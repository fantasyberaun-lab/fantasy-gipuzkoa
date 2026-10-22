-- 0108: guía de estreno de las misiones (se enseña una sola vez a cada usuario).
--
-- Mismo patrón que 0087 (tutorial de niveles). profiles.tutorial_misiones_visto
-- empieza en false para todos, así que cada usuario ve la guía una vez, la primera
-- vez que entra tras publicar esto. La web la marca como vista al empezar
-- (marcar_tutorial_misiones) y tutorial_misiones_visto() dice si ya se vio.
--
-- Para volver a ver la guía en pruebas:
--   update profiles set tutorial_misiones_visto = false where nombre ilike '...';
--
-- Impacto en datos existentes: añade una columna con valor por defecto y crea dos
-- funciones. No toca nada más. Se puede lanzar con `supabase db push` o pegándola
-- en el SQL Editor.

alter table public.profiles
  add column if not exists tutorial_misiones_visto boolean not null default false;

create or replace function public.marcar_tutorial_misiones()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update profiles set tutorial_misiones_visto = true where id = auth.uid();
end;
$$;

create or replace function public.tutorial_misiones_visto()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select tutorial_misiones_visto from profiles where id = auth.uid()), true);
$$;

revoke all on function public.marcar_tutorial_misiones() from public, anon;
grant execute on function public.marcar_tutorial_misiones() to authenticated;
revoke all on function public.tutorial_misiones_visto() from public, anon;
grant execute on function public.tutorial_misiones_visto() to authenticated;
