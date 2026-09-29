-- Ver la plantilla de otro manager en la liga pública.
--
-- La RLS de squad_slots (0001) solo deja leer tu propia plantilla, así que
-- para enseñar las de los demás hace falta una función security definer.
-- Solo funciona en la liga pública y solo si quien pregunta tiene equipo en
-- ella. Devuelve datos que ya son públicos de cada jugador (nada de año de
-- nacimiento, ver 0031) y NO revela quién es titular ni el capitán, para que
-- nadie copie alineaciones antes de que se cree la jornada.

create or replace function public.plantilla_equipo_publica(p_equipo_id uuid)
returns table (
  id uuid,
  nombre text,
  club text,
  categoria categoria,
  elo integer,
  valor_mercado numeric,
  activo boolean,
  puntos_totales integer,
  historial_puntos jsonb
)
language sql
stable
security definer set search_path = public
as $$
  select
    p.id,
    p.nombre,
    p.club,
    p.categoria,
    p.elo,
    p.valor_mercado,
    p.activo,
    coalesce(pt.puntos_totales, 0)::integer,
    coalesce(hist.historial, '[]'::jsonb)
  from fantasy_teams ft
  join leagues l on l.id = ft.league_id and l.tipo = 'publica'
  join squad_slots ss on ss.fantasy_team_id = ft.id and ss.fecha_salida is null
  join players p on p.id = ss.player_id
  left join (
    select player_id, sum(puntos_fantasy) as puntos_totales
    from results
    group by player_id
  ) pt on pt.player_id = p.id
  left join lateral (
    select jsonb_agg(
             jsonb_build_object('jornada', m.numero, 'puntos', r.puntos_fantasy)
             order by m.numero
           ) as historial
    from results r
    join matchdays m on m.id = r.matchday_id
    where r.player_id = p.id
  ) hist on true
  where ft.id = p_equipo_id
    and exists (
      select 1 from fantasy_teams mio
      where mio.league_id = ft.league_id and mio.owner_id = auth.uid()
    )
  order by p.valor_mercado desc, p.nombre;
$$;

grant execute on function public.plantilla_equipo_publica(uuid) to authenticated;
