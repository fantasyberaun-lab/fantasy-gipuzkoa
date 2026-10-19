-- 0095: Los territorios (provincias y comunidades) son ligas públicas.
--
-- Corrige 0093, que dejó Bizkaia, Araba y Euskadi como ligas PRIVADAS (con
-- plantilla inicial). Ahora todas las ligas están al mismo nivel:
--
--   1) Las ligas que ya existen (la pública y las privadas) se marcan como
--      Gipuzkoa (ambito 'provincia', region 'Gipuzkoa'), que es donde están hoy
--      los jugadores y los torneos. Las ligas privadas nuevas también (valor por
--      defecto de la columna) hasta que haya selector de territorio al crearlas.
--   2) Puede haber UNA liga pública por territorio (antes, una en total). Lo
--      fuerza un índice único sobre (ambito, region).
--   3) Bizkaia, Araba y Euskadi pasan a ser ligas PÚBLICAS, limpias y en
--      'prueba' (solo root puede tener equipo, lo impide un trigger de 0093).
--      Se borran los equipos que hubiera en ellas (el de prueba de root): al
--      borrarlos se van en cascada su plantilla inicial y su historial.
--      Las liga públicas no reparten plantilla inicial: cada manager ficha.
--   4) unirse_liga_publica(texto) sigue entrando en la pública de Gipuzkoa
--      (mismo comportamiento y mismos mensajes que hoy). Nueva
--      unirse_liga_publica(texto, liga) para entrar en la de otro territorio.
--      unirse_liga (código) pasa la liga al unirse a una pública.
--   5) El panel de categorías y el listado de territorios del admin solo
--      consideran ligas PÚBLICAS: las ligas privadas de Gipuzkoa están marcadas
--      como provincia pero no son "ligas territoriales".
--   5b) crear_liga admite ámbito y territorio opcionales: root puede crear ligas
--      PRIVADAS de otro territorio (para probar), que nacen en 'prueba'.
--   6) La pública de Gipuzkoa recibe sus tres categorías (Primera, Segunda,
--      Tercera) para poder verlas en el panel. Son las mismas que usa el juego
--      si no hay filas, así que no cambia nada.
--
-- Impacto en datos existentes: ninguno en el juego de Gipuzkoa. Solo se borran
-- los equipos de las tres ligas de prueba. Requiere 0093.

-- 1) Todo lo existente es Gipuzkoa ---------------------------------------------------
alter table public.leagues
  alter column ambito set default 'provincia',
  alter column region set default 'Gipuzkoa';

update public.leagues
set ambito = 'provincia', region = 'Gipuzkoa'
where ambito is null;

-- 2) Una pública por territorio --------------------------------------------------------
drop index if exists public.leagues_una_publica;
create unique index if not exists leagues_una_publica_por_territorio
  on public.leagues (ambito, region) where tipo = 'publica';

-- 3) Las tres ligas de prueba, públicas y limpias ----------------------------------
delete from public.fantasy_teams
where league_id in (select id from public.leagues where codigo in ('TERR-BIZKAIA', 'TERR-ARABA', 'TERR-EUSKADI'));

update public.leagues
set tipo = 'publica', creado_por = null, max_miembros = 100000, estado = 'prueba'
where codigo in ('TERR-BIZKAIA', 'TERR-ARABA', 'TERR-EUSKADI');

-- 6) Categorías de las ligas públicas que aún no tengan ------------------------------
insert into public.liga_categorias (league_id, codigo, nombre, nombre_eu, nombre_en, orden)
select l.id, c.codigo, c.nombre, c.nombre_eu, c.nombre_en, c.orden
from public.leagues l
cross join (values
  ('1', 'Primera', 'Lehena', 'First', 1),
  ('2', 'Segunda', 'Bigarrena', 'Second', 2),
  ('3', 'Tercera', 'Hirugarrena', 'Third', 3)
) as c(codigo, nombre, nombre_eu, nombre_en, orden)
where l.tipo = 'publica'
  and not exists (select 1 from public.liga_categorias x where x.league_id = l.id);

