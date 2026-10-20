-- 0098: Minijuegos (base + "Higher or lower", "Elo exacto" y "Ordena por Elo").
--
-- Qué hace (todo aditivo: nada del juego principal cambia):
--
--   1) Tablas nuevas: mj_partidas (cada partida, con las preguntas Y sus
--      respuestas, solo accesible desde funciones), mj_diarias (la partida del día,
--      igual para todos), mj_puntuaciones / mj_acumulado / mj_dia_usuario (rankings),
--      mj_recompensas (qué se pagó) y mj_objetos (reparador de racha, reintento).
--      Ninguna se lee ni se escribe desde el navegador: están sin políticas y sin
--      permisos para anon/authenticated. Todo pasa por funciones security definer.
--   2) Anti-trampas: las preguntas se generan en el servidor y el navegador solo
--      recibe la pregunta actual SIN su respuesta. La puntuación (acierto y
--      velocidad) la calcula el servidor con su propio reloj; el cronómetro de la
--      web es solo decorativo.
--   3) Reglas del día (día de Madrid, como la racha):
--        - Cada minijuego tiene UNA partida del día (la misma para todos, sale de
--          una tanda guardada en mj_diarias). Cuenta para el ranking y es la única
--          que da recompensa. Siempre usa el modo estándar.
--        - Después se puede jugar sin límite en partidas libres (modo estándar o
--          leyenda), sin ranking y sin recompensa.
--        - Completar la partida del día da monedas y XP (variables), con un techo
--          diario de cada una. Pasado el techo se sigue jugando sin recompensa.
--          Las monedas van a TODOS los equipos del usuario: 0,5 M en las ligas
--          privadas y 0,25 M en las públicas (mj_monedas_por_juego_publica), para
--          que no dupliquen el presupuesto de la pública. El techo diario se mide
--          en importe de liga privada; en la pública entra la proporción.
--        - Al completar TODOS los minijuegos del día se abre un cofre con un premio
--          al azar: monedas, reparador de racha o reintento.
--        - Reintento: permite repetir la partida del día de un minijuego (con
--          preguntas distintas); se guarda la mejor puntuación. No vuelve a pagar.
--        - Reparador de racha: si ayer te saltaste un día, recupera la racha.
--   4) Modos: 'estandar' = jugadores activos en torneos que no han terminado (si hay
--      menos de 30, todos los activos); 'leyenda' = toda la tabla players.
--   5) Variables ajustables (panel Admin > Variables, grupo "Minijuegos").
--
-- Privacidad: se usan nombre y Elo (datos que ya se ven en la ficha). NO se usa el
-- año de nacimiento ni la edad (0031: menores). Los rankings muestran el nombre de
-- usuario, el icono y el nivel, como el chat público.
--
-- Impacto en datos existentes: ninguno. Solo crea tablas, funciones y claves de
-- configuración. Requiere 0075 y 0086 (rachas, XP, fijar_xp) y 0092 (variables).
-- Retención: mj_purgar() borra partidas antiguas; programarla a mano igual que el
-- chat:  select cron.schedule('mj_purgar', '20 4 * * *', 'select public.mj_purgar()');

-- 1) Variables --------------------------------------------------------------------
insert into public.game_config (clave, valor) values
  ('mj_activo', 'true'::jsonb),
  ('mj_monedas_por_juego', '0.5'::jsonb),
  ('mj_monedas_por_juego_publica', '0.25'::jsonb),
  ('mj_tope_monedas_dia', '4'::jsonb),
  ('mj_xp_por_juego', '3'::jsonb),
  ('mj_tope_xp_dia', '24'::jsonb),
  ('mj_cofre_monedas', '1'::jsonb),
  ('mj_cofre_xp', '0'::jsonb),
  ('mj_cofre_peso_monedas', '50'::jsonb),
  ('mj_cofre_peso_reparador', '20'::jsonb),
  ('mj_cofre_peso_reintento', '30'::jsonb),
  ('mj_elo_rondas', '8'::jsonb),
  ('mj_elo_segundos', '20'::jsonb),
  ('mj_orden_rondas', '4'::jsonb),
  ('mj_orden_segundos', '45'::jsonb),
  ('mj_hol_cadena', '20'::jsonb),
  ('mj_retencion_dias', '60'::jsonb)
on conflict (clave) do nothing;

insert into public.config_definiciones
  (clave, grupo, etiqueta, descripcion, tipo, minimo, maximo, unidad, valor_defecto, permite_liga, estado, funcion_sql, orden)
