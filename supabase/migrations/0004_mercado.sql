-- Mercado (v1): fichaje instantáneo de jugadores libres al valor de
-- mercado actual. Los jugadores libres se derivan de player_status
-- (propietario_team_id is null) — no hace falta poblar market_listings
-- a mano para esto; esa tabla queda para cuando se implemente el
-- sistema de pujas de verdad (ver punto 2 más abajo).
--
-- De paso, esta migración corrige dos cosas que afectaban también a
-- pagar_clausula (0003) y que había que resolver antes de dejar entrar
-- una segunda vía para fichar jugadores:
--   1. La plantilla se validaba contra 10 jugadores en vez de los 6 del
--      Reglamento V3.1, y no se comprobaba el máximo de 2 de Tercera.
--   2. squad_slots no impedía que un mismo jugador quedara con dos
--      "propietarios" activos a la vez si dos managers actuaban en el
--      mismo instante (dos clausulazos, o un clausulazo y un fichaje,
--      sobre el mismo jugador). Se cierra con un índice único parcial.

-- 1) Un jugador solo puede tener un slot "activo" (fecha_salida is null)
--    en un momento dado, sea cual sea el equipo. Esto es lo que hace que
--    la segunda operación concurrente falle de forma segura en vez de
--    dejar al jugador fichado por dos equipos.
create unique index if not exists squad_slots_un_propietario_activo
  on squad_slots (player_id)
  where fecha_salida is null;

-- 2) Validación de composición de plantilla (Reglamento V3.1, punto 3),
--    compartida entre pagar_clausula y fichar_jugador para que las dos
--    vías de entrada a la plantilla apliquen exactamente la misma regla.
create or replace function public.validar_composicion_plantilla(
  p_equipo_id uuid,
  p_categoria_nueva categoria
)
returns jsonb
language plpgsql
as $$
declare
  v_total integer;
  v_tercera integer;
begin
  select
    count(*),
    count(*) filter (where players.categoria = '3')
  into v_total, v_tercera
  from squad_slots
  join players on players.id = squad_slots.player_id
  where squad_slots.fantasy_team_id = p_equipo_id
    and squad_slots.fecha_salida is null;

  if v_total >= 6 then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Tu plantilla ya tiene los 6 jugadores permitidos por el reglamento.'
    );
  end if;

  if p_categoria_nueva = '3' and v_tercera >= 2 then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Ya tienes 2 jugadores de Tercera en plantilla — es el máximo permitido.'
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- 3) pagar_clausula: mismo comportamiento que en 0003, pero usando la
--    validación compartida en vez del límite de 10 sin comprobación de
--    categoría, y capturando la carrera de squad_slots_un_propietario_activo.
create or replace function public.pagar_clausula(p_player_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_comprador_id uuid;
  v_vendedor_slot squad_slots%rowtype;
  v_categoria categoria;
  v_valor numeric;
  v_clausula numeric;
  v_saldo_comprador numeric;
  v_validacion jsonb;
begin
  select id into v_comprador_id from fantasy_teams where owner_id = auth.uid();
  if v_comprador_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes un equipo Fantasy.');
  end if;

  select * into v_vendedor_slot
  from squad_slots
  where player_id = p_player_id and fecha_salida is null
  limit 1;

  if v_vendedor_slot.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no pertenece a ningún equipo ahora mismo.');
  end if;

  if v_vendedor_slot.fantasy_team_id = v_comprador_id then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya tienes a este jugador en tu plantilla.');
  end if;

  select categoria, valor_mercado into v_categoria, v_valor from players where id = p_player_id;
  v_clausula := ceil(v_valor * 1.5);

  select presupuesto into v_saldo_comprador from fantasy_teams where id = v_comprador_id;
  if v_saldo_comprador < v_clausula then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('Saldo insuficiente: necesitas %s M y tienes %s M.', v_clausula, v_saldo_comprador)
    );
  end if;

  v_validacion := public.validar_composicion_plantilla(v_comprador_id, v_categoria);
  if not (v_validacion ->> 'ok')::boolean then
    return v_validacion;
  end if;

  -- A partir de aquí ya se ha validado todo; se ejecutan los cambios.
  update squad_slots set fecha_salida = now() where id = v_vendedor_slot.id;
  update fantasy_teams set presupuesto = presupuesto - v_clausula where id = v_comprador_id;
  update fantasy_teams set presupuesto = presupuesto + v_clausula where id = v_vendedor_slot.fantasy_team_id;

  begin
    insert into squad_slots (fantasy_team_id, player_id) values (v_comprador_id, p_player_id);
  exception when unique_violation then
    -- Alguien más ha tocado a este jugador en el mismo instante (otro
    -- clausulazo o un fichaje de mercado). Deshacemos el dinero movido
    -- y la baja del vendedor para no dejar el estado a medias.
    update squad_slots set fecha_salida = null where id = v_vendedor_slot.id;
    update fantasy_teams set presupuesto = presupuesto + v_clausula where id = v_comprador_id;
    update fantasy_teams set presupuesto = presupuesto - v_clausula where id = v_vendedor_slot.fantasy_team_id;
    return jsonb_build_object('ok', false, 'mensaje', 'Alguien se te ha adelantado con este jugador. Inténtalo de nuevo.');
  end;

  insert into clause_releases (player_id, from_team_id, to_team_id, importe)
  values (p_player_id, v_vendedor_slot.fantasy_team_id, v_comprador_id, v_clausula);

  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_comprador_id, 'clausulazo', p_player_id, v_clausula);

  delete from player_offers where player_id = p_player_id and equipo_oferente_id = v_comprador_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- 4) fichar_jugador: alta directa de un jugador libre al valor de
