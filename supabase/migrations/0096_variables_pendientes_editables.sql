-- 0096: Las variables que faltaban pasan a ser editables desde el panel.
--
-- Hasta ahora estaban escritas a mano dentro de funciones SQL (y por eso el
-- panel las enseñaba bloqueadas). Ahora esas funciones leen la tabla de
-- variables. Los valores por defecto son EXACTAMENTE los de siempre, y si la
-- variable falta o es ilegible se usa ese mismo valor de siempre, así que con la
-- tabla sin tocar el juego se comporta igual que antes:
--
--   variable                          función                      antes
--   clausula_porcentaje (por liga)    pagar_clausula_privada       1.5
--                                     player_status                1.5
--   clausula_multiplicador_subida     subir_clausula               2
--   blindaje_porcentaje (global)      porcentaje_blindaje()        0.10
--   capitan_multiplicador (global)    multiplicador_capitan()      2
--   plantilla_tamano (por liga)       validar_composicion_plantilla 10
--   puntos_por_diferencia_elo         calcular_puntos_resultado    tabla de 5 tramos
--
-- Cada función es la de producción con UNA sola línea cambiada (el literal). Los
-- cuerpos se compararon con los que hay ahora en producción antes de escribir
-- esta migración.
--
-- Rendimiento: las funciones que se llaman dentro de consultas por fila
-- (multiplicador_capitan, porcentaje_blindaje, player_status) leen la variable
-- UNA vez por consulta (subconsulta no correlacionada), igual que
-- puntos_descanso() en 0094. calcular_puntos_resultado solo se usa al guardar un
-- resultado.
--
-- Detalles que conviene saber:
--   - Capitán y blindaje son globales (sus funciones no reciben liga).
--   - El multiplicador del capitán se aplica al calcular la clasificación, así
--     que cambiarlo cambia también las jornadas ya jugadas. La tabla de puntos
--     por Elo, en cambio, solo afecta a resultados que se guarden a partir de
--     ahora (los puntos de cada resultado quedan guardados).
--   - El tamaño de plantilla solo admite 6 o más: la plantilla inicial de las
--     ligas privadas asigna 6 jugadores.
--   - "Límite de operaciones por periodo" sigue sin editarse: no hay ninguna
--     función que lo aplique.
--   - Los textos de ayuda del juego ("150 %", "x2", "10 %") siguen siendo los
--     de siempre; el frontend los toma ahora de reglas_liga().
--
-- Impacto en datos existentes: ninguno. Requiere 0092 y 0094.

-- 1) Nuevo tipo de variable: tabla de puntos ------------------------------------------
do $$
declare
  c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.config_definiciones'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%entero%'
  loop
    execute format('alter table public.config_definiciones drop constraint %I', c);
  end loop;
end;
$$;

alter table public.config_definiciones
  add constraint config_definiciones_tipo_check
  check (tipo in ('entero', 'decimal', 'booleano', 'tabla_puntos'));

-- 2) Validación (cuerpo de 0092 + la tabla de puntos) -----------------------------------
create or replace function public.config_validar(p_clave text, p_valor jsonb)
returns void
language plpgsql
stable
security definer set search_path = public
as $$
declare
  d public.config_definiciones%rowtype;
  v numeric;
  v_otro numeric;
  i integer;
  t jsonb;
  v_vic numeric;
  v_tab numeric;
