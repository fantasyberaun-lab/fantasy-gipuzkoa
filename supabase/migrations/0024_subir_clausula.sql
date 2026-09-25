-- Permite a un manager subir la cláusula de un jugador de SU PROPIA
-- plantilla, pagando una cantidad a cambio de un incremento (x2, ver
-- v_multiplicador) que dificulta que le hagan un clausulazo. El extra
-- se guarda en squad_slots (no en players, que es global) porque es un
-- efecto ligado a ESTA titularidad del jugador en ESTA liga: si lo
-- venden o se lo quitan con una cláusula, el nuevo squad_slot empieza
-- en 0.

alter table squad_slots add column if not exists clausula_extra numeric not null default 0;

-- player_status: añade el total de cláusula (base 1.5x + extra del
-- dueño actual) para que jugadores/clasificación muestren el precio
-- real de clausulazo, no solo el 1.5x base.
-- Postgres no permite cambiar las columnas de salida con CREATE OR
-- REPLACE, así que hay que borrar la función anterior primero.
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
    coalesce(hist.historial, '[]'::jsonb) as historial_puntos
  from players p
  left join lateral (
    select ss.fantasy_team_id, ss.clausula_extra
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

-- pagar_clausula: el comprador ahora paga base (1.5x) + el extra que el
-- dueño actual haya acumulado subiendo la cláusula.
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

-- subir_clausula: pagas un importe de tu presupuesto y la cláusula de
-- ESE jugador (solo en tu plantilla, en esta liga) sube el doble de lo
-- pagado. Genera una notificación privada, solo para ti.
create or replace function public.subir_clausula(p_player_id uuid, p_league_id uuid, p_importe numeric)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_slot squad_slots%rowtype;
  v_saldo numeric;
  v_incremento numeric;
  v_multiplicador numeric := 2;
begin
  if p_importe is null or p_importe <= 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'Introduce un importe válido.');
  end if;

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
    and fecha_salida is null;

  if v_slot.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no está en tu plantilla.');
  end if;

  select presupuesto into v_saldo from fantasy_teams where id = v_equipo_id;
  if v_saldo < p_importe then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('Saldo insuficiente: necesitas %s M y tienes %s M.', p_importe, v_saldo)
    );
  end if;

  v_incremento := p_importe * v_multiplicador;

  update squad_slots set clausula_extra = clausula_extra + v_incremento where id = v_slot.id;
  update fantasy_teams set presupuesto = presupuesto - p_importe where id = v_equipo_id;

  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_equipo_id, 'subida_clausula', p_player_id, p_importe);

  insert into notificaciones (league_id, tipo, actor_team_id, objetivo_team_id, player_id, importe, privada)
  values (p_league_id, 'clausula_subida', v_equipo_id, v_equipo_id, p_player_id, v_incremento, true);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.subir_clausula(uuid, uuid, numeric) to authenticated;

-- Nuevos valores permitidos en las columnas "tipo".
alter table operations_log drop constraint if exists operations_log_tipo_check;
alter table operations_log add constraint operations_log_tipo_check
  check (tipo in ('fichaje', 'venta', 'oferta_aceptada', 'clausulazo', 'subida_clausula'));

alter table notificaciones drop constraint if exists notificaciones_tipo_check;
alter table notificaciones add constraint notificaciones_tipo_check
  check (tipo in ('oferta_recibida', 'fichaje', 'clausulazo', 'clausula_subida'));