-- 0115: resumen semanal del manager (estilo "Wrapped").
--
-- Fase 0 del plan de engagement. Tras cerrar la jornada, cada manager recibe un
-- resumen de su semana: puntos, posición en su liga y cuántos puestos ha subido
-- o bajado. Se guarda en `resumenes_semanales` (una fila por equipo y semana),
-- se muestra en /resumen y, al generarse, deja un aviso 'resumen' (0114) que el
-- push empuja.
--
-- La posición es por puntos ACUMULADOS dentro de la liga (como la clasificación).
-- La variación compara con la semana anterior (positiva = ha subido puestos).
--
-- La generación (generar_resumenes_semanales) la lanza el servidor/cron una vez
-- cerrada la jornada; es idempotente por (equipo, semana). La lectura
-- (resumen_semanal) la hace el manager desde la web.
--
-- Impacto en datos existentes: solo crea una tabla y funciones nuevas. No cambia
-- saldos, jugadores ni plantillas. Se puede lanzar con `supabase db push` o en el
-- SQL Editor.

create table if not exists public.resumenes_semanales (
  fantasy_team_id uuid not null references public.fantasy_teams (id) on delete cascade,
  semana date not null,
  puntos integer not null,
  posicion integer,
  variacion integer,                 -- puestos ganados respecto a la semana anterior (+ sube)
  notificado_en timestamptz,         -- cuándo se creó su aviso 'resumen'
  created_at timestamptz not null default now(),
  primary key (fantasy_team_id, semana)
);

create index if not exists resumenes_semanales_semana_idx
  on public.resumenes_semanales (semana);

alter table public.resumenes_semanales enable row level security;

-- El manager ve los resúmenes de sus equipos; root, todos. Nadie escribe desde
-- el cliente: solo generar_resumenes_semanales() (security definer).
drop policy if exists "ver mis resumenes" on public.resumenes_semanales;
create policy "ver mis resumenes" on public.resumenes_semanales
  for select to authenticated
  using (
    fantasy_team_id in (select id from fantasy_teams where owner_id = auth.uid())
    or public.es_root()
  );

-- Genera (o actualiza) los resúmenes de la última semana cerrada y deja el aviso
-- 'resumen' para los nuevos. Devuelve cuántos resúmenes nuevos ha avisado.
create or replace function public.generar_resumenes_semanales()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_semana date;
  v_anterior date;
  v_nuevos integer := 0;
begin
  select max(semana) into v_semana from pagos_semana;
  if v_semana is null then
    return jsonb_build_object('ok', true, 'semana', null, 'nuevos', 0);
  end if;

  select max(semana) into v_anterior from pagos_semana where semana < v_semana;

  with acum_actual as (
    select ps.fantasy_team_id, ft.league_id, sum(ps.puntos) as total
    from pagos_semana ps
    join fantasy_teams ft on ft.id = ps.fantasy_team_id
    where ps.semana <= v_semana
    group by ps.fantasy_team_id, ft.league_id
  ),
  pos_actual as (
    select fantasy_team_id,
           rank() over (partition by league_id order by total desc) as posicion
    from acum_actual
  ),
  acum_anterior as (
    select ps.fantasy_team_id, ft.league_id, sum(ps.puntos) as total
    from pagos_semana ps
    join fantasy_teams ft on ft.id = ps.fantasy_team_id
    where v_anterior is not null and ps.semana <= v_anterior
    group by ps.fantasy_team_id, ft.league_id
  ),
  pos_anterior as (
    select fantasy_team_id,
           rank() over (partition by league_id order by total desc) as posicion
    from acum_anterior
  )
  insert into resumenes_semanales (fantasy_team_id, semana, puntos, posicion, variacion)
  select
    ps.fantasy_team_id,
    v_semana,
    ps.puntos,
    pa.posicion,
    case when pant.posicion is not null and pa.posicion is not null
         then pant.posicion - pa.posicion end
  from pagos_semana ps
  left join pos_actual pa on pa.fantasy_team_id = ps.fantasy_team_id
  left join pos_anterior pant on pant.fantasy_team_id = ps.fantasy_team_id
  where ps.semana = v_semana
  on conflict (fantasy_team_id, semana) do update
    set puntos = excluded.puntos,
        posicion = excluded.posicion,
        variacion = excluded.variacion;

  -- Aviso (y por tanto push) para los resúmenes aún no notificados.
  insert into notificaciones (league_id, tipo, objetivo_team_id, importe, privada)
  select ft.league_id, 'resumen', rs.fantasy_team_id, rs.puntos, true
  from resumenes_semanales rs
  join fantasy_teams ft on ft.id = rs.fantasy_team_id
  where rs.semana = v_semana and rs.notificado_en is null;

  get diagnostics v_nuevos = row_count;

  update resumenes_semanales
  set notificado_en = now()
  where semana = v_semana and notificado_en is null;

  return jsonb_build_object('ok', true, 'semana', v_semana, 'nuevos', v_nuevos);
end;
$$;

revoke all on function public.generar_resumenes_semanales() from public, anon, authenticated;
grant execute on function public.generar_resumenes_semanales() to service_role;

-- Resumen del manager actual: su mejor equipo en la última semana con datos.
create or replace function public.resumen_semanal()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_semana date;
  v_fila resumenes_semanales%rowtype;
  v_nombre text;
  v_liga text;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver tu resumen.';
  end if;

  select max(rs.semana) into v_semana
  from resumenes_semanales rs
  join fantasy_teams ft on ft.id = rs.fantasy_team_id
  where ft.owner_id = v_uid;

  if v_semana is null then
    return jsonb_build_object('ok', true, 'hay', false);
  end if;

  -- El equipo con más puntos esa semana (desempate por id).
  select rs.* into v_fila
  from resumenes_semanales rs
  join fantasy_teams ft on ft.id = rs.fantasy_team_id
  where ft.owner_id = v_uid and rs.semana = v_semana
  order by rs.puntos desc, rs.fantasy_team_id
  limit 1;

  select nombre into v_nombre from fantasy_teams where id = v_fila.fantasy_team_id;
  select l.nombre into v_liga
  from fantasy_teams ft join leagues l on l.id = ft.league_id
  where ft.id = v_fila.fantasy_team_id;

  return jsonb_build_object(
    'ok', true,
    'hay', true,
    'semana', v_fila.semana,
    'equipo', v_nombre,
    'liga', v_liga,
    'puntos', v_fila.puntos,
    'posicion', v_fila.posicion,
    'variacion', v_fila.variacion
  );
end;
$$;

revoke all on function public.resumen_semanal() from public, anon;
grant execute on function public.resumen_semanal() to authenticated;

-- Programación (NO se activa desde la migración; ver CLAUDE.md). Tras cerrar la
-- jornada del fin de semana, por ejemplo lunes a las 08:00 (UTC en pg_cron):
--
--   select cron.schedule(
--     'resumenes-semanales',
--     '0 8 * * 1',
--     $$ select public.generar_resumenes_semanales(); $$
--   );
