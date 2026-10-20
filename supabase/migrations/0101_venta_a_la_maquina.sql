-- 0101: En las ligas privadas los jugadores se venden a la máquina.
--
-- Hasta ahora, vender en una liga privada era instantáneo: el jugador salía de la
-- plantilla y cobrabas su valor de mercado (vender_jugador). Ahora:
--
--   1) Pones el jugador a la venta (poner_a_la_venta). Sigue en tu equipo y
--      puntuando; lo puedes quitar de la venta cuando quieras.
--   2) En cada tanda del mercado de tu liga (las horas que elige el administrador,
--      0100), la máquina te hace una oferta: su valor de mercado ± hasta un 10 %.
--      El porcentaje es la media de cinco números al azar, así que casi siempre
--      sale cerca del valor (más de la mitad entre −2 % y +2 %) y los extremos
--      salen muy poco: así no compensa poner a la venta a todo el equipo
--      esperando una oferta alta, porque el jugador sigue puntuando mientras.
--      Te llega una notificación que solo ves tú.
--   3) La aceptas (cobras la oferta y el jugador sale de tu plantilla) o la
--      rechazas. Si la rechazas o no contestas, en la siguiente tanda te hace otra.
--
-- La liga pública NO cambia: allí vender sigue siendo instantáneo.
--
-- Impacto en datos: ninguno. Tabla nueva vacía; vender_jugador() solo deja de
-- aceptar ligas privadas; procesar_mercado_liga() es la de 0100 con una línea más
-- al final (generar las ofertas).
--
-- Aplicar a mano en el SQL Editor (mientras falte en el repo 0098_minijuegos,
-- `supabase db push` no funciona) y registrarla después:
--   insert into supabase_migrations.schema_migrations (version, name)
--   values ('0101', 'venta_a_la_maquina');


-- 1) Jugadores puestos a la venta ---------------------------------------------------
-- Una fila por jugador en venta, ligada a SU paso por tu plantilla (squad_slot):
-- si te lo quitan por clausulazo, esa venta deja de valer.
create table if not exists public.ventas_maquina (
  squad_slot_id uuid primary key references public.squad_slots (id) on delete cascade,
  fantasy_team_id uuid not null references public.fantasy_teams (id) on delete cascade,
  league_id uuid not null references public.leagues (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  puesto_en timestamptz not null default now(),
  -- Última oferta de la máquina (null: aún no ha llegado o la has rechazado).
  oferta numeric check (oferta is null or oferta > 0),
  oferta_en timestamptz
);

create index if not exists ventas_maquina_liga_idx on public.ventas_maquina (league_id);
create index if not exists ventas_maquina_equipo_idx on public.ventas_maquina (fantasy_team_id);

alter table public.ventas_maquina enable row level security;

-- Cada manager ve solo sus ventas. Se escriben únicamente con las funciones de abajo.
drop policy if exists "cada manager ve sus ventas a la maquina" on public.ventas_maquina;
create policy "cada manager ve sus ventas a la maquina" on public.ventas_maquina
  for select using (
    fantasy_team_id in (select id from public.fantasy_teams where owner_id = auth.uid())
  );


-- 2) Notificación nueva: oferta_maquina ------------------------------------------------
-- La lista de 0100 + oferta_maquina (privada: solo la ve el dueño del jugador).
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (
  tipo in (
    'oferta_recibida', 'fichaje', 'clausulazo', 'clausula_subida', 'oferta_rechazada',
    'actualizacion_elo', 'pago_jornada',
    'sancion', 'advertencia', 'expulsion', 'nuevo_admin',
    'oferta_maquina'
  )
);


-- 3) Cuánto ofrece la máquina ----------------------------------------------------------
-- Factor entre 0,90 y 1,10. La media de cinco random() tiene forma de campana
-- (desviación ~2,6 %): ~55 % de las ofertas caen entre 0,98 y 1,02, ~75 % entre
-- 0,97 y 1,03, y más allá de ±5 % sale ~5 de cada 100 (simulado con un millón).
-- Mantener igual que el texto de t.ficha.ponerALaVentaTexto (lib/i18n/textos/ficha.ts).
create or replace function public.factor_oferta_maquina()
returns numeric
language sql
volatile
as $$
  select (1 + 0.10 * ((select avg(random()) from generate_series(1, 5)) * 2 - 1))::numeric;
