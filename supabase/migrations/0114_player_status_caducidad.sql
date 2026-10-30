-- 0114: player_status devuelve también cuándo caducan el candado y el blindaje de cada jugador.
--
-- Hace falta para enseñar en la app una cuenta atrás discreta ("6d 4h") junto a la insignia de
-- candado o de blindado, tanto en tu plantilla como en la de los rivales (Jugadores y
-- Clasificación leen esta función). candado_hasta / blindado_hasta solo vienen rellenos mientras
-- la protección sigue vigente; si ya ha caducado, son null.
--
-- Cambia el tipo devuelto (dos columnas nuevas al final), así que hay que borrar la función y
-- crearla de nuevo; se vuelven a dar los permisos de 0082. No toca datos.

drop function if exists public.player_status(uuid);

create or replace function public.player_status(p_league_id uuid)
returns table (
  id uuid,
  nombre text,
  club text,
  categoria categoria,
  elo integer,
  valor_mercado numeric,
  activo boolean,
  puntos_totales integer,
  propietario_team_id uuid,
  propietario_nombre text,
  clausula numeric,
  candado boolean,
  blindado boolean,
  historial_puntos jsonb,
  candado_hasta timestamptz,
  blindado_hasta timestamptz
)
language sql
security definer set search_path = public
as $$
  select
    p.id,
    p.nombre,
    p.club,
    p.categoria,
    p.elo,
    p.valor_mercado,
    p.activo,
    coalesce(pt.puntos_totales, 0)::integer as puntos_totales,
    owner.fantasy_team_id as propietario_team_id,
    ft.nombre as propietario_nombre,
    public.calcular_clausula(owner.precio_pago, p.valor_mercado, owner.clausula_extra, p_league_id) as clausula,
    coalesce(owner.candado and coalesce(owner.candado_hasta, 'infinity'::timestamptz) > now(), false) as candado,
    coalesce(owner.blindado and coalesce(owner.blindado_hasta, 'infinity'::timestamptz) > now(), false) as blindado,
    coalesce(hist.historial, '[]'::jsonb) as historial_puntos,
    case when owner.candado and coalesce(owner.candado_hasta, 'infinity'::timestamptz) > now() then owner.candado_hasta end as candado_hasta,
    case when owner.blindado and coalesce(owner.blindado_hasta, 'infinity'::timestamptz) > now() then owner.blindado_hasta end as blindado_hasta
  from players p
  left join lateral (
    select ss.fantasy_team_id, ss.clausula_extra, ss.precio_pago, ss.candado, ss.candado_hasta, ss.blindado, ss.blindado_hasta
    from squad_slots ss
    where ss.player_id = p.id
      and ss.league_id = p_league_id
      and ss.fecha_salida is null
    limit 1
  ) owner on true
  left join fantasy_teams ft on ft.id = owner.fantasy_team_id
  left join (
    select player_id, sum(puntos_fantasy) as puntos_totales
    from results
    group by player_id
  ) pt on pt.player_id = p.id
  left join lateral (
    select jsonb_agg(
             jsonb_build_object('jornada', m.numero, 'puntos', r.puntos_fantasy)
             order by m.numero
           ) as historial
    from results r
    join matchdays m on m.id = r.matchday_id
    where r.player_id = p.id
  ) hist on true;
$$;

revoke all on function public.player_status(uuid) from public, anon;
grant execute on function public.player_status(uuid) to authenticated;
