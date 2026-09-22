-- Paso 2 de las ligas privadas: squad_slots, market_listings y bids
-- pasan a estar scoped por liga. Hasta ahora "un jugador solo puede
-- tener un dueño" era una regla global (squad_slots_un_propietario_activo
-- sobre player_id a secas) — con ligas independientes, un mismo jugador
-- puede estar fichado en una liga y libre en otra a la vez, así que la
-- regla pasa a ser por (player_id, league_id).
--
-- OJO — lo que esta migración NO arregla todavía (queda para el
-- siguiente paso, antes de que las ligas funcionen del todo):
--   - fichar_jugador, pagar_clausula y pujar_mercado siguen buscando tu
--     equipo con "where owner_id = auth.uid()" sin más — si alguna vez
--     tienes más de un equipo (estás en más de una liga), cogerían uno
--     cualquiera de forma ambigua. Hoy mismo no rompe nada porque nadie
--     tiene más de un equipo todavía, pero hay que arreglarlo antes de
--     que la gente use varias ligas de verdad.
--   - procesar_mercado_diario sigue generando UNA tanda global de 9,
--     no 9 por liga.
--   - player_status sigue siendo una vista sin distinguir liga.

-- 1) squad_slots: añadir league_id, rellenar desde el equipo, y
--    arreglar el índice de propietario único para que sea por liga.
alter table squad_slots add column if not exists league_id uuid references leagues (id) on delete cascade;

update squad_slots ss
set league_id = ft.league_id
from fantasy_teams ft
where ft.id = ss.fantasy_team_id
  and ss.league_id is null;

alter table squad_slots alter column league_id set not null;

drop index if exists squad_slots_un_propietario_activo;
create unique index squad_slots_un_propietario_activo
  on squad_slots (player_id, league_id)
  where fecha_salida is null;

create index if not exists squad_slots_league_id_idx on squad_slots (league_id);

-- 2) market_listings: añadir league_id. Como hasta ahora solo existía
--    una partida global, todo lo que hubiera ya en la tabla se asigna a
--    la liga más antigua que exista (la única, en la práctica, salvo
--    que ya hayáis creado alguna liga nueva de prueba).
alter table market_listings add column if not exists league_id uuid references leagues (id) on delete cascade;

update market_listings
set league_id = (select id from leagues order by created_at limit 1)
where league_id is null;

alter table market_listings alter column league_id set not null;

create index if not exists market_listings_league_id_idx on market_listings (league_id);

-- La lectura pública de market_listings dejaba ver los listings de
-- CUALQUIER liga a cualquier usuario logueado — con ligas privadas eso
-- ya no vale, se restringe a las ligas de las que eres miembro.
drop policy if exists "lectura publica market_listings" on market_listings;
create policy "ver listings de mis ligas"
  on market_listings for select
  using (
    league_id in (select league_id from fantasy_teams where owner_id = auth.uid())
  );

-- 3) bids: mismo cambio, heredando league_id desde su listing.
alter table bids add column if not exists league_id uuid references leagues (id) on delete cascade;

update bids b
set league_id = ml.league_id
from market_listings ml
where ml.id = b.market_listing_id
  and b.league_id is null;

alter table bids alter column league_id set not null;

create index if not exists bids_league_id_idx on bids (league_id);

drop policy if exists "lectura publica bids" on bids;
create policy "ver bids de mis ligas"
  on bids for select
  using (
    league_id in (select league_id from fantasy_teams where owner_id = auth.uid())
  );