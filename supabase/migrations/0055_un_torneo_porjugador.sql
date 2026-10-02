-- 0055: si un jugador está en más de un torneo la misma ronda, solo puntúa en
-- el torneo donde más puntos haya hecho.
--
-- "La misma ronda" = el mismo fin de semana, es decir, la misma foto semanal
-- de alineaciones (weekly_lineups, sábado 16:00). Cada torneo lleva su propia
-- numeración (uno puede ir por la R1 y otro por la R2), así que el número de
-- jornada NO sirve para agrupar: se agrupa por la foto del sábado de la que
-- salió cada jornada.
--
--   1) matchday_lineups.semana: de qué foto semanal salió la alineación.
--      Las jornadas antiguas sin foto semanal quedan con semana = null y no se
--      agrupan con nada (puntúan como siempre).
--   2) snapshot_alineaciones(): igual que en 0051, guardando además la semana.
--   3) puntos_jugador_jornada: vista interna con los puntos de cada titular en
--      cada jornada y si CUENTA (es su mejor torneo del fin de semana). En
--      empate a puntos cuenta el torneo cuya jornada se creó antes.
--   4) team_matchday_points: solo suma lo que cuenta. clasificacion() y el
--      perfil del manager la leen de aquí, así que se actualizan solos.
--   5) alineaciones_equipo(): igual que en 0051, con "cuenta" y "cuenta_en" en
--      cada jugador. Mantener igual que components/AlineacionesJornadas.tsx.
--
-- Nota: los puntos del jugador en sí (ficha del jugador, player_status) NO
-- cambian: son lo que hizo en cada partida. La regla solo afecta a lo que
-- suma cada equipo fantasy.
--
-- Nota 2: mientras el otro torneo no tenga resultado, el jugador cuenta en el
-- que ya tiene puntos; si luego puntúa más en el otro, la puntuación del
-- equipo se mueve sola a ese.

-- 1) Semana de la alineación ------------------------------------------------
alter table public.matchday_lineups add column if not exists semana date;

-- Jornadas ya creadas: se les asigna la foto semanal con la misma regla que
-- usa snapshot_alineaciones (la última de los 5 días anteriores a crearse).
update public.matchday_lineups ml
set semana = (
  select max(wl.semana)
  from public.weekly_lineups wl
  join public.matchdays m on m.id = ml.matchday_id
  where wl.tomada_en <= m.created_at
    and wl.tomada_en > m.created_at - interval '5 days'
)
where ml.semana is null;

-- 2) La jornada guarda de qué semana salió -----------------------------------
create or replace function public.snapshot_alineaciones()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_semana date;
begin
  select max(wl.semana)
  into v_semana
  from weekly_lineups wl
  where wl.tomada_en <= new.created_at
    and wl.tomada_en > new.created_at - interval '5 days';

  if v_semana is not null then
    insert into matchday_lineups (matchday_id, fantasy_team_id, player_id, es_capitan, semana)
    select new.id, wl.fantasy_team_id, wl.player_id, wl.es_capitan, v_semana
    from weekly_lineups wl
    where wl.semana = v_semana;
  else
    insert into matchday_lineups (matchday_id, fantasy_team_id, player_id, es_capitan)
    select new.id, ss.fantasy_team_id, ss.player_id, ss.capitan
    from squad_slots ss
    where ss.fecha_salida is null and ss.titular = true;
  end if;

  return new;
end;
$$;

-- 3) Puntos de cada titular por jornada y si cuentan ---------------------------
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
    ) as puntos_base
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
  ) as cuenta,
  first_value(torneo) over (
    partition by fantasy_team_id, player_id, grupo
    order by puntos_base desc, creada, matchday_id
  ) as cuenta_en
from base;

revoke all on public.puntos_jugador_jornada from public, anon, authenticated;

-- 4) Puntos de equipo por jornada: solo suma lo que cuenta ------------------------
-- Mismas columnas y orden que en 0033. El capitán sigue multiplicando.
create or replace view public.team_matchday_points as
select
  p.fantasy_team_id,
  p.matchday_id,
  p.jornada,
  coalesce(
    sum(
      case when p.cuenta
        then p.puntos_base * case when p.es_capitan then public.multiplicador_capitan() else 1 end
        else 0
      end
    ),
    0
  )::integer as puntos,
  p.torneo,
  p.creada
from public.puntos_jugador_jornada p
group by p.fantasy_team_id, p.matchday_id, p.jornada, p.torneo, p.creada;

-- 5) Qué puso un manager en cada jornada -----------------------------------------
create or replace function public.alineaciones_equipo(p_equipo_id uuid)
returns table (
  jornada_id uuid,
  jornada integer,
  torneo text,
  creada timestamptz,
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
      pj.matchday_id,
      pj.es_capitan,
      pj.cuenta,
      pj.cuenta_en,
      p.id as pid,
      p.nombre,
      p.categoria,
      r.resultado,
      (b.player_id is not null) as descanso,
      pj.puntos_base as base,
      case when pj.cuenta
        then pj.puntos_base * case when pj.es_capitan then public.multiplicador_capitan() else 1 end
        else 0
      end as puntos
    from puntos_jugador_jornada pj
    join players p on p.id = pj.player_id
    left join results r
      on r.player_id = pj.player_id and r.matchday_id = pj.matchday_id
    left join matchday_byes b
      on b.player_id = pj.player_id and b.matchday_id = pj.matchday_id
    where pj.fantasy_team_id = p_equipo_id
      and public.puedo_ver_equipo(p_equipo_id)
  )
  select
    m.id,
    m.numero,
    t.nombre,
    m.created_at,
    sum(f.puntos)::integer,
    false,
    jsonb_agg(
      jsonb_build_object(
        'id', f.pid,
        'nombre', f.nombre,
        'categoria', f.categoria::text,
        'capitan', f.es_capitan,
        'resultado', f.resultado::text,
        'descanso', f.descanso,
        'base', f.base,
        'puntos', f.puntos,
        'cuenta', f.cuenta,
        'cuenta_en', f.cuenta_en
      )
      order by f.es_capitan desc, f.base desc, f.nombre
    )
  from filas f
  join matchdays m on m.id = f.matchday_id
  left join tournaments t on t.id = m.tournament_id
  group by m.id, m.numero, t.nombre, m.created_at

  union all

  -- Foto del último sábado cuando todavía no hay jornada creada después.
  select
    null::uuid,
    null::integer,
    null::text,
    max(wl.tomada_en),
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
        'cuenta', true,
        'cuenta_en', null
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
    and wl.tomada_en > coalesce((select max(created_at) from matchdays), '-infinity'::timestamptz)
  group by wl.semana;
$$;

revoke all on function public.alineaciones_equipo(uuid) from public, anon;
grant execute on function public.alineaciones_equipo(uuid) to authenticated;
