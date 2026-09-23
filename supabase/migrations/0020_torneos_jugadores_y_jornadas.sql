-- Segunda parte de los torneos (continúa 0019_torneos.sql):
--
--   1) Torneos sin restricciones de formato: solo el nombre es obligatorio.
--      Se quitan los checks de rondas, fechas y sistema, y los NOT NULL
--      con valor por defecto de numero_rondas, sistema y pais.
--   2) Las jornadas pasan a numerarse POR TORNEO, empezando en 1 en cada
--      uno. matchdays.numero deja de ser único global y ahora lo es dentro
--      de su torneo; la columna ronda de 0019 se fusiona en numero.
--   3) Jugadores participantes de cada torneo (tournament_players): ya no
--      juegan todos los de la base de datos en todos los torneos.
--   4) El historial de puntos (clasificacion y player_status) ya no puede
--      identificar una jornada solo por su número, porque "jornada 1"
--      existe en cada torneo. Ahora cada entrada lleva también el id de la
--      jornada, el nombre del torneo y cuándo se creó, y se ordena por eso.

-- 1) Torneos sin controles de formato -------------------------------------
alter table tournaments drop constraint if exists tournaments_rondas_positivas;
alter table tournaments drop constraint if exists tournaments_fechas_coherentes;
alter table tournaments drop constraint if exists tournaments_sistema_valido;

alter table tournaments alter column numero_rondas drop not null;
alter table tournaments alter column numero_rondas drop default;
alter table tournaments alter column sistema drop not null;
alter table tournaments alter column sistema drop default;
alter table tournaments alter column pais drop not null;
alter table tournaments alter column pais drop default;

-- 2) Jornadas numeradas por torneo ----------------------------------------
alter table matchdays drop constraint if exists matchdays_numero_key;
alter table matchdays drop constraint if exists matchdays_ronda_unica_por_torneo;

-- Las jornadas creadas con 0019 ya tenían su número dentro del torneo en
-- "ronda": pasa a ser el número de jornada.
update matchdays set numero = ronda where ronda is not null;
alter table matchdays drop column if exists ronda;

-- Los NULL no chocan entre sí, así que las jornadas antiguas sin torneo
-- siguen funcionando aunque repitan número.
alter table matchdays
  add constraint matchdays_numero_unico_por_torneo unique (tournament_id, numero);

-- 3) Jugadores de cada torneo ---------------------------------------------
create table if not exists tournament_players (
  tournament_id uuid not null references tournaments (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  primary key (tournament_id, player_id)
);

create index if not exists tournament_players_player_id_idx
  on tournament_players (player_id);

alter table tournament_players enable row level security;

create policy "lectura publica tournament_players" on tournament_players
  for select using (true);

create policy "root gestiona jugadores de torneos" on tournament_players
  for all using (public.es_root()) with check (public.es_root());

-- 4) Historial de puntos con identificación de jornada ---------------------
-- Vista interna (sin grant a clientes, como en 0018): se añaden torneo y
-- fecha de creación al final, y se agrupa también por ellos.
create or replace view public.team_matchday_points as
select
  ml.fantasy_team_id,
  ml.matchday_id,
  m.numero as jornada,
  coalesce(sum(r.puntos_fantasy), 0)::integer as puntos,
  t.nombre as torneo,
  m.created_at as creada
from matchday_lineups ml
join matchdays m on m.id = ml.matchday_id
left join tournaments t on t.id = m.tournament_id
left join results r
  on r.player_id = ml.player_id and r.matchday_id = ml.matchday_id
group by ml.fantasy_team_id, ml.matchday_id, m.numero, t.nombre, m.created_at;

create or replace function public.clasificacion(p_league_id uuid)
returns table (
  equipo_id uuid,
  nombre_equipo text,
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
  left join team_matchday_points tmp on tmp.fantasy_team_id = ft.id
  where ft.league_id = p_league_id
    and exists (
      select 1 from fantasy_teams mio
      where mio.league_id = p_league_id and mio.owner_id = auth.uid()
    )
  group by ft.id, ft.nombre;
$$;

grant execute on function public.clasificacion(uuid) to authenticated;

-- player_status: igual que en 0017, cambiando solo el historial.
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
    select player_id, sum(puntos_fantasy) as puntos_totales
    from results
    group by player_id
  ) pt on pt.player_id = p.id
  left join lateral (
    select jsonb_agg(
             jsonb_build_object(
               'id', m.id,
               'jornada', m.numero,
               'torneo', t.nombre,
               'puntos', r.puntos_fantasy,
               'creada', m.created_at
             )
             order by m.created_at, m.id
           ) as historial
    from results r
    join matchdays m on m.id = r.matchday_id
    left join tournaments t on t.id = m.tournament_id
    where r.player_id = p.id
  ) hist on true;
$$;

grant execute on function public.player_status(uuid) to authenticated;
