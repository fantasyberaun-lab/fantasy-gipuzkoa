-- 0116: avisos push (cola de envío y qué avisos se mandan).
--
-- Qué avisos llegan al móvil:
--   1) 'oferta_recibida' y 'clausulazo': filas que ya se crean en `notificaciones`
--      (0022 y siguientes). Van dirigidas al dueño del jugador.
--   2) Torneo nuevo: un trigger en `tournaments` crea una difusión a todos.
--   3) Aviso del admin: un trigger en `comunicados` crea una difusión a todos cada vez
--      que el admin publica un comunicado, sea cual sea su etiqueta.
-- No se avisa de movimientos de valor, de nueva jornada ni del resumen semanal.
--
-- Los avisos de las difusiones se guardan en `push_difusiones` y los textos están en
-- castellano (como el resto de avisos generados por la base de datos).
--
-- Cómo se envía (un cron cada 2-3 minutos llama a /api/push/despachar):
--   1) notificaciones_push_pendientes() devuelve lo que falta por enviar: una fila por
--      (aviso, suscripción) que no tenga registro de envío. Máximo 500 por llamada.
--   2) El servidor manda cada push y llama a marcar_push_enviados() SOLO con los que
--      han salido bien (o que han fallado de forma definitiva). Los que fallan por un
--      error pasajero (sin red, servicio caído) NO se marcan y se reintentan en la
--      siguiente pasada, hasta que el aviso cumple 2 días.
--   La marca es por suscripción (push_envios): si un aviso llega a 3 de 5 móviles, solo
--   se reintentan los 2 que faltan y nadie recibe el aviso repetido.
--
-- Impacto en datos existentes: crea tablas y funciones nuevas y dos triggers. No toca
-- `notificaciones` (ni su check de tipos), saldos, jugadores ni plantillas. Se puede
-- lanzar con `supabase db push` o en el SQL Editor.

-- 1) Difusiones (avisos para todos) ---------------------------------------------------
create table if not exists public.push_difusiones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('torneo_nuevo', 'aviso_admin')),
  titulo text not null,
  cuerpo text not null,
  url text not null default '/',
  created_at timestamptz not null default now()
);

alter table public.push_difusiones enable row level security;  -- sin políticas: solo servidor

-- 2) Registro de envíos, por aviso y suscripción ----------------------------------------
create table if not exists public.push_envios (
  origen text not null check (origen in ('notificacion', 'difusion')),
  ref_id uuid not null,
  suscripcion_id uuid not null references public.push_suscripciones (id) on delete cascade,
  estado text not null default 'ok' check (estado in ('ok', 'descartado')),
  enviado_en timestamptz not null default now(),
  primary key (origen, ref_id, suscripcion_id)
);

alter table public.push_envios enable row level security;  -- sin políticas: solo servidor

-- 3) Torneo nuevo ---------------------------------------------------------------------
create or replace function public.difundir_torneo_nuevo()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into push_difusiones (tipo, titulo, cuerpo, url)
  values ('torneo_nuevo', 'Torneo nuevo', left(new.nombre, 120), '/torneos');
  return new;
end;
$$;

revoke all on function public.difundir_torneo_nuevo() from public, anon, authenticated;

drop trigger if exists difundir_torneo_nuevo_trg on public.tournaments;
create trigger difundir_torneo_nuevo_trg
  after insert on public.tournaments
  for each row execute function public.difundir_torneo_nuevo();

-- 4) Aviso del admin (cualquier comunicado) ---------------------------------------------
create or replace function public.difundir_aviso_admin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into push_difusiones (tipo, titulo, cuerpo, url)
  values ('aviso_admin', left(new.titulo, 80), left(new.cuerpo, 140), '/notificaciones');
  return new;
end;
$$;

revoke all on function public.difundir_aviso_admin() from public, anon, authenticated;

drop trigger if exists difundir_aviso_admin_trg on public.comunicados;
create trigger difundir_aviso_admin_trg
  after insert on public.comunicados
  for each row execute function public.difundir_aviso_admin();

