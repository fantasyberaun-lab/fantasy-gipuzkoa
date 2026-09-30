-- 0043: perfil de manager.
--
-- 1) profiles.ligas_ganadas: contador de ligas ganadas (todos parten de 0).
--    Los managers no pueden tocarlo (profiles solo tiene política de lectura
--    propia, sin escritura): se sube a mano con SQL cuando acabe una liga.
--      update profiles set ligas_ganadas = ligas_ganadas + 1 where id = '...';
-- 2) puedo_ver_equipo(): el que pregunta tiene equipo en la misma liga.
-- 3) perfil_manager(equipo): nombre de usuario, "manager desde", ligas
--    ganadas y jugadas, puntos totales y mejor jornada de ese equipo.
-- 4) evolucion_valor_plantilla(equipo): valor de la plantilla día a día,
--    reconstruido con player_value_history (0041) y las altas/bajas de
--    squad_slots. Si un jugador no tiene histórico anterior a ese día (p. ej.
--    ya estaba fichado antes de existir el histórico) se usa su primer valor
--    registrado, para que la gráfica no salga con huecos.
-- 5) clasificacion(): añade nombre_manager (el nombre de usuario) para
--    enseñarlo junto al nombre del equipo.
--
-- Requiere 0041 (player_value_history), 0023 (team_matchday_points).

-- 1) Ligas ganadas ------------------------------------------------------------
alter table profiles
  add column if not exists ligas_ganadas integer not null default 0
  check (ligas_ganadas >= 0);

-- 2) Acceso: solo managers de la misma liga ----------------------------------
create or replace function public.puedo_ver_equipo(p_equipo_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from fantasy_teams ft
    join fantasy_teams mio
      on mio.league_id = ft.league_id and mio.owner_id = auth.uid()
    where ft.id = p_equipo_id
  );
$$;

revoke all on function public.puedo_ver_equipo(uuid) from public, anon;
grant execute on function public.puedo_ver_equipo(uuid) to authenticated;

-- 3) Perfil de un manager (a través de su equipo en una liga) -----------------
create or replace function public.perfil_manager(p_equipo_id uuid)
returns table (
  equipo_id uuid,
  nombre_equipo text,
  nombre_manager text,
  liga_nombre text,
  liga_publica boolean,
  miembro_desde timestamptz,
  ligas_ganadas integer,
  ligas_jugadas integer,
  puntos_totales integer,
  mejor_jornada integer,
  es_mio boolean
)
language sql
stable
security definer set search_path = public
as $$
  select
    ft.id,
    ft.nombre,
    p.nombre,
    l.nombre,
    (l.tipo = 'publica'),
    p.created_at,
    p.ligas_ganadas,
    (select count(*) from fantasy_teams x where x.owner_id = ft.owner_id)::integer,
    coalesce((select sum(t.puntos) from team_matchday_points t
              where t.fantasy_team_id = ft.id), 0)::integer,
    coalesce((select max(t.puntos) from team_matchday_points t
              where t.fantasy_team_id = ft.id), 0)::integer,
    (ft.owner_id = auth.uid())
  from fantasy_teams ft
  join profiles p on p.id = ft.owner_id
  join leagues l on l.id = ft.league_id
  where ft.id = p_equipo_id
    and public.puedo_ver_equipo(p_equipo_id);
$$;

revoke all on function public.perfil_manager(uuid) from public, anon;
grant execute on function public.perfil_manager(uuid) to authenticated;

-- 4) Evolución del valor de la plantilla --------------------------------------
-- Un punto por día (hora de Madrid), con el valor al final de ese día de los
-- jugadores que estaban en la plantilla ese día. Máximo el último año.
create or replace function public.evolucion_valor_plantilla(p_equipo_id uuid)
returns table (
  dia date,
  valor numeric,
  jugadores integer
)
language sql
stable
security definer set search_path = public
as $$
  with hoy as (
    select (now() at time zone 'Europe/Madrid')::date as d
  ),
  limites as (
    select
      greatest(
        min((ss.fecha_incorporacion at time zone 'Europe/Madrid')::date),
        (select d from hoy) - 365
      ) as desde
    from squad_slots ss
    where ss.fantasy_team_id = p_equipo_id
  ),
  dias as (
    select g::date as dia
    from limites l,
         generate_series(l.desde::timestamp, (select d from hoy)::timestamp, interval '1 day') g
    where l.desde is not null
  )
  select
    d.dia,
    round(sum(v.valor), 2),
    count(*)::integer
  from dias d
  join squad_slots ss
    on ss.fantasy_team_id = p_equipo_id
   and (ss.fecha_incorporacion at time zone 'Europe/Madrid')::date <= d.dia
   and (ss.fecha_salida is null
        or (ss.fecha_salida at time zone 'Europe/Madrid')::date > d.dia)
  cross join lateral (
    select coalesce(
      (select h.valor
         from player_value_history h
        where h.player_id = ss.player_id
          and h.created_at < ((d.dia + 1)::timestamp at time zone 'Europe/Madrid')
        order by h.created_at desc
        limit 1),
      (select h.valor
         from player_value_history h
        where h.player_id = ss.player_id
        order by h.created_at asc
        limit 1)
    ) as valor
  ) v
  where public.puedo_ver_equipo(p_equipo_id)
    and v.valor is not null
  group by d.dia
  order by d.dia;
$$;

revoke all on function public.evolucion_valor_plantilla(uuid) from public, anon;
grant execute on function public.evolucion_valor_plantilla(uuid) to authenticated;

-- 5) clasificacion(): con el nombre del manager --------------------------------
-- Igual que en 0020 más nombre_manager. Cambia el tipo devuelto, así que hay
-- que borrar y crear de nuevo.
drop function if exists public.clasificacion(uuid);

create function public.clasificacion(p_league_id uuid)
returns table (
  equipo_id uuid,
  nombre_equipo text,
  nombre_manager text,
  puntos_totales integer,
  historial_puntos jsonb
)
language sql
stable
security definer set search_path = public
as $$
  select
    ft.id as equipo_id,
    ft.nombre as nombre_equipo,
    pr.nombre as nombre_manager,
    coalesce(sum(tmp.puntos), 0)::integer as puntos_totales,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', tmp.matchday_id,
          'jornada', tmp.jornada,
          'torneo', tmp.torneo,
          'puntos', tmp.puntos,
          'creada', tmp.creada
        )
        order by tmp.creada, tmp.matchday_id
      ) filter (where tmp.matchday_id is not null),
      '[]'::jsonb
    ) as historial_puntos
  from fantasy_teams ft
  join profiles pr on pr.id = ft.owner_id
  left join team_matchday_points tmp on tmp.fantasy_team_id = ft.id
  where ft.league_id = p_league_id
    and exists (
      select 1 from fantasy_teams mio
      where mio.league_id = p_league_id and mio.owner_id = auth.uid()
    )
  group by ft.id, ft.nombre, pr.nombre;
$$;

revoke all on function public.clasificacion(uuid) from public, anon;
grant execute on function public.clasificacion(uuid) to authenticated;
