-- 0122 · Rendimiento: clasificacion() calcula solo los equipos de la liga pedida.
--
-- Medido en producción: la vista team_matchday_points (que sale de puntos_jugador_jornada) recorría
-- las 26.573 alineaciones de TODAS las ligas, les aplicaba funciones de ventana y solo después
-- se quedaba con la liga. Una liga privada de 6 equipos tardaba ~80 ms y la pública ~113 ms, y
-- crece cada semana con las alineaciones nuevas.
-- Ahora se filtra primero por los equipos de la liga (`fantasy_team_id = any(...)`); como
-- fantasy_team_id es la clave de partición de las ventanas, Postgres lo aplica ANTES de calcular.
--     liga privada de 6-9 equipos: ~80 ms -> ~8-12 ms
--     liga pública (95 equipos):   ~113 ms -> ~80 ms
--
-- Qué NO cambia:
--   * La puntuación: no se toca ninguna vista ni función de puntos (team_matchday_points,
--     puntos_jugador_jornada, multiplicador_capitan, puntos_descanso...). Las siguen usando
--     perfil_manager, misiones, pagos de jornada, alineaciones, etc., exactamente igual.
--   * Nombre, argumentos, columnas devueltas, permisos (CREATE OR REPLACE los conserva),
--     seguridad (SECURITY DEFINER, mismo search_path y la misma comprobación de que quien
--     consulta es de esa liga) ni el orden del historial.
-- Comprobado antes de publicar en las 16 ligas con equipos (2 ligas vacías no devuelven filas):
-- comparación fila a fila (EXCEPT ALL, en las dos direcciones) entre la función antigua y la nueva,
-- incluido el historial de puntos por jornada: 0 diferencias.
--
-- Comprobación para hacerla tú: supabase/comprobacion-clasificacion.sql (antes y después deben coincidir).
-- Para deshacerlo: volver a ejecutar la definición de clasificacion() de 0100_administrador_liga_privada.sql.

create or replace function public.clasificacion(p_league_id uuid)
returns table(
  equipo_id uuid,
  nombre_equipo text,
  nombre_manager text,
  puntos_totales integer,
  historial_puntos jsonb,
  puntos_sancion integer
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    ft.id as equipo_id,
    ft.nombre as nombre_equipo,
    pr.nombre as nombre_manager,
    (coalesce(sum(tmp.puntos), 0) - coalesce(sanc.puntos, 0))::integer as puntos_totales,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', tmp.matchday_id,
          'jornada', tmp.jornada,
          'torneo', tmp.torneo,
          'puntos', tmp.puntos,
          'creada', tmp.creada
        )
        order by tmp.creada, tmp.matchday_id
      ) filter (where tmp.matchday_id is not null),
      '[]'::jsonb
    ) as historial_puntos,
    coalesce(sanc.puntos, 0)::integer as puntos_sancion
  from fantasy_teams ft
  join profiles pr on pr.id = ft.owner_id
  left join (
    -- Solo los equipos de ESTA liga: el filtro va dentro, antes de las ventanas de la vista.
    select t.fantasy_team_id, t.matchday_id, t.jornada, t.torneo, t.puntos, t.creada
    from team_matchday_points t
    where t.fantasy_team_id = any (
      array(select f2.id from fantasy_teams f2 where f2.league_id = p_league_id)
    )
  ) tmp on tmp.fantasy_team_id = ft.id
  left join lateral (
    select sum(s.cantidad) as puntos
    from liga_sanciones s
    where s.fantasy_team_id = ft.id and s.tipo = 'puntos'
  ) sanc on true
  where ft.league_id = p_league_id
    and exists (
      select 1 from fantasy_teams mio
      where mio.league_id = p_league_id and mio.owner_id = auth.uid()
    )
  group by ft.id, ft.nombre, pr.nombre, sanc.puntos;
$function$;
