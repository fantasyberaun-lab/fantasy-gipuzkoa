-- Mercado con pujas de verdad (sustituye al "Fichar" instantáneo de
-- 0004_mercado.sql para los jugadores libres). Usa las tablas
-- market_listings y bids que ya existían desde 0001_init.sql pero no se
-- estaban usando todavía.
--
-- Funcionamiento: una vez al día a las 12:00 (vía pg_cron), se resuelven
-- las pujas de los listings abiertos (el importe más alto se lleva al
-- jugador) y se abre una tanda nueva de 9 jugadores libres para el resto
-- del día. fichar_jugador (compra instantánea) deja de estar disponible
-- para jugadores del mercado libre a partir de aquí.

-- 1) Falta una unicidad (market_listing_id, fantasy_team_id) para que un
--    equipo solo pueda tener una puja activa por listing (si vuelve a
--    pujar, actualiza el importe en vez de acumular filas).
alter table bids
  add constraint bids_un_equipo_por_listing unique (market_listing_id, fantasy_team_id);

-- 2) Vista pública con el número de pujas por listing (sin importes ni
--    quién puja, para que sigan siendo anónimas de cara al resto de
--    managers, tal como se decidió para la pantalla de Mercado).
create or replace view public.market_bid_counts as
  select market_listing_id, count(*) as numero_pujas
  from bids
  group by market_listing_id;

grant select on public.market_bid_counts to anon, authenticated;

-- 3) Pujar: valida que el listing sigue abierto y que el importe no
--    supera el saldo del equipo, y hace upsert sobre la puja existente.
--    security definer por el mismo motivo que fichar_jugador: hay que
--    poder confiar en la comprobación de "sigue disponible" en el
--    instante de la operación, no en lo que el cliente diga que ve.
create or replace function public.pujar_mercado(p_listing_id uuid, p_importe numeric)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_saldo numeric;
  v_disponible boolean;
begin
  select id into v_equipo_id from fantasy_teams where owner_id = auth.uid();
  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes un equipo Fantasy.');
  end if;

  select disponible into v_disponible from market_listings where id = p_listing_id;
  if v_disponible is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador ya no está en el mercado.');
  end if;
  if not v_disponible then
    return jsonb_build_object('ok', false, 'mensaje', 'La puja por ese jugador ya ha cerrado.');
  end if;

  select presupuesto into v_saldo from fantasy_teams where id = v_equipo_id;
  if p_importe <= 0 or p_importe > v_saldo then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('Importe inválido o superior a tu saldo (%s M).', v_saldo)
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

-- 4) Resuelve la tanda actual y abre la siguiente. Pensada para
--    llamarse una vez al día a las 12:00 vía pg_cron (instrucción de
--    programación más abajo).
create or replace function public.procesar_mercado_diario()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  v_validacion jsonb;
  v_categoria categoria;
begin
  -- 4a) Resolver pujas de los listings abiertos: importe más alto gana
  --     (empate → quien pujó antes). Se reutiliza validar_composicion_
  --     plantilla (de 0004) para no saltarse el límite de 6/2 de
  --     Tercera si el ganador ya está al tope.
  for r in
    select distinct on (b.market_listing_id)
      b.market_listing_id, b.fantasy_team_id, b.importe, ml.player_id
    from bids b
    join market_listings ml on ml.id = b.market_listing_id
    where ml.disponible = true
    order by b.market_listing_id, b.importe desc, b.created_at asc
  loop
    select categoria into v_categoria from players where id = r.player_id;
    v_validacion := public.validar_composicion_plantilla(r.fantasy_team_id, v_categoria);

    if (v_validacion ->> 'ok')::boolean then
      begin
        insert into squad_slots (fantasy_team_id, player_id) values (r.fantasy_team_id, r.player_id);
        update fantasy_teams set presupuesto = presupuesto - r.importe where id = r.fantasy_team_id;
        insert into operations_log (fantasy_team_id, tipo, player_id, importe)
        values (r.fantasy_team_id, 'oferta_aceptada', r.player_id, r.importe);
      exception when unique_violation then
        -- El jugador dejó de estar libre entre medias (p. ej. un
        -- clausulazo sobre él mientras la puja estaba abierta). Se
        -- queda sin dueño por esta vía, sin tocar el saldo del equipo.
        null;
      end;
    end if;
    -- Si no pasa la validación (plantilla completa, límite de Tercera),
    -- el jugador simplemente no se asigna — no hay manera automática de
    -- "pasar al segundo mejor postor" sin complicar bastante esto; se
    -- podría añadir más adelante si hace falta.
  end loop;

  -- 4b) Cerrar todos los listings de la tanda que acaba de resolverse.
  update market_listings set disponible = false where disponible = true;
  delete from bids where market_listing_id in (
    select id from market_listings where disponible = false
  );

  -- 4c) Abrir la tanda nueva: 9 jugadores libres al azar, excluyendo a
  --     los que acaban de entrar en una plantilla en el paso 4a.
  insert into market_listings (player_id, valor_actual, disponible)
  select p.id, p.valor_mercado, true
  from players p
  where p.activo = true
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id and ss.fecha_salida is null
    )
  order by random()
  limit 9;
end;
$$;

grant execute on function public.procesar_mercado_diario() to postgres;