-- 0111: la cláusula se calcula sobre lo que pagó el dueño, y baja a 110 %.
--
-- Hasta ahora la cláusula era valor de mercado actual x clausula_porcentaje (150 %) más lo que
-- el dueño hubiera subido. Ahora es PRECIO PAGADO x clausula_porcentaje (110 %) más lo subido:
--   - Fichaje por puja del mercado u oferta aceptada: lo que se pagó.
--   - Clausulazo: la cláusula que se pagó.
--   - Plantilla inicial (sin pago): el valor de mercado del jugador en ese momento.
-- Así, si un jugador sube de valor, su dueño no pierde protección, y quien lo fichó caro no
-- queda con una cláusula por debajo de lo que le costó.
--
-- Cómo funciona sin reescribir cada función de fichaje:
--   1) squad_slots.precio_pago: nueva columna.
--   2) Trigger BEFORE INSERT en squad_slots: pone el valor de mercado del jugador (cubre la
--      plantilla inicial y cualquier camino que no registre pago).
--   3) Trigger AFTER INSERT en operations_log: cuando se registra un fichaje, oferta_aceptada o
--      clausulazo, apunta el importe como precio_pago del jugador en esa plantilla. Todas las
--      funciones de fichaje ya registran esa fila justo después de crear el squad_slot.
--   4) calcular_clausula(): fórmula única. precio_pago null = se usa el valor de mercado actual.
--   5) pagar_clausula_privada() y player_status() la usan (cuerpos de 0096, solo cambia la cláusula).
--
-- Impacto en datos existentes:
--   - Añade una columna (nullable) a squad_slots.
--   - Rellena precio_pago de las plantillas actuales con el último fichaje, oferta aceptada o
--     clausulazo registrado de ese jugador en ese equipo. Los que no tengan registro (plantilla
--     inicial) quedan en null y siguen usando su valor de mercado actual.
--   - Cambia el valor por defecto de clausula_porcentaje a 1,1. Si en Admin > Variables hay un
--     valor global o de liga guardado a mano (1,5), ese manda: hay que cambiarlo allí.
--   - Las cláusulas que ve cada manager cambian en cuanto se aplica (en general, bajan).
--   - NO toca la misión Mercader (0106): sigue topando con valor x clausula_porcentaje.
--
-- Lanzar con `supabase db push` (hay que revisar antes `supabase migration list`).


-- 1) Precio pagado ------------------------------------------------------------------------------
alter table public.squad_slots add column if not exists precio_pago numeric;

create or replace function public.fijar_precio_pago_inicial()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.precio_pago is null then
    select valor_mercado into new.precio_pago from players where id = new.player_id;
  end if;
  return new;
end;
$$;

drop trigger if exists fijar_precio_pago_inicial_trg on public.squad_slots;
create trigger fijar_precio_pago_inicial_trg
  before insert on public.squad_slots
  for each row execute function public.fijar_precio_pago_inicial();

create or replace function public.registrar_precio_pago()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.tipo in ('fichaje', 'oferta_aceptada', 'clausulazo') and new.importe is not null then
    update squad_slots
    set precio_pago = new.importe
    where fantasy_team_id = new.fantasy_team_id
      and player_id = new.player_id
      and fecha_salida is null;
  end if;
  return new;
end;
$$;

drop trigger if exists registrar_precio_pago_trg on public.operations_log;
create trigger registrar_precio_pago_trg
  after insert on public.operations_log
  for each row execute function public.registrar_precio_pago();

-- Plantillas actuales: lo último que se pagó por cada jugador en ese equipo.
update public.squad_slots s
set precio_pago = ol.importe
from (
  select distinct on (fantasy_team_id, player_id) fantasy_team_id, player_id, importe
  from public.operations_log
  where tipo in ('fichaje', 'oferta_aceptada', 'clausulazo') and importe is not null
  order by fantasy_team_id, player_id, created_at desc
) ol
where s.fecha_salida is null
  and s.fantasy_team_id = ol.fantasy_team_id
  and s.player_id = ol.player_id;


-- 2) Fórmula única ------------------------------------------------------------------------------
create or replace function public.calcular_clausula(
  p_precio numeric, p_valor numeric, p_extra numeric, p_league_id uuid
)
returns numeric
language sql
stable
security definer set search_path = public
as $$
  select ceil(coalesce(p_precio, p_valor) * public.config_num('clausula_porcentaje', p_league_id, 1.1))
         + coalesce(p_extra, 0);
$$;

revoke all on function public.calcular_clausula(numeric, numeric, numeric, uuid) from public, anon;
grant execute on function public.calcular_clausula(numeric, numeric, numeric, uuid) to authenticated;

update public.config_definiciones
set valor_defecto = '1.1'::jsonb,
    descripcion = 'Cláusula = lo que pagó el dueño por el jugador por este factor (1,1 = 110 %), redondeada al millón superior, más lo que haya subido. Si no hay pago registrado (plantilla inicial), se usa su valor de mercado.'
where clave = 'clausula_porcentaje';


-- 3) Clausulazo (cuerpo de 0096; solo cambia el cálculo de la cláusula) -------------------------
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


-- 4) Cláusula que se enseña en la lista de jugadores (cuerpo de 0096; solo cambia la cláusula) ---
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
    coalesce(owner.candado, false) as candado,
    coalesce(owner.blindado, false) as blindado,
    coalesce(hist.historial, '[]'::jsonb) as historial_puntos
  from players p
  left join lateral (
    select ss.fantasy_team_id, ss.clausula_extra, ss.precio_pago, ss.candado, ss.blindado
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
