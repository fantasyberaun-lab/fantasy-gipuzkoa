-- 0123: el resumen semanal ("Tu semana") enseña TODAS las ligas del manager.
--
-- Hasta ahora (0117) resumen_pendiente() devolvía un solo equipo: el que más puntos
-- había hecho esa semana. Quien juega en varias ligas (pública y privadas) no veía
-- las demás. Ahora devuelve una lista `resumenes` con un elemento por equipo, de más
-- a menos puntos, y cada uno trae más datos para pintar una pantalla más completa:
--   - equipos: cuántos equipos hay en esa liga ("3.º de 12").
--   - total:   puntos acumulados del equipo hasta esa semana.
--   - importe: millones cobrados por la jornada (pagos_semana).
--   - mejor:   el jugador que más puntos le ha dado esa semana (con capitán), o null.
-- También devuelve `jornada` (número de la jornada de ese fin de semana).
--
-- Se mantienen las claves antiguas en la raíz (equipo, liga, puntos, posicion,
-- variacion) con el primer equipo, para que la versión anterior de la app siga
-- funcionando mientras se despliega la nueva.
--
-- "Visto" sigue siendo por usuario y semana (resumenes_vistos): al cerrar la pantalla
-- se dan por vistos los de todas sus ligas.
--
-- Impacto en datos existentes: ninguno. Solo reemplaza la función resumen_pendiente();
-- no toca tablas, saldos ni puntos. Se puede lanzar con `supabase db push` o en el
-- SQL Editor.

create or replace function public.resumen_pendiente()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_semana date;
  v_jornada integer;
  v_resumenes jsonb;
  v_primero jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('hay', false);
  end if;

  select max(semana) into v_semana from pagos_semana;
  if v_semana is null then
    return jsonb_build_object('hay', false);
  end if;

  if exists (select 1 from resumenes_vistos where user_id = v_uid and semana = v_semana) then
    return jsonb_build_object('hay', false);
  end if;

  if not exists (select 1 from resumenes_semanales where semana = v_semana) then
    perform public.generar_resumenes_semana(v_semana);
  end if;

  select js.numero into v_jornada
  from jornadas_semanales() js
  where js.semana = v_semana
  limit 1;

  select jsonb_agg(x.fila order by x.puntos desc, x.id) into v_resumenes
  from (
    select
      rs.fantasy_team_id as id,
      rs.puntos,
      jsonb_build_object(
        'equipo', ft.nombre,
        'liga', l.nombre,
        'puntos', rs.puntos,
        'posicion', rs.posicion,
        'variacion', rs.variacion,
        'equipos', (select count(*) from fantasy_teams o where o.league_id = ft.league_id),
        'total', (
          select coalesce(sum(ps.puntos), 0)
          from pagos_semana ps
          where ps.fantasy_team_id = ft.id and ps.semana <= v_semana
        ),
        'importe', (
          select ps.importe
          from pagos_semana ps
          where ps.fantasy_team_id = ft.id and ps.semana = v_semana
        ),
        -- Mismo cálculo que team_matchday_points (0055): solo lo que cuenta y con capitán.
        'mejor', (
          select jsonb_build_object('nombre', p.nombre, 'puntos', m.puntos)
          from (
            select
              pj.player_id,
              sum(
                pj.puntos_base * case when pj.es_capitan then public.multiplicador_capitan() else 1 end
              )::integer as puntos
            from puntos_jugador_jornada pj
            where pj.fantasy_team_id = ft.id
              and pj.cuenta
              and pj.matchday_id in (
                select js.matchday_id from jornadas_semanales() js where js.semana = v_semana
              )
            group by pj.player_id
            order by 2 desc, 1
            limit 1
          ) m
          join players p on p.id = m.player_id
          where m.puntos > 0
        )
      ) as fila
    from resumenes_semanales rs
    join fantasy_teams ft on ft.id = rs.fantasy_team_id
    join leagues l on l.id = ft.league_id
    where ft.owner_id = v_uid and rs.semana = v_semana
  ) x;

  if v_resumenes is null then
    return jsonb_build_object('hay', false);
  end if;

  v_primero := v_resumenes -> 0;

  return jsonb_build_object(
    'hay', true,
    'semana', v_semana,
    'jornada', v_jornada,
    'resumenes', v_resumenes,
    -- Claves antiguas (0117), por compatibilidad con la versión anterior de la app.
    'equipo', v_primero -> 'equipo',
    'liga', v_primero -> 'liga',
    'puntos', v_primero -> 'puntos',
    'posicion', v_primero -> 'posicion',
    'variacion', v_primero -> 'variacion'
  );
end;
$$;

revoke all on function public.resumen_pendiente() from public, anon;
grant execute on function public.resumen_pendiente() to authenticated;
