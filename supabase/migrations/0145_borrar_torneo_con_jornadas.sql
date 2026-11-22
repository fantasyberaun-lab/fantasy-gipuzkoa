-- 0145: borrar un torneo junto con todas sus jornadas, en una sola operación (Admin > Torneos).
--
-- Hasta ahora matchdays.tournament_id era "on delete restrict" (0019): para borrar un torneo había
-- que borrar antes cada jornada a mano. Esta migración añade dos funciones, solo para root:
--
--   * resumen_borrado_torneo(torneo)      -> SOLO LEE. Devuelve qué se perdería (jornadas, resultados,
--                                            alineaciones, pagos semanales a devolver...). La usa el
--                                            Admin para el aviso de confirmación.
--   * borrar_torneo_con_jornadas(torneo)  -> borra el torneo y sus jornadas, todo en una transacción
--                                            (si algo falla, no se borra nada).
--
-- QUÉ SE BORRA (en cascada, al borrar cada jornada):
--   results, matchday_lineups, matchday_captains, matchday_pairings (+ pronósticos de esas mesas),
--   matchday_byes y tournament_players.
-- QUÉ SE CONSERVA: clause_releases y operations_log (el historial de operaciones del mercado): se les
--   quita solo el enlace a la jornada (matchday_id = null); la operación sigue existiendo.
--
-- EFECTOS SECUNDARIOS (los provocan triggers que YA existen, igual que al borrar una jornada a mano):
--   1) Puntos: la clasificación y los puntos de los jugadores se calculan en vivo desde results /
--      matchday_lineups, así que los puntos de ese torneo DESAPARECEN de todas las clasificaciones.
--   2) Valor de mercado: trigger_valor_por_resultado revierte en cada jugador los cambios de valor que
--      produjeron esos resultados (borrar results = deshacer su efecto en el valor).
--   3) Dinero: reajustar_pagos_al_borrar_ronda devuelve lo ya cobrado por las semanas de esas
--      jornadas (baja presupuesto de los equipos y crea una notificación privada por equipo). Si una
--      semana tiene jornadas de otro torneo, solo se descuenta la parte de las borradas.
--   4) Los iconos de fin de liga ya entregados (iconos_desbloqueados) NO se tocan, pero entregar
--      iconos DESPUÉS de borrar daría clasificaciones distintas: entregarlos antes.
--
-- Impacto en datos existentes: ninguno al aplicar la migración (solo crea 2 funciones). Aplicar con
-- `npx supabase db push`. Borrar de verdad solo ocurre cuando root pulsa "Borrar" y confirma.

-- 1) Resumen de lo que se perdería (no escribe nada) ---------------------------------------------
create or replace function public.resumen_borrado_torneo(p_torneo_id uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_nombre text;
  v_ids uuid[];
  v_res jsonb;
begin
  if not public.es_root() then
    raise exception 'Solo el administrador puede hacer esto';
  end if;

  select nombre into v_nombre from tournaments where id = p_torneo_id;
  if v_nombre is null then
    raise exception 'El torneo no existe';
  end if;

  select coalesce(array_agg(id), '{}') into v_ids from matchdays where tournament_id = p_torneo_id;

  v_res := jsonb_build_object(
    'nombre', v_nombre,
    'jornadas', cardinality(v_ids),
    'resultados', (select count(*) from results where matchday_id = any(v_ids)),
    'alineaciones', (select count(*) from matchday_lineups where matchday_id = any(v_ids)),
    'mesas', (select count(*) from matchday_pairings where matchday_id = any(v_ids)),
    'jugadores_inscritos', (select count(*) from tournament_players where tournament_id = p_torneo_id),
    -- Semanas cobradas que incluyen alguna de estas jornadas, y lo cobrado en ellas (tope de lo
    -- que se podría devolver: si la semana tiene jornadas de otro torneo, se devuelve solo una parte).
    'semanas_cobradas', (
      select count(distinct js.semana)
      from jornadas_semanales() js
      where js.matchday_id = any(v_ids)
        and exists (select 1 from jornadas_cerradas jc where jc.semana = js.semana)
    ),
    'importe_cobrado_max', coalesce((
      select sum(ps.importe)
      from pagos_semana ps
      where ps.semana in (
        select js.semana from jornadas_semanales() js where js.matchday_id = any(v_ids)
      )
    ), 0)
  );
  return v_res;
end;
$$;

revoke all on function public.resumen_borrado_torneo(uuid) from public, anon;
grant execute on function public.resumen_borrado_torneo(uuid) to authenticated;

-- 2) Borrado transaccional ------------------------------------------------------------------------
create or replace function public.borrar_torneo_con_jornadas(p_torneo_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_resumen jsonb;
begin
  if not public.es_root() then
    raise exception 'Solo el administrador puede hacer esto';
  end if;

  v_resumen := public.resumen_borrado_torneo(p_torneo_id);

  -- El historial de operaciones del mercado se conserva, sin enlace a la jornada.
  update clause_releases set matchday_id = null
  where matchday_id in (select id from matchdays where tournament_id = p_torneo_id);
  update operations_log set matchday_id = null
  where matchday_id in (select id from matchdays where tournament_id = p_torneo_id);

  -- Cada jornada borrada dispara el reajuste de pagos y deshace el valor de sus resultados
  -- (ver cabecera). Las tablas dependientes caen en cascada.
  delete from matchdays where tournament_id = p_torneo_id;
  delete from tournaments where id = p_torneo_id;

  return v_resumen;
end;
$$;

revoke all on function public.borrar_torneo_con_jornadas(uuid) from public, anon;
grant execute on function public.borrar_torneo_con_jornadas(uuid) to authenticated;
