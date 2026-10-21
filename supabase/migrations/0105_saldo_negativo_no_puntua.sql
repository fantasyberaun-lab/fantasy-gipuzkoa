-- 0105: con el saldo en negativo cuando empieza la jornada, el equipo puntúa 0.
--
-- REQUIERE 0104 (tabla plantilla_semanal: saldo y plantilla de cada equipo en la foto del
-- sábado, y la variable jornada_hora_inicio).
--
-- Problema: la app avisaba ("Con el saldo en negativo no puntúas en la jornada") pero ninguna
-- vista ni función de la base de datos lo aplicaba: puntuaban igual. Ahora sí, y se ve en la
-- pestaña Jornadas del perfil del manager.
--
-- Regla: si en la foto del sábado (la hora de inicio de la jornada, plantilla_semanal) el equipo
-- tiene presupuesto < 0, TODAS sus rondas de ese fin de semana puntúan 0, aunque luego se recupere.
--   - puntos_jugador_jornada.cuenta pasa a ser falso para ese equipo y fin de semana. Como
--     team_matchday_points, clasificacion(), pagos_semana (el pago de jornada y la XP de jornada)
--     y las misiones solo suman lo que "cuenta", todo se corrige solo. puntos_base se queda con
--     lo que hizo de verdad el jugador (es lo que se enseña en su ficha).
--   - Columna nueva al final de la vista: sancionado (true = ese equipo no puntúa ese fin de semana).
--   - alineaciones_equipo_semanas() (pestaña Jornadas) devuelve además saldo_negativo, pone el
--     total de la semana y los puntos de cada jugador a 0 y mantiene 'base' (lo que habría
--     sumado). También lo marca en la fila "pendiente" (foto ya tomada, rondas aún no creadas).
--
-- Fines de semana anteriores a 0104: no hay foto de saldo, así que no se penaliza a nadie (no se
-- puede saber quién estaba en negativo). Rondas con jornada ya cerrada y pagada: si se recalculan
-- (cerrar_jornada otra vez) y había foto con saldo negativo, se corrigen solas.
--
-- Impacto en datos existentes: solo cambia una vista y una función; no toca saldos ni jugadores.
-- Hoy no cambia ningún punto: las fotos con saldo empiezan con el primer sábado tras lanzar 0104.
-- Lanzar con `supabase db push` o en el SQL Editor (después de 0104).


-- 1) Vista: quien estaba en negativo en la foto no cuenta ------------------------------------------
-- La de 0055 con una columna más (sancionado) y cuenta = ... and not sancionado.
create or replace view public.puntos_jugador_jornada as
with base as (
  select
    ml.fantasy_team_id,
    ml.matchday_id,
    ml.player_id,
    ml.es_capitan,
    m.numero as jornada,
    m.created_at as creada,
    t.nombre as torneo,
    -- Misma semana = misma ronda. Sin semana, la jornada va sola.
    coalesce(ml.semana::text, ml.matchday_id::text) as grupo,
    (
      coalesce(r.puntos_fantasy, 0)
      + case when b.player_id is not null then public.puntos_descanso() else 0 end
    ) as puntos_base,
    exists (
      select 1 from public.plantilla_semanal ps
      where ps.fantasy_team_id = ml.fantasy_team_id
        and ps.semana = ml.semana
        and ps.presupuesto < 0
    ) as sancionado
  from matchday_lineups ml
  join matchdays m on m.id = ml.matchday_id
  left join tournaments t on t.id = m.tournament_id
  left join results r
    on r.player_id = ml.player_id and r.matchday_id = ml.matchday_id
  left join matchday_byes b
    on b.player_id = ml.player_id and b.matchday_id = ml.matchday_id
)
select
  fantasy_team_id,
  matchday_id,
  player_id,
  es_capitan,
  jornada,
  creada,
  torneo,
  puntos_base,
  (
    row_number() over (
      partition by fantasy_team_id, player_id, grupo
      order by puntos_base desc, creada, matchday_id
    ) = 1
    and not sancionado
  ) as cuenta,
  first_value(torneo) over (
    partition by fantasy_team_id, player_id, grupo
    order by puntos_base desc, creada, matchday_id
  ) as cuenta_en,
  sancionado
from base;

revoke all on public.puntos_jugador_jornada from public, anon, authenticated;


-- 2) Pestaña Jornadas: avisar y poner 0 -----------------------------------------------------------
-- La de 0064 con dos cambios: columna saldo_negativo y, si es true, total y puntos por jugador a 0.
drop function if exists public.alineaciones_equipo_semanas(uuid);

create or replace function public.alineaciones_equipo_semanas(p_equipo_id uuid)
returns table (
  clave text,
  fecha date,
  puntos_equipo integer,
  pendiente boolean,
  jugadores jsonb,
  saldo_negativo boolean
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
      pj.sancionado,
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
    (case
       when bool_or(e.sancionado) then 0
       else sum(e.base * case when e.es_capitan then public.multiplicador_capitan() else 1 end)
     end)::integer,
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
        'puntos', case
                    when e.sancionado then 0
                    else e.base * case when e.es_capitan then public.multiplicador_capitan() else 1 end
                  end,
        'torneo', case when e.resultado is not null or e.descanso then e.torneo end,
        'jornada', case when e.resultado is not null or e.descanso then e.jornada end
      )
      order by e.es_capitan desc, e.base desc, p.nombre
    ),
    coalesce(bool_or(e.sancionado), false)
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
    ),
    exists (
      select 1 from plantilla_semanal ps
      where ps.fantasy_team_id = p_equipo_id
        and ps.semana = wl.semana
        and ps.presupuesto < 0
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
