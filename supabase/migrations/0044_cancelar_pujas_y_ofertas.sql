-- 0044: cancelar pujas del mercado y ofertas directas.
--
-- Ni las pujas (bids) ni las ofertas (player_offers) retienen saldo: solo se
-- comprueba el límite al crearlas y el dinero se mueve al resolverse. Por eso
-- cancelarlas es simplemente borrar la fila, sin ninguna repercusión en el
-- saldo.
--
-- bids no tiene política de borrado, así que se hace por función
-- (security definer) que además comprueba que el plazo siga abierto.

-- 1) Cancelar una puja del mercado mientras el listing siga abierto.
create or replace function public.cancelar_puja_mercado(p_listing_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_disponible boolean;
  v_listing_league_id uuid;
  v_borradas integer;
begin
  select id into v_equipo_id
  from fantasy_teams
  where owner_id = auth.uid() and league_id = p_league_id
  for update;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  select ml.disponible, ml.league_id
  into v_disponible, v_listing_league_id
  from market_listings ml
  where ml.id = p_listing_id
  for update;

  if v_disponible is null or v_listing_league_id <> p_league_id then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no está en el mercado de esta liga.');
  end if;
  if not v_disponible then
    return jsonb_build_object('ok', false, 'mensaje', 'La puja por ese jugador ya ha cerrado: no se puede cancelar.');
  end if;

  delete from bids
  where market_listing_id = p_listing_id and fantasy_team_id = v_equipo_id;
  get diagnostics v_borradas = row_count;

  if v_borradas = 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'No tenías ninguna puja por ese jugador.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cancelar_puja_mercado(uuid, uuid) from public, anon;
grant execute on function public.cancelar_puja_mercado(uuid, uuid) to authenticated;

-- 2) Cancelar una oferta directa mientras siga pendiente (no aceptada ni
--    rechazada). No genera aviso para el otro manager.
create or replace function public.cancelar_oferta(p_offer_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_oferta player_offers%rowtype;
begin
  -- Se bloquea la fila para que no se acepte a la vez que se cancela.
  select * into v_oferta from player_offers where id = p_offer_id for update;

  if v_oferta.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa oferta no existe.');
  end if;

  if v_oferta.equipo_oferente_id not in (
    select id from fantasy_teams where owner_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'No puedes cancelar una oferta que no es tuya.');
  end if;

  if v_oferta.estado <> 'pendiente' then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa oferta ya no está pendiente: no se puede cancelar.');
  end if;

  delete from player_offers where id = p_offer_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cancelar_oferta(uuid) from public, anon;
grant execute on function public.cancelar_oferta(uuid) to authenticated;
