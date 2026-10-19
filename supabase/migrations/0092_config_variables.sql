-- 0092: Variables ajustables (panel de admin "Variables") — infraestructura.
--
-- Qué hace (todo aditivo: el comportamiento actual de Gipuzkoa NO cambia):
--
--   1) config_definiciones: registro de cada variable del reglamento con su tipo,
--      rango permitido, unidad y estado:
--        'activa'        la base de datos YA lee su valor de la tabla: editable.
--        'pendiente_sql' el valor sigue escrito a mano en una función SQL (se
--                        indica cuál): se ve en el panel pero NO se puede editar,
--                        para que el panel nunca diga una cosa y el juego otra.
--        'economia'      igual que la anterior, pero se deja para una fase
--                        posterior a propósito (cláusulas, blindaje, capitán).
--   2) Valor global = game_config (la tabla de siempre). Sobrescritura por liga
--      = config_liga (solo para las variables con permite_liga).
--   3) config_historial: valor anterior, quién y cuándo. Lo escribe un trigger,
--      así que queda registrado aunque alguien toque game_config a mano desde
--      el SQL Editor o con la API. config_deshacer() revierte el último cambio.
--   4) Validación en la base de datos (tipo y rango), no solo en el formulario.
--   5) Permisos: solo root (puede_editar_config). Cuando existan admins
--      regionales, basta cambiar esa función para que editen SOLO su liga; está
--      preparada pero NO activada.
--
-- Diseñado y NO implementado: "vigencia desde la siguiente jornada". Se haría con
-- una tabla config_pendiente (clave, league_id, valor, desde_jornada) aplicada
-- por el cierre de jornada (0071). Hoy los cambios son inmediatos.
--
-- Impacto en datos existentes: ninguno. Crea tablas nuevas y un trigger sobre
-- game_config que solo valida y registra. Se puede lanzar con `supabase db push`.
-- Requiere: es_root() (0005) y leagues (0015). Orden respecto a 0075/0086/0089:
-- indiferente (las variables que aún no existan en game_config muestran su valor
-- por defecto).

-- 1) Registro de variables ----------------------------------------------------
create table if not exists public.config_definiciones (
  clave text primary key,
  grupo text not null,
  etiqueta text not null,
  descripcion text,
  tipo text not null check (tipo in ('entero', 'decimal', 'booleano')),
  minimo numeric,
  maximo numeric,
  unidad text,
  valor_defecto jsonb not null,
  permite_liga boolean not null default false,
  estado text not null default 'activa' check (estado in ('activa', 'pendiente_sql', 'economia')),
  funcion_sql text,
  orden integer not null default 0
);

alter table public.config_definiciones enable row level security;

drop policy if exists "ver definiciones de config" on public.config_definiciones;
create policy "ver definiciones de config" on public.config_definiciones
  for select to authenticated using (true);
-- Sin políticas de escritura: solo las migraciones (y la service role) la tocan.

-- 2) Sobrescritura por liga e historial ----------------------------------------
create table if not exists public.config_liga (
  league_id uuid not null references public.leagues (id) on delete cascade,
  clave text not null references public.config_definiciones (clave),
  valor jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (league_id, clave)
);

alter table public.config_liga enable row level security;

drop policy if exists "ver config de mis ligas" on public.config_liga;
create policy "ver config de mis ligas" on public.config_liga
  for select to authenticated
  using (
    public.es_root()
    or league_id in (select league_id from public.fantasy_teams where owner_id = auth.uid())
  );
-- Sin políticas de escritura: se escribe con config_guardar() (security definer).

create table if not exists public.config_historial (
  id bigint generated always as identity primary key,
  clave text not null,                -- clave de la variable, o 'categorias'
  league_id uuid,                     -- null = valor global (sin FK: sobrevive a la liga)
  valor_anterior jsonb,               -- null = no había valor (usaba el defecto)
  valor_nuevo jsonb,                  -- null = se quitó la sobrescritura / el valor
  cambiado_por uuid,
  cambiado_en timestamptz not null default now(),
  revierte_id bigint,                 -- si es un "deshacer", el cambio que revierte
  motivo text
);

