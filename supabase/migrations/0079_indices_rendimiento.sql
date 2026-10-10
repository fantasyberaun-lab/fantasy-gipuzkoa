-- 0079: índices para acelerar la carga de la app.
--
-- Solo añade índices: no cambia datos, funciones ni permisos. Se puede lanzar
-- con `supabase db push` o pegándolo en el SQL Editor; si un índice ya existe,
-- se salta (if not exists).
--
-- 1) results(matchday_id): el único índice era el único (player_id, matchday_id),
--    que no sirve para buscar por jornada. Lo usan los próximos rivales
--    (resultados de las jornadas vigentes), el detalle de torneo y la vista
--    team_matchday_points (clasificación).
-- 2) matchday_lineups(fantasy_team_id, matchday_id): la clasificación junta las
--    alineaciones por equipo; el único existente empieza por matchday_id.
--
-- matchday_byes no necesita nada: su clave primaria ya empieza por matchday_id
-- y tiene índice por player_id (0021).

create index if not exists results_matchday_id_idx
  on public.results (matchday_id);

create index if not exists matchday_lineups_equipo_jornada_idx
  on public.matchday_lineups (fantasy_team_id, matchday_id);
