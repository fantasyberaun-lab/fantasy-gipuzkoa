-- 0084: cierra las versiones antiguas (sin liga) de fichar, pagar cláusula y pujar.
--
-- Hallazgo al comprobar la base de datos real tras la 0082 (17-10-2026): además
-- de las versiones actuales (con p_league_id), siguen existiendo en producción las
-- de antes de las ligas, que también se pueden llamar desde la API:
--   - fichar_jugador(uuid)
--   - pagar_clausula(uuid)
--   - pujar_mercado(uuid, numeric)
-- Se quedaron sin borrar cuando se añadió el parámetro de liga (0017) y por eso
-- no pasan por los controles que se fueron añadiendo después: que el jugador esté
-- inscrito en un torneo (0056), el cierre de clausulazos del viernes a las 16:00
-- al sábado a las 18:00 (0050), los límites de deuda y de pujas (0040) y la
-- separación de liga pública y privada (0036). Un manager que las llamara
-- directamente se saltaría esas reglas.
--
-- La web no las usa: todas sus llamadas mandan p_league_id (comprobado con grep
-- en lib/supabase/queries.ts), así que PostgREST siempre elige las nuevas.
--
-- Qué hace: quita el permiso de ejecución a esas tres versiones. No se borran,
-- por si hiciera falta mirarlas o volver atrás (se revierte con un grant).
-- Impacto en datos: ninguno.

revoke all on function public.fichar_jugador(uuid) from public, anon, authenticated;
revoke all on function public.pagar_clausula(uuid) from public, anon, authenticated;
revoke all on function public.pujar_mercado(uuid, numeric) from public, anon, authenticated;
