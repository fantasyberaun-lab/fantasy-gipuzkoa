-- 0117: jornada en directo (Fase 1 del plan de engagement, "picos emocionales").
--
-- Pantalla /directo: mientras se juega la última jornada (fin de semana), los
-- puntos de cada equipo de tu liga van subiendo a medida que el admin mete los
-- resultados. Se apoya en lo que ya existe:
--   - jornadas_semanales() (0071): qué rondas forman cada jornada y si está cerrada.
--   - team_matchday_points (vista, 0055): puntos por equipo y ronda (ya con capitán).
-- La "jornada en directo" es simplemente la jornada más reciente (haya o no
-- terminado). El frontend se suscribe por Realtime a `results` para refrescar.
--
-- Impacto en datos existentes: ninguno. Crea una función y añade `results` a la
-- publicación de Realtime (ya es de lectura pública, 0001). Se puede lanzar con
-- `supabase db push` o en el SQL Editor.

create or replace function public.jornada_en_directo(p_league_id uuid)
returns table (
  equipo_id uuid,
  nombre_equipo text,
  nombre_manager text,
  puntos integer,
  jornada integer,
  semana date,
  terminada boolean
)
language sql
stable
security definer set search_path = public
as $$
  with ultima as (
    select js.semana, js.numero, bool_or(js.terminada_en is not null) as terminada
    from jornadas_semanales() js
    group by js.semana, js.numero
    order by js.semana desc
    limit 1
  ),
  mds as (
    select js.matchday_id
    from jornadas_semanales() js
    join ultima u on u.semana = js.semana
  )
  select
    ft.id as equipo_id,
    ft.nombre as nombre_equipo,
    pr.nombre as nombre_manager,
    coalesce(sum(tmp.puntos), 0)::integer as puntos,
    u.numero as jornada,
    u.semana,
    u.terminada
  from fantasy_teams ft
  join profiles pr on pr.id = ft.owner_id
  cross join ultima u
  left join team_matchday_points tmp
    on tmp.fantasy_team_id = ft.id
   and tmp.matchday_id in (select matchday_id from mds)
  where ft.league_id = p_league_id
    and exists (
      select 1 from fantasy_teams mio
      where mio.league_id = p_league_id and mio.owner_id = auth.uid()
    )
  group by ft.id, ft.nombre, pr.nombre, u.numero, u.semana, u.terminada
  order by puntos desc, ft.nombre;
$$;

revoke all on function public.jornada_en_directo(uuid) from public, anon;
grant execute on function public.jornada_en_directo(uuid) to authenticated;

-- Realtime sobre results, para refrescar la pantalla en directo sin recargar.
-- results ya es de lectura pública (0001), así que la RLS de Realtime la respeta.
do $$
begin
  alter publication supabase_realtime add table public.results;
exception
  when duplicate_object then null;
end $$;