values
  ('mj_activo', 'Minijuegos', 'Minijuegos activos',
   'Interruptor general. Apagado, no se puede iniciar ninguna partida.',
   'booleano', null, null, null, 'true'::jsonb, false, 'activa', null, 80),
  ('mj_monedas_por_juego', 'Minijuegos', 'Monedas por completar un minijuego',
   'Liga privada. Se ingresa en todos los equipos del usuario, una vez al día por minijuego (la partida del día).',
   'decimal', 0, 10, 'M', '0.5'::jsonb, false, 'activa', null, 81),
  ('mj_monedas_por_juego_publica', 'Minijuegos', 'Monedas por minijuego en la liga pública',
   'Lo que cobra el equipo de la liga pública por el mismo minijuego. No puede superar al de la privada.',
   'decimal', 0, 10, 'M', '0.25'::jsonb, false, 'activa', null, 94),
  ('mj_tope_monedas_dia', 'Minijuegos', 'Techo diario de monedas',
   'Máximo al día con los minijuegos (sin contar el cofre), medido en importe de liga privada.',
   'decimal', 0, 50, 'M', '4'::jsonb, false, 'activa', null, 82),
  ('mj_xp_por_juego', 'Minijuegos', 'XP por completar un minijuego',
   null, 'entero', 0, 100, 'XP', '3'::jsonb, false, 'activa', null, 83),
  ('mj_tope_xp_dia', 'Minijuegos', 'Techo diario de XP',
   'Máximo de XP al día con los minijuegos (sin contar el cofre).',
   'entero', 0, 1000, 'XP', '24'::jsonb, false, 'activa', null, 84),
  ('mj_cofre_monedas', 'Minijuegos', 'Cofre: premio en monedas',
   'Cuando el cofre toca monedas. Liga privada; en la pública entra la misma proporción que en los minijuegos.',
   'decimal', 0, 50, 'M', '1'::jsonb, false, 'activa', null, 85),
  ('mj_cofre_xp', 'Minijuegos', 'Cofre: XP', 'Se suma siempre que se abre el cofre, sea cual sea el premio.',
   'entero', 0, 1000, 'XP', '0'::jsonb, false, 'activa', null, 86),
  ('mj_cofre_peso_monedas', 'Minijuegos', 'Cofre: peso del premio en monedas',
   'Probabilidad relativa (se compara con los otros pesos del cofre).',
   'entero', 0, 100, null, '50'::jsonb, false, 'activa', null, 87),
  ('mj_cofre_peso_reparador', 'Minijuegos', 'Cofre: peso del reparador de racha',
   null, 'entero', 0, 100, null, '20'::jsonb, false, 'activa', null, 88),
  ('mj_cofre_peso_reintento', 'Minijuegos', 'Cofre: peso del reintento',
   null, 'entero', 0, 100, null, '30'::jsonb, false, 'activa', null, 89),
  ('mj_elo_rondas', 'Minijuegos', 'Elo exacto: rondas por partida',
   null, 'entero', 3, 20, 'rondas', '8'::jsonb, false, 'activa', null, 90),
  ('mj_elo_segundos', 'Minijuegos', 'Elo exacto: segundos por ronda',
   null, 'entero', 5, 120, 's', '20'::jsonb, false, 'activa', null, 91),
  ('mj_orden_rondas', 'Minijuegos', 'Ordena por Elo: rondas por partida',
   'Cada ronda son 5 jugadores.', 'entero', 2, 10, 'rondas', '4'::jsonb, false, 'activa', null, 95),
  ('mj_orden_segundos', 'Minijuegos', 'Ordena por Elo: segundos por ronda',
   null, 'entero', 10, 180, 's', '45'::jsonb, false, 'activa', null, 96),
  ('mj_hol_cadena', 'Minijuegos', 'Higher or lower: aciertos para la puntuación máxima',
   'Si alguien los acierta todos, la partida termina.',
   'entero', 5, 60, 'aciertos', '20'::jsonb, false, 'activa', null, 92),
  ('mj_retencion_dias', 'Minijuegos', 'Retención de partidas',
   'Días que se conservan las partidas (el detalle). Las puntuaciones de los rankings se conservan. Debe coincidir con la Política de privacidad.',
   'entero', 7, 365, 'días', '60'::jsonb, false, 'activa', null, 93)
on conflict (clave) do nothing;

-- 2) Tablas ---------------------------------------------------------------------------
create table if not exists public.mj_partidas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  juego text not null,
  modo text not null check (modo in ('estandar', 'leyenda')),
  dia date not null,
  ranked boolean not null default false,
  intento integer not null default 1,
  preguntas jsonb not null,           -- CON las respuestas: nunca sale de la base de datos
  indice integer not null default 0,
  inicio_pregunta timestamptz not null default now(),
  puntos integer not null default 0,
  aciertos integer not null default 0,
  detalle jsonb not null default '[]'::jsonb,
  estado text not null default 'en_curso' check (estado in ('en_curso', 'terminada', 'abandonada')),
  created_at timestamptz not null default now(),
  terminada_at timestamptz
);

-- Una sola partida del día por usuario, juego e intento (el reintento es el 2).
create unique index if not exists mj_partidas_diaria_uidx
  on public.mj_partidas (user_id, juego, dia, intento) where ranked;
create index if not exists mj_partidas_usuario_idx on public.mj_partidas (user_id, juego, estado);
create index if not exists mj_partidas_created_idx on public.mj_partidas (created_at);

-- La partida del día, igual para todos: se genera la primera vez que alguien la pide.
create table if not exists public.mj_diarias (
  dia date not null,
  juego text not null,
  preguntas jsonb not null,
  primary key (dia, juego)
);

-- Mejor puntuación de la partida del día de cada usuario (lo que cuenta en el ranking).
create table if not exists public.mj_puntuaciones (
  user_id uuid not null references auth.users (id) on delete cascade,
  juego text not null,
  dia date not null,
  puntos integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, juego, dia)
);
create index if not exists mj_puntuaciones_ranking_idx on public.mj_puntuaciones (dia, juego, puntos desc);

-- Puntos acumulados por juego; juego = 'total' suma todos.
create table if not exists public.mj_acumulado (
  user_id uuid not null references auth.users (id) on delete cascade,
  juego text not null,
  puntos_total bigint not null default 0,
  partidas integer not null default 0,
  primary key (user_id, juego)
);
create index if not exists mj_acumulado_ranking_idx on public.mj_acumulado (juego, puntos_total desc);

-- Resumen del día de cada usuario: lo cobrado, lo puntuado y el cofre.
create table if not exists public.mj_dia_usuario (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  monedas numeric not null default 0,
  xp integer not null default 0,
  puntos integer not null default 0,
  cofre_abierto boolean not null default false,
  cofre_premio jsonb,
  primary key (user_id, dia)
);
create index if not exists mj_dia_usuario_ranking_idx on public.mj_dia_usuario (dia, puntos desc);

-- Qué se pagó por cada minijuego y día (la clave primaria impide pagar dos veces).
create table if not exists public.mj_recompensas (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  juego text not null,
  monedas numeric not null,
  xp integer not null,
  equipos integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, dia, juego)
);

create table if not exists public.mj_objetos (
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('reparador', 'reintento')),
  cantidad integer not null default 0 check (cantidad >= 0),
  primary key (user_id, tipo)
);

do $$
declare
  t text;
