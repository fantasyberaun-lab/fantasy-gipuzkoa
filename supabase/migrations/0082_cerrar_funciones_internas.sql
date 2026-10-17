-- 0082: cierra funciones internas que cualquiera podía llamar desde la API.
--
-- Hallazgo de la auditoría de seguridad (17-10-2026): en Postgres una función
-- recién creada puede ser ejecutada por cualquiera (PUBLIC) y Supabase además se
-- la concede a anon y authenticated. Estas tres son internas (solo las llaman
-- otras funciones security definer o el cron, que corren como postgres) pero no
-- tenían ningún revoke:
--   - asignar_plantilla_inicial(equipo, liga): reparte jugadores y suma hasta
--     350 M al saldo del equipo que se le pase. Sin comprobar quién llama.
--   - abrir_tanda_mercado(liga): fuerza el relleno del mercado de cualquier liga.
--   - procesar_mercado_diario(): adjudica las pujas ya, fuera del horario.
--
-- Qué cambia:
--   1) Esas tres dejan de ser ejecutables por anon/authenticated. Siguen
--      funcionando dentro de crear_liga, unirse_liga, el cron, etc. (las llama
--      su dueño, postgres).
--   2) Las funciones de juego que usa la web (fichar_jugador, pagar_clausula,
--      pujar_mercado y player_status) dejan de ser ejecutables por anon: sin
--      sesión no tienen sentido (y player_status devolvía datos de equipos).
--      authenticated mantiene su permiso.
--
-- Impacto en datos: ninguno. Es idempotente y reversible con un grant.
-- Nada de la web llama directamente a las tres primeras (comprobado con grep).

revoke all on function public.asignar_plantilla_inicial(uuid, uuid) from public, anon, authenticated;
revoke all on function public.abrir_tanda_mercado(uuid) from public, anon, authenticated;
revoke all on function public.procesar_mercado_diario() from public, anon, authenticated;

revoke all on function public.fichar_jugador(uuid, uuid) from public, anon;
grant execute on function public.fichar_jugador(uuid, uuid) to authenticated;

revoke all on function public.pagar_clausula(uuid, uuid) from public, anon;
grant execute on function public.pagar_clausula(uuid, uuid) to authenticated;

revoke all on function public.pujar_mercado(uuid, numeric, uuid) from public, anon;
grant execute on function public.pujar_mercado(uuid, numeric, uuid) to authenticated;

revoke all on function public.player_status(uuid) from public, anon;
grant execute on function public.player_status(uuid) to authenticated;