begin
  select * into d from public.config_definiciones where clave = p_clave;
  if not found then
    return; -- clave sin definición (p. ej. nivel_curva): no se valida aquí
  end if;

  if d.tipo = 'tabla_puntos' then
    -- Cinco tramos de diferencia de Elo; cada uno [puntos de victoria, puntos de tablas].
    if jsonb_typeof(p_valor) <> 'array' or jsonb_array_length(p_valor) <> 5 then
      raise exception '% debe tener 5 tramos.', d.etiqueta;
    end if;
    for i in 0..4 loop
      t := p_valor -> i;
      if jsonb_typeof(t) <> 'array' or jsonb_array_length(t) <> 2
         or jsonb_typeof(t -> 0) <> 'number' or jsonb_typeof(t -> 1) <> 'number' then
        raise exception 'El tramo % de % debe tener victoria y tablas.', i + 1, d.etiqueta;
      end if;
      v_vic := (t ->> 0)::numeric;
      v_tab := (t ->> 1)::numeric;
      if v_vic <> trunc(v_vic) or v_tab <> trunc(v_tab) then
        raise exception 'Los puntos de % deben ser números enteros.', d.etiqueta;
      end if;
      if v_vic < d.minimo or v_vic > d.maximo or v_tab < d.minimo or v_tab > d.maximo then
        raise exception 'Los puntos de % deben estar entre % y %.', d.etiqueta, d.minimo, d.maximo;
      end if;
      if v_tab > v_vic then
        raise exception 'En el tramo % las tablas no pueden dar más puntos que la victoria.', i + 1;
      end if;
    end loop;
    return;
  end if;

  if d.tipo = 'booleano' then
    if jsonb_typeof(p_valor) <> 'boolean' then
      raise exception '% debe ser verdadero o falso.', d.etiqueta;
    end if;
    return;
  end if;

  if jsonb_typeof(p_valor) <> 'number' then
    raise exception '% debe ser un número.', d.etiqueta;
  end if;
  v := (p_valor #>> '{}')::numeric;

  if d.tipo = 'entero' and v <> trunc(v) then
    raise exception '% debe ser un número entero.', d.etiqueta;
  end if;
  if d.minimo is not null and v < d.minimo then
    raise exception '% no puede ser menor que %.', d.etiqueta, d.minimo;
  end if;
  if d.maximo is not null and v > d.maximo then
    raise exception '% no puede ser mayor que %.', d.etiqueta, d.maximo;
  end if;

  -- Coherencias entre variables (se comparan con el valor global actual).
  if p_clave = 'cofre_min' then
    select (valor #>> '{}')::numeric into v_otro from public.game_config where clave = 'cofre_max';
    if v > coalesce(v_otro, 10) then
      raise exception 'El mínimo del cofre no puede superar al máximo (%).', coalesce(v_otro, 10);
    end if;
  elsif p_clave = 'cofre_max' then
    select (valor #>> '{}')::numeric into v_otro from public.game_config where clave = 'cofre_min';
    if v < coalesce(v_otro, 5) then
      raise exception 'El máximo del cofre no puede ser menor que el mínimo (%).', coalesce(v_otro, 5);
    end if;
  end if;
end;
$$;

-- 3) Funciones del juego leyendo la tabla -------------------------------------------------
-- Cláusulazo en ligas privadas (cuerpo de 0033/producción; solo cambia el 1.5).
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
  v_clausula := ceil(v_valor * public.config_num('clausula_porcentaje', p_league_id, 1.5)) + coalesce(v_vendedor_slot.clausula_extra, 0);

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

-- Cláusula que se enseña en la lista de jugadores (cuerpo de 0033/producción).
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
    ceil(p.valor_mercado * (select public.config_num('clausula_porcentaje', p_league_id, 1.5))) + coalesce(owner.clausula_extra, 0) as clausula,
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

-- Subir cláusula (cuerpo de 0024/producción; solo cambia el multiplicador).
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
  v_multiplicador numeric := public.config_num('clausula_multiplicador_subida', p_league_id, 2);
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

-- Tamaño de plantilla (cuerpo de 0029/producción; solo cambia el 10).
create or replace function public.validar_composicion_plantilla(
  p_equipo_id uuid,
  p_categoria_nueva categoria
)
returns jsonb
language plpgsql
as $$
declare
  v_total integer;
  v_max_plantilla integer := public.config_num(
    'plantilla_tamano',
    (select ft.league_id from fantasy_teams ft where ft.id = p_equipo_id),
    10
  )::integer;
begin
  select count(*)
  into v_total
  from squad_slots
  where squad_slots.fantasy_team_id = p_equipo_id
    and squad_slots.fecha_salida is null;

  if v_total >= v_max_plantilla then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('Tu plantilla ya tiene los %s jugadores permitidos.', v_max_plantilla)
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Capitán y blindaje: SQL puro sin security definer para que Postgres los
-- sustituya dentro de las consultas y los evalúe una vez (como puntos_descanso()).
create or replace function public.multiplicador_capitan()
returns integer
language sql
stable
as $$
  select coalesce(
    (select case when jsonb_typeof(valor) = 'number' then round((valor #>> '{}')::numeric)::integer end
       from public.game_config where clave = 'capitan_multiplicador'),
    2);
$$;

create or replace function public.porcentaje_blindaje()
returns numeric
language sql
stable
as $$
  select coalesce(
    (select case when jsonb_typeof(valor) = 'number' then (valor #>> '{}')::numeric end
       from public.game_config where clave = 'blindaje_porcentaje'),
    0.10);
$$;

-- Puntos por resultado (misma tabla de tramos de 0014; ahora configurable).
-- Tramos: <=29, <=99, <=199, <=299 y más. Cada uno es [victoria, tablas].
create or replace function public.calcular_puntos_resultado(
  p_resultado resultado_partida,
  p_diferencia_elo integer
)
returns integer
language plpgsql
stable
as $$
declare
  v_defecto constant jsonb := '[[3,1],[4,2],[5,3],[7,4],[9,5]]';
  v_tabla jsonb;
  v_tramo integer;
  v_victoria integer;
  v_tablas integer;
begin
  if p_diferencia_elo <= 29 then
    v_tramo := 0;
  elsif p_diferencia_elo <= 99 then
    v_tramo := 1;
  elsif p_diferencia_elo <= 199 then
    v_tramo := 2;
  elsif p_diferencia_elo <= 299 then
    v_tramo := 3;
  else
    v_tramo := 4;
  end if;

  begin
    select valor into v_tabla from public.game_config where clave = 'puntos_por_diferencia_elo';
    if v_tabla is null or jsonb_typeof(v_tabla) <> 'array' or jsonb_array_length(v_tabla) <> 5 then
      v_tabla := v_defecto;
    end if;
    v_victoria := (v_tabla -> v_tramo ->> 0)::integer;
    v_tablas := (v_tabla -> v_tramo ->> 1)::integer;
  exception when others then
    v_victoria := null;
  end;

  if v_victoria is null or v_tablas is null then
    v_victoria := (v_defecto -> v_tramo ->> 0)::integer;
    v_tablas := (v_defecto -> v_tramo ->> 1)::integer;
  end if;

  return case p_resultado
    when 'victoria' then v_victoria
    when 'tablas' then v_tablas
    else 0
  end;
end;
$$;

-- 4) Reglas efectivas para el frontend ----------------------------------------------------
create or replace function public.reglas_liga(p_league_id uuid)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'maxTitulares', public.config_num('plantilla_max_titulares', p_league_id, 6)::integer,
    'maxTitularesPorTorneo', public.config_num('plantilla_max_titulares_torneo', p_league_id, 4)::integer,
    'maxPlantilla', public.config_num('plantilla_tamano', p_league_id, 10)::integer,
    'clausulaPorcentaje', public.config_num('clausula_porcentaje', p_league_id, 1.5),
    'multiplicadorSubida', public.config_num('clausula_multiplicador_subida', p_league_id, 2),
    'blindajePorcentaje', public.config_num('blindaje_porcentaje', null, 0.10),
    'capitanMultiplicador', public.config_num('capitan_multiplicador', null, 2)::integer
  );
$$;

-- 5) Registro: ya son editables -------------------------------------------------------------
update public.config_definiciones
set tipo = 'tabla_puntos', minimo = 0, maximo = 20, unidad = 'puntos',
    permite_liga = false, estado = 'activa', funcion_sql = null,
    descripcion = 'Cinco tramos por diferencia de Elo (hasta 29, 99, 199, 299 y más). Cada uno: puntos de victoria y de tablas. Solo afecta a los resultados que se guarden a partir de ahora.'
where clave = 'puntos_por_diferencia_elo';

update public.config_definiciones
set estado = 'activa', funcion_sql = null,
    descripcion = 'Máximo de jugadores en plantilla. Mínimo 6 (la plantilla inicial de las ligas privadas asigna 6).',
    minimo = 6, maximo = 20
where clave = 'plantilla_tamano';

update public.config_definiciones
set estado = 'activa', funcion_sql = null,
    descripcion = 'Cláusula = valor de mercado por este factor (1,5 = 150 %), redondeada al millón superior. Se aplica a los clausulazos y a la cláusula que ve el manager.'
where clave = 'clausula_porcentaje';

update public.config_definiciones
set estado = 'activa', funcion_sql = null
where clave = 'clausula_multiplicador_subida';

update public.config_definiciones
set estado = 'activa', funcion_sql = null, permite_liga = false,
    descripcion = 'Coste de blindar a un jugador, como parte de su valor de mercado (0,10 = 10 %). Global.'
where clave = 'blindaje_porcentaje';

update public.config_definiciones
set estado = 'activa', funcion_sql = null, permite_liga = false,
    descripcion = 'El capitán puntúa este factor. Global. Se calcula al mostrar la clasificación, así que cambiarlo cambia también las jornadas ya jugadas.'
where clave = 'capitan_multiplicador';
