-- Paso 3+4 de las ligas privadas:
--   - player_status pasa de vista fija a función con parámetro de liga
--     (el propietario de un jugador depende de en qué liga preguntes).
--   - fichar_jugador, pagar_clausula y pujar_mercado pasan a recibir
--     p_league_id explícito, en vez de asumir "tu único equipo" — así
--     dejan de ser ambiguas el día que alguien esté en más de una liga.
--   - procesar_mercado_diario pasa a resolver e iniciar tanda POR CADA
--     LIGA por separado, no una tanda global de 9 para todo el mundo.

-- 1) player_status: función en vez de vista.
drop view if exists public.player_status;

create or replace function public.player_status(p_league_id uuid)
returns table (
  id uuid,
  nombre text,
  club text,
  categoria categoria,
  elo integer,
  valor_mercado numeric,
  activo boolean,
  puntos_totales integer,
  propietario_team_id uuid,
  propietario_nombre text,
  historial_puntos jsonb
)
language sql
security definer set search_path = public
as $$
  select
    p.id,
    p.nombre,
    p.club,
    p.categoria,
    p.elo,
    p.valor_mercado,
    p.activo,
    coalesce(pt.puntos_totales, 0)::integer as puntos_totales,
    owner.fantasy_team_id as propietario_team_id,
    ft.nombre as propietario_nombre,
    coalesce(hist.historial, '[]'::jsonb) as historial_puntos
  from players p
  left join lateral (
    select ss.fantasy_team_id
    from squad_slots ss
    where ss.player_id = p.id
      and ss.league_id = p_league_id
      and ss.fecha_salida is null
    limit 1
  ) owner on true
  left join fantasy_teams ft on ft.id = owner.fantasy_team_id
  left join (
    select player_id, sum(puntos_fantasy) as puntos_totales
    from results
    group by player_id
  ) pt on pt.player_id = p.id
  left join lateral (
    select jsonb_agg(
             jsonb_build_object('jornada', m.numero, 'puntos', r.puntos_fantasy)
             order by m.numero
           ) as historial
    from results r
    join matchdays m on m.id = r.matchday_id
    where r.player_id = p.id
  ) hist on true;
$$;

grant execute on function public.player_status(uuid) to authenticated;

-- 2) fichar_jugador: ahora recibe la liga explícita, y busca TU equipo
--    en ESA liga concreta (antes: "el único que tengas", ambiguo con
--    varias ligas).
create or replace function public.fichar_jugador(p_player_id uuid, p_league_id uuid)
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
  select id into v_equipo_id
  from fantasy_teams
  where owner_id = auth.uid() and league_id = p_league_id;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  select categoria, valor_mercado into v_categoria, v_precio from players where id = p_player_id;
  if v_categoria is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no existe.');
  end if;

  select exists(
    select 1 from squad_slots
    where player_id = p_player_id and league_id = p_league_id and fecha_salida is null
  ) into v_ya_fichado;

  if v_ya_fichado then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador ya no está libre en esta liga — alguien se te ha adelantado.');
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
    insert into squad_slots (fantasy_team_id, player_id, league_id)
    values (v_equipo_id, p_player_id, p_league_id);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador ya no está libre en esta liga — alguien se te ha adelantado.');
  end;

  update fantasy_teams set presupuesto = presupuesto - v_precio where id = v_equipo_id;

  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_equipo_id, 'fichaje', p_player_id, v_precio);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.fichar_jugador(uuid, uuid) to authenticated;

-- 3) pagar_clausula: mismo cambio — recibe la liga, y busca tanto tu
--    equipo como el del vendedor DENTRO de esa liga.
create or replace function public.pagar_clausula(p_player_id uuid, p_league_id uuid)
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
  select id into v_comprador_id
  from fantasy_teams
  where owner_id = auth.uid() and league_id = p_league_id;

  if v_comprador_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  select * into v_vendedor_slot
  from squad_slots
  where player_id = p_player_id and league_id = p_league_id and fecha_salida is null
  limit 1;

  if v_vendedor_slot.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no pertenece a ningún equipo de esta liga ahora mismo.');
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

  update squad_slots set fecha_salida = now() where id = v_vendedor_slot.id;
  update fantasy_teams set presupuesto = presupuesto - v_clausula where id = v_comprador_id;
  update fantasy_teams set presupuesto = presupuesto + v_clausula where id = v_vendedor_slot.fantasy_team_id;

  begin
    insert into squad_slots (fantasy_team_id, player_id, league_id)
    values (v_comprador_id, p_player_id, p_league_id);
  exception when unique_violation then
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

grant execute on function public.pagar_clausula(uuid, uuid) to authenticated;

-- 4) pujar_mercado: recibe la liga y comprueba que el listing es de esa
--    misma liga (para que no se pueda pujar con el equipo de una liga
--    sobre un listing de otra).
create or replace function public.pujar_mercado(p_listing_id uuid, p_importe numeric, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_saldo numeric;
  v_disponible boolean;
  v_valor_minimo numeric;
  v_listing_league_id uuid;
begin
  select id into v_equipo_id
  from fantasy_teams
  where owner_id = auth.uid() and league_id = p_league_id;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  select disponible, valor_actual, league_id
  into v_disponible, v_valor_minimo, v_listing_league_id
  from market_listings where id = p_listing_id;

  if v_disponible is null or v_listing_league_id <> p_league_id then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no está en el mercado de esta liga.');
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

  insert into bids (market_listing_id, fantasy_team_id, importe, league_id)
  values (p_listing_id, v_equipo_id, p_importe, p_league_id)
  on conflict (market_listing_id, fantasy_team_id)
  do update set importe = excluded.importe, created_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.pujar_mercado(uuid, numeric, uuid) to authenticated;

-- 5) procesar_mercado_diario: ahora recorre TODAS las ligas y hace el
--    proceso (resolver pujas + abrir 9 nuevas) de forma independiente
--    para cada una.
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
    -- 5a) Resolver pujas de los listings abiertos de ESTA liga.
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

    -- 5b) Cerrar los listings resueltos de esta liga.
    update market_listings set disponible = false
    where disponible = true and league_id = v_liga.id;

    delete from bids where market_listing_id in (
      select id from market_listings where disponible = false and league_id = v_liga.id
    );

    -- 5c) Abrir tanda nueva de 9 SOLO para esta liga, excluyendo a
    --     quienes ya tienen dueño DENTRO de esta liga (pueden estar
    --     libres aquí y fichados en otra liga distinta, sin problema).
    insert into market_listings (player_id, valor_actual, disponible, league_id)
    select p.id, p.valor_mercado, true, v_liga.id
    from players p
    where p.activo = true
      and not exists (
        select 1 from squad_slots ss
        where ss.player_id = p.id
          and ss.league_id = v_liga.id
          and ss.fecha_salida is null
      )
    order by random()
    limit 9;
  end loop;
end;
$$;

grant execute on function public.procesar_mercado_diario() to postgres;