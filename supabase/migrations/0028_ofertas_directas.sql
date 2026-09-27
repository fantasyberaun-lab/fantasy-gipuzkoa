-- Ofertas directas (player_offers) aceptables/rechazables por el dueño.
--
-- La tabla player_offers (0003) y su columna `estado` ya existían, pero
-- nadie podía cambiar `estado`: no había política RLS que dejara al
-- dueño del jugador tocar la fila (solo el equipo oferente podía
-- actualizar/borrar sus propias ofertas), y no existía ninguna función
-- que, al aceptar, moviera de verdad al jugador de plantilla.
--
-- Esto es DISTINTO del mercado libre (bids/market_listings), que se
-- resuelve solo cada día con procesar_mercado_diario (0012/0017): aquí
-- es el dueño quien decide, no una subasta automática. Por eso las
-- funciones son security definer (no se abre RLS de escritura en la
-- tabla: todo pasa por aceptar_oferta/rechazar_oferta, igual que
-- pagar_clausula o fichar_jugador).

-- 1) aceptar_oferta: solo el dueño ACTUAL del jugador puede aceptar una
--    oferta pendiente sobre él. Si se acepta, el jugador se mueve al
--    equipo oferente con candado puesto (igual que cualquier otra
--    incorporación), y el resto de ofertas pendientes por ese jugador
--    quedan rechazadas automáticamente.
create or replace function public.aceptar_oferta(p_offer_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_oferta player_offers%rowtype;
  v_liga uuid;
  v_vendedor_slot squad_slots%rowtype;
  v_categoria categoria;
  v_saldo_comprador numeric;
  v_validacion jsonb;
begin
  select * into v_oferta from player_offers where id = p_offer_id;
  if v_oferta.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa oferta no existe.');
  end if;

  if v_oferta.estado <> 'pendiente' then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa oferta ya no está pendiente.');
  end if;

  select league_id into v_liga from fantasy_teams where id = v_oferta.equipo_oferente_id;

  select * into v_vendedor_slot
  from squad_slots
  where player_id = v_oferta.player_id and league_id = v_liga and fecha_salida is null
  limit 1;

  if v_vendedor_slot.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador ya no pertenece a ningún equipo de esta liga.');
  end if;

  if v_vendedor_slot.fantasy_team_id not in (
    select id from fantasy_teams where owner_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'No puedes aceptar ofertas de un jugador que no es tuyo.');
  end if;

  select categoria into v_categoria from players where id = v_oferta.player_id;

  select presupuesto into v_saldo_comprador
  from fantasy_teams where id = v_oferta.equipo_oferente_id;

  if v_saldo_comprador < v_oferta.importe then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'El equipo que ofertó ya no tiene saldo suficiente para cerrar esta oferta.'
    );
  end if;

  v_validacion := public.validar_composicion_plantilla(v_oferta.equipo_oferente_id, v_categoria);
  if not (v_validacion ->> 'ok')::boolean then
    return v_validacion;
  end if;

  update squad_slots set fecha_salida = now() where id = v_vendedor_slot.id;
  update fantasy_teams set presupuesto = presupuesto - v_oferta.importe where id = v_oferta.equipo_oferente_id;
  update fantasy_teams set presupuesto = presupuesto + v_oferta.importe where id = v_vendedor_slot.fantasy_team_id;

  begin
    insert into squad_slots (fantasy_team_id, player_id, league_id, candado)
    values (v_oferta.equipo_oferente_id, v_oferta.player_id, v_liga, true);
  exception when unique_violation then
    update squad_slots set fecha_salida = null where id = v_vendedor_slot.id;
    update fantasy_teams set presupuesto = presupuesto + v_oferta.importe where id = v_oferta.equipo_oferente_id;
    update fantasy_teams set presupuesto = presupuesto - v_oferta.importe where id = v_vendedor_slot.fantasy_team_id;
    return jsonb_build_object('ok', false, 'mensaje', 'El equipo que ofertó ya tiene a este jugador. Inténtalo de nuevo.');
  end;

  update player_offers set estado = 'aceptada' where id = p_offer_id;

  -- El resto de ofertas pendientes por este mismo jugador ya no aplican.
  update player_offers
  set estado = 'rechazada'
  where player_id = v_oferta.player_id
    and estado = 'pendiente'
    and id <> p_offer_id;

  -- 'oferta_aceptada' ya existía como tipo válido en operations_log
  -- (pensado originalmente para las pujas del mercado) y notificar_fichaje
  -- (0022) ya lo trata como un fichaje público normal.
  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_oferta.equipo_oferente_id, 'oferta_aceptada', v_oferta.player_id, v_oferta.importe);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.aceptar_oferta(uuid) to authenticated;

-- 2) rechazar_oferta: solo el dueño actual del jugador puede rechazar.
create or replace function public.rechazar_oferta(p_offer_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_oferta player_offers%rowtype;
  v_liga uuid;
  v_dueno_id uuid;
begin
  select * into v_oferta from player_offers where id = p_offer_id;
  if v_oferta.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa oferta no existe.');
  end if;

  if v_oferta.estado <> 'pendiente' then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa oferta ya no está pendiente.');
  end if;

  select league_id into v_liga from fantasy_teams where id = v_oferta.equipo_oferente_id;

  select fantasy_team_id into v_dueno_id
  from squad_slots
  where player_id = v_oferta.player_id and league_id = v_liga and fecha_salida is null
  limit 1;

  if v_dueno_id is null or v_dueno_id not in (
    select id from fantasy_teams where owner_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'No puedes rechazar ofertas de un jugador que no es tuyo.');
  end if;

  update player_offers set estado = 'rechazada' where id = p_offer_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.rechazar_oferta(uuid) to authenticated;

-- 3) Aviso privado al equipo oferente cuando le rechazan una oferta
--    (a mano con rechazar_oferta, o automáticamente al aceptarse otra
--    oferta sobre el mismo jugador). 'oferta_rechazada' es un tipo
--    nuevo, así que hay que ampliar el check de notificaciones.tipo.
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.notificaciones'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%tipo%';

  if v_conname is not null then
    execute format('alter table public.notificaciones drop constraint %I', v_conname);
  end if;
end $$;

alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in ('oferta_recibida', 'fichaje', 'clausulazo', 'clausula_subida', 'oferta_rechazada'));

create or replace function public.notificar_oferta_rechazada()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga uuid;
begin
  if new.estado <> 'rechazada' or old.estado <> 'pendiente' then
    return new;
  end if;

  select league_id into v_liga from fantasy_teams where id = new.equipo_oferente_id;

  insert into notificaciones (league_id, tipo, objetivo_team_id, player_id, importe, privada)
  values (v_liga, 'oferta_rechazada', new.equipo_oferente_id, new.player_id, new.importe, true);

  return new;
end;
$$;

drop trigger if exists notificar_oferta_rechazada_trg on public.player_offers;
create trigger notificar_oferta_rechazada_trg
  after update of estado on public.player_offers
  for each row execute function public.notificar_oferta_rechazada();
