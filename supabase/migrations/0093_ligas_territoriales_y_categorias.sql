-- 0093: Ligas territoriales de prueba (Bizkaia, Araba, Euskadi) y categorías por liga.
--
-- Qué hace (aditivo; las ligas y equipos actuales no cambian):
--
--   1) leagues gana tres columnas: ambito ('provincia' | 'comunidad' | 'pais'; null
--      = liga de siempre), region (texto libre) y estado ('activa' | 'prueba').
--      Una liga en 'prueba' solo admite equipos de root: lo fuerza un trigger sobre
--      fantasy_teams, no el frontend. Root las ve en su selector y el resto no.
--      Siguen siendo tipo 'privada' por dentro: la mecánica de liga territorial
--      (mercado, abierta o por tandas) se decidirá con el punto 2 del plan.
--   2) liga_categorias: nombre (es/eu/en) y orden de las categorías de CADA liga
--      territorial. Una liga sin filas usa las tres de Gipuzkoa (Primera, Segunda,
--      Tercera), así que nada cambia para las ligas existentes.
--      OJO: jugadores y torneos siguen teniendo la categoría como tipo fijo
--      ('1','2','3') y son globales. Estas categorías quedan DEFINIDAS por liga;
--      que los jugadores de una liga las usen llega con los catálogos por liga.
--   3) Crea las tres ligas de prueba, cada una con sus categorías editables.
--
-- Impacto en datos existentes: ninguno. `alter table leagues add column` con
-- valor por defecto es instantáneo y las ligas actuales quedan 'activa'/sin ámbito.
-- Requiere 0092 (historial de cambios) y es_root() (0005).

-- 1) leagues -------------------------------------------------------------------------
alter table public.leagues
  add column if not exists ambito text check (ambito in ('provincia', 'comunidad', 'pais')),
  add column if not exists region text,
  add column if not exists estado text not null default 'activa' check (estado in ('activa', 'prueba'));

-- Root ve todas las ligas (para administrar las de prueba aunque no sea miembro).
drop policy if exists "root ve todas las ligas" on public.leagues;
create policy "root ve todas las ligas" on public.leagues
  for select to authenticated using (public.es_root());

-- Una liga en 'prueba' solo admite equipos de root. Va sobre la tabla, así que
-- vale para unirse con código, crear liga o cualquier otra vía. Sin sesión de
-- usuario (service role, migraciones) no se bloquea.
create or replace function public.bloquear_equipos_en_liga_de_prueba()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null
     and exists (select 1 from public.leagues l where l.id = new.league_id and l.estado = 'prueba')
     and not public.es_root() then
    raise exception 'Esta liga todavía no está abierta.';
  end if;
  return new;
end;
$$;

revoke all on function public.bloquear_equipos_en_liga_de_prueba() from public, anon, authenticated;

drop trigger if exists bloquear_equipos_en_liga_de_prueba_trg on public.fantasy_teams;
create trigger bloquear_equipos_en_liga_de_prueba_trg
  before insert on public.fantasy_teams
  for each row execute function public.bloquear_equipos_en_liga_de_prueba();

-- 2) Categorías por liga ------------------------------------------------------------------
create table if not exists public.liga_categorias (
  league_id uuid not null references public.leagues (id) on delete cascade,
  codigo text not null check (codigo ~ '^[a-z0-9_-]{1,20}$'),
  nombre text not null check (char_length(nombre) between 1 and 40),
  nombre_eu text check (nombre_eu is null or char_length(nombre_eu) <= 40),
  nombre_en text check (nombre_en is null or char_length(nombre_en) <= 40),
  orden integer not null,
  primary key (league_id, codigo),
  unique (league_id, orden)  deferrable initially deferred
);

alter table public.liga_categorias enable row level security;

drop policy if exists "ver categorias de mis ligas" on public.liga_categorias;
create policy "ver categorias de mis ligas" on public.liga_categorias
  for select to authenticated
  using (
    public.es_root()
    or league_id in (select league_id from public.fantasy_teams where owner_id = auth.uid())
  );
-- Sin políticas de escritura: se escribe con categorias_guardar().

-- Categorías de una liga: las suyas, o las de Gipuzkoa si no tiene.
create or replace function public.categorias_liga(p_league_id uuid)
returns table (codigo text, nombre text, nombre_eu text, nombre_en text, orden integer, propias boolean)
language sql
stable
security definer set search_path = public
as $$
  select c.codigo, c.nombre, c.nombre_eu, c.nombre_en, c.orden, true
  from public.liga_categorias c
  where c.league_id = p_league_id
    and (public.es_root() or c.league_id in (select league_id from public.fantasy_teams where owner_id = auth.uid()))
  union all
  select v.codigo, v.nombre, v.nombre_eu, v.nombre_en, v.orden, false
  from (values
    ('1', 'Primera', 'Lehena', 'First', 1),
    ('2', 'Segunda', 'Bigarrena', 'Second', 2),
    ('3', 'Tercera', 'Hirugarrena', 'Third', 3)
  ) as v(codigo, nombre, nombre_eu, nombre_en, orden)
  where not exists (select 1 from public.liga_categorias c where c.league_id = p_league_id)
  order by orden;
