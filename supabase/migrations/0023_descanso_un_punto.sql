-- Un jugador que queda sin emparejar en una jornada (matchday_byes, ver
-- 0021_emparejamientos.sql) pasa a puntuar 1 punto Fantasy. Antes no daba
-- puntos.
--
-- El descanso sigue sin ser una partida: no cuenta como partida jugada ni
-- entra en las estadísticas de torneo (puntos de torneo, performance). Solo
-- suma a los puntos Fantasy. Por eso NO se guarda como fila de results:
-- se suma donde se agregan los puntos.
--
--   1) puntos_descanso(): un único sitio en SQL donde cambiar el valor.
--      (En el frontend está en lib/gameConfig.ts -> puntosPorDescanso;
--      mantener los dos iguales.)
--   2) team_matchday_points: los puntos de equipo por jornada incluyen el
--      punto de los titulares que descansaron. clasificacion() lo lee de
--      aquí, así que la clasificación queda actualizada sin tocarla.
--   3) player_status: puntos totales del jugador e historial jornada a
--      jornada incluyen los descansos (marcados con "descanso": true).

-- 1) Valor del punto por descanso -------------------------------------------
create or replace function public.puntos_descanso()
returns integer
language sql
immutable
as $$
  select 1;
$$;

-- 2) Puntos de equipo por jornada -------------------------------------------
-- Mismas columnas y orden que en 0020; solo cambia el cálculo de "puntos".
-- Un jugador tiene como mucho una fila en results y una en matchday_byes
-- por jornada (y nunca las dos a la vez), así que los joins no duplican.
create or replace view public.team_matchday_points as
select
  ml.fantasy_team_id,
  ml.matchday_id,
  m.numero as jornada,
  (
    coalesce(sum(r.puntos_fantasy), 0)
    + count(b.player_id) * public.puntos_descanso()
  )::integer as puntos,
  t.nombre as torneo,
  m.created_at as creada
from matchday_lineups ml
join matchdays m on m.id = ml.matchday_id
left join tournaments t on t.id = m.tournament_id
left join results r
  on r.player_id = ml.player_id and r.matchday_id = ml.matchday_id
left join matchday_byes b
  on b.player_id = ml.player_id and b.matchday_id = ml.matchday_id
group by ml.fantasy_team_id, ml.matchday_id, m.numero, t.nombre, m.created_at;

-- 3) player_status: igual que en 0020, sumando los descansos --------------------
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
  historial_puntos jsonb
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
    coalesce(hist.historial, '[]'::jsonb) as historial_puntos
  from players p
  left join lateral (
    select ss.fantasy_team_id
    from squad_slots ss
    where ss.player_id = p.id
      and ss.league_id = p_league_id
      and ss.fecha_salida is null
    limit 1
  ) owner on true
  left join fantasy_teams ft on ft.id = owner.fantasy_team_id
  left join (
    select x.player_id, sum(x.puntos) as puntos_totales
    from (
      select player_id, puntos_fantasy as puntos from results
      union all
      select player_id, public.puntos_descanso() as puntos from matchday_byes
    ) x
    group by x.player_id
  ) pt on pt.player_id = p.id
  left join lateral (
    select jsonb_agg(e.entrada order by e.creada, e.matchday_id) as historial
    from (
      select
        m.id as matchday_id,
        m.created_at as creada,
        jsonb_build_object(
          'id', m.id,
          'jornada', m.numero,
          'torneo', t.nombre,
          'puntos', r.puntos_fantasy,
          'creada', m.created_at
        ) as entrada
      from results r
      join matchdays m on m.id = r.matchday_id
      left join tournaments t on t.id = m.tournament_id
      where r.player_id = p.id

      union all

      select
        m.id as matchday_id,
        m.created_at as creada,
        jsonb_build_object(
          'id', m.id,
          'jornada', m.numero,
          'torneo', t.nombre,
          'puntos', public.puntos_descanso(),
          'creada', m.created_at,
          'descanso', true
        ) as entrada
      from matchday_byes b
      join matchdays m on m.id = b.matchday_id
      left join tournaments t on t.id = m.tournament_id
      where b.player_id = p.id
    ) e
  ) hist on true;
$$;

grant execute on function public.player_status(uuid) to authenticated;
