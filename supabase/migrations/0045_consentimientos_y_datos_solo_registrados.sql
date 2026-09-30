-- 0045: cumplimiento de la Política de Privacidad v2.1 y las Condiciones de Uso.
--
-- 1) consentimientos: constancia de cada aceptación (fecha/hora del servidor y
--    versión del texto), como exige el art. 7.1 RGPD y el apartado 10 de la
--    política. A propósito NO tiene clave foránea a auth.users: el apartado 12
--    dice que la constancia se conserva tras borrar la cuenta durante el plazo
--    de prescripción, y eliminar_mi_cuenta() (0008) no la toca.
-- 2) handle_new_user(): al registrarse, guarda las aceptaciones que vienen en los
--    metadatos del signUp (ver app/(auth)/registro/page.tsx).
-- 3) registrar_aceptacion_legal(): para usuarios ya registrados (LegalGate).
-- 5) La edad deja de salir de la base de datos (apartado 4: no se publica la
--    edad). jugadores_ficha.nacimiento_texto pasa de "2004 (22 años)" a "2004"
--    (o "sub20" para menores de 20). Mismas columnas y tipos que en 0031.
--
-- 4) Datos solo para usuarios registrados (apartado 4 de la política): se quita
--    a `anon` el acceso de lectura a todas las tablas y vistas de public. La clave
--    pública de Supabase permitía leer jugadores, equipos, resultados, etc. sin
--    iniciar sesión. `authenticated` no cambia.

-- 1) Tabla ------------------------------------------------------------------
create table if not exists public.consentimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text,
  tipo text not null check (tipo in ('condiciones', 'privacidad', 'mayor_14', 'comunicaciones')),
  aceptado boolean not null,
  version text not null,
  created_at timestamptz not null default now()
);

create index if not exists consentimientos_user_idx on public.consentimientos (user_id, tipo, created_at desc);

alter table public.consentimientos enable row level security;

-- Cada usuario solo ve sus propias filas; nadie escribe desde el cliente (solo
-- las funciones security definer de abajo).
drop policy if exists "ver mis consentimientos" on public.consentimientos;
create policy "ver mis consentimientos" on public.consentimientos
  for select to authenticated using (user_id = auth.uid());

revoke all on public.consentimientos from anon, authenticated;
grant select on public.consentimientos to authenticated;

-- 2) Registro ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_v_cond text := coalesce(v_meta ->> 'version_condiciones', '');
  v_v_priv text := coalesce(v_meta ->> 'version_privacidad', '');
begin
  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    coalesce(v_meta ->> 'nombre', split_part(new.email, '@', 1)),
    'manager'
  );

  if coalesce((v_meta ->> 'acepta_legal')::boolean, false) then
    insert into public.consentimientos (user_id, email, tipo, aceptado, version)
    values
      (new.id, new.email, 'condiciones', true, v_v_cond),
      (new.id, new.email, 'privacidad', true, v_v_priv),
      (new.id, new.email, 'mayor_14', true, v_v_cond),
      (new.id, new.email, 'comunicaciones',
        coalesce((v_meta ->> 'acepta_comunicaciones')::boolean, false), v_v_priv);
  end if;

  return new;
end;
$$;

-- 3) Aceptación de usuarios ya registrados -------------------------------------
create or replace function public.registrar_aceptacion_legal(
  p_version_condiciones text,
  p_version_privacidad text,
  p_comunicaciones boolean default false
)
returns jsonb
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No has iniciado sesión.');
  end if;

  select email into v_email from auth.users where id = v_user;

  insert into public.consentimientos (user_id, email, tipo, aceptado, version)
  values
    (v_user, v_email, 'condiciones', true, p_version_condiciones),
    (v_user, v_email, 'privacidad', true, p_version_privacidad),
    (v_user, v_email, 'mayor_14', true, p_version_condiciones),
    (v_user, v_email, 'comunicaciones', coalesce(p_comunicaciones, false), p_version_privacidad);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.registrar_aceptacion_legal(text, text, boolean) from public, anon;
grant execute on function public.registrar_aceptacion_legal(text, text, boolean) to authenticated;

-- 4) Nada legible sin sesión ---------------------------------------------------
-- Las funciones que anon sí necesita (nombre_usuario_disponible) son EXECUTE y
-- no se ven afectadas. Las tablas nuevas también nacen sin acceso para anon.
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
  loop
    execute format('revoke all on public.%I from anon', r.relname);
  end loop;
end $$;

alter default privileges in schema public revoke all on tables from anon;

-- 5) Vista sin edad --------------------------------------------------------------
create or replace view public.jugadores_ficha as
with base as (
  select
    p.id,
    p.sexo,
    p.anio_nacimiento,
    coalesce(extract(year from current_date)::integer - p.anio_nacimiento, p.edad) as edad_actual
  from public.players p
)
select
  b.id,
  b.sexo,
  case
    when b.edad_actual is null then null
    when b.edad_actual < 20 then 'sub20'
    when b.anio_nacimiento is null then null
    else b.anio_nacimiento::text
  end as nacimiento_texto,
  coalesce(b.edad_actual < 20, false) as es_sub20,
  case when public.es_root() then b.anio_nacimiento end as anio_nacimiento,
  case when public.es_root() then b.edad_actual end as edad
from base b;
