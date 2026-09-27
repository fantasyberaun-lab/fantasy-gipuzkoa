-- Candado de fichaje reciente: un jugador fichado por clausulazo o por
-- compra en el mercado (puja resuelta) queda "bloqueado" y no se le
-- puede volver a hacer un clausulazo hasta que empiece la siguiente
-- jornada. Se guarda en squad_slots (no en players) porque es un efecto
-- ligado a ESTA titularidad del jugador en ESTA liga, igual que
-- clausula_extra (0024): si se vende o se lo quitan, el nuevo squad_slot
-- empieza sin candado.

alter table squad_slots add column if not exists candado boolean not null default false;

-- 1) pagar_clausula: si el jugador tiene candado, se rechaza el
--    clausulazo; y el jugador que se ficha así queda con candado puesto
--    para el comprador.
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

  if v_vendedor_slot.candado then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Este jugador tiene un candado: se acaba de fichar y no se le puede hacer un clausulazo hasta la próxima jornada.'
    );
  end if;

  select categoria, valor_mercado into v_categoria, v_valor from players where id = p_player_id;
  v_clausula := ceil(v_valor * 1.5) + coalesce(v_vendedor_slot.clausula_extra, 0);

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
    insert into squad_slots (fantasy_team_id, player_id, league_id, candado)
    values (v_comprador_id, p_player_id, p_league_id, true);
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

-- 2) fichar_jugador: el fichaje directo (jugador libre) también deja
--    candado puesto, por si alguna vez vuelve a usarse desde la UI.
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
    insert into squad_slots (fantasy_team_id, player_id, league_id, candado)
    values (v_equipo_id, p_player_id, p_league_id, true);
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

-- 3) procesar_mercado_diario: los fichajes que se cierran al resolver
--    las pujas del mercado también quedan con candado puesto.
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
          insert into squad_slots (fantasy_team_id, player_id, league_id, candado)
          values (r.fantasy_team_id, r.player_id, v_liga.id, true);
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

-- 4) player_status: expone el candado para que "Jugadores" (plantillas
--    de los demás) pueda mostrar el símbolo y desactivar el clausulazo.
drop function if exists public.player_status(uuid);

create function public.player_status(p_league_id uuid)
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
  clausula numeric,
  candado boolean,
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
    ceil(p.valor_mercado * 1.5) + coalesce(owner.clausula_extra, 0) as clausula,
    coalesce(owner.candado, false) as candado,
    coalesce(hist.historial, '[]'::jsonb) as historial_puntos
  from players p
  left join lateral (
    select ss.fantasy_team_id, ss.clausula_extra, ss.candado
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

-- 5) Al crearse una jornada nueva (cualquier torneo), se levantan todos
--    los candados: es el disparador de "hasta que empiece la siguiente
--    jornada". Las jornadas son globales al juego (todas las ligas
--    puntúan con los mismos torneos, ver 0019), así que el candado se
--    levanta para todas las ligas a la vez.
create or replace function public.levantar_candados_nueva_jornada()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update squad_slots set candado = false where candado = true;
  return null;
end;
$$;

drop trigger if exists levantar_candados_trg on public.matchdays;
create trigger levantar_candados_trg
  after insert on public.matchdays
  for each statement
  execute function public.levantar_candados_nueva_jornada();
