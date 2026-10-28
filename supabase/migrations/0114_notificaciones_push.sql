-- 0114: enganchar las notificaciones existentes al envío push + alertas de mercado.
--
-- Fase 0 del plan de engagement. Reutiliza la tabla `notificaciones` (0022):
-- cada aviso que ya se genera (oferta recibida, clausulazo) se puede empujar por
-- push, y se añaden tres tipos nuevos:
--   - 'mercado': el valor de un jugador TUYO se ha movido mucho (alerta FOMO).
--   - 'resumen': tu resumen semanal ya está listo (ver 0115).
--   - 'jornada': aviso a toda la liga de que hay puntos nuevos (lo lanza el admin).
--
-- El envío real lo hace /api/push/despachar (service role + web-push), que:
--   1) pide a notificaciones_push_pendientes() las filas por enviar (una por
--      suscripción y destinatario), ya resueltas a quién y con qué texto;
--   2) manda cada push;
--   3) marca las notificaciones con marcar_push_despachada().
-- Solo se consideran avisos recientes (2 días) para no empujar el histórico al
-- activar el push por primera vez.
--
-- Impacto en datos existentes: añade una columna y amplía el check de tipos de
-- notificaciones (sin tocar filas), crea un trigger y funciones. No cambia
-- saldos, jugadores ni plantillas. Se puede lanzar con `supabase db push` o en
-- el SQL Editor.

-- 1) Tipos nuevos y marca de "ya empujada" ------------------------------------------
alter table public.notificaciones
  add column if not exists push_despachada_en timestamptz;

alter table public.notificaciones
  drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in ('oferta_recibida', 'fichaje', 'clausulazo', 'mercado', 'resumen', 'jornada'));

-- Umbral (en %) a partir del cual un cambio de valor por resultado avisa al dueño.
insert into game_config (clave, valor) values ('push_mercado_umbral_pct', '2.5'::jsonb)
on conflict (clave) do nothing;

-- 2) Alerta de mercado: cuando el valor de un jugador se mueve mucho por un
--    resultado, avisa (privado) a cada manager que lo tiene en plantilla.
--    La variación diaria (motivo 'diaria', <= 1,5 %) no avisa nunca.
create or replace function public.notificar_movimiento_valor()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_umbral numeric;
begin
  if new.motivo not in ('resultado', 'correccion') or new.cambio_pct is null then
    return new;
  end if;

  select coalesce((select valor::text::numeric from game_config where clave = 'push_mercado_umbral_pct'), 2.5)
  into v_umbral;

  if abs(new.cambio_pct) < v_umbral then
    return new;
  end if;

  insert into notificaciones (league_id, tipo, objetivo_team_id, player_id, importe, privada)
  select ss.league_id, 'mercado', ss.fantasy_team_id, new.player_id, round(new.cambio_pct, 2), true
  from squad_slots ss
  where ss.player_id = new.player_id and ss.fecha_salida is null;

  return new;
end;
$$;

revoke all on function public.notificar_movimiento_valor() from public, anon, authenticated;

drop trigger if exists notificar_movimiento_valor_trg on public.player_value_history;
create trigger notificar_movimiento_valor_trg
  after insert on public.player_value_history
  for each row execute function public.notificar_movimiento_valor();

-- 3) Aviso de nueva jornada a toda una liga (lo lanza el admin desde el panel).
create or replace function public.avisar_nueva_jornada(p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede avisar.');
  end if;
  if p_league_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Falta la liga.');
  end if;

  insert into notificaciones (league_id, tipo, privada)
  values (p_league_id, 'jornada', false);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.avisar_nueva_jornada(uuid) from public, anon;
grant execute on function public.avisar_nueva_jornada(uuid) to authenticated;

-- 4) Lo pendiente de empujar: una fila por (notificación, suscripción). El
--    servidor (service role) la llama, envía cada push y luego marca.
create or replace function public.notificaciones_push_pendientes()
returns table (
  notif_id uuid,
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
  with destinatarios as (
    -- Avisos dirigidos a un equipo concreto.
    select
      n.id as notif_id,
      ft.owner_id as user_id,
      case n.tipo
        when 'oferta_recibida' then 'Nueva oferta'
        when 'clausulazo' then '¡Clausulazo!'
        when 'mercado' then 'Movimiento de mercado'
        when 'resumen' then 'Tu resumen semanal'
      end as titulo,
      case n.tipo
        when 'oferta_recibida' then 'Han ofertado ' || coalesce(round(n.importe)::text, '?') || ' M por tu jugador ' || coalesce(p.nombre, 'un jugador') || '.'
        when 'clausulazo' then 'Te han pagado la cláusula de ' || coalesce(p.nombre, 'un jugador') || '.'
        when 'mercado' then coalesce(p.nombre, 'Un jugador') || (case when n.importe >= 0 then ' sube ' else ' baja ' end) || round(abs(n.importe), 1)::text || '% de valor.'
        when 'resumen' then 'Ya está tu resumen de la semana. Toca para verlo.'
      end as cuerpo,
      case n.tipo
        when 'oferta_recibida' then '/mercado'
        when 'clausulazo' then '/notificaciones'
        when 'mercado' then '/mercado'
        when 'resumen' then '/resumen'
      end as url,
      n.tipo as tag
    from notificaciones n
    join fantasy_teams ft on ft.id = n.objetivo_team_id
    left join players p on p.id = n.player_id
    where n.push_despachada_en is null
      and n.created_at > now() - interval '2 days'
      and n.tipo in ('oferta_recibida', 'clausulazo', 'mercado', 'resumen')

    union all

    -- Aviso de jornada: a todos los managers de la liga.
    select
      n.id as notif_id,
      ft.owner_id as user_id,
      'Nueva jornada' as titulo,
      'Ya puedes ver los puntos de la jornada.' as cuerpo,
      '/clasificacion' as url,
      'jornada' as tag
    from notificaciones n
    join fantasy_teams ft on ft.league_id = n.league_id
    where n.push_despachada_en is null
      and n.created_at > now() - interval '2 days'
      and n.tipo = 'jornada'
  )
  select
    d.notif_id,
    s.id as suscripcion_id,
    s.endpoint,
    s.p256dh,
    s.auth,
    d.titulo,
    d.cuerpo,
    d.url,
    d.tag
  from destinatarios d
  join push_suscripciones s on s.user_id = d.user_id;
$$;

revoke all on function public.notificaciones_push_pendientes() from public, anon, authenticated;
grant execute on function public.notificaciones_push_pendientes() to service_role;

-- 5) Marcar como ya despachadas (tras enviar).
create or replace function public.marcar_push_despachada(p_ids uuid[])
returns void
language sql
security definer set search_path = public
as $$
  update notificaciones
  set push_despachada_en = now()
  where id = any(p_ids) and push_despachada_en is null;
$$;

revoke all on function public.marcar_push_despachada(uuid[]) from public, anon, authenticated;
grant execute on function public.marcar_push_despachada(uuid[]) to service_role;

-- 6) Programación (NO se activa desde la migración; ver CLAUDE.md). El despacho
--    lo dispara Vercel Cron (vercel.json) o, si se prefiere pg_cron + pg_net:
--
--    select cron.schedule(
--      'despachar-push',
--      '* * * * *',
--      $$ select net.http_post(
--           url := 'https://TU-DOMINIO/api/push/despachar',
--           headers := jsonb_build_object('x-cron-secret', 'EL_SECRETO')
--         ); $$
--    );
