-- 0120 · Rendimiento: player_status calcula el porcentaje de cláusula una vez, no una por jugador.
--
-- Medido en producción (liga pública, 612 jugadores): player_status tardaba ~140 ms y de ellos
-- ~90 ms eran 612 llamadas a calcular_clausula(), cada una de las cuales busca la configuración
-- (config_num -> config_valor, con hasta 3 subconsultas y un bloque de excepciones).
-- Aquí el porcentaje se lee una sola vez (CTE `materialized`: sin esa palabra Postgres
-- reinserta la consulta y vuelve a llamarla por fila) y se aplica la MISMA fórmula que calcular_clausula:
--     ceil(coalesce(precio_pago, valor_mercado) * porcentaje) + coalesce(clausula_extra, 0)
-- La función se marca además `stable` (no escribe nada): así Postgres puede optimizarla mejor.
--
-- Qué NO cambia: nombre, argumentos, columnas devueltas, permisos (CREATE OR REPLACE los conserva),
-- seguridad (sigue siendo SECURITY DEFINER con el mismo search_path) ni el resultado.
-- Comprobado antes de publicar con las 18 ligas de producción: 11.016 filas, ninguna diferencia
-- entre la función antigua y la nueva (comparación fila a fila con EXCEPT ALL).
-- Tiempo medido en la liga pública: ~140 ms -> ~40 ms.
--
-- Para deshacerlo: volver a ejecutar la definición de 0114_player_status_caducidad.sql.

create or replace function public.player_status(p_league_id uuid)
returns table(
  id uuid,
  nombre text,
  club text,
  categoria categoria,
  elo integer,
  valor_mercado numeric,
  activo boolean,
  puntos_totales integer,
  propietario_team_id uuid,
  propietario_nombre text,
  clausula numeric,
  candado boolean,
  blindado boolean,
  historial_puntos jsonb,
  candado_hasta timestamp with time zone,
  blindado_hasta timestamp with time zone
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with cfg as materialized (
    select public.config_num('clausula_porcentaje', p_league_id, 1.1) as pct
  )
  select
    p.id,
    p.nombre,
    p.club,
    p.categoria,
    p.elo,
    p.valor_mercado,
    p.activo,
    coalesce(pt.puntos_totales, 0)::integer as puntos_totales,
    owner.fantasy_team_id as propietario_team_id,
    ft.nombre as propietario_nombre,
    ceil(coalesce(owner.precio_pago, p.valor_mercado) * cfg.pct) + coalesce(owner.clausula_extra, 0) as clausula,
    coalesce(owner.candado and coalesce(owner.candado_hasta, 'infinity'::timestamptz) > now(), false) as candado,
    coalesce(owner.blindado and coalesce(owner.blindado_hasta, 'infinity'::timestamptz) > now(), false) as blindado,
    coalesce(hist.historial, '[]'::jsonb) as historial_puntos,
    case when owner.candado and coalesce(owner.candado_hasta, 'infinity'::timestamptz) > now() then owner.candado_hasta end as candado_hasta,
    case when owner.blindado and coalesce(owner.blindado_hasta, 'infinity'::timestamptz) > now() then owner.blindado_hasta end as blindado_hasta
  from players p
  cross join cfg
  left join lateral (
    select ss.fantasy_team_id, ss.clausula_extra, ss.precio_pago, ss.candado, ss.candado_hasta, ss.blindado, ss.blindado_hasta
    from squad_slots ss
    where ss.player_id = p.id
      and ss.league_id = p_league_id
      and ss.fecha_salida is null
    limit 1
  ) owner on true
  left join fantasy_teams ft on ft.id = owner.fantasy_team_id
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
  ) hist on true;
$function$;
