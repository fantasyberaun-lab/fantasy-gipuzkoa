-- 0083: vender un jugador pasa a hacerse en el servidor también en las ligas privadas.
--
-- Hallazgo de la auditoría de seguridad (17-10-2026): en las ligas privadas la
-- venta la hacía el navegador (venderJugadorDB): daba de baja el jugador, leía el
-- saldo y se lo reescribía sumando un valor que el propio navegador mandaba.
-- Cualquier manager podía, con la consola, venderse un jugador por el importe
-- que quisiera. En la liga pública ya se hacía bien con esta misma función
-- (0036), pero con un candado que la limitaba a esa liga.
--
-- Qué cambia: se quita ese candado. Misma función, mismo cuerpo: el valor sale
-- de players.valor_mercado en el servidor, la baja y el saldo van en una sola
-- transacción y se comprueba que el jugador es del equipo de quien llama.
--
-- Es el paso previo a la 0084 (cerrar las escrituras directas). Esta migración
-- es aditiva: la web actual no la usa en ligas privadas, así que se puede lanzar
-- antes de desplegar la web nueva sin que cambie nada.
--
-- Impacto en datos: ninguno.

create or replace function public.vender_jugador(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_slot_id uuid;
  v_valor numeric;
begin
  select id into v_equipo_id
  from fantasy_teams
  where owner_id = auth.uid() and league_id = p_league_id
  for update;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  select id into v_slot_id
  from squad_slots
  where fantasy_team_id = v_equipo_id and player_id = p_player_id and fecha_salida is null
  for update;

  if v_slot_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no está en tu plantilla.');
  end if;

  select valor_mercado into v_valor from players where id = p_player_id;

  update squad_slots set fecha_salida = now() where id = v_slot_id;
  update fantasy_teams set presupuesto = presupuesto + v_valor where id = v_equipo_id;

  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_equipo_id, 'venta', p_player_id, v_valor);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.vender_jugador(uuid, uuid) from public, anon;
grant execute on function public.vender_jugador(uuid, uuid) to authenticated;
