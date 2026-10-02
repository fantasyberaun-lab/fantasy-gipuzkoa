-- 0060: arreglo del bug "jugadores de la plantilla inicial que salen también
--       en el mercado".
--
-- Causa: cuando alguien se une a una liga privada (unirse_liga), le reparten
-- una plantilla inicial al azar entre los jugadores sin dueño. Pero la tanda de
-- mercado de esa liga ya está abierta (market_listings.disponible = true) y
-- asignar_plantilla_inicial (0056) no miraba esa tanda: podía regalar a un
-- jugador que estaba a la venta. Resultado: jugador con dueño Y en el mercado.
--
-- Arreglo:
--   1) rellenar_mercado(liga): completa la tanda abierta hasta 9 jugadores
--      (inscritos, sin dueño y que no estén ya en la tanda).
--   2) asignar_plantilla_inicial: mismo reparto que en 0056, pero
--        - prefiere jugadores que NO estén en la tanda abierta (solo usa uno de
--          la tanda si no quedan otros),
--        - y al terminar quita de la tanda (y sus pujas) a cualquier jugador que
--          ya tenga dueño y rellena la tanda.
--   3) Limpieza de lo que ya está mal ahora mismo en todas las ligas privadas.
--
-- Las pujas no reservan saldo, así que borrar las de un listing retirado no
-- deja dinero bloqueado.

-- 1) Rellenar la tanda abierta ------------------------------------------------
create or replace function public.rellenar_mercado(p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_abiertos integer;
begin
  if public.es_liga_publica(p_league_id) then
    return;
  end if;

  select count(*) into v_abiertos
  from market_listings
  where league_id = p_league_id and disponible = true;

  if v_abiertos >= 9 then
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
  limit 9 - v_abiertos;
end;
$$;

revoke all on function public.rellenar_mercado(uuid) from public, anon, authenticated;

-- 2) Plantilla inicial sin pisar la tanda abierta -----------------------------
create or replace function public.asignar_plantilla_inicial(p_equipo_id uuid, p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_tamano_inicial constant integer := 6;
  v_max_tercera_inicial constant integer := 3;
  v_tercera_asignados integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_league_id::text, 0));

  insert into squad_slots (fantasy_team_id, player_id, league_id)
  select p_equipo_id, p.id, p_league_id
  from players p
  where p.categoria = '3'
    and p.activo
    and public.jugador_inscrito(p.id)
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
  order by
    exists (
      select 1 from market_listings ml
      where ml.player_id = p.id and ml.league_id = p_league_id and ml.disponible = true
    ),
    random()
  limit v_max_tercera_inicial;

  get diagnostics v_tercera_asignados = row_count;

  insert into squad_slots (fantasy_team_id, player_id, league_id)
  select p_equipo_id, p.id, p_league_id
  from players p
  where p.categoria in ('1', '2')
    and p.activo
    and public.jugador_inscrito(p.id)
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
  order by
    exists (
      select 1 from market_listings ml
      where ml.player_id = p.id and ml.league_id = p_league_id and ml.disponible = true
    ),
    random()
  limit greatest(v_tamano_inicial - v_tercera_asignados, 0);

  -- Red de seguridad: si algún jugador repartido estaba en la tanda abierta,
  -- sale de ella (con sus pujas) y la tanda se rellena.
  delete from bids
  where market_listing_id in (
    select ml.id
    from market_listings ml
    where ml.league_id = p_league_id
      and ml.disponible = true
      and exists (
        select 1 from squad_slots ss
        where ss.player_id = ml.player_id
          and ss.league_id = p_league_id
          and ss.fecha_salida is null
      )
  );

  delete from market_listings ml
  where ml.league_id = p_league_id
    and ml.disponible = true
    and exists (
      select 1 from squad_slots ss
      where ss.player_id = ml.player_id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    );

  perform public.rellenar_mercado(p_league_id);
end;
$$;

-- 3) Limpieza de lo que ya está mal ahora mismo ----------------------------------
delete from bids
where market_listing_id in (
  select ml.id
  from market_listings ml
  where ml.disponible = true
    and exists (
      select 1 from squad_slots ss
      where ss.player_id = ml.player_id
        and ss.league_id = ml.league_id
        and ss.fecha_salida is null
    )
);

delete from market_listings ml
where ml.disponible = true
  and exists (
    select 1 from squad_slots ss
    where ss.player_id = ml.player_id
      and ss.league_id = ml.league_id
      and ss.fecha_salida is null
  );

do $$
declare
  v_liga record;
begin
  for v_liga in select id from leagues where tipo = 'privada' loop
    perform public.rellenar_mercado(v_liga.id);
  end loop;
end $$;