create index if not exists config_historial_clave_idx
  on public.config_historial (clave, league_id, id desc);
create index if not exists config_historial_fecha_idx
  on public.config_historial (cambiado_en desc);

alter table public.config_historial enable row level security;

drop policy if exists "root ve el historial de config" on public.config_historial;
create policy "root ve el historial de config" on public.config_historial
  for select to authenticated using (public.es_root());

-- 3) Permisos -----------------------------------------------------------------------
-- Hoy solo root. Con admins regionales (plan de escalabilidad, punto 3) sería:
--   public.es_root() or (p_league_id is not null and exists (
--     select 1 from admins_liga where user_id = auth.uid() and league_id = p_league_id))
-- y los valores GLOBALES (p_league_id null) seguirían siendo solo de root.
create or replace function public.puede_editar_config(p_league_id uuid default null)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.es_root();
$$;

-- 4) Validación (tipo, rango, coherencias) --------------------------------------
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
begin
  select * into d from public.config_definiciones where clave = p_clave;
  if not found then
    return; -- clave sin definición (p. ej. nivel_curva): no se valida aquí
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

-- 5) Lectura del valor efectivo (la usan las funciones SQL) -----------------------
-- Orden: sobrescritura de la liga -> valor global (game_config) -> defecto del
-- registro. Devuelve null si la clave no existe en ningún sitio.
create or replace function public.config_valor(p_clave text, p_league_id uuid default null)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select cl.valor from public.config_liga cl
      where p_league_id is not null and cl.league_id = p_league_id and cl.clave = p_clave),
    (select gc.valor from public.game_config gc where gc.clave = p_clave),
    (select d.valor_defecto from public.config_definiciones d where d.clave = p_clave)
  );
$$;

-- Atajo numérico con respaldo: si algo falla o falta, devuelve p_respaldo (el valor
-- que tenía el código antes de este cambio), así que una variable mal puesta nunca
-- puede romper un fichaje ni un cambio de titular.
create or replace function public.config_num(p_clave text, p_league_id uuid, p_respaldo numeric)
returns numeric
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v jsonb;
begin
  v := public.config_valor(p_clave, p_league_id);
  if v is null or jsonb_typeof(v) <> 'number' then
    return p_respaldo;
  end if;
  return (v #>> '{}')::numeric;
exception when others then
  return p_respaldo;
end;
$$;

-- 6) Triggers: validan y sellan (BEFORE) y registran (AFTER) ----------------------
-- El registro va en AFTER a propósito: un `insert ... on conflict do nothing`
-- (como hacen otras migraciones) no dispara el AFTER si la fila ya existía, y así
-- no queda un cambio fantasma en el historial.
create or replace function public.config_validar_trg()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  d public.config_definiciones%rowtype;
  v_liga uuid := null;
begin
  if tg_table_name = 'config_liga' then
    v_liga := new.league_id;
  end if;

  select * into d from public.config_definiciones where clave = new.clave;
  if found then
    if d.estado <> 'activa' then
      raise exception '% todavía no se puede cambiar desde aquí: el juego lo lee de la función %.',
        d.etiqueta, coalesce(d.funcion_sql, 'SQL');
    end if;
    if v_liga is not null and not d.permite_liga then
      raise exception '% es una variable global: no admite valor por liga.', d.etiqueta;
    end if;
    perform public.config_validar(new.clave, new.valor);
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function public.config_historial_trg()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga uuid := null;
  v_clave text;
  v_antes jsonb;
  v_despues jsonb;
begin
  if tg_table_name = 'config_liga' then
    v_liga := coalesce(new.league_id, old.league_id);
  end if;
  v_clave := coalesce(new.clave, old.clave);
  v_antes := case when tg_op = 'INSERT' then null else old.valor end;
  v_despues := case when tg_op = 'DELETE' then null else new.valor end;

  if v_antes is not distinct from v_despues then
    return null;
  end if;

  insert into public.config_historial (clave, league_id, valor_anterior, valor_nuevo,
                                       cambiado_por, revierte_id, motivo)
  values (v_clave, v_liga, v_antes, v_despues, auth.uid(),
          nullif(current_setting('config.revierte_id', true), '')::bigint,
          nullif(current_setting('config.motivo', true), ''));
  return null;