--    mercado actual. No security definer sobre dinero ajeno (a
--    diferencia de pagar_clausula, aquí solo se toca el equipo propio),
--    pero se mantiene security definer para poder comprobar de forma
--    fiable que el jugador sigue libre en el instante de la operación,
--    sin depender de que el cliente juegue limpio.
create or replace function public.fichar_jugador(p_player_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_categoria categoria;
  v_precio numeric;
  v_saldo numeric;
  v_ya_fichado boolean;
  v_validacion jsonb;
begin
  select id into v_equipo_id from fantasy_teams where owner_id = auth.uid();
  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes un equipo Fantasy.');
  end if;

  select categoria, valor_mercado into v_categoria, v_precio from players where id = p_player_id;
  if v_categoria is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no existe.');
  end if;

  select exists(
    select 1 from squad_slots where player_id = p_player_id and fecha_salida is null
  ) into v_ya_fichado;

  if v_ya_fichado then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador ya no está libre — alguien se te ha adelantado.');
  end if;

  select presupuesto into v_saldo from fantasy_teams where id = v_equipo_id;
  if v_saldo < v_precio then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('Saldo insuficiente: necesitas %s M y tienes %s M.', v_precio, v_saldo)
    );
  end if;

  v_validacion := public.validar_composicion_plantilla(v_equipo_id, v_categoria);
  if not (v_validacion ->> 'ok')::boolean then
    return v_validacion;
  end if;

  begin
    insert into squad_slots (fantasy_team_id, player_id) values (v_equipo_id, p_player_id);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador ya no está libre — alguien se te ha adelantado.');
  end;

  update fantasy_teams set presupuesto = presupuesto - v_precio where id = v_equipo_id;

  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_equipo_id, 'fichaje', p_player_id, v_precio);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.fichar_jugador(uuid) to authenticated;

-- 5) bids tenía RLS activado desde 0001 pero ninguna política: hoy es
--    ilegible e inescribible del todo. No se usa todavía (ver nota al
--    principio del archivo), pero se deja lista para cuando se decida
--    el mecanismo de puja, en vez de arrancar esa función desde cero.
create policy "lectura publica bids" on bids for select using (true);

create policy "un equipo puja desde su propio equipo" on bids
  for insert with check (
    fantasy_team_id in (select id from fantasy_teams where owner_id = auth.uid())
  );
