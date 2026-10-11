-- 0080: próximos rivales calculados en la base de datos.
--
-- Hasta ahora la app descargaba TODOS los emparejamientos de la temporada y
-- TODOS los jugadores para quedarse con la última ronda de cada torneo (4-5
-- consultas seguidas que crecen cada semana). Esta función hace el mismo
-- cálculo aquí y devuelve solo las filas útiles: una por jugador y torneo con
-- ronda vigente.
--
-- Reglas (las mismas que fetchProximosRivales en lib/supabase/queries.ts):
--   1) En cada torneo solo cuenta su última jornada con emparejamientos
--      publicados (la de created_at más reciente).
--   2) Si el jugador ya tiene resultado en esa jornada, la partida está jugada
--      y no sale.
--   3) Fila "descansa" en los emparejamientos -> descansa.
--   4) Mesa normal -> rival (nombre y Elo actuales si está en la base; si es
--      externo, "Rival externo" con el Elo guardado en la mesa) y color.
--   5) Descanso guardado (matchday_byes) sin fila "descansa" -> descansa.
--   6) Inscrito en el torneo que no aparece en los emparejamientos de esa
--      jornada ni tiene descanso -> descansa ("sin emparejar").
--
-- Solo lectura: no cambia datos ni permisos de tablas. security invoker: lee
-- con los permisos de quien llama (como hacía la app), así que la RLS se
-- respeta igual que antes. Solo para usuarios con sesión.

create or replace function public.proximos_rivales()
returns table (
  player_id uuid,
  jornada integer,
  torneo text,
  tablero integer,
  descansa boolean,
  rival_id uuid,
  rival_nombre text,
  rival_elo integer,
  color text,
  orden integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with vigentes as (
    -- 1) Última jornada con emparejamientos de cada torneo.
    select distinct on (coalesce(m.tournament_id, m.id))
      m.id as matchday_id,
      m.numero as jornada,
      m.tournament_id,
      t.nombre as torneo
    from matchdays m
    left join tournaments t on t.id = m.tournament_id
    where exists (select 1 from matchday_pairings mp where mp.matchday_id = m.id)
    order by coalesce(m.tournament_id, m.id), m.created_at desc, m.numero desc, m.id
  ),
  mesas as (
    select mp.*, v.jornada, v.torneo
    from matchday_pairings mp
    join vigentes v on v.matchday_id = mp.matchday_id
  ),
  jugado as (
    -- 2) Partidas ya jugadas en las jornadas vigentes.
    select r.matchday_id, r.player_id
    from results r
    join vigentes v on v.matchday_id = r.matchday_id
  ),
  filas as (
    -- 3) Filas "descansa" de los emparejamientos.
    select
      me.blanco_player_id as player_id, me.jornada, me.torneo, me.tablero,
      true as descansa, null::uuid as rival_id, '' as rival_nombre,
      null::integer as rival_elo, null::text as color, 1 as fase, me.id as mesa_id
    from mesas me
    where me.descansa
      and me.blanco_player_id is not null
      and not exists (
        select 1 from jugado j
        where j.matchday_id = me.matchday_id and j.player_id = me.blanco_player_id
      )

    union all

    -- 4) Mesas normales, vistas desde cada lado.
    select
      l.yo, me.jornada, me.torneo, me.tablero,
      false, l.rival,
      case when l.rival is null then 'Rival externo'
           else coalesce(p.nombre, 'Rival desconocido') end,
      case when l.rival is null then l.rival_elo_mesa else p.elo end,
      l.color, 1, me.id
    from mesas me
    cross join lateral (
      values
        (me.blanco_player_id, me.negro_player_id, me.negro_elo, 'blancas'),
        (me.negro_player_id, me.blanco_player_id, me.blanco_elo, 'negras')
    ) as l(yo, rival, rival_elo_mesa, color)
    left join players p on p.id = l.rival
    where not me.descansa
      and l.yo is not null
      and not exists (
        select 1 from jugado j
        where j.matchday_id = me.matchday_id and j.player_id = l.yo
      )

    union all

    -- 5) Descansos guardados sin fila "descansa" en los emparejamientos.
    select
      b.player_id, v.jornada, v.torneo, null::integer,
      true, null::uuid, '', null::integer, null::text, 2, null::uuid
    from matchday_byes b
    join vigentes v on v.matchday_id = b.matchday_id
    where not exists (
        select 1 from jugado j
        where j.matchday_id = b.matchday_id and j.player_id = b.player_id
      )
      and not exists (
        select 1 from matchday_pairings mp
        where mp.matchday_id = b.matchday_id and mp.descansa
          and mp.blanco_player_id = b.player_id
      )

    union all

    -- 6) Inscritos que no salen en los emparejamientos ni tienen descanso.
    select
      tp.player_id, v.jornada, v.torneo, null::integer,
      true, null::uuid, '', null::integer, null::text, 3, null::uuid
    from vigentes v
    join tournament_players tp on tp.tournament_id = v.tournament_id
    where not exists (
        select 1 from matchday_pairings mp
        where mp.matchday_id = v.matchday_id
          and (mp.blanco_player_id = tp.player_id or mp.negro_player_id = tp.player_id)
      )
      and not exists (
        select 1 from matchday_byes b
        where b.matchday_id = v.matchday_id and b.player_id = tp.player_id
      )
      and not exists (
        select 1 from jugado j
        where j.matchday_id = v.matchday_id and j.player_id = tp.player_id
      )
  )
  select
    f.player_id, f.jornada, f.torneo, f.tablero, f.descansa,
    f.rival_id, f.rival_nombre, f.rival_elo, f.color,
    (row_number() over (partition by f.player_id order by f.fase, f.mesa_id, f.torneo))::integer as orden
  from filas f;
$$;

revoke all on function public.proximos_rivales() from public, anon;
grant execute on function public.proximos_rivales() to authenticated;
