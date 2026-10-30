-- 0113: el candado de un fichaje y el blindaje duran 1 semana (7 días) desde que se ponen.
--
-- Antes (0027/0033) los candados y blindajes se levantaban todos a la vez cuando se creaba
-- cualquier jornada. Como las jornadas se crean una por torneo, a veces en dos tandas el mismo
-- día, un fichaje recién hecho podía perder el candado a las pocas horas (visto el 25-10-2026:
-- jornadas a las 11:08 y a las 13:38). Ahora cada candado y cada blindaje lleva su propia fecha
-- de caducidad y crear una jornada ya no los toca.
--
-- Qué hace:
--   1) squad_slots.candado_hasta y squad_slots.blindado_hasta: caducidad de cada protección.
--      Un trigger la fija a now() + 7 días cuando candado / blindado pasan a true. Las columnas
--      booleanas se mantienen (otras funciones las escriben), pero una protección solo vale si
--      además su fecha no ha pasado.
--   2) Se quita el trigger que levantaba candados y blindajes al crear una jornada.
--   3) Los clientes (rol authenticated) no pueden tocar candado, candado_hasta ni blindado_hasta
--      directamente: la política de UPDATE de 0003 deja escribir cualquier columna de la
--      propia plantilla y así nadie podría alargarse la protección.
--   4) pagar_clausula_privada y player_status miran la fecha; blindar_jugador solo permite
--      un blindaje por equipo cada 7 días (antes: uno por jornada, 0034).
--   5) Datos existentes: los candados activos caducan 7 días después de su fecha de
--      incorporación; los blindajes activos, 7 días después de su registro en operations_log.
--      Los candados y blindajes que ya se habían levantado no se recuperan.
--
-- Mantener sincronizado con los textos de la app (lib/i18n/textos/jugadores.ts, ficha.ts,
-- reglas.ts y components/InfoReglasButton.tsx) y con fetchMiPlantilla (lib/supabase/queries.ts).

-- 1) Columnas y duración ------------------------------------------------------------------------
alter table public.squad_slots add column if not exists candado_hasta timestamptz;
alter table public.squad_slots add column if not exists blindado_hasta timestamptz;

create or replace function public.dias_candado_blindaje()
returns integer
language sql
immutable
as $$
  select 7;
$$;

-- 2) Caducidad y protección frente a escrituras directas -----------------------------------------
create or replace function public.fijar_caducidad_protecciones()
returns trigger
language plpgsql
as $$
declare
  v_era_candado boolean := false;
  v_era_blindado boolean := false;
begin
  if tg_op = 'UPDATE' then
    v_era_candado := old.candado;
    v_era_blindado := old.blindado;

    if current_user in ('authenticated', 'anon')
       and (new.candado is distinct from old.candado
         or new.candado_hasta is distinct from old.candado_hasta
         or new.blindado_hasta is distinct from old.blindado_hasta) then
      raise exception 'El candado y el blindaje no se pueden modificar a mano.';
    end if;
  end if;

  if new.candado and not v_era_candado then
    new.candado_hasta := now() + make_interval(days => public.dias_candado_blindaje());
  elsif not new.candado then
    new.candado_hasta := null;
  end if;

  if new.blindado and not v_era_blindado then
    new.blindado_hasta := now() + make_interval(days => public.dias_candado_blindaje());
  elsif not new.blindado then
    new.blindado_hasta := null;
  end if;

  return new;
end;
$$;

drop trigger if exists fijar_caducidad_protecciones_trg on public.squad_slots;
create trigger fijar_caducidad_protecciones_trg
  before insert or update of candado, blindado, candado_hasta, blindado_hasta on public.squad_slots
  for each row execute function public.fijar_caducidad_protecciones();

-- 3) Crear una jornada ya no levanta candados ni blindajes ---------------------------------------
drop trigger if exists levantar_candados_trg on public.matchdays;

-- 4) Datos existentes ----------------------------------------------------------------------------
update public.squad_slots
set candado_hasta = fecha_incorporacion + make_interval(days => public.dias_candado_blindaje())
where candado and candado_hasta is null;

update public.squad_slots ss
set blindado_hasta = coalesce(
      (select max(o.created_at)
       from public.operations_log o
       where o.fantasy_team_id = ss.fantasy_team_id
         and o.player_id = ss.player_id
         and o.tipo = 'blindaje'),
      now()
    ) + make_interval(days => public.dias_candado_blindaje())
where blindado and blindado_hasta is null;

-- 5) Blindar: un blindaje por equipo cada 7 días (cuerpo de 0034) --------------------------------
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

  if v_slot.blindado and coalesce(v_slot.blindado_hasta, 'infinity'::timestamptz) > now() then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador ya está blindado.');
  end if;

  -- Un solo blindaje por equipo cada 7 días. Se cuenta con operations_log y no con
  -- squad_slots.blindado para que no se pueda saltar la regla vendiendo el jugador blindado.
  if exists (
    select 1
    from operations_log
    where fantasy_team_id = v_equipo_id
      and tipo = 'blindaje'
      and created_at > now() - make_interval(days => public.dias_candado_blindaje())
  ) then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Solo puedes blindar a un jugador cada semana, y ya has usado tu blindaje.'
    );
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

  -- Si el blindaje anterior de este jugador ya había caducado, el booleano sigue en true:
  -- se apaga y se vuelve a encender para que el trigger fije la nueva caducidad.
  update squad_slots set blindado = false where id = v_slot.id and blindado;
  update squad_slots set blindado = true where id = v_slot.id;
  update fantasy_teams set presupuesto = presupuesto - v_precio where id = v_equipo_id;

  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_equipo_id, 'blindaje', p_player_id, v_precio);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.blindar_jugador(uuid, uuid) to authenticated;

-- 6) Clausulazo (cuerpo de 0111; solo cambian las comprobaciones de blindaje y candado) -----------
create or replace function public.pagar_clausula_privada(p_player_id uuid, p_league_id uuid)
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

  if v_vendedor_slot.blindado and coalesce(v_vendedor_slot.blindado_hasta, 'infinity'::timestamptz) > now() then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Este jugador está blindado: no se le puede hacer un clausulazo durante una semana desde que se blindó.'
    );
  end if;

  if v_vendedor_slot.candado and coalesce(v_vendedor_slot.candado_hasta, 'infinity'::timestamptz) > now() then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Este jugador tiene un candado: se acaba de fichar y no se le puede hacer un clausulazo hasta que pase una semana desde el fichaje.'
    );
  end if;

  select categoria, valor_mercado into v_categoria, v_valor from players where id = p_player_id;
  v_clausula := public.calcular_clausula(
    v_vendedor_slot.precio_pago, v_valor, v_vendedor_slot.clausula_extra, p_league_id
  );

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

-- 7) Lista de jugadores (cuerpo de 0111; candado y blindado solo cuentan si no han caducado) -------
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
    public.calcular_clausula(owner.precio_pago, p.valor_mercado, owner.clausula_extra, p_league_id) as clausula,
    coalesce(owner.candado and coalesce(owner.candado_hasta, 'infinity'::timestamptz) > now(), false) as candado,
    coalesce(owner.blindado and coalesce(owner.blindado_hasta, 'infinity'::timestamptz) > now(), false) as blindado,
    coalesce(hist.historial, '[]'::jsonb) as historial_puntos
  from players p
  left join lateral (
    select ss.fantasy_team_id, ss.clausula_extra, ss.precio_pago, ss.candado, ss.candado_hasta, ss.blindado, ss.blindado_hasta
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
