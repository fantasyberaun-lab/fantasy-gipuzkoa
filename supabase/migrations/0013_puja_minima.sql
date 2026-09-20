-- Las pujas del mercado no pueden ser por debajo del valor de mercado
-- del jugador (market_listings.valor_actual). Sustituye pujar_mercado
-- de 0012_pujas_mercado.sql añadiendo esa comprobación.
create or replace function public.pujar_mercado(p_listing_id uuid, p_importe numeric)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_saldo numeric;
  v_disponible boolean;
  v_valor_minimo numeric;
begin
  select id into v_equipo_id from fantasy_teams where owner_id = auth.uid();
  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes un equipo Fantasy.');
  end if;

  select disponible, valor_actual into v_disponible, v_valor_minimo
  from market_listings where id = p_listing_id;

  if v_disponible is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador ya no está en el mercado.');
  end if;
  if not v_disponible then
    return jsonb_build_object('ok', false, 'mensaje', 'La puja por ese jugador ya ha cerrado.');
  end if;

  if p_importe < v_valor_minimo then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('La puja no puede ser inferior al valor de mercado (%s M).', v_valor_minimo)
    );
  end if;

  select presupuesto into v_saldo from fantasy_teams where id = v_equipo_id;
  if p_importe > v_saldo then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('No puedes pujar más de tu saldo disponible (%s M).', v_saldo)
    );
  end if;

  insert into bids (market_listing_id, fantasy_team_id, importe)
  values (p_listing_id, v_equipo_id, p_importe)
  on conflict (market_listing_id, fantasy_team_id)
  do update set importe = excluded.importe, created_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.pujar_mercado(uuid, numeric) to authenticated;