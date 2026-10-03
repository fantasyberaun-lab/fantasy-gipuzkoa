-- 0064: en la pestaña "Jornadas" del perfil de un manager salía el mismo
-- sábado dos veces: una fila normal (con puntos) y otra "pendiente" (sin puntos).
--
-- CAUSA: alineaciones_equipo_semanas() (0058) añadía la fila "pendiente" siempre
-- que la foto del sábado fuera posterior a la última jornada creada. Si las
-- jornadas se crean ANTES de la foto de las 16:00 (o la foto se toma a mano
-- después), la misma semana salía como fila normal y como pendiente.
--
-- ARREGLO: la fila "pendiente" solo sale si ese equipo no tiene todavía
-- ninguna jornada (matchday_lineups) de esa semana. Es lo único que cambia
-- respecto a 0058.
--
-- Mantener igual que lib/supabase/alineacionesQueries.ts y
-- components/AlineacionesJornadas.tsx.

create or replace function public.alineaciones_equipo_semanas(p_equipo_id uuid)
returns table (
  clave text,            -- identifica el fin de semana (semana o jornada antigua)
  fecha date,            -- sábado de la foto (o día de creación en jornadas antiguas)
  puntos_equipo integer,
  pendiente boolean,
  jugadores jsonb
)
language sql
stable
security definer set search_path = public
as $$
  with filas as (
    select
      coalesce(ml.semana::text, ml.matchday_id::text) as grupo,
      ml.semana,
      pj.matchday_id,
      pj.player_id,
      pj.es_capitan,
      pj.torneo,
      pj.jornada,
      pj.creada,
      pj.puntos_base as base,
      r.resultado,
      (b.player_id is not null) as descanso
    from puntos_jugador_jornada pj
    join matchday_lineups ml
      on ml.matchday_id = pj.matchday_id
     and ml.fantasy_team_id = pj.fantasy_team_id
     and ml.player_id = pj.player_id
    left join results r
      on r.player_id = pj.player_id and r.matchday_id = pj.matchday_id
    left join matchday_byes b
      on b.player_id = pj.player_id and b.matchday_id = pj.matchday_id
    where pj.fantasy_team_id = p_equipo_id
      and public.puedo_ver_equipo(p_equipo_id)
  ),
  -- Un solo registro por jugador y fin de semana: el de más puntos; en empate,
  -- el torneo donde de verdad jugó (resultado o descanso) y luego el más antiguo.
  elegidas as (
    select distinct on (grupo, player_id) *
    from filas
    order by
      grupo,
      player_id,
      base desc,
      (resultado is not null or descanso) desc,
      creada,
      matchday_id
  )
  select
    e.grupo,
    coalesce(max(e.semana), (min(e.creada) at time zone 'Europe/Madrid')::date),
    sum(e.base * case when e.es_capitan then public.multiplicador_capitan() else 1 end)::integer,
    false,
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'nombre', p.nombre,
        'categoria', p.categoria::text,
        'capitan', e.es_capitan,
        'resultado', e.resultado::text,
        'descanso', e.descanso,
        'base', e.base,
        'puntos', e.base * case when e.es_capitan then public.multiplicador_capitan() else 1 end,
        'torneo', case when e.resultado is not null or e.descanso then e.torneo end,
        'jornada', case when e.resultado is not null or e.descanso then e.jornada end
      )
      order by e.es_capitan desc, e.base desc, p.nombre
    )
  from elegidas e
  join players p on p.id = e.player_id
  group by e.grupo

  union all

  -- Foto del último sábado cuando todavía no hay jornada creada después.
  select
    'pendiente'::text,
    max(wl.semana),
    0,
    true,
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'nombre', p.nombre,
        'categoria', p.categoria::text,
        'capitan', wl.es_capitan,
        'resultado', null,
        'descanso', false,
        'base', 0,
        'puntos', 0,
        'torneo', null,
        'jornada', null
      )
      order by wl.es_capitan desc, p.nombre
    )
  from weekly_lineups wl
  join players p on p.id = wl.player_id
  where wl.fantasy_team_id = p_equipo_id
    and public.puedo_ver_equipo(p_equipo_id)
    and wl.semana = (
      select max(w2.semana) from weekly_lineups w2 where w2.fantasy_team_id = p_equipo_id
    )
    -- Solo es "pendiente" si ese fin de semana este equipo todavía no tiene
    -- ninguna jornada con su alineación (si la tiene, ya sale como fila normal).
    and not exists (
      select 1 from matchday_lineups ml2
      where ml2.fantasy_team_id = p_equipo_id and ml2.semana = wl.semana
    )
  group by wl.semana;
$$;

revoke all on function public.alineaciones_equipo_semanas(uuid) from public, anon;
grant execute on function public.alineaciones_equipo_semanas(uuid) to authenticated;