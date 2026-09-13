-- Esquema inicial del Fantasy Campeonatos de Gipuzkoa.
-- Basado en el Reglamento V3.1. Los valores concretos (tablas de puntos,
-- presupuesto inicial, límite de operaciones...) se guardan en game_config
-- como JSON editable por el rol "root", no hardcodeados aquí.

create type categoria as enum ('1', '2', '3');
create type resultado_partida as enum ('victoria', 'tablas', 'derrota');
create type rol_usuario as enum ('root', 'manager');

-- Perfiles de usuario (extiende auth.users de Supabase)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol rol_usuario not null default 'manager',
  created_at timestamptz not null default now()
);

-- Jugadores reales de ajedrez que compiten en el campeonato
create table players (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  club text,
  categoria categoria not null,
  elo integer not null,
  valor_mercado numeric not null default 0, -- en millones
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Jornadas del campeonato
create table matchdays (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique,
  fecha_inicio date,
  fecha_fin date,
  mercado_abierto boolean not null default false,
  created_at timestamptz not null default now()
);

-- Resultado de cada jugador en cada jornada (fuente de la puntuación Fantasy)
create table results (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  matchday_id uuid not null references matchdays (id) on delete cascade,
  rival_player_id uuid references players (id),
  rival_elo_en_el_momento integer, -- por si el rival no es de la plantilla de nadie
  resultado resultado_partida not null,
  puntos_fantasy integer not null default 0,
  unique (player_id, matchday_id)
);

-- Equipos Fantasy de cada manager
create table fantasy_teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  nombre text not null,
  presupuesto numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id)
);

-- Plantilla actual de cada equipo (relación equipo <-> jugador)
create table squad_slots (
  id uuid primary key default gen_random_uuid(),
  fantasy_team_id uuid not null references fantasy_teams (id) on delete cascade,
  player_id uuid not null references players (id),
  fecha_incorporacion timestamptz not null default now(),
  fecha_salida timestamptz, -- null = sigue en la plantilla
  unique (fantasy_team_id, player_id, fecha_incorporacion)
);

-- Jugador de la Jornada elegido por cada equipo
create table matchday_captains (
  id uuid primary key default gen_random_uuid(),
  fantasy_team_id uuid not null references fantasy_teams (id) on delete cascade,
  matchday_id uuid not null references matchdays (id) on delete cascade,
  player_id uuid not null references players (id),
  unique (fantasy_team_id, matchday_id)
);

-- Jugadores disponibles en el mercado en un momento dado
create table market_listings (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id),
  valor_actual numeric not null,
  disponible boolean not null default true,
  created_at timestamptz not null default now()
);

-- Pujas realizadas sobre un listing del mercado
create table bids (
  id uuid primary key default gen_random_uuid(),
  market_listing_id uuid not null references market_listings (id) on delete cascade,
  fantasy_team_id uuid not null references fantasy_teams (id) on delete cascade,
  importe numeric not null,
  created_at timestamptz not null default now()
);

-- Clausulazos ejecutados entre managers
create table clause_releases (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id),
  from_team_id uuid not null references fantasy_teams (id),
  to_team_id uuid not null references fantasy_teams (id),
  importe numeric not null,
  matchday_id uuid references matchdays (id),
  created_at timestamptz not null default now()
);

-- Registro de operaciones (fichajes, ventas, ofertas aceptadas, clausulazos)
-- para poder aplicar el límite de operaciones por periodo.
create table operations_log (
  id uuid primary key default gen_random_uuid(),
  fantasy_team_id uuid not null references fantasy_teams (id) on delete cascade,
  matchday_id uuid references matchdays (id),
  tipo text not null check (tipo in ('fichaje', 'venta', 'oferta_aceptada', 'clausulazo')),
  player_id uuid references players (id),
  importe numeric,
  created_at timestamptz not null default now()
);

-- Parámetros del reglamento, editables por un usuario con rol "root"
-- desde la propia app, sin tocar código ni desplegar.
create table game_config (
  clave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id)
);

-- RLS: activar en todas las tablas y abrir lectura pública de datos de juego
-- (jugadores, jornadas, mercado, clasificación) pero restringir escritura.
-- Esto es un punto de partida: hay que revisar las políticas caso a caso
-- antes de ir a producción.
alter table players enable row level security;
alter table matchdays enable row level security;
alter table results enable row level security;
alter table fantasy_teams enable row level security;
alter table squad_slots enable row level security;
alter table matchday_captains enable row level security;
alter table market_listings enable row level security;
alter table bids enable row level security;
alter table clause_releases enable row level security;
alter table operations_log enable row level security;
alter table game_config enable row level security;
alter table profiles enable row level security;

create policy "lectura publica players" on players for select using (true);
create policy "lectura publica matchdays" on matchdays for select using (true);
create policy "lectura publica results" on results for select using (true);
create policy "lectura publica fantasy_teams" on fantasy_teams for select using (true);
create policy "lectura publica market_listings" on market_listings for select using (true);
create policy "lectura publica game_config" on game_config for select using (true);

create policy "cada manager ve su propia plantilla" on squad_slots
  for select using (
    fantasy_team_id in (select id from fantasy_teams where owner_id = auth.uid())
  );

create policy "cada manager gestiona su propio equipo" on fantasy_teams
  for update using (owner_id = auth.uid());

create policy "cada manager ve su perfil" on profiles
  for select using (id = auth.uid());
