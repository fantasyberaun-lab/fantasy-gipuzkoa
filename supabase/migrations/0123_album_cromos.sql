-- 0123: álbum de cromos (Fase 3 del plan de engagement, "coleccionismo").
--
-- Coleccionas el cromo de cada jugador que ha pasado por tu plantilla (en
-- cualquiera de tus ligas). Es puramente cosmético: no afecta a puntos ni al
-- mercado. La rareza se deduce del Elo.
--
-- Privacidad (hay menores): la carta SOLO muestra datos ya públicos en la app
-- (nombre, club, Elo, categoría). Nunca edad, año de nacimiento ni fotos; no se
-- añade ningún dato personal nuevo, así que no cambia la política de privacidad.
--
-- Todo se deriva en el momento (no hay tabla de propiedad): "conseguido" = el
-- jugador tiene (o tuvo) un hueco en squad_slots de algún equipo tuyo.
--
-- Impacto en datos existentes: ninguno. Solo crea funciones. Se puede lanzar con
-- `supabase db push` o en el SQL Editor.

-- Rareza por Elo (umbrales pensados para el campeonato local; cosmético, fáciles
-- de ajustar). Elo 0 (sin Elo) cae en 'comun'.
create or replace function public.rareza_por_elo(p_elo integer)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_elo, 0) >= 2000 then 'legendario'
    when coalesce(p_elo, 0) >= 1700 then 'epico'
    when coalesce(p_elo, 0) >= 1400 then 'raro'
    else 'comun'
  end;
$$;

-- El álbum del manager actual: todos los jugadores coleccionables (activos) con
-- si los tiene conseguidos o no.
create or replace function public.album_coleccion()
returns table (
  player_id uuid,
  nombre text,
  club text,
  elo integer,
  categoria text,
  rareza text,
  conseguido boolean
)
language sql
stable
security definer set search_path = public
as $$
  select
    p.id as player_id,
    p.nombre,
    p.club,
    p.elo,
    p.categoria::text as categoria,
    public.rareza_por_elo(p.elo) as rareza,
    exists (
      select 1
      from squad_slots ss
      join fantasy_teams ft on ft.id = ss.fantasy_team_id
      where ss.player_id = p.id and ft.owner_id = auth.uid()
    ) as conseguido
  from players p
  where p.activo = true
  order by conseguido desc, p.elo desc, p.nombre;
$$;

revoke all on function public.rareza_por_elo(integer) from public, anon;
grant execute on function public.rareza_por_elo(integer) to authenticated;
revoke all on function public.album_coleccion() from public, anon;
grant execute on function public.album_coleccion() to authenticated;