-- 5) Lo pendiente de enviar -------------------------------------------------------------
-- Solo avisos de las últimas 48 horas, para no empujar el histórico al activar el push.
create or replace function public.notificaciones_push_pendientes()
returns table (
  origen text,
  ref_id uuid,
  suscripcion_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  titulo text,
  cuerpo text,
  url text,
  tag text
)
language sql
security definer set search_path = public
as $$
  with avisos as (
    -- Dirigidos al dueño de un equipo.
    select
      'notificacion'::text as origen,
      n.id as ref_id,
      ft.owner_id as user_id,
      case n.tipo when 'oferta_recibida' then 'Nueva oferta' else '¡Clausulazo!' end as titulo,
      case n.tipo
        when 'oferta_recibida' then 'Han ofertado ' || coalesce(round(n.importe)::text, '?') || ' M por tu jugador ' || coalesce(p.nombre, 'un jugador') || '.'
        else 'Te han pagado la cláusula de ' || coalesce(p.nombre, 'un jugador') || '.'
      end as cuerpo,
      case n.tipo when 'oferta_recibida' then '/mercado' else '/notificaciones' end as url,
      n.tipo as tag,
      n.created_at
    from notificaciones n
    join fantasy_teams ft on ft.id = n.objetivo_team_id
    left join players p on p.id = n.player_id
    where n.tipo in ('oferta_recibida', 'clausulazo')
      and n.created_at > now() - interval '2 days'
  ),
  difusiones as (
    -- Para todos los que tienen el push activado.
    select
      'difusion'::text as origen,
      d.id as ref_id,
      null::uuid as user_id,
      d.titulo,
      d.cuerpo,
      d.url,
      d.tipo as tag,
      d.created_at
    from push_difusiones d
    where d.created_at > now() - interval '2 days'
  )
  select
    a.origen,
    a.ref_id,
    s.id as suscripcion_id,
    s.endpoint,
    s.p256dh,
    s.auth,
    a.titulo,
    a.cuerpo,
    a.url,
    a.tag
  from (select * from avisos union all select * from difusiones) a
  join push_suscripciones s on a.user_id is null or s.user_id = a.user_id
  left join push_envios e
    on e.origen = a.origen and e.ref_id = a.ref_id and e.suscripcion_id = s.id
  where e.ref_id is null
  order by a.created_at
  limit 500;
$$;

revoke all on function public.notificaciones_push_pendientes() from public, anon, authenticated;
grant execute on function public.notificaciones_push_pendientes() to service_role;

-- 6) Marcar lo enviado ------------------------------------------------------------------
-- p_items: [{"origen":"notificacion","ref_id":"...","suscripcion_id":"...","estado":"ok"}, ...]
create or replace function public.marcar_push_enviados(p_items jsonb)
returns void
language sql
security definer set search_path = public
as $$
  insert into push_envios (origen, ref_id, suscripcion_id, estado)
  select
    i ->> 'origen',
    (i ->> 'ref_id')::uuid,
    (i ->> 'suscripcion_id')::uuid,
    coalesce(i ->> 'estado', 'ok')
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) i
  where exists (select 1 from push_suscripciones s where s.id = (i ->> 'suscripcion_id')::uuid)
  on conflict do nothing;
$$;

revoke all on function public.marcar_push_enviados(jsonb) from public, anon, authenticated;
grant execute on function public.marcar_push_enviados(jsonb) to service_role;

-- 7) Limpieza ---------------------------------------------------------------------------
-- Borra difusiones y registros de envío de más de 7 días.
create or replace function public.purgar_push()
returns void
language sql
security definer set search_path = public
as $$
  delete from push_envios where enviado_en < now() - interval '7 days';
  delete from push_difusiones where created_at < now() - interval '7 days';
$$;

revoke all on function public.purgar_push() from public, anon, authenticated;

-- 8) Programación (NO se activa desde la migración; ver CLAUDE.md) -----------------------
-- pg_cron ya está instalado en el proyecto; pg_net hay que activarlo una vez
-- (Database > Extensions, o `create extension pg_net;`). El secreto se guarda en Vault:
--
--   select vault.create_secret('EL_SECRETO_LARGO', 'push_cron_secret');
--
--   select cron.schedule(
--     'despachar-push',
--     '*/2 * * * *',
--     $$ select net.http_post(
--          url := 'https://fantasy.beraunberaxake.com/api/push/despachar',
--          headers := jsonb_build_object(
--            'Content-Type', 'application/json',
--            'x-cron-secret',
--            (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
--          ),
--          timeout_milliseconds := 50000
--        ); $$
--   );
--   select cron.schedule('purgar-push', '30 3 * * *', $$ select public.purgar_push(); $$);
--
-- El mismo valor del secreto va en la variable CRON_SECRET de Vercel.