$$;

-- Sustituye el conjunto de categorías de una liga (sin permisos: la usan
-- categorias_guardar y config_deshacer, que ya los comprueban).
create or replace function public.categorias_aplicar(p_league_id uuid, p_categorias jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.liga_categorias where league_id = p_league_id;
  insert into public.liga_categorias (league_id, codigo, nombre, nombre_eu, nombre_en, orden)
  select p_league_id, e->>'codigo', e->>'nombre',
         nullif(trim(e->>'nombre_eu'), ''), nullif(trim(e->>'nombre_en'), ''),
         (e->>'orden')::integer
  from jsonb_array_elements(p_categorias) e;
end;
$$;

revoke all on function public.categorias_aplicar(uuid, jsonb) from public, anon, authenticated;

-- Foto de las categorías de una liga como jsonb (para el historial).
create or replace function public.categorias_json(p_league_id uuid)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'codigo', codigo, 'nombre', nombre, 'nombre_eu', nombre_eu,
           'nombre_en', nombre_en, 'orden', orden) order by orden), '[]'::jsonb)
  from public.liga_categorias where league_id = p_league_id;
$$;

revoke all on function public.categorias_json(uuid) from public, anon, authenticated;

-- Guardar las categorías de una liga territorial. p_categorias es una lista:
--   [{"codigo":"a","nombre":"Primera","nombre_eu":"Lehena","nombre_en":"First"}, ...]
-- El orden es el de la lista. Entre 1 y 12 categorías, códigos únicos. Solo en
-- ligas territoriales (ambito no nulo): las ligas de Gipuzkoa no se tocan.
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
  if not exists (select 1 from public.leagues where id = p_league_id and ambito is not null) then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo se pueden definir categorías en ligas territoriales.');
  end if;
  if p_categorias is null or jsonb_typeof(p_categorias) <> 'array' then
    return jsonb_build_object('ok', false, 'mensaje', 'Las categorías deben ser una lista.');
  end if;

  v_n := jsonb_array_length(p_categorias);
  if v_n < 1 or v_n > 12 then
    return jsonb_build_object('ok', false, 'mensaje', 'Tiene que haber entre 1 y 12 categorías.');
  end if;

  -- Normaliza: orden = posición en la lista; valida código y nombre.
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

-- Ligas territoriales para el panel de admin (solo root).
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
  where public.es_root() and l.ambito is not null
  order by l.created_at, l.nombre;
$$;

revoke all on function public.categorias_liga(uuid) from public, anon;
revoke all on function public.categorias_guardar(uuid, jsonb) from public, anon;
revoke all on function public.ligas_territoriales_admin() from public, anon;
grant execute on function public.categorias_liga(uuid) to authenticated;
grant execute on function public.categorias_guardar(uuid, jsonb) to authenticated;
grant execute on function public.ligas_territoriales_admin() to authenticated;

-- 3) Las tres ligas de prueba ---------------------------------------------------------------
-- El código es largo a propósito (no se teclea por casualidad); además el trigger
-- impide que entre nadie que no sea root. creado_por queda vacío (como la pública).
insert into public.leagues (nombre, codigo, creado_por, max_miembros, ambito, region, estado)
select v.nombre, v.codigo, null, 50, v.ambito, v.region, 'prueba'
from (values
  ('Bizkaia', 'TERR-BIZKAIA', 'provincia', 'Bizkaia'),
  ('Araba',   'TERR-ARABA',   'provincia', 'Araba'),
  ('Euskadi', 'TERR-EUSKADI', 'comunidad', 'Euskadi')
) as v(nombre, codigo, ambito, region)
where not exists (select 1 from public.leagues l where l.codigo = v.codigo);

-- Cada liga arranca con una copia de las categorías de Gipuzkoa, para editarlas.
insert into public.liga_categorias (league_id, codigo, nombre, nombre_eu, nombre_en, orden)
select l.id, c.codigo, c.nombre, c.nombre_eu, c.nombre_en, c.orden
from public.leagues l
cross join (values
  ('1', 'Primera', 'Lehena', 'First', 1),
  ('2', 'Segunda', 'Bigarrena', 'Second', 2),
  ('3', 'Tercera', 'Hirugarrena', 'Third', 3)
) as c(codigo, nombre, nombre_eu, nombre_en, orden)
where l.codigo in ('TERR-BIZKAIA', 'TERR-ARABA', 'TERR-EUSKADI')
  and not exists (select 1 from public.liga_categorias x where x.league_id = l.id);
