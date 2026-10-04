-- 0069: arreglo del bug "salen ~20 jugadores en el mercado de una liga privada".
--       (Sustituye al 0069_mercado_8_jugadores.sql anterior: el mercado se queda
--       en 9 jugadores; el problema no era el número, era que se acumulaban.)
--
-- Causa: abrir_tanda_mercado (0056) INSERTA 9 jugadores sin mirar si ya había una
-- tanda abierta. Si se ejecuta dos veces a la vez (p. ej. el cron antiguo
-- "mercado-cada-8h" sigue vivo junto al nuevo "mercado-horas-madrid", o dos
-- ejecuciones solapadas), la segunda no ve los 9 que acaba de insertar la primera
-- y se acumulan 18, 27... jugadores abiertos.
--
-- Arreglo:
--   1) Limpieza: se quitan los jugadores repetidos en una misma liga (queda el más
--      antiguo) y se crea un índice único para que NO pueda volver a pasar.
--   2) tamano_mercado(): el tamaño de la tanda (9) en un único sitio.
--   3) rellenar_mercado(liga): bloquea la liga y deja la tanda abierta EXACTAMENTE
--      en tamano_mercado(): quita repetidos, quita jugadores con dueño, recorta
--      lo que sobre (se quedan los que tienen más pujas) y rellena lo que falte.
--   4) abrir_tanda_mercado(liga) pasa a llamar a rellenar_mercado, así que
--      ejecutarla dos veces ya no suma jugadores.
--   5) Se normalizan ahora mismo todas las ligas privadas.
--
-- Es seguro ejecutarlo aunque ya hubieras lanzado el 0069 anterior.
-- Las pujas se borran solas al borrar un listing (on delete cascade) y no
-- reservan saldo.

-- 1) Limpieza + índice único --------------------------------------------------
delete from market_listings
where id in (
  select d.id
  from (
    select id,
           row_number() over (partition by league_id, player_id order by created_at, id) as rn
    from market_listings
    where disponible = true
  ) d
  where d.rn > 1
);

create unique index if not exists market_listings_abierto_unico
  on public.market_listings (league_id, player_id)
  where disponible;

-- 2) Tamaño de la tanda -------------------------------------------------------
create or replace function public.tamano_mercado()
returns integer
language sql
immutable
as $$
  select 9;
$$;

-- 3) Dejar la tanda abierta exactamente en su tamaño ---------------------------
create or replace function public.rellenar_mercado(p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_tam integer := public.tamano_mercado();
  v_abiertos integer;
begin
  if public.es_liga_publica(p_league_id) then
    return;
  end if;

  -- Mismo candado que asignar_plantilla_inicial: nadie más toca el mercado de
  -- esta liga mientras se normaliza.
  perform pg_advisory_xact_lock(hashtextextended(p_league_id::text, 0));

  -- a) Jugadores repetidos en la tanda abierta (queda el más antiguo).
  delete from market_listings
  where id in (
    select d.id
    from (
      select id,
             row_number() over (partition by player_id order by created_at, id) as rn
      from market_listings
      where league_id = p_league_id and disponible = true
    ) d
    where d.rn > 1
  );

  -- b) Jugadores que ya tienen dueño en esta liga.
  delete from market_listings ml
  where ml.league_id = p_league_id
    and ml.disponible = true
    and exists (
      select 1 from squad_slots ss
      where ss.player_id = ml.player_id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    );

  -- c) Si sobran, fuera los que tienen menos pujas.
  delete from market_listings
  where id in (
    select ml.id
    from market_listings ml
    where ml.league_id = p_league_id and ml.disponible = true
    order by (select count(*) from bids b where b.market_listing_id = ml.id) desc,
             ml.created_at, ml.id
    offset v_tam
  );

  -- d) Si faltan, se rellenan con jugadores inscritos, sin dueño y no repetidos.
  select count(*) into v_abiertos
  from market_listings
  where league_id = p_league_id and disponible = true;

  if v_abiertos >= v_tam then
    return;
  end if;

  insert into market_listings (player_id, valor_actual, disponible, league_id)
  select p.id, p.valor_mercado, true, p_league_id
  from players p
  where p.activo = true
    and public.jugador_inscrito(p.id)
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
    and not exists (
      select 1 from market_listings ml
      where ml.player_id = p.id
        and ml.league_id = p_league_id
        and ml.disponible = true
    )
  order by random()
  limit v_tam - v_abiertos
  on conflict (league_id, player_id) where disponible do nothing;
end;
$$;

revoke all on function public.rellenar_mercado(uuid) from public, anon, authenticated;

-- 4) Abrir tanda = normalizar (idempotente) -------------------------------------
create or replace function public.abrir_tanda_mercado(p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.rellenar_mercado(p_league_id);
end;
$$;

-- 5) Normalizar ahora mismo las ligas privadas ----------------------------------
do $$
declare
  v_liga record;
begin
  for v_liga in select id from leagues where tipo = 'privada' loop
    perform public.rellenar_mercado(v_liga.id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- COMPROBACIÓN (a mano, en el SQL Editor): mira que no haya dos crons del mercado.
-- Solo debe haber UNO que llame a procesar_mercado_si_toca():
--
--   select jobid, jobname, schedule, command from cron.job;
--
-- Si sigue 'mercado-cada-8h' además de 'mercado-horas-madrid', quita el viejo:
--
--   select cron.unschedule('mercado-cada-8h');
-- ---------------------------------------------------------------------------