-- Al registrarse (auth.users), crea automáticamente:
--   1. su fila en profiles (nombre + rol por defecto "manager")
--   2. su equipo en fantasy_teams (nombre elegido en el registro + presupuesto inicial)
--
-- "nombre" y "nombre_equipo" llegan como metadatos del signUp() (ver
-- app/(auth)/registro/page.tsx). Si por lo que sea faltan, se usan
-- valores por defecto para que el registro no falle.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    'manager'
  );

  insert into public.fantasy_teams (owner_id, nombre, presupuesto)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_equipo', 'Mi equipo'),
    100 -- TODO: mover el presupuesto inicial a game_config cuando exista
        -- el panel de administración para el rol root (ver lib/gameConfig.ts)
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Falta una política de INSERT explícita en profiles/fantasy_teams para
-- que el propio usuario cree su fila desde el cliente; con este trigger
-- no hace falta, porque se ejecuta con "security definer" (privilegios
-- del dueño de la función) y no como el usuario que se está registrando.