begin
  foreach t in array array['mj_partidas', 'mj_diarias', 'mj_puntuaciones', 'mj_acumulado',
                           'mj_dia_usuario', 'mj_recompensas', 'mj_objetos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- 3) Utilidades -------------------------------------------------------------------------
create or replace function public.mj_dia()
returns date
language sql
stable
as $$ select (now() at time zone 'Europe/Madrid')::date $$;

create or replace function public.mj_activo()
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v jsonb := public.config_valor('mj_activo', null);
begin
  return case when v is null or jsonb_typeof(v) <> 'boolean' then true else (v #>> '{}')::boolean end;
end;
$$;

-- Minijuegos disponibles. Al añadir uno: aquí, en mj_generar, mj_formar_pregunta y
-- mj_responder, y en lib/minijuegos.ts.
create or replace function public.mj_juegos_activos()
returns text[]
language sql
immutable
as $$ select array['hol', 'elo', 'orden'] $$;

-- Jugadores con los que se juega. Estándar: activos en torneos que no han acabado
-- (si son menos de 30, todos los activos). Leyenda: toda la tabla.
create or replace function public.mj_pool(p_modo text)
returns table (id uuid, nombre text, elo integer)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_n integer;
begin
  if p_modo = 'leyenda' then
    return query select p.id, p.nombre, p.elo from players p;
    return;
  end if;

  select count(*) into v_n
  from players p
  where p.activo and exists (
    select 1 from tournament_players tp join tournaments t on t.id = tp.tournament_id
    where tp.player_id = p.id and (t.fecha_fin is null or t.fecha_fin >= public.mj_dia())
  );

  if v_n >= 30 then
    return query
      select p.id, p.nombre, p.elo from players p
      where p.activo and exists (
        select 1 from tournament_players tp join tournaments t on t.id = tp.tournament_id
        where tp.player_id = p.id and (t.fecha_fin is null or t.fecha_fin >= public.mj_dia())
      );
  else
    return query select p.id, p.nombre, p.elo from players p where p.activo;
  end if;
end;
$$;

-- Genera las preguntas (con respuesta) de una partida a partir de una semilla.
create or replace function public.mj_generar(p_juego text, p_modo text, p_semilla text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_n integer;
  v_lista jsonb := '[]'::jsonb;
  v_prev integer;
  r record;
begin
  if p_juego = 'elo' then
    v_n := public.config_num('mj_elo_rondas', null, 8)::integer;
    select coalesce(jsonb_agg(jsonb_build_object('nombre', s.nombre, 'elo', s.elo) order by s.ord), '[]'::jsonb)
    into v_lista
    from (
      select pp.nombre, pp.elo, row_number() over (order by md5(p_semilla || pp.id::text)) as ord
      from public.mj_pool(p_modo) pp
    ) s
    where s.ord <= v_n;
    return v_lista;
  elsif p_juego = 'hol' then
    -- Cadena de jugadores con Elo; dos seguidos nunca empatan. El primero se ve entero.
    v_n := public.config_num('mj_hol_cadena', null, 20)::integer + 1;
    for r in
      select pp.nombre, pp.elo from public.mj_pool(p_modo) pp
      where pp.elo > 0
      order by md5(p_semilla || pp.id::text)
    loop
      if v_prev is null or r.elo <> v_prev then
        v_lista := v_lista || jsonb_build_object('nombre', r.nombre, 'elo', r.elo);
        v_prev := r.elo;
      end if;
      exit when jsonb_array_length(v_lista) >= v_n;
    end loop;
    return v_lista;
  elsif p_juego = 'orden' then
    -- Rondas de 5 jugadores con Elo distinto entre sí (y mayor que 0). Se guardan
    -- en el orden en que se enseñan (al azar); la web nunca recibe el Elo.
    declare
      v_rondas integer := public.config_num('mj_orden_rondas', null, 4)::integer;
      v_grupo jsonb := '[]'::jsonb;
      v_elos integer[] := '{}';
    begin
      for r in
        select pp.nombre, pp.elo from public.mj_pool(p_modo) pp
        where pp.elo > 0
        order by md5(p_semilla || pp.id::text)
      loop
        if not (r.elo = any (v_elos)) then
          v_grupo := v_grupo || jsonb_build_object('nombre', r.nombre, 'elo', r.elo);
          v_elos := v_elos || r.elo;
        end if;
        if jsonb_array_length(v_grupo) = 5 then
          v_lista := v_lista || jsonb_build_array(jsonb_build_object('jugadores', v_grupo));
          v_grupo := '[]'::jsonb;
          v_elos := '{}';
        end if;
        exit when jsonb_array_length(v_lista) >= v_rondas;
      end loop;
    end;
    return v_lista;
  end if;
  raise exception 'Minijuego desconocido: %', p_juego;
end;
$$;

-- Tanda del día de un juego (la misma para todos). Se guarda para que no cambie
-- aunque durante el día cambien los torneos activos.
create or replace function public.mj_preguntas_diarias(p_juego text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_hoy date := public.mj_dia();
  v_p jsonb;
begin
  select preguntas into v_p from mj_diarias where dia = v_hoy and juego = p_juego;
  if found then
    return v_p;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('mj_diaria|' || v_hoy::text || '|' || p_juego, 0));
  select preguntas into v_p from mj_diarias where dia = v_hoy and juego = p_juego;
  if found then
    return v_p;
  end if;
  v_p := public.mj_generar(p_juego, 'estandar', v_hoy::text || '|' || p_juego);
  insert into mj_diarias (dia, juego, preguntas) values (v_hoy, p_juego, v_p)
  on conflict (dia, juego) do nothing;
  return v_p;
end;
$$;

-- Pregunta actual SIN la respuesta.
create or replace function public.mj_formar_pregunta(p public.mj_partidas)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_seg integer;
  v_resta numeric;
begin
  if p.juego = 'elo' then
    v_seg := public.config_num('mj_elo_segundos', null, 20)::integer;
    v_resta := greatest(0, v_seg - extract(epoch from (now() - p.inicio_pregunta)));
    return jsonb_build_object(
      'tipo', 'elo',
      'indice', p.indice + 1,
      'total', jsonb_array_length(p.preguntas),
      'nombre', p.preguntas -> p.indice ->> 'nombre',
      'segundos', v_seg,
      'restante', round(v_resta, 1)
    );
  elsif p.juego = 'orden' then
    v_seg := public.config_num('mj_orden_segundos', null, 45)::integer;
    v_resta := greatest(0, v_seg - extract(epoch from (now() - p.inicio_pregunta)));
    return jsonb_build_object(
      'tipo', 'orden',
      'indice', p.indice + 1,
      'total', jsonb_array_length(p.preguntas),
      'jugadores', (select jsonb_agg(j ->> 'nombre' order by o)
                    from jsonb_array_elements(p.preguntas -> p.indice -> 'jugadores') with ordinality as t(j, o)),
      'segundos', v_seg,
      'restante', round(v_resta, 1)
    );
  elsif p.juego = 'hol' then
    return jsonb_build_object(
      'tipo', 'hol',
      'indice', p.indice,
      'total', jsonb_array_length(p.preguntas) - 1,
      'aciertos', p.aciertos,
      'actual', jsonb_build_object(
        'nombre', p.preguntas -> (p.indice - 1) ->> 'nombre',
        'elo', (p.preguntas -> (p.indice - 1) ->> 'elo')::integer
      ),
      'siguiente', jsonb_build_object('nombre', p.preguntas -> p.indice ->> 'nombre')
    );
  end if;
  return null;
end;
$$;

-- Ingresa monedas en todos los equipos del usuario. El importe es el de liga
-- privada; en las ligas públicas entra la proporción pública/privada.
create or replace function public.mj_ingresar(p_uid uuid, p_monedas numeric)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_priv numeric := public.config_num('mj_monedas_por_juego', null, 0.5);
  v_pub numeric := public.config_num('mj_monedas_por_juego_publica', null, 0.25);
  v_factor numeric := case when v_priv <= 0 then 1 else least(1, v_pub / v_priv) end;
begin
  if p_monedas <= 0 then
    return;
  end if;
  update fantasy_teams ft
  set presupuesto = ft.presupuesto + p_monedas * case
        when exists (select 1 from leagues l where l.id = ft.league_id and l.tipo = 'publica')
        then v_factor else 1 end
  where ft.owner_id = p_uid;
end;
$$;

-- 4) Reparto de recompensas y cierre de partida ------------------------------------
-- Cierra la partida y, si era la del día, guarda la puntuación para los rankings y
-- paga la recompensa (una vez por juego y día, respetando los techos).
create or replace function public.mj_cerrar(p_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_p mj_partidas%rowtype;
  v_antes integer;
  v_delta integer := 0;
  v_mejora boolean := false;
  v_du mj_dia_usuario%rowtype;
  v_monedas numeric := 0;
  v_xp integer := 0;
  v_equipos integer;
  v_pago jsonb := null;
  v_completados integer;
begin
  update mj_partidas set estado = 'terminada', terminada_at = now() where id = p_id returning * into v_p;

  if not v_p.ranked then
    return jsonb_build_object('puntos', v_p.puntos, 'ranked', false);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('mj_cerrar|' || v_p.user_id::text || '|' || v_p.dia::text, 0));

  -- Puntuación: nos quedamos con la mejor del día.
  select puntos into v_antes from mj_puntuaciones
  where user_id = v_p.user_id and juego = v_p.juego and dia = v_p.dia;
  if v_antes is null then
    insert into mj_puntuaciones (user_id, juego, dia, puntos) values (v_p.user_id, v_p.juego, v_p.dia, v_p.puntos);
    v_delta := v_p.puntos;
    v_mejora := true;
  elsif v_p.puntos > v_antes then
    update mj_puntuaciones set puntos = v_p.puntos, updated_at = now()
    where user_id = v_p.user_id and juego = v_p.juego and dia = v_p.dia;
    v_delta := v_p.puntos - v_antes;
    v_mejora := true;
  end if;

  if v_delta > 0 or v_antes is null then
    insert into mj_acumulado (user_id, juego, puntos_total, partidas)
    values (v_p.user_id, v_p.juego, v_delta, 1)
    on conflict (user_id, juego) do update
      set puntos_total = mj_acumulado.puntos_total + v_delta,
          partidas = mj_acumulado.partidas + case when v_antes is null then 1 else 0 end;
    insert into mj_acumulado (user_id, juego, puntos_total, partidas)
    values (v_p.user_id, 'total', v_delta, 1)
    on conflict (user_id, juego) do update
      set puntos_total = mj_acumulado.puntos_total + v_delta,
          partidas = mj_acumulado.partidas + case when v_antes is null then 1 else 0 end;
  end if;

  insert into mj_dia_usuario (user_id, dia) values (v_p.user_id, v_p.dia) on conflict do nothing;
  select * into v_du from mj_dia_usuario where user_id = v_p.user_id and dia = v_p.dia for update;
  update mj_dia_usuario set puntos = puntos + v_delta where user_id = v_p.user_id and dia = v_p.dia;

  -- Recompensa por completar (solo la primera vez que se completa este juego hoy).
  if not exists (
    select 1 from mj_recompensas where user_id = v_p.user_id and dia = v_p.dia and juego = v_p.juego
  ) then
    select count(*) into v_equipos from fantasy_teams where owner_id = v_p.user_id;
    v_monedas := least(
      public.config_num('mj_monedas_por_juego', null, 0.5),
      greatest(0, public.config_num('mj_tope_monedas_dia', null, 4) - v_du.monedas)
    );
    v_xp := least(
      public.config_num('mj_xp_por_juego', null, 3)::integer,
      greatest(0, public.config_num('mj_tope_xp_dia', null, 24)::integer - v_du.xp)
    );
    if v_equipos = 0 then
      v_monedas := 0;
    end if;

    insert into mj_recompensas (user_id, dia, juego, monedas, xp, equipos)
    values (v_p.user_id, v_p.dia, v_p.juego, v_monedas, v_xp, v_equipos);

    update mj_dia_usuario
    set monedas = monedas + v_monedas, xp = xp + v_xp
    where user_id = v_p.user_id and dia = v_p.dia;

    perform public.mj_ingresar(v_p.user_id, v_monedas);
    if v_xp > 0 then
      perform public.fijar_xp(v_p.user_id, 'minijuego', v_p.dia::text || '|' || v_p.juego, v_xp);
    end if;

    v_pago := jsonb_build_object(
      'monedas', v_monedas,
      'xp', v_xp,
      'tope_monedas', v_monedas < public.config_num('mj_monedas_por_juego', null, 0.5),
      'tope_xp', v_xp < public.config_num('mj_xp_por_juego', null, 3)::integer
    );
  end if;

  select count(*) into v_completados from mj_recompensas
  where user_id = v_p.user_id and dia = v_p.dia and juego = any (public.mj_juegos_activos());

  return jsonb_build_object(
    'puntos', v_p.puntos,
    'ranked', true,
    'mejora', v_mejora,
    'recompensa', v_pago,
    'cofre_disponible',
      v_completados >= array_length(public.mj_juegos_activos(), 1)
      and not (select cofre_abierto from mj_dia_usuario where user_id = v_p.user_id and dia = v_p.dia)
  );
end;
$$;

-- 5) Iniciar y responder -------------------------------------------------------------------
-- p_tipo 'diaria': la partida del día (ranking). Si ya hay una en curso, la
-- reanuda (el reloj de la pregunta sigue corriendo). Con p_reintento y un objeto
-- 'reintento' se puede repetir una vez al día.
-- p_tipo 'libre': partida sin ranking ni recompensa, en modo estándar o leyenda.
create or replace function public.mj_iniciar(
  p_juego text,
  p_tipo text default 'diaria',
  p_modo text default 'estandar',
  p_reintento boolean default false
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := public.mj_dia();
  v_p mj_partidas%rowtype;
  v_ult mj_partidas%rowtype;
  v_pregs jsonb;
  v_intento integer := 1;
  v_reanudada boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para jugar.');
  end if;
  if not public.mj_activo() then
    return jsonb_build_object('ok', false, 'mensaje', 'Los minijuegos están desactivados ahora mismo.');
  end if;
  if p_juego <> all (public.mj_juegos_activos()) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese minijuego no existe.');
  end if;
  if p_tipo not in ('diaria', 'libre') or p_modo not in ('estandar', 'leyenda') then
    return jsonb_build_object('ok', false, 'mensaje', 'Modo de juego no válido.');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('mj_iniciar|' || v_uid::text || '|' || p_juego, 0));

  if p_tipo = 'diaria' then
    select * into v_ult from mj_partidas
    where user_id = v_uid and juego = p_juego and ranked and dia = v_hoy
    order by intento desc limit 1;

    if found and v_ult.estado = 'en_curso' then
      v_p := v_ult;
      v_reanudada := true;
    elsif found then
      if not p_reintento then
        return jsonb_build_object('ok', false, 'mensaje', 'Ya has jugado la partida del día. ¡Vuelve mañana!');
      end if;
      if v_ult.intento >= 2 then
        return jsonb_build_object('ok', false, 'mensaje', 'Ya has usado el reintento de este minijuego hoy.');
      end if;
      update mj_objetos set cantidad = cantidad - 1
      where user_id = v_uid and tipo = 'reintento' and cantidad > 0;
      if not found then
        return jsonb_build_object('ok', false, 'mensaje', 'No tienes ningún reintento.');
      end if;
      v_intento := v_ult.intento + 1;
      v_pregs := public.mj_generar(p_juego, 'estandar', gen_random_uuid()::text);
    else
      v_pregs := public.mj_preguntas_diarias(p_juego);
    end if;

    if not v_reanudada then
      if jsonb_array_length(v_pregs) < 2 then
        return jsonb_build_object('ok', false, 'mensaje', 'Todavía no hay jugadores suficientes para este minijuego.');
      end if;
      insert into mj_partidas (user_id, juego, modo, dia, ranked, intento, preguntas, indice)
      values (v_uid, p_juego, 'estandar', v_hoy, true, v_intento, v_pregs,
              case when p_juego = 'hol' then 1 else 0 end)
      returning * into v_p;
    end if;
  else
    update mj_partidas set estado = 'abandonada'
    where user_id = v_uid and juego = p_juego and not ranked and estado = 'en_curso';
    v_pregs := public.mj_generar(p_juego, p_modo, gen_random_uuid()::text);
    if jsonb_array_length(v_pregs) < 2 then
      return jsonb_build_object('ok', false, 'mensaje', 'Todavía no hay jugadores suficientes para este minijuego.');
    end if;
    insert into mj_partidas (user_id, juego, modo, dia, ranked, intento, preguntas, indice)
    values (v_uid, p_juego, p_modo, v_hoy, false, 1, v_pregs, case when p_juego = 'hol' then 1 else 0 end)
    returning * into v_p;
  end if;

  return jsonb_build_object(
    'ok', true,
    'partida', v_p.id,
    'juego', v_p.juego,
    'modo', v_p.modo,
    'ranked', v_p.ranked,
    'intento', v_p.intento,
    'reanudada', v_reanudada,
    'puntos', v_p.puntos,
    'pregunta', public.mj_formar_pregunta(v_p)
  );
end;
$$;

create or replace function public.mj_responder(p_partida uuid, p_respuesta jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_p mj_partidas%rowtype;
  v_seg numeric;
  v_lim integer;
  v_q jsonb;
  v_real integer;
  v_real_c integer;
  v_guess integer;
  v_acc numeric;
  v_mult numeric;
  v_pts integer := 0;
  v_total integer;
  v_fin boolean := false;
  v_correcta boolean := false;
  v_dir text;
  v_ant jsonb;
  v_rev jsonb;
  v_final jsonb;
  v_orden integer[];
  v_pares integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para jugar.');
  end if;

  select * into v_p from mj_partidas where id = p_partida and user_id = v_uid for update;
  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Partida no encontrada.');
  end if;
  if v_p.estado <> 'en_curso' then
    return jsonb_build_object('ok', false, 'mensaje', 'Esta partida ya ha terminado.');
  end if;

  v_seg := extract(epoch from (now() - v_p.inicio_pregunta));
  v_total := jsonb_array_length(v_p.preguntas);

  if v_p.juego = 'elo' then
    v_lim := public.config_num('mj_elo_segundos', null, 20)::integer;
    v_q := v_p.preguntas -> v_p.indice;
    v_real := (v_q ->> 'elo')::integer;

    if p_respuesta is not null and jsonb_typeof(p_respuesta -> 'valor') = 'number' then
      v_guess := round((p_respuesta ->> 'valor')::numeric)::integer;
      if not (v_guess = 0 or v_guess between 1400 and 2500) then
        return jsonb_build_object('ok', false, 'mensaje', 'Elo fuera de rango.');
      end if;
    end if;

    -- Se da un margen de 3 s por la red; pasado, la ronda vale 0.
    if v_guess is null or v_seg > v_lim + 3 then
      v_acc := 0;
    elsif v_real = 0 then
      v_acc := case when v_guess = 0 then 1 else 0 end;
    elsif v_guess = 0 then
      v_acc := 0;
    else
      v_real_c := least(2500, greatest(1400, v_real));
      v_acc := greatest(0, 1 - greatest(0, abs(v_guess - v_real_c) - 5) / 245.0);
    end if;
    v_mult := 0.5 + 0.5 * greatest(0, 1 - v_seg / v_lim);
    v_pts := round(1000.0 / v_total * v_acc * v_mult)::integer;
    v_correcta := v_acc >= 0.9;
    v_rev := jsonb_build_object('nombre', v_q ->> 'nombre', 'elo', v_real, 'respuesta', v_guess);

    update mj_partidas
    set puntos = puntos + v_pts,
        aciertos = aciertos + case when v_correcta then 1 else 0 end,
        detalle = detalle || jsonb_build_object(
          'nombre', v_q ->> 'nombre', 'real', v_real, 'respuesta', v_guess,
          'segundos', round(v_seg, 1), 'puntos', v_pts),
        indice = indice + 1,
        inicio_pregunta = now()
    where id = v_p.id
    returning * into v_p;

    v_fin := v_p.indice >= v_total;

  elsif v_p.juego = 'orden' then
    v_lim := public.config_num('mj_orden_segundos', null, 45)::integer;
    v_q := v_p.preguntas -> v_p.indice -> 'jugadores';

    -- La respuesta es la lista de posiciones (0-4) de menor a mayor Elo. Se admite
    -- incompleta (si se acaba el tiempo); las que falten cuentan como falladas.
    if p_respuesta is not null and jsonb_typeof(p_respuesta -> 'orden') = 'array' then
      select coalesce(array_agg(x::integer order by o), '{}') into v_orden
      from jsonb_array_elements_text(p_respuesta -> 'orden') with ordinality as t(x, o);
      if cardinality(v_orden) > 5
         or exists (select 1 from unnest(v_orden) u where u not between 0 and 4)
         or (select count(distinct u) from unnest(v_orden) u) <> cardinality(v_orden) then
        return jsonb_build_object('ok', false, 'mensaje', 'Orden no válido.');
      end if;
    else
      v_orden := '{}';
    end if;

    v_acc := 0;
    if v_seg <= v_lim + 3 then
      -- Pares bien ordenados entre los 10 posibles.
      select count(*) into v_pares
      from generate_series(1, cardinality(v_orden)) a
      join generate_series(1, cardinality(v_orden)) b on b > a
      where (v_q -> v_orden[a] ->> 'elo')::integer < (v_q -> v_orden[b] ->> 'elo')::integer;
      v_acc := v_pares / 10.0;
    end if;
    v_mult := 0.5 + 0.5 * greatest(0, 1 - v_seg / v_lim);
    v_pts := round(1000.0 / v_total * v_acc * v_mult)::integer;
    v_correcta := v_acc = 1;
    select jsonb_agg(jsonb_build_object('nombre', j ->> 'nombre', 'elo', (j ->> 'elo')::integer)
                     order by (j ->> 'elo')::integer)
    into v_rev from jsonb_array_elements(v_q) j;
    v_rev := jsonb_build_object('jugadores', v_rev, 'orden', to_jsonb(v_orden));

    update mj_partidas
    set puntos = puntos + v_pts,
        aciertos = aciertos + case when v_correcta then 1 else 0 end,
        detalle = detalle || jsonb_build_object('puntos', v_pts, 'segundos', round(v_seg, 1), 'pares', v_pares),
        indice = indice + 1,
        inicio_pregunta = now()
    where id = v_p.id
    returning * into v_p;

    v_fin := v_p.indice >= v_total;

  elsif v_p.juego = 'hol' then
    v_dir := p_respuesta ->> 'dir';
    if v_dir is null or v_dir not in ('mas', 'menos') then
      return jsonb_build_object('ok', false, 'mensaje', 'Respuesta no válida.');
    end if;
    v_ant := v_p.preguntas -> (v_p.indice - 1);
    v_q := v_p.preguntas -> v_p.indice;
    v_correcta := ((v_q ->> 'elo')::integer > (v_ant ->> 'elo')::integer) = (v_dir = 'mas');
    v_rev := jsonb_build_object('nombre', v_q ->> 'nombre', 'elo', (v_q ->> 'elo')::integer);

    if v_correcta then
      v_pts := round(1000.0 / (v_total - 1))::integer;
      update mj_partidas
      set puntos = puntos + v_pts, aciertos = aciertos + 1, indice = indice + 1, inicio_pregunta = now(),
          detalle = detalle || jsonb_build_object('nombre', v_q ->> 'nombre', 'real', (v_q ->> 'elo')::integer, 'ok', true)
      where id = v_p.id
      returning * into v_p;
      v_fin := v_p.indice >= v_total;
    else
      update mj_partidas
      set detalle = detalle || jsonb_build_object('nombre', v_q ->> 'nombre', 'real', (v_q ->> 'elo')::integer, 'ok', false)
      where id = v_p.id
      returning * into v_p;
      v_fin := true;
    end if;
  else
    return jsonb_build_object('ok', false, 'mensaje', 'Minijuego desconocido.');
  end if;

  if v_fin then
    v_final := public.mj_cerrar(v_p.id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'correcta', v_correcta,
    'puntos_ronda', v_pts,
    'puntos', v_p.puntos,
    'aciertos', v_p.aciertos,
    'revelado', v_rev,
    'terminada', v_fin,
    'final', v_final,
    'pregunta', case when v_fin then null else public.mj_formar_pregunta(v_p) end
  );
end;
$$;

-- 6) Estado, cofre y objetos ----------------------------------------------------------------
-- ¿Se puede reparar la racha? Solo si hoy ya está registrada, se rompió ayer
-- (falló exactamente un día) y venía de una racha de 2 o más.
create or replace function public.mj_racha_reparable(p_uid uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_hoy date := public.mj_dia();
  v_r rachas%rowtype;
  v_prev recompensas_diarias%rowtype;
begin
  select * into v_r from rachas where user_id = p_uid;
  if not found or v_r.ultimo_dia is distinct from v_hoy or v_r.racha_actual <> 1 then
    return null;
  end if;
  select * into v_prev from recompensas_diarias
  where user_id = p_uid and dia < v_hoy order by dia desc limit 1;
  if not found or v_hoy - v_prev.dia <> 2 or v_prev.racha < 2 then
    return null;
  end if;
  return jsonb_build_object('racha_anterior', v_prev.racha, 'racha_nueva', v_prev.racha + 2);
end;
$$;

create or replace function public.mj_estado()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := public.mj_dia();
  v_du mj_dia_usuario%rowtype;
  v_juegos jsonb := '[]'::jsonb;
  v_j text;
  v_p mj_partidas%rowtype;
  v_rew mj_recompensas%rowtype;
  v_completados integer := 0;
  v_obj jsonb;
  v_pos bigint;
  v_mis bigint;
  v_part bigint;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver los minijuegos.';
  end if;

  select * into v_du from mj_dia_usuario where user_id = v_uid and dia = v_hoy;

  foreach v_j in array public.mj_juegos_activos() loop
    select * into v_p from mj_partidas
    where user_id = v_uid and juego = v_j and ranked and dia = v_hoy
    order by intento desc limit 1;
    select * into v_rew from mj_recompensas where user_id = v_uid and dia = v_hoy and juego = v_j;
    if found then
      v_completados := v_completados + 1;
    end if;
    v_juegos := v_juegos || jsonb_build_object(
      'id', v_j,
      'jugada', v_p.id is not null and v_p.estado = 'terminada',
      'en_curso', v_p.id is not null and v_p.estado = 'en_curso',
      'intento', coalesce(v_p.intento, 0),
      'puntos', coalesce((select puntos from mj_puntuaciones where user_id = v_uid and juego = v_j and dia = v_hoy), 0),
      'recompensa', case when v_rew.user_id is null then null
                         else jsonb_build_object('monedas', v_rew.monedas, 'xp', v_rew.xp) end
    );
  end loop;

  select coalesce(jsonb_object_agg(tipo, cantidad), '{}'::jsonb) into v_obj
  from mj_objetos where user_id = v_uid;

  select puntos_total into v_mis from mj_acumulado where user_id = v_uid and juego = 'total';
  select count(*) into v_part from mj_acumulado where juego = 'total' and puntos_total > 0;
  if coalesce(v_mis, 0) > 0 then
    select count(*) + 1 into v_pos from mj_acumulado where juego = 'total' and puntos_total > v_mis;
  end if;

  return jsonb_build_object(
    'activo', public.mj_activo(),
    'juegos', v_juegos,
    'completados', v_completados,
    'total_juegos', array_length(public.mj_juegos_activos(), 1),
    'monedas_hoy', coalesce(v_du.monedas, 0),
    'tope_monedas', public.config_num('mj_tope_monedas_dia', null, 4),
    'xp_hoy', coalesce(v_du.xp, 0),
    'tope_xp', public.config_num('mj_tope_xp_dia', null, 24),
    'monedas_por_juego', public.config_num('mj_monedas_por_juego', null, 0.5),
    'monedas_por_juego_publica', public.config_num('mj_monedas_por_juego_publica', null, 0.25),
    'xp_por_juego', public.config_num('mj_xp_por_juego', null, 3),
    'cofre_disponible', v_completados >= array_length(public.mj_juegos_activos(), 1)
                        and not coalesce(v_du.cofre_abierto, false),
    'cofre_abierto', coalesce(v_du.cofre_abierto, false),
    'cofre_premio', v_du.cofre_premio,
    'objetos', v_obj,
    'racha_reparable', public.mj_racha_reparable(v_uid),
    'elo_rondas', public.config_num('mj_elo_rondas', null, 8),
    'elo_segundos', public.config_num('mj_elo_segundos', null, 20),
    'orden_rondas', public.config_num('mj_orden_rondas', null, 4),
    'orden_segundos', public.config_num('mj_orden_segundos', null, 45),
    'hol_cadena', public.config_num('mj_hol_cadena', null, 20),
    'general', jsonb_build_object('pos', v_pos, 'puntos', coalesce(v_mis, 0), 'participantes', v_part)
  );
end;
$$;

-- Abre el cofre del día (hay que haber completado todos los minijuegos).
create or replace function public.mj_abrir_cofre()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := public.mj_dia();
  v_du mj_dia_usuario%rowtype;
  v_n integer;
  v_w1 numeric;
  v_w2 numeric;
  v_w3 numeric;
  v_r numeric;
  v_premio text;
  v_monedas numeric := 0;
  v_xp integer;
  v_equipos integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para abrir el cofre.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('mj_cofre|' || v_uid::text || '|' || v_hoy::text, 0));

  select count(*) into v_n from mj_recompensas
  where user_id = v_uid and dia = v_hoy and juego = any (public.mj_juegos_activos());
  if v_n < array_length(public.mj_juegos_activos(), 1) then
    return jsonb_build_object('ok', false, 'mensaje', 'Completa todos los minijuegos de hoy para abrir el cofre.');
  end if;

  insert into mj_dia_usuario (user_id, dia) values (v_uid, v_hoy) on conflict do nothing;
  select * into v_du from mj_dia_usuario where user_id = v_uid and dia = v_hoy for update;
  if v_du.cofre_abierto then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya has abierto el cofre de hoy.');
  end if;

  v_w1 := public.config_num('mj_cofre_peso_monedas', null, 50);
  v_w2 := public.config_num('mj_cofre_peso_reparador', null, 20);
  v_w3 := public.config_num('mj_cofre_peso_reintento', null, 30);
  if v_w1 + v_w2 + v_w3 <= 0 then
    v_w1 := 1;
  end if;
  v_r := random() * (v_w1 + v_w2 + v_w3);
  v_premio := case when v_r < v_w1 then 'monedas'
                   when v_r < v_w1 + v_w2 then 'reparador'
                   else 'reintento' end;

  v_xp := public.config_num('mj_cofre_xp', null, 0)::integer;

  if v_premio = 'monedas' then
    v_monedas := public.config_num('mj_cofre_monedas', null, 1);
    select count(*) into v_equipos from fantasy_teams where owner_id = v_uid;
    if v_equipos > 0 then
      perform public.mj_ingresar(v_uid, v_monedas);
    end if;
  else
    insert into mj_objetos (user_id, tipo, cantidad) values (v_uid, v_premio, 1)
    on conflict (user_id, tipo) do update set cantidad = mj_objetos.cantidad + 1;
  end if;

  if v_xp > 0 then
    perform public.fijar_xp(v_uid, 'minijuego', v_hoy::text || '|cofre', v_xp);
  end if;

  update mj_dia_usuario
  set cofre_abierto = true,
      cofre_premio = jsonb_build_object('tipo', v_premio, 'monedas', v_monedas, 'xp', v_xp)
  where user_id = v_uid and dia = v_hoy;

  return jsonb_build_object('ok', true, 'premio', v_premio, 'monedas', v_monedas, 'xp', v_xp);
end;
$$;

-- Usa un reparador: recupera la racha rota ayer (ver mj_racha_reparable).
create or replace function public.mj_usar_reparador_racha()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := public.mj_dia();
  v_rep jsonb;
  v_nueva integer;
  v_cada integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para usarlo.');
  end if;

  perform 1 from rachas where user_id = v_uid for update;
  v_rep := public.mj_racha_reparable(v_uid);
  if v_rep is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ahora mismo no hay ninguna racha que reparar.');
  end if;

  update mj_objetos set cantidad = cantidad - 1
  where user_id = v_uid and tipo = 'reparador' and cantidad > 0;
  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes ningún reparador de racha.');
  end if;

  v_nueva := (v_rep ->> 'racha_nueva')::integer;
  v_cada := public.config_num('racha_dias_cofre', null, 7)::integer;

  -- El día perdido se anota (sin cobrar) para que no se pueda reparar dos veces.
  insert into recompensas_diarias (user_id, dia, racha, importe_diario, importe_cofre, equipos)
  values (v_uid, v_hoy - 1, v_nueva - 1, 0, 0, 0)
  on conflict do nothing;
  update recompensas_diarias set racha = v_nueva where user_id = v_uid and dia = v_hoy;

  update rachas
  set racha_actual = v_nueva,
      mejor_racha = greatest(mejor_racha, v_nueva),
      cofres_pendientes = cofres_pendientes + case when v_cada > 0 and v_nueva % v_cada = 0 then 1 else 0 end,
      updated_at = now()
  where user_id = v_uid;

  return jsonb_build_object('ok', true, 'racha', v_nueva);
end;
$$;

-- 7) Rankings --------------------------------------------------------------------------------
-- p_juego: 'hol' | 'elo' | 'total'.  p_periodo: 'dia' | 'general'.
-- Devuelve los 50 primeros y la posición del usuario. No expone ids de usuario.
create or replace function public.mj_ranking(p_juego text, p_periodo text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := public.mj_dia();
  v_res jsonb;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver el ranking.';
  end if;
  if p_periodo not in ('dia', 'general') or p_juego not in ('total', 'hol', 'elo', 'orden') then
    raise exception 'Ranking no válido.';
  end if;

  with base as materialized (
    select user_id, puntos::bigint as puntos from mj_puntuaciones
      where p_periodo = 'dia' and p_juego <> 'total' and dia = v_hoy and juego = p_juego and puntos > 0
    union all
    select user_id, puntos::bigint from mj_dia_usuario
      where p_periodo = 'dia' and p_juego = 'total' and dia = v_hoy and puntos > 0
    union all
    select user_id, puntos_total from mj_acumulado
      where p_periodo = 'general' and juego = p_juego and puntos_total > 0
  ),
  mio as (select puntos from base where user_id = v_uid),
  top as (
    select user_id, puntos, rank() over (order by puntos desc) as pos
    from base order by puntos desc, user_id limit 50
  )
  select jsonb_build_object(
    'filas', coalesce((
      select jsonb_agg(jsonb_build_object(
          'pos', t.pos,
          'nombre', pr.nombre,
          'avatar', pr.avatar,
          'nivel', public.nivel_de_xp(coalesce(x.xp, 0)),
          'puntos', t.puntos,
          'yo', t.user_id = v_uid
        ) order by t.pos, pr.nombre)
      from top t
      join profiles pr on pr.id = t.user_id
      left join xp_usuarios x on x.user_id = t.user_id
    ), '[]'::jsonb),
    'mi', (select jsonb_build_object(
             'pos', (select count(*) + 1 from base b where b.puntos > m.puntos),
             'puntos', m.puntos) from mio m),
    'participantes', (select count(*) from base)
  ) into v_res;

  return v_res;
end;
$$;

-- 8) Retención --------------------------------------------------------------------------------
create or replace function public.mj_purgar()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_dias integer := public.config_num('mj_retencion_dias', null, 60)::integer;
  v_n integer;
