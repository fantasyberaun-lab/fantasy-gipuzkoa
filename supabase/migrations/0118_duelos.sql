-- 0118: duelos cara a cara (Fase 1 del plan de engagement, "picos emocionales").
--
-- En las ligas privadas, cada jornada enfrenta a los managers 1 contra 1: gana
-- el duelo quien más puntos haga esa jornada. Hay una clasificación paralela por
-- victorias de duelo (liguilla: 3 por victoria, 1 por empate).
--
-- Todo se DERIVA en el momento (no se guarda nada ni hay que cerrar/liquidar):
--   - El emparejamiento sale del número de jornada con el método del círculo
--     (round-robin), así que a lo largo de la temporada todos se cruzan con todos.
--   - Los puntos de cada lado salen de team_matchday_points (0055), igual que la
--     clasificación normal.
-- La jornada en curso se ve en directo; para la liguilla solo cuentan las
-- jornadas ya CERRADAS (jornadas_cerradas, 0071).
--
-- El conjunto de equipos es el de los miembros actuales de la liga (si entra
-- gente nueva, se recalcula el emparejamiento de todas las jornadas; es un
-- compromiso aceptable para una liga de amigos).
--
-- Impacto en datos existentes: ninguno. Solo crea funciones. Se puede lanzar con
-- `supabase db push` o en el SQL Editor.

-- 1) Emparejamiento round-robin (método del círculo) ---------------------------------
-- Dado el array de equipos (ordenado y estable) y el índice de ronda (0-based),
-- devuelve los pares de esa ronda. Si hay un número impar de equipos, uno
-- descansa esa jornada (no sale en ningún par).
create or replace function public.duelos_emparejar(p_teams uuid[], p_ronda integer)
returns table (equipo_a uuid, equipo_b uuid)
language plpgsql
immutable
as $$
declare
  a uuid[] := p_teams;
  n integer := coalesce(array_length(p_teams, 1), 0);
  rondas integer;
  r integer;
  arr uuid[];
  k integer;
  i integer;
  ea uuid;
  eb uuid;
begin
  if n < 2 or p_ronda is null then
    return;
  end if;
  if n % 2 = 1 then
    a := a || null::uuid;      -- sentinela: el que caiga con él descansa
    n := n + 1;
  end if;
  rondas := n - 1;
  r := ((p_ronda % rondas) + rondas) % rondas;   -- módulo no negativo

  -- Primer equipo fijo; el resto (a[2..n]) rota según la ronda.
  arr := array[a[1]];
  for k in 1..(n - 1) loop
    arr := arr || a[2 + ((k - 1 + r) % (n - 1))];
  end loop;

  for i in 1..(n / 2) loop
    ea := arr[i];
    eb := arr[n + 1 - i];
    if ea is not null and eb is not null then
      equipo_a := ea;
      equipo_b := eb;
      return next;
    end if;
  end loop;
  return;
end;
$$;

revoke all on function public.duelos_emparejar(uuid[], integer) from public, anon;
grant execute on function public.duelos_emparejar(uuid[], integer) to authenticated;

-- 2) Duelos de la jornada actual (en directo) ----------------------------------------
create or replace function public.duelos_jornada(p_league_id uuid)
returns table (
  equipo_a uuid, nombre_a text, manager_a text, puntos_a integer,
  equipo_b uuid, nombre_b text, manager_b text, puntos_b integer,
  jornada integer, semana date, terminada boolean
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
  ),
  teams as (
    select array_agg(id order by id) as arr
    from fantasy_teams where league_id = p_league_id
  ),
  pts as (
    select tmp.fantasy_team_id, sum(tmp.puntos)::integer as puntos
    from team_matchday_points tmp
    where tmp.matchday_id in (select matchday_id from mds)
    group by tmp.fantasy_team_id
  ),
  pares as (
    select d.equipo_a, d.equipo_b
    from duelos_emparejar((select arr from teams), (select numero from ultima) - 1) d
  )
  select
    p.equipo_a, fa.nombre, pra.nombre, coalesce(pa.puntos, 0),
    p.equipo_b, fb.nombre, prb.nombre, coalesce(pb.puntos, 0),
    (select numero from ultima), (select semana from ultima), (select terminada from ultima)
  from pares p
  join fantasy_teams fa on fa.id = p.equipo_a
  join profiles pra on pra.id = fa.owner_id
  join fantasy_teams fb on fb.id = p.equipo_b
  join profiles prb on prb.id = fb.owner_id
  left join pts pa on pa.fantasy_team_id = p.equipo_a
  left join pts pb on pb.fantasy_team_id = p.equipo_b
  where exists (
    select 1 from fantasy_teams mio
    where mio.league_id = p_league_id and mio.owner_id = auth.uid()
  );
