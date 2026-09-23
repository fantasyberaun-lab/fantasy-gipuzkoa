-- Clasificación real (Reglamento V3.1, puntos 13-14). Solo cuentan los
-- puntos de los jugadores que eran TITULARES de cada equipo en el
-- momento de esa jornada — confirmado explícitamente por el manager,
-- como en un Fantasy de fútbol.
--
-- El problema: squad_slots.titular es un interruptor que cambia con el
-- tiempo (si Fulano era titular en la jornada 3 pero ahora es suplente,
-- la clasificación de la jornada 3 tiene que seguir contando con él como
-- titular de entonces, no con su estado de hoy). Por eso hace falta una
-- "foto" histórica, no solo leer el estado actual.
--
-- Solución adoptada: en cuanto se crea una jornada nueva desde Admin, se
-- guarda automáticamente qué jugadores tenía cada equipo marcados como
-- titulares en ese preciso instante, y esa foto es la que cuenta para
-- esa jornada. Es decir: los managers tienen que dejar su once decidido
-- antes de darle a "+ Nueva jornada" en Admin. No hay todavía un
-- "cierre de plazo" más fino (por horas, o automático); si hace falta
-- más adelante, se puede añadir sin tocar esta base.
--
-- Con ligas privadas (0015-0017): las jornadas (matchdays) siguen siendo
-- globales, así que la foto se hace de los equipos de TODAS las ligas a
-- la vez. matchday_lineups no necesita league_id porque fantasy_team_id
-- ya pertenece a una única liga. Donde sí importa la liga es al leer la
-- clasificación: eso es la función clasificacion(p_league_id) de abajo.

create table matchday_lineups (
  id uuid primary key default gen_random_uuid(),
  matchday_id uuid not null references matchdays (id) on delete cascade,
  fantasy_team_id uuid not null references fantasy_teams (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (matchday_id, fantasy_team_id, player_id)
);

alter table matchday_lineups enable row level security;

create policy "lectura publica matchday_lineups" on matchday_lineups
  for select using (true);

-- Solo la de "root gestiona jornadas" (0005) puede escribir aquí
-- directamente; en la práctica solo lo hace el trigger de abajo, que es
-- security definer y no depende de esa política.

create or replace function public.snapshot_alineaciones()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into matchday_lineups (matchday_id, fantasy_team_id, player_id)
  select new.id, ss.fantasy_team_id, ss.player_id
  from squad_slots ss
  where ss.fecha_salida is null and ss.titular = true;

  return new;
end;
$$;

drop trigger if exists snapshot_alineaciones_al_crear_jornada on matchdays;
create trigger snapshot_alineaciones_al_crear_jornada
  after insert on matchdays
  for each row execute function public.snapshot_alineaciones();

-- Puntos de cada equipo en cada jornada: suma de los puntos_fantasy de
-- los jugadores que estaban en su "foto" de titulares de esa jornada.
-- Si un titular de entonces no tiene resultado registrado esa jornada
-- (no se ha introducido todavía, o no jugó), cuenta como 0 puntos, no
-- como fila ausente — así el total no cambia según se va rellenando.
--
-- Vista interna: NO se da grant a anon/authenticated. Al no ser
-- security_invoker se salta las políticas RLS, y con ligas privadas no
-- queremos que cualquiera pueda leer los puntos de equipos de ligas
-- ajenas. Se consulta solo a través de clasificacion(p_league_id).
create or replace view public.team_matchday_points as
select
  ml.fantasy_team_id,
  ml.matchday_id,
  m.numero as jornada,
  coalesce(sum(r.puntos_fantasy), 0)::integer as puntos
from matchday_lineups ml
join matchdays m on m.id = ml.matchday_id
left join results r
  on r.player_id = ml.player_id and r.matchday_id = ml.matchday_id
group by ml.fantasy_team_id, ml.matchday_id, m.numero;

-- Clasificación general de UNA liga: puntos totales por equipo + su
-- historial jornada a jornada (mismo formato que
-- player_status.historial_puntos, para reutilizar HistorialPuntosChart
-- si algún día se quiere mostrar también aquí).
--
-- Es función y no vista, igual que player_status en 0017, porque
-- depende de la liga. Solo devuelve filas si el usuario que pregunta
-- tiene un equipo en esa liga.
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
        jsonb_build_object('jornada', tmp.jornada, 'puntos', tmp.puntos)
        order by tmp.jornada
      ) filter (where tmp.jornada is not null),
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
