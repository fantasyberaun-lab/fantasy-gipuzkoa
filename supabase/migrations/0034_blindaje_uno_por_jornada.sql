-- Blindaje: como mucho UN jugador blindado por equipo y jornada.
--
-- "Por jornada" = desde que se creó la última jornada (el momento en que se
-- levantan los blindajes, ver 0033). Se cuenta con operations_log y no con
-- squad_slots.blindado para que no se pueda saltar la regla vendiendo el
-- jugador blindado y blindando a otro.
--
-- Mismo cuerpo que blindar_jugador en 0033, con la comprobación nueva.
create or replace function public.blindar_jugador(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_slot squad_slots%rowtype;
  v_valor numeric;
  v_precio numeric;
  v_saldo numeric;
  v_ultima_jornada timestamptz;
begin
  select id into v_equipo_id
  from fantasy_teams
  where owner_id = auth.uid() and league_id = p_league_id;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  select * into v_slot
  from squad_slots
  where player_id = p_player_id
    and league_id = p_league_id
    and fantasy_team_id = v_equipo_id
    and fecha_salida is null
  for update;

  if v_slot.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no está en tu plantilla.');
  end if;

  if v_slot.blindado then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador ya está blindado esta jornada.');
  end if;

  -- Un solo blindaje por equipo y jornada.
  select max(created_at) into v_ultima_jornada from matchdays;

  if exists (
    select 1
    from operations_log
    where fantasy_team_id = v_equipo_id
      and tipo = 'blindaje'
      and (v_ultima_jornada is null or created_at > v_ultima_jornada)
  ) then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Solo puedes blindar a un jugador por jornada, y ya has usado tu blindaje.'
    );
  end if;

  select valor_mercado into v_valor from players where id = p_player_id;
  v_precio := ceil(v_valor * public.porcentaje_blindaje());

  select presupuesto into v_saldo from fantasy_teams where id = v_equipo_id;
  if v_saldo < v_precio then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('Saldo insuficiente: necesitas %s M y tienes %s M.', v_precio, v_saldo)
    );
  end if;

  update squad_slots set blindado = true where id = v_slot.id;
  update fantasy_teams set presupuesto = presupuesto - v_precio where id = v_equipo_id;

  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_equipo_id, 'blindaje', p_player_id, v_precio);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.blindar_jugador(uuid, uuid) to authenticated;