end;
$$;

drop trigger if exists config_validar_trg on public.game_config;
create trigger config_validar_trg
  before insert or update on public.game_config
  for each row execute function public.config_validar_trg();

drop trigger if exists config_historial_trg on public.game_config;
create trigger config_historial_trg
  after insert or update or delete on public.game_config
  for each row execute function public.config_historial_trg();

drop trigger if exists config_validar_trg on public.config_liga;
create trigger config_validar_trg
  before insert or update on public.config_liga
  for each row execute function public.config_validar_trg();

drop trigger if exists config_historial_trg on public.config_liga;
create trigger config_historial_trg
  after insert or update or delete on public.config_liga
  for each row execute function public.config_historial_trg();

-- 7) RPC del panel ----------------------------------------------------------------------
-- Guarda un valor. p_league_id null = global. Con p_league_id y p_valor null se
-- quita la sobrescritura de esa liga (vuelve a valer el global).
create or replace function public.config_guardar(
  p_clave text,
  p_valor jsonb,
  p_league_id uuid default null,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  d public.config_definiciones%rowtype;
begin
  if not public.puede_editar_config(p_league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes permiso para cambiar esta variable.');
  end if;

  select * into d from public.config_definiciones where clave = p_clave;
  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa variable no existe.');
  end if;
  if d.estado <> 'activa' then
    return jsonb_build_object('ok', false, 'mensaje',
      format('%s todavía no se puede cambiar desde aquí (función %s).', d.etiqueta, coalesce(d.funcion_sql, 'SQL')));
  end if;
  if p_league_id is not null and not d.permite_liga then
    return jsonb_build_object('ok', false, 'mensaje', format('%s es global: no admite valor por liga.', d.etiqueta));
  end if;
  if p_league_id is not null and not exists (select 1 from public.leagues where id = p_league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa liga no existe.');
  end if;
  if p_valor is null and p_league_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Falta el valor.');
  end if;

  perform set_config('config.motivo', coalesce(left(trim(p_motivo), 300), ''), true);
  perform set_config('config.revierte_id', '', true);

  begin
    if p_league_id is null then
      update public.game_config set valor = p_valor where clave = p_clave;
      if not found then
        insert into public.game_config (clave, valor) values (p_clave, p_valor);
      end if;
    elsif p_valor is null then
      delete from public.config_liga where league_id = p_league_id and clave = p_clave;
    else
      update public.config_liga set valor = p_valor where league_id = p_league_id and clave = p_clave;
      if not found then
        insert into public.config_liga (league_id, clave, valor) values (p_league_id, p_clave, p_valor);
      end if;
    end if;
  exception when raise_exception then
    return jsonb_build_object('ok', false, 'mensaje', sqlerrm);
  end;

  return jsonb_build_object('ok', true);
end;
$$;

-- Deshace el ÚLTIMO cambio de una variable (en su ámbito: global o esa liga). Si
-- hubo cambios posteriores hay que deshacer primero esos.
create or replace function public.config_deshacer(p_historial_id bigint)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  h public.config_historial%rowtype;
begin
  select * into h from public.config_historial where id = p_historial_id;
  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese cambio no existe.');
  end if;
  if not public.puede_editar_config(h.league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes permiso para deshacer este cambio.');
  end if;
  if exists (
    select 1 from public.config_historial x
    where x.clave = h.clave and x.league_id is not distinct from h.league_id and x.id > h.id
  ) then
    return jsonb_build_object('ok', false, 'mensaje',
      'Solo se puede deshacer el último cambio de esa variable: hay cambios posteriores.');
  end if;

  perform set_config('config.revierte_id', h.id::text, true);
  perform set_config('config.motivo', 'Deshacer cambio #' || h.id, true);

  begin
    if h.clave = 'categorias' then
      perform public.categorias_aplicar(h.league_id, coalesce(h.valor_anterior, '[]'::jsonb));
    elsif h.league_id is null then
      if h.valor_anterior is null then
        delete from public.game_config where clave = h.clave;
      else
        update public.game_config set valor = h.valor_anterior where clave = h.clave;
        if not found then
          insert into public.game_config (clave, valor) values (h.clave, h.valor_anterior);
        end if;
      end if;
    else
      if h.valor_anterior is null then
        delete from public.config_liga where league_id = h.league_id and clave = h.clave;
      else
        update public.config_liga set valor = h.valor_anterior
          where league_id = h.league_id and clave = h.clave;
        if not found then
          insert into public.config_liga (league_id, clave, valor)
          values (h.league_id, h.clave, h.valor_anterior);
        end if;
      end if;
    end if;
  exception when raise_exception then
    return jsonb_build_object('ok', false, 'mensaje', sqlerrm);
  end;

  return jsonb_build_object('ok', true);
end;
$$;

-- Listado para el panel (solo root). p_league_id null = vista global.
create or replace function public.config_listar(p_league_id uuid default null)
returns table (
  clave text,
  grupo text,
  etiqueta text,
  descripcion text,
  tipo text,
  minimo numeric,
  maximo numeric,
  unidad text,
  estado text,
  funcion_sql text,
  permite_liga boolean,
  orden integer,
  valor_defecto jsonb,
  valor_global jsonb,
  valor_liga jsonb,
  valor_efectivo jsonb
)
language sql
stable
security definer set search_path = public
as $$
  select
    d.clave, d.grupo, d.etiqueta, d.descripcion, d.tipo, d.minimo, d.maximo, d.unidad,
    d.estado, d.funcion_sql, d.permite_liga, d.orden, d.valor_defecto,
    gc.valor,
    cl.valor,
    coalesce(cl.valor, gc.valor, d.valor_defecto)
  from public.config_definiciones d
  left join public.game_config gc on gc.clave = d.clave
  left join public.config_liga cl on cl.clave = d.clave and cl.league_id = p_league_id
  where public.es_root()
  order by d.orden, d.clave;
$$;

create or replace function public.config_historial_listar(
  p_clave text default null,
  p_league_id uuid default null,
  p_limite integer default 100
)
returns table (
  id bigint,
  clave text,
  league_id uuid,
  nombre_liga text,
  valor_anterior jsonb,
  valor_nuevo jsonb,
  cambiado_por uuid,
  nombre_usuario text,
  cambiado_en timestamptz,
  revierte_id bigint,
  motivo text,
  deshacible boolean
)
language sql
stable
security definer set search_path = public
as $$
  select
    h.id, h.clave, h.league_id, l.nombre, h.valor_anterior, h.valor_nuevo, h.cambiado_por,
    p.nombre, h.cambiado_en, h.revierte_id, h.motivo,
    not exists (
      select 1 from public.config_historial x
      where x.clave = h.clave and x.league_id is not distinct from h.league_id and x.id > h.id
    )
  from public.config_historial h
  left join public.leagues l on l.id = h.league_id
  left join public.profiles p on p.id = h.cambiado_por
  where public.es_root()
    and (p_clave is null or h.clave = p_clave)
    and (p_league_id is null or h.league_id = p_league_id)
  order by h.id desc
  limit least(greatest(coalesce(p_limite, 100), 1), 500);
$$;

-- 8) Permisos de ejecución -----------------------------------------------------------------
revoke all on function public.config_validar_trg() from public, anon, authenticated;
revoke all on function public.config_historial_trg() from public, anon, authenticated;
revoke all on function public.config_validar(text, jsonb) from public, anon, authenticated;
revoke all on function public.config_valor(text, uuid) from public, anon;
revoke all on function public.config_num(text, uuid, numeric) from public, anon;
revoke all on function public.puede_editar_config(uuid) from public, anon;
revoke all on function public.config_guardar(text, jsonb, uuid, text) from public, anon;
revoke all on function public.config_deshacer(bigint) from public, anon;
revoke all on function public.config_listar(uuid) from public, anon;
revoke all on function public.config_historial_listar(text, uuid, integer) from public, anon;

grant execute on function public.config_valor(text, uuid) to authenticated;
grant execute on function public.config_num(text, uuid, numeric) to authenticated;
grant execute on function public.puede_editar_config(uuid) to authenticated;
grant execute on function public.config_guardar(text, jsonb, uuid, text) to authenticated;
grant execute on function public.config_deshacer(bigint) to authenticated;
grant execute on function public.config_listar(uuid) to authenticated;
grant execute on function public.config_historial_listar(text, uuid, integer) to authenticated;

-- 9) Catálogo de variables -------------------------------------------------------------------
-- valor_defecto = lo que aplica el SQL si no hay fila en game_config (el respaldo
-- que ya llevaban las funciones). Si cambia un respaldo en una función, cámbialo aquí.
insert into public.config_definiciones
  (clave, grupo, etiqueta, descripcion, tipo, minimo, maximo, unidad, valor_defecto, permite_liga, estado, funcion_sql, orden)
values
  -- Plantilla y titulares
  ('plantilla_max_titulares', 'Plantilla', 'Máximo de titulares por equipo',
   'No afecta a quien ya tenga más: solo bloquea poner a más titulares.',
   'entero', 1, 10, 'jugadores', '6'::jsonb, true, 'pendiente_sql', 'validar_max_titulares() (0052)', 10),
  ('plantilla_max_titulares_torneo', 'Plantilla', 'Máximo de titulares por torneo',
   'Titulares de un mismo equipo inscritos en el mismo torneo.',
   'entero', 1, 10, 'jugadores', '4'::jsonb, true, 'pendiente_sql', 'validar_titulares_por_torneo() (0048)', 11),
  ('plantilla_tamano', 'Plantilla', 'Tamaño de plantilla',
   'Máximo de jugadores en plantilla. Hoy escrito a mano en validar_composicion_plantilla().',
   'entero', 5, 20, 'jugadores', '10'::jsonb, true, 'pendiente_sql', 'validar_composicion_plantilla() (0029)', 12),
  -- Puntuación
  ('puntos_descanso', 'Puntuación', 'Puntos por descanso',
   'Puntos del titular que queda sin emparejar en una jornada.',
   'entero', 0, 10, 'puntos', '1'::jsonb, false, 'pendiente_sql', 'puntos_descanso() (0023)', 20),
  ('puntos_por_diferencia_elo', 'Puntuación', 'Tabla de puntos por diferencia de Elo',
   'Cinco tramos (29, 99, 199, 299 y más) con puntos de victoria y tablas. Escrita a mano en calcular_puntos_resultado().',
   'entero', 0, 20, 'puntos', '[[3,1],[4,2],[5,3],[7,4],[9,5]]'::jsonb, false, 'pendiente_sql', 'calcular_puntos_resultado() (0014)', 21),
  -- Economía (fase posterior)
  ('clausula_porcentaje', 'Economía', 'Cláusula (% del valor de mercado)',
   'Hoy 150 %. Escrito a mano en pagar_clausula() y player_status.',
   'decimal', 1, 10, 'x valor', '1.5'::jsonb, true, 'economia', 'pagar_clausula() / player_status (0024)', 30),
  ('clausula_multiplicador_subida', 'Economía', 'Multiplicador de subida de cláusula',
   'Cada millón pagado sube la cláusula este factor.',
   'decimal', 1, 10, 'x', '2'::jsonb, true, 'economia', 'subir_clausula() (0024)', 31),
  ('blindaje_porcentaje', 'Economía', 'Blindaje (% del valor)',
   'Coste de blindar a un jugador hasta la siguiente jornada.',
   'decimal', 0, 1, 'x valor', '0.1'::jsonb, true, 'economia', 'porcentaje_blindaje() (0033)', 32),
  ('capitan_multiplicador', 'Economía', 'Multiplicador del capitán',
   'El capitán puntúa este factor en la jornada.',
   'entero', 1, 5, 'x', '2'::jsonb, true, 'economia', 'multiplicador_capitan() (0033)', 33),
  ('limite_operaciones_periodo', 'Economía', 'Límite de operaciones por periodo',
   'Pendiente de decidir por la organización; hoy no se aplica.',
   'entero', 0, 100, 'operaciones', '3'::jsonb, true, 'economia', 'sin implementar', 34),
  ('presupuesto_inicial', 'Economía', 'Presupuesto inicial (ligas privadas)',
   'Solo afecta a los equipos que se creen a partir de ahora.',
   'decimal', 10, 5000, 'M', '250'::jsonb, false, 'activa', null, 40),
  ('presupuesto_liga_publica', 'Economía', 'Presupuesto inicial (liga pública)',
   'Solo afecta a los equipos que se creen a partir de ahora.',
   'decimal', 10, 5000, 'M', '500'::jsonb, false, 'activa', null, 41),
  -- Racha diaria
  ('recompensa_diaria', 'Racha diaria', 'Recompensa diaria',
   'Se ingresa a todos los equipos del usuario.',
   'decimal', 0, 10, 'M', '1'::jsonb, false, 'activa', null, 50),
  ('racha_dias_cofre', 'Racha diaria', 'Días para el cofre',
   'Cada cuántos días seguidos toca cofre.',
   'entero', 2, 30, 'días', '7'::jsonb, false, 'activa', null, 51),
  ('cofre_min', 'Racha diaria', 'Cofre: mínimo',
   'Premio mínimo del cofre. No puede superar al máximo.',
   'decimal', 0, 50, 'M', '5'::jsonb, false, 'activa', null, 52),
  ('cofre_max', 'Racha diaria', 'Cofre: máximo',
   'Premio máximo del cofre. No puede ser menor que el mínimo.',
   'decimal', 0, 100, 'M', '10'::jsonb, false, 'activa', null, 53),
  -- Niveles
  ('xp_por_punto', 'Niveles y XP', 'XP por punto de jornada', null,
   'entero', 0, 20, 'XP', '3'::jsonb, false, 'activa', null, 60),
  ('xp_login', 'Niveles y XP', 'XP por iniciar sesión (al día)', null,
   'entero', 0, 100, 'XP', '10'::jsonb, false, 'activa', null, 61),
  ('xp_cofre', 'Niveles y XP', 'XP por abrir el cofre', null,
   'entero', 0, 1000, 'XP', '100'::jsonb, false, 'activa', null, 62),
  -- Chat
  ('chat_dias_conservacion', 'Chat', 'Retención de mensajes',
   'Debe coincidir con la Política de privacidad (lib/legal/privacidad.ts). Si lo cambias, actualiza el texto legal.',
   'entero', 7, 365, 'días', '90'::jsonb, false, 'activa', null, 70),
  ('chat_max_denuncias_dia', 'Chat', 'Denuncias máximas por usuario y día',
   'Debe coincidir con las Condiciones de uso. Si lo cambias, actualiza el texto legal.',
   'entero', 1, 20, 'denuncias', '3'::jsonb, false, 'activa', null, 71),
  ('chat_dias_denuncias', 'Chat', 'Conservación de denuncias resueltas',
   null, 'entero', 30, 1825, 'días', '365'::jsonb, false, 'activa', null, 72),
  ('chat_max_caracteres', 'Chat', 'Caracteres por mensaje',
   null, 'entero', 50, 1000, 'caracteres', '300'::jsonb, false, 'activa', null, 73),
  ('chat_segundos_entre_mensajes', 'Chat', 'Segundos entre mensajes',
   null, 'entero', 0, 60, 's', '2'::jsonb, false, 'activa', null, 74),
  ('chat_max_por_minuto', 'Chat', 'Mensajes máximos por minuto',
   null, 'entero', 1, 60, 'mensajes', '10'::jsonb, false, 'activa', null, 75),
  ('chat_minutos_edicion', 'Chat', 'Minutos para editar un mensaje',
   null, 'entero', 1, 1440, 'min', '30'::jsonb, false, 'activa', null, 76),
  ('chat_nivel_minimo_publico', 'Chat', 'Nivel mínimo para escribir en el chat público',
   null, 'entero', 1, 50, 'nivel', '1'::jsonb, false, 'activa', null, 77)
on conflict (clave) do nothing;
