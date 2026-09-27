-- Tres arreglos relacionados con "qué encuentra un manager nada más
-- crear o unirse a una liga":
--
--   1. asignar_plantilla_inicial() (0007) se quedó huérfana: creaba tu
--      plantilla de 6 jugadores al azar, pero se llamaba desde
--      handle_new_user(), y 0025 reescribió handle_new_user() para
--      dejar de crear el equipo ahí (el equipo se crea ahora en
--      crear_liga/unirse_liga). Desde entonces nadie la llama, así que
--      todo el mundo empieza con la plantilla vacía. Además seguía sin
--      tener en cuenta league_id (0016), así que tal cual estaba,
--      llamarla ahora fallaría (squad_slots.league_id es NOT NULL) y,
--      peor, consideraría "libre" solo lo que no esté fichado en NINGUNA
--      liga, cuando debe mirarse liga por liga.
--
--   2. El mercado (market_listings) solo se rellena en
--      procesar_mercado_diario(), que solo se ejecuta una vez al día vía
--      pg_cron. Una liga recién creada se queda sin ninguna tanda hasta
--      ese primer proceso. Se saca la parte de "abrir 9 nuevos" a una
--      función aparte (abrir_tanda_mercado) para poder llamarla también
--      al crear la liga.
--
--   3. Presupuesto inicial: baja de 250 a 100 (decisión de balanceo).

-- 1) asignar_plantilla_inicial: ahora por liga.
drop function if exists public.asignar_plantilla_inicial(uuid);

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
  insert into squad_slots (fantasy_team_id, player_id, league_id)
  select p_equipo_id, p.id, p_league_id
  from players p
  where p.categoria = '3'
    and p.activo
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
  order by random()
  limit v_max_tercera_inicial;

  get diagnostics v_tercera_asignados = row_count;

  insert into squad_slots (fantasy_team_id, player_id, league_id)
  select p_equipo_id, p.id, p_league_id
  from players p
  where p.categoria in ('1', '2')
    and p.activo
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
  order by random()
  limit greatest(v_tamano_inicial - v_tercera_asignados, 0);
end;
$$;

