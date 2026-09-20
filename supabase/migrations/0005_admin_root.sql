-- Prepara el terreno para el perfil de administrador (rol "root" de
-- profiles, ya definido desde 0001_init.sql pero sin usar todavía) y
-- añade el identificador FIDE de cada jugador, presente en los listados
-- oficiales y útil para no duplicar jugadores en futuras importaciones.

alter table players add column if not exists fide_id text;

-- Función de ayuda: ¿el usuario actual es root? Se usa en las políticas
-- de abajo y se puede reutilizar desde el código de la app si hace falta.
create or replace function public.es_root()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and rol = 'root'
  );
$$;

grant execute on function public.es_root() to authenticated;

-- Solo el rol root puede dar de alta/editar/borrar jugadores, jornadas y
-- resultados oficiales. El resto de la app (managers normales) los sigue
-- viendo con las políticas de lectura pública que ya existían.
create policy "root gestiona jugadores" on players
  for all using (public.es_root()) with check (public.es_root());

create policy "root gestiona jornadas" on matchdays
  for all using (public.es_root()) with check (public.es_root());

create policy "root gestiona resultados" on results
  for all using (public.es_root()) with check (public.es_root());

create policy "root gestiona la configuracion del juego" on game_config
  for all using (public.es_root()) with check (public.es_root());

-- Nota: las políticas "for all" ya cubren SELECT, así que a partir de
-- ahora players/matchdays/results/game_config tienen DOS políticas de
-- lectura solapadas (la pública de 0001 + esta): no hay conflicto, basta
-- con que una de las dos permita el acceso.