$$;

revoke all on function public.factor_oferta_maquina() from public, anon, authenticated;
grant execute on function public.factor_oferta_maquina() to service_role;

-- Ofertas de una liga: las llama procesar_mercado_liga() en cada tanda.
create or replace function public.generar_ofertas_maquina(p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- Ventas de jugadores que ya no están en esa plantilla (clausulazo, etc.).
  delete from ventas_maquina v
  using squad_slots s
  where v.league_id = p_league_id
    and s.id = v.squad_slot_id
    and s.fecha_salida is not null;

  -- Una oferta nueva para cada jugador en venta (sustituye a la anterior).
  update ventas_maquina v
  set oferta = greatest(0.01, round(p.valor_mercado * public.factor_oferta_maquina(), 2)),
      oferta_en = now()
  from players p
  where v.league_id = p_league_id
    and p.id = v.player_id;

  insert into notificaciones (league_id, tipo, objetivo_team_id, player_id, importe, privada)
  select v.league_id, 'oferta_maquina', v.fantasy_team_id, v.player_id, v.oferta, true
  from ventas_maquina v
  where v.league_id = p_league_id
    and v.oferta is not null;
end;
$$;

revoke all on function public.generar_ofertas_maquina(uuid) from public, anon, authenticated;
grant execute on function public.generar_ofertas_maquina(uuid) to service_role;

-- procesar_mercado_liga: la de 0100 + las ofertas de la máquina al final.
create or replace function public.procesar_mercado_liga(p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  v_validacion jsonb;
  v_saldo numeric;
  v_asignados uuid[] := '{}';
begin
  -- Las pujas se recorren de mayor a menor importe (empate: la más antigua).
  -- Ya no se filtra por valor actual: una puja hecha antes de que el jugador
  -- subiera de precio sigue valiendo, solo que compite con su importe.
  for r in
    select b.market_listing_id, b.fantasy_team_id, b.importe, ml.player_id
    from bids b
    join market_listings ml on ml.id = b.market_listing_id
    where ml.disponible = true
      and ml.league_id = p_league_id
    order by b.importe desc, b.created_at asc
  loop
    if r.market_listing_id = any (v_asignados) then
      continue;
    end if;

    select presupuesto into v_saldo from fantasy_teams where id = r.fantasy_team_id;
    if v_saldo - r.importe < -public.limite_deuda_equipo(r.fantasy_team_id) then
      continue;
    end if;

    v_validacion := public.validar_composicion_plantilla(
      r.fantasy_team_id,
      (select categoria from players where id = r.player_id)
    );
    if not (v_validacion ->> 'ok')::boolean then
      continue;
    end if;

    begin
      insert into squad_slots (fantasy_team_id, player_id, league_id, candado)
      values (r.fantasy_team_id, r.player_id, p_league_id, true);
      update fantasy_teams set presupuesto = presupuesto - r.importe where id = r.fantasy_team_id;
      insert into operations_log (fantasy_team_id, tipo, player_id, importe)
      values (r.fantasy_team_id, 'oferta_aceptada', r.player_id, r.importe);
      v_asignados := array_append(v_asignados, r.market_listing_id);
    exception when unique_violation then
      null;
    end;
  end loop;

  update market_listings set disponible = false
  where disponible = true and league_id = p_league_id;

  delete from bids where market_listing_id in (
    select id from market_listings where disponible = false and league_id = p_league_id
  );

  perform public.abrir_tanda_mercado(p_league_id);

  -- 0101: la máquina hace sus ofertas por los jugadores puestos a la venta.
  perform public.generar_ofertas_maquina(p_league_id);
end;
$$;


-- 4) Poner y quitar de la venta -----------------------------------------------------------
create or replace function public.poner_a_la_venta(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_slot_id uuid;
begin
  if not exists (select 1 from leagues where id = p_league_id and tipo = 'privada') then
    return jsonb_build_object('ok', false, 'mensaje', 'En la liga pública los jugadores se venden al momento.');
  end if;

  select id into v_equipo_id
  from fantasy_teams
  where owner_id = auth.uid() and league_id = p_league_id;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  select id into v_slot_id
  from squad_slots
  where fantasy_team_id = v_equipo_id and player_id = p_player_id and fecha_salida is null;

  if v_slot_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no está en tu plantilla.');
  end if;

  insert into ventas_maquina (squad_slot_id, fantasy_team_id, league_id, player_id)
  values (v_slot_id, v_equipo_id, p_league_id, p_player_id)
  on conflict (squad_slot_id) do nothing;

  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador ya está a la venta.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.poner_a_la_venta(uuid, uuid) from public, anon;
grant execute on function public.poner_a_la_venta(uuid, uuid) to authenticated;

create or replace function public.quitar_de_la_venta(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  delete from ventas_maquina v
  using fantasy_teams ft
  where ft.id = v.fantasy_team_id
    and ft.owner_id = auth.uid()
    and v.league_id = p_league_id
    and v.player_id = p_player_id;

  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no está a la venta.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.quitar_de_la_venta(uuid, uuid) from public, anon;
grant execute on function public.quitar_de_la_venta(uuid, uuid) to authenticated;


-- 5) Aceptar o rechazar la oferta -----------------------------------------------------------
create or replace function public.aceptar_oferta_maquina(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_venta ventas_maquina%rowtype;
begin
  select id into v_equipo_id
  from fantasy_teams
  where owner_id = auth.uid() and league_id = p_league_id
  for update;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  select * into v_venta
  from ventas_maquina
  where fantasy_team_id = v_equipo_id and player_id = p_player_id
  for update;

  if v_venta.squad_slot_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no está a la venta.');
  end if;
  if v_venta.oferta is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Todavía no tienes oferta de la máquina por este jugador.');
  end if;

  update squad_slots
  set fecha_salida = now()
  where id = v_venta.squad_slot_id and fecha_salida is null;

  if not found then
    delete from ventas_maquina where squad_slot_id = v_venta.squad_slot_id;
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador ya no está en tu plantilla.');
  end if;

  update fantasy_teams set presupuesto = presupuesto + v_venta.oferta where id = v_equipo_id;

  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_equipo_id, 'venta', p_player_id, v_venta.oferta);

  delete from ventas_maquina where squad_slot_id = v_venta.squad_slot_id;

  return jsonb_build_object('ok', true, 'importe', v_venta.oferta);
end;
$$;

revoke all on function public.aceptar_oferta_maquina(uuid, uuid) from public, anon;
grant execute on function public.aceptar_oferta_maquina(uuid, uuid) to authenticated;

-- Rechazar: sigue a la venta y en la próxima tanda llega otra oferta.
create or replace function public.rechazar_oferta_maquina(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  update ventas_maquina v
  set oferta = null, oferta_en = null
  from fantasy_teams ft
  where ft.id = v.fantasy_team_id
    and ft.owner_id = auth.uid()
    and v.league_id = p_league_id
    and v.player_id = p_player_id
    and v.oferta is not null;

  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes oferta de la máquina por ese jugador.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.rechazar_oferta_maquina(uuid, uuid) from public, anon;
grant execute on function public.rechazar_oferta_maquina(uuid, uuid) to authenticated;


-- 6) vender_jugador: solo en la liga pública ----------------------------------------------
-- La de producción, con la comprobación de la liga al principio.
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
  if exists (select 1 from leagues where id = p_league_id and tipo = 'privada') then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'En las ligas privadas los jugadores se ponen a la venta: la máquina te hará una oferta en la próxima actualización del mercado.'
    );
  end if;

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