-- 2) abrir_tanda_mercado: la mitad de procesar_mercado_diario (0017,
--    paso 5c) que abre 9 listings libres para UNA liga, separada para
--    poder llamarla también nada más crear la liga.
create or replace function public.abrir_tanda_mercado(p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into market_listings (player_id, valor_actual, disponible, league_id)
  select p.id, p.valor_mercado, true, p_league_id
  from players p
  where p.activo = true
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
  order by random()
  limit 9;
end;
$$;

-- procesar_mercado_diario pasa a llamar a abrir_tanda_mercado en vez de
-- repetir el insert (mismo comportamiento, sin duplicar la lógica).
create or replace function public.procesar_mercado_diario()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga record;
  r record;
  v_validacion jsonb;
  v_categoria categoria;
begin
  for v_liga in select id from leagues loop
    for r in
      select distinct on (b.market_listing_id)
        b.market_listing_id, b.fantasy_team_id, b.importe, ml.player_id
      from bids b
      join market_listings ml on ml.id = b.market_listing_id
      where ml.disponible = true and ml.league_id = v_liga.id
      order by b.market_listing_id, b.importe desc, b.created_at asc
    loop
      select categoria into v_categoria from players where id = r.player_id;
      v_validacion := public.validar_composicion_plantilla(r.fantasy_team_id, v_categoria);

      if (v_validacion ->> 'ok')::boolean then
        begin
          insert into squad_slots (fantasy_team_id, player_id, league_id)
          values (r.fantasy_team_id, r.player_id, v_liga.id);
          update fantasy_teams set presupuesto = presupuesto - r.importe where id = r.fantasy_team_id;
          insert into operations_log (fantasy_team_id, tipo, player_id, importe)
          values (r.fantasy_team_id, 'oferta_aceptada', r.player_id, r.importe);
        exception when unique_violation then
          null;
        end;
      end if;
    end loop;

    update market_listings set disponible = false
    where disponible = true and league_id = v_liga.id;

    delete from bids where market_listing_id in (
      select id from market_listings where disponible = false and league_id = v_liga.id
    );

    perform public.abrir_tanda_mercado(v_liga.id);
  end loop;
end;
$$;

grant execute on function public.procesar_mercado_diario() to postgres;

-- 3) crear_liga: además de crear la liga y tu equipo, te da ya la
--    plantilla inicial y abre la primera tanda de mercado de la liga
--    (antes había que esperar al cron de las 12:00 del día siguiente).
create or replace function public.crear_liga(p_nombre_liga text, p_nombre_equipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga_id uuid;
  v_codigo text;
  v_equipo_id uuid;
  v_presupuesto_inicial numeric;
begin
  if trim(p_nombre_liga) = '' or trim(p_nombre_equipo) = '' then
    return jsonb_build_object('ok', false, 'mensaje', 'El nombre de la liga y del equipo no pueden estar vacíos.');
  end if;

  v_codigo := public.generar_codigo_liga();

  insert into leagues (nombre, codigo, creado_por)
  values (trim(p_nombre_liga), v_codigo, auth.uid())
  returning id into v_liga_id;

  select coalesce(valor::text::numeric, 250)
  into v_presupuesto_inicial
  from game_config where clave = 'presupuesto_inicial';

  insert into fantasy_teams (owner_id, league_id, nombre, presupuesto)
  values (auth.uid(), v_liga_id, trim(p_nombre_equipo), coalesce(v_presupuesto_inicial, 250))
  returning id into v_equipo_id;

  perform public.asignar_plantilla_inicial(v_equipo_id, v_liga_id);
  perform public.abrir_tanda_mercado(v_liga_id);

  return jsonb_build_object('ok', true, 'liga_id', v_liga_id, 'codigo', v_codigo);
end;
$$;

grant execute on function public.crear_liga(text, text) to authenticated;

-- unirse_liga: la liga ya tiene mercado abierto (lo creó quien la
-- fundó), así que aquí solo hace falta dar la plantilla inicial al
-- equipo que se une.
create or replace function public.unirse_liga(p_codigo text, p_nombre_equipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga leagues%rowtype;
  v_miembros_actuales integer;
  v_presupuesto_inicial numeric;
  v_equipo_id uuid;
begin
  if trim(p_nombre_equipo) = '' then
    return jsonb_build_object('ok', false, 'mensaje', 'El nombre del equipo no puede estar vacío.');
  end if;

  select * into v_liga from leagues where codigo = upper(trim(p_codigo));
  if v_liga.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No existe ninguna liga con ese código.');
  end if;

  if exists (select 1 from fantasy_teams where owner_id = auth.uid() and league_id = v_liga.id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya estás en esta liga.');
  end if;

  select count(*) into v_miembros_actuales from fantasy_teams where league_id = v_liga.id;
  if v_miembros_actuales >= v_liga.max_miembros then
    return jsonb_build_object('ok', false, 'mensaje', 'Esta liga ya está completa.');
  end if;

  select coalesce(valor::text::numeric, 250)
  into v_presupuesto_inicial
  from game_config where clave = 'presupuesto_inicial';

  insert into fantasy_teams (owner_id, league_id, nombre, presupuesto)
  values (auth.uid(), v_liga.id, trim(p_nombre_equipo), coalesce(v_presupuesto_inicial, 250))
  returning id into v_equipo_id;

  perform public.asignar_plantilla_inicial(v_equipo_id, v_liga.id);

  return jsonb_build_object('ok', true, 'liga_id', v_liga.id, 'nombre_liga', v_liga.nombre);
end;
$$;

grant execute on function public.unirse_liga(text, text) to authenticated;

-- 4) Presupuesto inicial: 250 -> 100 M (balanceo).
update game_config set valor = '100'::jsonb where clave = 'presupuesto_inicial';