begin
  delete from mj_partidas where created_at < now() - make_interval(days => v_dias);
  get diagnostics v_n = row_count;
  delete from mj_diarias where dia < public.mj_dia() - 7;
  return v_n;
end;
$$;

-- 9) Permisos ------------------------------------------------------------------------------------
revoke all on function public.mj_dia() from public, anon;
revoke all on function public.mj_activo() from public, anon;
revoke all on function public.mj_juegos_activos() from public, anon;
revoke all on function public.mj_pool(text) from public, anon, authenticated;
revoke all on function public.mj_generar(text, text, text) from public, anon, authenticated;
revoke all on function public.mj_preguntas_diarias(text) from public, anon, authenticated;
revoke all on function public.mj_formar_pregunta(public.mj_partidas) from public, anon, authenticated;
revoke all on function public.mj_cerrar(uuid) from public, anon, authenticated;
revoke all on function public.mj_ingresar(uuid, numeric) from public, anon, authenticated;
revoke all on function public.mj_racha_reparable(uuid) from public, anon, authenticated;
revoke all on function public.mj_purgar() from public, anon, authenticated;

revoke all on function public.mj_iniciar(text, text, text, boolean) from public, anon;
revoke all on function public.mj_responder(uuid, jsonb) from public, anon;
revoke all on function public.mj_estado() from public, anon;
revoke all on function public.mj_abrir_cofre() from public, anon;
revoke all on function public.mj_usar_reparador_racha() from public, anon;
revoke all on function public.mj_ranking(text, text) from public, anon;
grant execute on function public.mj_dia() to authenticated;
grant execute on function public.mj_iniciar(text, text, text, boolean) to authenticated;
grant execute on function public.mj_responder(uuid, jsonb) to authenticated;
grant execute on function public.mj_estado() to authenticated;
grant execute on function public.mj_abrir_cofre() to authenticated;
grant execute on function public.mj_usar_reparador_racha() to authenticated;
grant execute on function public.mj_ranking(text, text) to authenticated;