$$;

revoke all on function public.duelos_jornada(uuid) from public, anon;
grant execute on function public.duelos_jornada(uuid) to authenticated;

-- 3) Clasificación por duelos (solo jornadas cerradas) --------------------------------
create or replace function public.clasificacion_duelos(p_league_id uuid)
returns table (
  equipo_id uuid,
  nombre_equipo text,
  nombre_manager text,
  ganados integer,
  empatados integer,
  perdidos integer,
  puntos_liguilla integer
)
language sql
stable
security definer set search_path = public
as $$
  with teams as (
    select array_agg(id order by id) as arr
    from fantasy_teams where league_id = p_league_id
  ),
  jcerradas as (
    select distinct js.semana, js.numero
    from jornadas_semanales() js
    where js.terminada_en is not null
  ),
  pteam as (
    select js.semana, tmp.fantasy_team_id, sum(tmp.puntos)::integer as puntos
    from jornadas_semanales() js
    join team_matchday_points tmp on tmp.matchday_id = js.matchday_id
    group by js.semana, tmp.fantasy_team_id
  ),
  pares as (
    select jc.semana, d.equipo_a, d.equipo_b
    from jcerradas jc
    cross join lateral duelos_emparejar((select arr from teams), jc.numero - 1) d
  ),
  duelos_res as (
    select
      pr.semana, pr.equipo_a, pr.equipo_b,
      coalesce(pa.puntos, 0) as pa, coalesce(pb.puntos, 0) as pb
    from pares pr
    left join pteam pa on pa.semana = pr.semana and pa.fantasy_team_id = pr.equipo_a
    left join pteam pb on pb.semana = pr.semana and pb.fantasy_team_id = pr.equipo_b
  ),
  -- Cada duelo se desdobla en dos filas (una por equipo).
  filas as (
    select equipo_a as equipo, pa as mis, pb as suyos from duelos_res
    union all
    select equipo_b as equipo, pb as mis, pa as suyos from duelos_res
  ),
  agregado as (
    select
      equipo,
      count(*) filter (where mis > suyos)::integer as ganados,
      count(*) filter (where mis = suyos)::integer as empatados,
      count(*) filter (where mis < suyos)::integer as perdidos
    from filas
    group by equipo
  )
  select
    ft.id as equipo_id,
    ft.nombre as nombre_equipo,
    pr.nombre as nombre_manager,
    coalesce(ag.ganados, 0) as ganados,
    coalesce(ag.empatados, 0) as empatados,
    coalesce(ag.perdidos, 0) as perdidos,
    (coalesce(ag.ganados, 0) * 3 + coalesce(ag.empatados, 0))::integer as puntos_liguilla
  from fantasy_teams ft
  join profiles pr on pr.id = ft.owner_id
  left join agregado ag on ag.equipo = ft.id
  where ft.league_id = p_league_id
    and exists (
      select 1 from fantasy_teams mio
      where mio.league_id = p_league_id and mio.owner_id = auth.uid()
    )
  order by puntos_liguilla desc, ganados desc, ft.nombre;
$$;

revoke all on function public.clasificacion_duelos(uuid) from public, anon;
grant execute on function public.clasificacion_duelos(uuid) to authenticated;