-- 4) Entrar en una liga pública --------------------------------------------------------
-- Misma lógica y mismos mensajes que 0036; solo cambia que la liga se elige por id
-- (y el bloqueo de altas es por liga, no global).
create or replace function public.unirse_liga_publica(p_nombre_equipo text, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga leagues%rowtype;
  v_nombre text := trim(coalesce(p_nombre_equipo, ''));
  v_presupuesto numeric;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Tienes que iniciar sesión.');
  end if;

  if v_nombre = '' then
    return jsonb_build_object('ok', false, 'mensaje', 'El nombre del equipo no puede estar vacío.');
  end if;

  select * into v_liga from leagues where id = p_league_id and tipo = 'publica';
  if v_liga.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'La liga pública no está disponible.');
  end if;

  -- Serializa las altas de esta liga para que dos equipos no cojan el mismo nombre a la vez.
  perform pg_advisory_xact_lock(hashtextextended('alta-liga-publica:' || v_liga.id::text, 0));

  if exists (select 1 from fantasy_teams where owner_id = auth.uid() and league_id = v_liga.id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya estás en la liga pública.');
  end if;

  if exists (
    select 1 from fantasy_teams
    where league_id = v_liga.id and lower(nombre) = lower(v_nombre)
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya hay un equipo con ese nombre en la liga pública. Elige otro.');
  end if;

  select valor::text::numeric into v_presupuesto
  from game_config where clave = 'presupuesto_liga_publica';

  insert into fantasy_teams (owner_id, league_id, nombre, presupuesto)
  values (auth.uid(), v_liga.id, v_nombre, coalesce(v_presupuesto, 500));

  -- Sin plantilla inicial: cada manager la construye desde cero en el Mercado.
  return jsonb_build_object('ok', true, 'liga_id', v_liga.id, 'nombre_liga', v_liga.nombre);
end;
$$;

revoke all on function public.unirse_liga_publica(text, uuid) from public, anon;
grant execute on function public.unirse_liga_publica(text, uuid) to authenticated;

-- La versión de siempre (solo nombre) entra en la pública de Gipuzkoa.
create or replace function public.unirse_liga_publica(p_nombre_equipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from leagues
  where tipo = 'publica' and ambito = 'provincia' and region = 'Gipuzkoa';
  if v_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'La liga pública no está disponible.');
  end if;
  return public.unirse_liga_publica(p_nombre_equipo, v_id);
end;
$$;

-- unirse_liga (cuerpo de 0052): la única diferencia es que a una pública se entra
-- indicando la liga del código.
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
  v_nombre text := trim(coalesce(p_nombre_equipo, ''));
begin
  if v_nombre = '' then
    return jsonb_build_object('ok', false, 'mensaje', 'El nombre del equipo no puede estar vacío.');
  end if;

  select * into v_liga from leagues where codigo = upper(trim(p_codigo));
  if v_liga.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No existe ninguna liga con ese código.');
  end if;

  if v_liga.tipo = 'publica' then
    return public.unirse_liga_publica(v_nombre, v_liga.id);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_liga.id::text, 0));

  if exists (select 1 from fantasy_teams where owner_id = auth.uid() and league_id = v_liga.id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya estás en esta liga.');
  end if;

  select count(*) into v_miembros_actuales from fantasy_teams where league_id = v_liga.id;
  if v_miembros_actuales >= v_liga.max_miembros then
    return jsonb_build_object('ok', false, 'mensaje', 'Esta liga ya está completa.');
  end if;

  if exists (
    select 1 from fantasy_teams
    where league_id = v_liga.id and lower(btrim(nombre)) = lower(v_nombre)
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya hay un equipo con ese nombre en esta liga. Elige otro.');
  end if;

  select coalesce(valor::text::numeric, 250)
  into v_presupuesto_inicial
  from game_config where clave = 'presupuesto_inicial';

  insert into fantasy_teams (owner_id, league_id, nombre, presupuesto)
  values (auth.uid(), v_liga.id, v_nombre, coalesce(v_presupuesto_inicial, 250))
  returning id into v_equipo_id;

  perform public.asignar_plantilla_inicial(v_equipo_id, v_liga.id);

  return jsonb_build_object('ok', true, 'liga_id', v_liga.id, 'nombre_liga', v_liga.nombre);
end;
$$;

-- 5) Solo las ligas públicas son "ligas territoriales" ----------------------------
create or replace function public.ligas_territoriales_admin()
returns table (
  id uuid,
  nombre text,
  codigo text,
  ambito text,
  region text,
  estado text,
  miembros integer,
  categorias jsonb
)
language sql
stable
security definer set search_path = public
as $$
  select l.id, l.nombre, l.codigo, l.ambito, l.region, l.estado,
         (select count(*) from public.fantasy_teams ft where ft.league_id = l.id)::integer,
         public.categorias_json(l.id)
  from public.leagues l
  where public.es_root() and l.ambito is not null and l.tipo = 'publica'
  order by case l.ambito when 'pais' then 0 when 'comunidad' then 1 else 2 end,
           l.region, l.nombre;
$$;

create or replace function public.categorias_guardar(p_league_id uuid, p_categorias jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_n integer;
  v_lista jsonb;
  v_antes jsonb;
begin
  if not public.puede_editar_config(p_league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes permiso para cambiar las categorías de esta liga.');
  end if;
  if not exists (select 1 from public.leagues where id = p_league_id and ambito is not null and tipo = 'publica') then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo se pueden definir categorías en las ligas públicas de cada territorio.');
  end if;
  if p_categorias is null or jsonb_typeof(p_categorias) <> 'array' then
    return jsonb_build_object('ok', false, 'mensaje', 'Las categorías deben ser una lista.');
  end if;

  v_n := jsonb_array_length(p_categorias);
  if v_n < 1 or v_n > 12 then
    return jsonb_build_object('ok', false, 'mensaje', 'Tiene que haber entre 1 y 12 categorías.');
  end if;

  select jsonb_agg(jsonb_build_object(
           'codigo', lower(trim(e.value->>'codigo')),
           'nombre', trim(e.value->>'nombre'),
           'nombre_eu', nullif(trim(e.value->>'nombre_eu'), ''),
           'nombre_en', nullif(trim(e.value->>'nombre_en'), ''),
           'orden', e.ord) order by e.ord)
  into v_lista
  from jsonb_array_elements(p_categorias) with ordinality as e(value, ord);

  if exists (
    select 1 from jsonb_array_elements(v_lista) x
    where coalesce(x->>'codigo', '') !~ '^[a-z0-9_-]{1,20}$'
  ) then
    return jsonb_build_object('ok', false, 'mensaje',
      'Cada categoría necesita un código de 1 a 20 caracteres (letras minúsculas, números, - o _).');
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_lista) x
    where char_length(coalesce(x->>'nombre', '')) not between 1 and 40
       or char_length(coalesce(x->>'nombre_eu', '')) > 40
       or char_length(coalesce(x->>'nombre_en', '')) > 40
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'Cada nombre debe tener entre 1 y 40 caracteres.');
  end if;
  if (select count(distinct x->>'codigo') from jsonb_array_elements(v_lista) x) <> v_n then
    return jsonb_build_object('ok', false, 'mensaje', 'Hay códigos de categoría repetidos.');
  end if;

  v_antes := public.categorias_json(p_league_id);
  perform public.categorias_aplicar(p_league_id, v_lista);

  if v_antes is distinct from public.categorias_json(p_league_id) then
    insert into public.config_historial (clave, league_id, valor_anterior, valor_nuevo, cambiado_por, motivo)
    values ('categorias', p_league_id, v_antes, public.categorias_json(p_league_id), auth.uid(), null);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- 5b) crear_liga con territorio opcional ----------------------------------------------
