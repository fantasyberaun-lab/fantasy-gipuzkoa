-- Dos funcionalidades nuevas:
--
--   1) CAPITÁN: cada equipo puede marcar UN titular como capitán. Ese
--      jugador puntúa doble en la jornada. Como los titulares, el capitán
--      es un interruptor que cambia con el tiempo (squad_slots.capitan) y
--      se "fotografía" en el momento de crear la jornada
--      (matchday_lineups.es_capitan, ver 0018), así que cambiar de
--      capitán después no altera jornadas ya creadas.
--
--   2) BLINDAJE: un manager paga el 10 % del valor de mercado de uno de
--      sus jugadores para que no se le pueda hacer un clausulazo. Dura
--      hasta que se crea la siguiente jornada (mismo momento en que se
--      levantan los candados, ver 0027). Se compra SOLO mediante
--      blindar_jugador(): un trigger impide que el cliente lo active
--      escribiendo directamente en squad_slots (la política de UPDATE de
--      0003 permite tocar cualquier columna de tu propia plantilla).
--
-- Mantener sincronizado con lib/gameConfig.ts:
--   capitan.multiplicador  <->  multiplicador_capitan()
--   blindaje.porcentaje    <->  porcentaje_blindaje()

-- 1) Columnas ---------------------------------------------------------------
alter table squad_slots add column if not exists capitan boolean not null default false;
alter table squad_slots add column if not exists blindado boolean not null default false;
alter table matchday_lineups add column if not exists es_capitan boolean not null default false;

-- Red de seguridad: como mucho un capitán activo por equipo.
create unique index if not exists squad_slots_un_capitan_por_equipo
  on squad_slots (fantasy_team_id)
  where capitan and fecha_salida is null;

-- 2) Constantes del juego -----------------------------------------------------
create or replace function public.multiplicador_capitan()
returns integer
language sql
immutable
as $$
  select 2;
$$;

create or replace function public.porcentaje_blindaje()
returns numeric
language sql
immutable
as $$
  select 0.10;
$$;

-- 3) Capitán: reglas a nivel de datos ---------------------------------------
--   - El capitán tiene que ser titular.
--   - Si un titular capitán pasa a suplente (o sale de la plantilla),
--     pierde la capitanía automáticamente.
--   - Al nombrar un capitán nuevo, el anterior deja de serlo.
create or replace function public.validar_capitan()
returns trigger
language plpgsql
as $$
declare
  v_era_capitan boolean := false;
begin
  -- OLD solo existe en los UPDATE: se lee aquí, sin tocarlo en los INSERT.
  if tg_op = 'UPDATE' then
    v_era_capitan := old.capitan;
  end if;

  if new.fecha_salida is not null then
    new.capitan := false;
    return new;
  end if;

  if new.capitan and new.titular is distinct from true then
    if v_era_capitan then
      -- Solo se ha tocado "titular": el capitán pasa a suplente.
      new.capitan := false;
    else
      raise exception 'El capitán tiene que ser titular.';
    end if;
  end if;

  if new.capitan and not v_era_capitan then
    update squad_slots
    set capitan = false
    where fantasy_team_id = new.fantasy_team_id
      and capitan
      and fecha_salida is null
      and id <> new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists validar_capitan_trg on public.squad_slots;
create trigger validar_capitan_trg
  before insert or update of capitan, titular, fecha_salida on public.squad_slots
  for each row execute function public.validar_capitan();

-- 4) Blindado: el cliente no puede activarlo a mano ---------------------------
-- Las funciones security definer se ejecutan como su propietario, y las
-- peticiones directas de la API como "authenticated"/"anon".
create or replace function public.proteger_blindado()
returns trigger
language plpgsql
as $$
declare
  v_era_blindado boolean := false;
begin
  if tg_op = 'UPDATE' then
    v_era_blindado := old.blindado;
  end if;

  if current_user in ('authenticated', 'anon')
     and new.blindado is distinct from v_era_blindado then
    raise exception 'El blindaje solo se puede comprar desde la opción Blindar.';
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_blindado_trg on public.squad_slots;
create trigger proteger_blindado_trg
  before insert or update of blindado on public.squad_slots
  for each row execute function public.proteger_blindado();

-- 5) Foto de la jornada: guarda también quién era el capitán ------------------
create or replace function public.snapshot_alineaciones()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into matchday_lineups (matchday_id, fantasy_team_id, player_id, es_capitan)
  select new.id, ss.fantasy_team_id, ss.player_id, ss.capitan
  from squad_slots ss
  where ss.fecha_salida is null and ss.titular = true;

  return new;
end;
$$;

-- 6) Puntos de equipo por jornada: el capitán puntúa doble ---------------------
-- Mismas columnas y orden que en 0023. La regla del capitán multiplica
-- TODO lo que da el jugador esa jornada (partida o descanso).
create or replace view public.team_matchday_points as
select
  ml.fantasy_team_id,
  ml.matchday_id,
  m.numero as jornada,
  coalesce(
    sum(
      (
        coalesce(r.puntos_fantasy, 0)
        + case when b.player_id is not null then public.puntos_descanso() else 0 end
      ) * case when ml.es_capitan then public.multiplicador_capitan() else 1 end
    ),
    0
  )::integer as puntos,
  t.nombre as torneo,
  m.created_at as creada
from matchday_lineups ml
join matchdays m on m.id = ml.matchday_id
left join tournaments t on t.id = m.tournament_id
left join results r
  on r.player_id = ml.player_id and r.matchday_id = ml.matchday_id
left join matchday_byes b
  on b.player_id = ml.player_id and b.matchday_id = ml.matchday_id
group by ml.fantasy_team_id, ml.matchday_id, m.numero, t.nombre, m.created_at;

-- 7) Al crearse una jornada nueva se levantan candados Y blindajes -------------
create or replace function public.levantar_candados_nueva_jornada()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update squad_slots set candado = false where candado = true;
  update squad_slots set blindado = false where blindado = true;
  return null;
end;
$$;

-- 8) Nuevos tipos de operación --------------------------------------------------
alter table operations_log drop constraint if exists operations_log_tipo_check;
alter table operations_log add constraint operations_log_tipo_check
  check (tipo in ('fichaje', 'venta', 'oferta_aceptada', 'clausulazo', 'subida_clausula', 'blindaje'));

-- 9) blindar_jugador: pagas el 10 % del valor y el jugador queda blindado ------
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

-- 10) pagar_clausula: mismo cuerpo que en 0027, rechazando jugadores blindados ---
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

  if v_vendedor_slot.blindado then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Este jugador está blindado: no se le puede hacer un clausulazo durante esta jornada.'
    );
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

-- 11) player_status: mismo cuerpo que en 0027, exponiendo también "blindado" ----
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
  blindado boolean,
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
    coalesce(owner.blindado, false) as blindado,
    coalesce(hist.historial, '[]'::jsonb) as historial_puntos
  from players p
  left join lateral (
    select ss.fantasy_team_id, ss.clausula_extra, ss.candado, ss.blindado
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