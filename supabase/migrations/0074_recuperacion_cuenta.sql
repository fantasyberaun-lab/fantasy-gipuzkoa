-- 0074: recuperación de cuenta ("He olvidado la contraseña").
--
-- Flujo:
--   1) El manager escribe su email en /recuperar. POST /api/recuperar (servidor,
--      con la service role key) genera una contraseña temporal, guarda AQUÍ solo
--      su hash (sha256) con caducidad, y le manda un email con su nombre de usuario
--      y la contraseña temporal.
--   2) La contraseña de siempre NO se toca al pedir la recuperación. Solo si el
--      manager inicia sesión con la temporal (POST /api/login) se canjea: se marca
--      como usada y pasa a ser su contraseña de Supabase Auth. Así nadie puede
--      dejar fuera a otro manager solo con conocer su email.
--   3) Después la cambia desde Mi perfil (esa pantalla ya existe).
--
-- Nadie accede a esto desde el navegador: la tabla tiene RLS activada y sin
-- políticas, y la función de abajo solo la puede ejecutar la service role.
-- Las filas se borran solas al eliminar la cuenta (on delete cascade).

create table if not exists public.recuperaciones_cuenta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  clave_hash text not null, -- sha256 en hexadecimal; nunca la contraseña en claro
  creada_en timestamptz not null default now(),
  caduca_en timestamptz not null,
  usada_en timestamptz
);

create index if not exists recuperaciones_cuenta_user_idx
  on public.recuperaciones_cuenta (user_id, creada_en desc);

create index if not exists recuperaciones_cuenta_creada_idx
  on public.recuperaciones_cuenta (creada_en);

alter table public.recuperaciones_cuenta enable row level security;

-- Usuario (id y nombre de usuario) a partir de su email. Igual que
-- email_por_nombre_usuario (0009): NO debe poder llamarla nadie desde el
-- navegador, porque permitiría saber qué emails están registrados. Solo el
-- servidor, con la service role key (app/api/recuperar y app/api/login).
create or replace function public.usuario_por_email(p_email text)
returns table (id uuid, nombre text)
language sql
security definer set search_path = public, auth
stable
as $$
  select p.id, p.nombre::text
  from auth.users u
  join profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.usuario_por_email(text) from public, anon, authenticated;
grant execute on function public.usuario_por_email(text) to service_role;