-- Cuerpo de producción (0026) con una sola novedad: dos parámetros opcionales
-- (ámbito y territorio). Sin ellos funciona exactamente igual que hoy (la liga
-- nace como Gipuzkoa). Con ellos solo puede crear root, y la liga nace en estado
-- 'prueba'. Se sustituye la versión de dos parámetros por esta, en la misma
-- migración, para que una llamada con dos argumentos no sea ambigua.
drop function if exists public.crear_liga(text, text);

create or replace function public.crear_liga(
  p_nombre_liga text,
  p_nombre_equipo text,
  p_ambito text default null,
  p_region text default null
)
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

  if p_ambito is not null or p_region is not null then
    if not public.es_root() then
      return jsonb_build_object('ok', false, 'mensaje', 'Todavía no se pueden crear ligas en este territorio.');
    end if;
    if p_ambito not in ('provincia', 'comunidad') or coalesce(trim(p_region), '') = '' then
      return jsonb_build_object('ok', false, 'mensaje', 'Territorio no válido.');
    end if;
  end if;

  v_codigo := public.generar_codigo_liga();

  if p_region is null then
    insert into leagues (nombre, codigo, creado_por)
    values (trim(p_nombre_liga), v_codigo, auth.uid())
    returning id into v_liga_id;
  else
    insert into leagues (nombre, codigo, creado_por, ambito, region, estado)
    values (trim(p_nombre_liga), v_codigo, auth.uid(), p_ambito, trim(p_region), 'prueba')
    returning id into v_liga_id;
  end if;

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

revoke all on function public.crear_liga(text, text, text, text) from public, anon;
grant execute on function public.crear_liga(text, text, text, text) to authenticated;
