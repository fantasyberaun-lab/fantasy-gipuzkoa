-- 1) Arregla el registro, roto desde 0015_ligas.sql: handle_new_user
--    creaba un fantasy_teams sin liga, y league_id es NOT NULL desde
--    entonces. El equipo ya no se crea en el registro (no sabemos en
--    qué liga meterlo) — se crea después, al llamar a crear_liga() o
--    unirse_liga() desde la pantalla de LigaGate.
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

  return new;
end;
$$;

-- 2) mis_ligas() (0015) pasa a incluir el saldo de cada equipo, para
--    que el selector de liga activa en el frontend no necesite una
--    segunda consulta.
create or replace function public.mis_ligas()
returns table (
  liga_id uuid,
  nombre text,
  codigo text,
  miembros integer,
  max_miembros integer,
  equipo_id uuid,
  nombre_equipo text,
  saldo numeric
)
language sql
security definer set search_path = public
as $$
  select
    l.id,
    l.nombre,
    l.codigo,
    (select count(*) from fantasy_teams ft2 where ft2.league_id = l.id)::integer,
    l.max_miembros,
    ft.id,
    ft.nombre,
    ft.presupuesto
  from leagues l
  join fantasy_teams ft on ft.league_id = l.id
  where ft.owner_id = auth.uid()
  order by l.created_at;
$$;

grant execute on function public.mis_ligas() to authenticated;