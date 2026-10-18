-- 0088: ver el nivel y el icono de los demás managers de tu liga.
--
-- Requiere 0086 (niveles). Hasta ahora cada usuario solo veía su propio icono. Estas
-- dos funciones devuelven, para los equipos de una liga en la que juegas, la XP
-- del dueño (el nivel se calcula en la web con la misma curva, lib/niveles.ts) y el
-- icono que tiene puesto. No devuelven nada de ligas en las que no juegas (salvo
-- root), igual que el resto de datos de otros managers.
--
--   - niveles_de_liga(liga): todos los equipos de la liga (clasificación).
--   - nivel_equipo(equipo): un solo equipo (perfil de un manager).
--
-- No es un dato personal nuevo: es el icono elegido de una lista cerrada y un
-- nivel de juego, y ya se ve en la clasificación y en el perfil.
--
-- Impacto en datos existentes: ninguno. Solo crea dos funciones de lectura. Se
-- puede lanzar con `supabase db push` o pegándola en el SQL Editor.

create or replace function public.niveles_de_liga(p_liga uuid)
returns table (equipo_id uuid, xp integer, avatar text)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para ver los niveles.';
  end if;

  if not (
    public.es_root()
    or exists (
      select 1 from fantasy_teams m where m.league_id = p_liga and m.owner_id = auth.uid()
    )
  ) then
    return;
  end if;

  return query
  select ft.id, coalesce(x.xp, 0), pr.avatar
  from fantasy_teams ft
  left join xp_usuarios x on x.user_id = ft.owner_id
  left join profiles pr on pr.id = ft.owner_id
  where ft.league_id = p_liga;
end;
$$;

create or replace function public.nivel_equipo(p_equipo uuid)
returns table (equipo_id uuid, xp integer, avatar text)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_liga uuid;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para ver los niveles.';
  end if;

  select t.league_id into v_liga from fantasy_teams t where t.id = p_equipo;
  if v_liga is null then
    return;
  end if;

  if not (
    public.es_root()
    or exists (
      select 1 from fantasy_teams m where m.league_id = v_liga and m.owner_id = auth.uid()
    )
  ) then
    return;
  end if;

  return query
  select ft.id, coalesce(x.xp, 0), pr.avatar
  from fantasy_teams ft
  left join xp_usuarios x on x.user_id = ft.owner_id
  left join profiles pr on pr.id = ft.owner_id
  where ft.id = p_equipo;
end;
$$;

revoke all on function public.niveles_de_liga(uuid) from public, anon;
grant execute on function public.niveles_de_liga(uuid) to authenticated;
revoke all on function public.nivel_equipo(uuid) from public, anon;
grant execute on function public.nivel_equipo(uuid) to authenticated;
