-- Torneos reales (los campeonatos de los que salen las jornadas del
-- Fantasy). Hasta ahora las jornadas (matchdays) existían sueltas; a
-- partir de aquí cada jornada pertenece a un torneo concreto y es una
-- ronda de ese torneo.
--
-- La ficha del torneo sigue la información que suele aparecer en
-- chess-results: organizador, director, árbitros, lugar de juego,
-- fechas, número de rondas, sistema, ritmo de juego, cómputo de Elo,
-- desempates, enlaces y contacto.
--
-- Igual que matchdays, los torneos son globales (no dependen de la
-- liga): todas las ligas privadas puntúan con los mismos torneos.

create table tournaments (
  id uuid primary key default gen_random_uuid(),

  -- General
  nombre text not null,
  categoria categoria,                       -- null = torneo abierto / sin categoría
  observaciones text,

  -- Organización
  organizador text,
  federacion text,
  director text,
  arbitro_principal text,
  arbitros_adjuntos text,                    -- varios nombres, separados por comas o saltos de línea

  -- Lugar de juego
  lugar text,                                -- sala / club / recinto
  direccion text,
  ciudad text,
  provincia text,
  pais text not null default 'España',

  -- Calendario
  fecha_inicio date,
  fecha_fin date,
  numero_rondas integer not null default 9,

  -- Sistema de juego
  sistema text not null default 'suizo',
  ritmo_juego text,                          -- p. ej. "90 min + 30 s/jugada"
  computo_elo text,                          -- p. ej. "FIDE", "FEDA", "FIDE y FEDA"
  desempates text,                           -- p. ej. "Buchholz -1, Buchholz, Sonneborn-Berger"

  -- Enlaces y contacto
  web_url text,
  email_contacto text,

  created_at timestamptz not null default now(),

  constraint tournaments_rondas_positivas check (numero_rondas > 0),
  constraint tournaments_fechas_coherentes check (
    fecha_inicio is null or fecha_fin is null or fecha_fin >= fecha_inicio
  ),
  constraint tournaments_sistema_valido check (
    sistema in ('suizo', 'round_robin', 'eliminatoria', 'otro')
  )
);

alter table tournaments enable row level security;

create policy "lectura publica tournaments" on tournaments
  for select using (true);

create policy "root gestiona torneos" on tournaments
  for all using (public.es_root()) with check (public.es_root());

-- Cada jornada pasa a ser una ronda de un torneo.
--   - matchdays.numero sigue siendo el número de jornada GLOBAL del
--     Fantasy (único, lo que usan la clasificación y los historiales).
--   - ronda es el número de ronda DENTRO de su torneo (1..numero_rondas).
--   - tournament_id es nullable solo para no romper las jornadas que ya
--     existan de las pruebas; la pantalla de Admin ya exige torneo al
--     crear una jornada nueva.
--   - on delete restrict: no se puede borrar un torneo que tenga
--     jornadas, porque borrarlas arrastraría sus resultados.
alter table matchdays
  add column if not exists tournament_id uuid references tournaments (id) on delete restrict,
  add column if not exists ronda integer;

alter table matchdays
  add constraint matchdays_ronda_unica_por_torneo unique (tournament_id, ronda);

create index if not exists matchdays_tournament_id_idx on matchdays (tournament_id);
