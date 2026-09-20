-- Inicio de sesión con nombre de usuario (además de con email).
--
-- Se reutiliza profiles.nombre como "nombre de usuario". Para que pueda
-- identificar a alguien sin ambigüedad tiene que ser:
--   - único sin distinguir mayúsculas ("Iker" = "iker"),
--   - sin "@" (así, en el campo de login, "algo@algo" es un email y
--     cualquier otra cosa es un nombre de usuario).

-- 1) Limpieza de lo que ya existe, para que los índices de abajo no fallen:
--    se quitan las "@" y a los duplicados se les añade un sufijo corto.
update profiles
set nombre = coalesce(nullif(trim(replace(nombre, '@', '')), ''), 'usuario');

with repetidos as (
  select id,
         row_number() over (partition by lower(nombre) order by created_at, id) as n
  from profiles
)
update profiles p
set nombre = p.nombre || '_' || substr(p.id::text, 1, 4)
from repetidos r
where r.id = p.id and r.n > 1;

-- 2) Reglas nuevas.
create unique index if not exists profiles_nombre_unico on profiles (lower(nombre));

alter table profiles
  add constraint profiles_nombre_sin_arroba check (position('@' in nombre) = 0);

-- 3) ¿Está libre este nombre de usuario? La usa el formulario de registro
--    (antes de crear la cuenta) para avisar con un mensaje claro en vez del
--    error genérico del trigger. Solo devuelve sí/no.
create or replace function public.nombre_usuario_disponible(p_nombre text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select not exists (
    select 1 from profiles where lower(nombre) = lower(trim(p_nombre))
  );
$$;

grant execute on function public.nombre_usuario_disponible(text) to anon, authenticated;

-- 4) Email asociado a un nombre de usuario. Esta función NO debe poder
--    llamarla nadie desde el navegador (la anon key es pública y
--    permitiría sacar el email de cualquiera): solo el servidor, con la
--    service role key, desde app/api/login/route.ts.
create or replace function public.email_por_nombre_usuario(p_nombre text)
returns text
language sql
security definer set search_path = public, auth
stable
as $$
  select u.email::text
  from profiles p
  join auth.users u on u.id = p.id
  where lower(p.nombre) = lower(trim(p_nombre))
  limit 1;
$$;

revoke all on function public.email_por_nombre_usuario(text) from public, anon, authenticated;
grant execute on function public.email_por_nombre_usuario(text) to service_role;
