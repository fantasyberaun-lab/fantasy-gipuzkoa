-- 0085: el navegador deja de poder escribir directamente en las tablas del juego.
--
-- NO LANZAR hasta que la web con el cambio de 0083 esté en producción (rama
-- fusionada en main y desplegada). Si se lanza antes, la web antigua no podría
-- vender jugadores en ligas privadas. Por eso este archivo NO está en
-- supabase/migrations: así un `supabase db push` no lo aplica por error.
-- Al lanzarlo, cópialo a supabase/migrations/0085_cerrar_escrituras_directas.sql.
--
-- Hallazgo de la auditoría (17-10-2026): las políticas RLS de 0001/0003 dejan a
-- cada manager insertar y modificar, desde la API y en cualquier columna, las
-- filas de su propio equipo (fantasy_teams), su plantilla (squad_slots), sus
-- pujas (bids) y su registro de operaciones. Solo la liga pública estaba
-- protegida con triggers. Con la consola del navegador se podía cambiar el saldo
-- o añadir jugadores sin pasar por el mercado.
--
-- Qué hace: quita los permisos de escritura de la API sobre esas tablas. Lo que
-- sí escribe la web directamente:
--   - squad_slots.titular y squad_slots.capitan (poner titular / capitán):
--     se mantiene solo esos dos campos (las políticas RLS siguen limitando a las
--     filas del propio equipo y los triggers validar_* siguen mandando).
-- Todo lo demás (fichar, pujar, vender, ofertas aceptadas, clausulazos, crear y
-- unirse a ligas, salir de liga...) ya va por funciones security definer, que no
-- se ven afectadas.
--
-- Comprobado (17-10-2026, solo lectura): la única función de la base que escribe
-- en estas tablas sin ser security definer es el trigger validar_capitan, y solo
-- actualiza squad_slots.capitan (permiso que se mantiene). Nada más se rompe.
--
-- Impacto en datos: ninguno. Reversible con el bloque ROLLBACK de abajo.
--
-- Antes de lanzarlo: probar en la preview que se puede vender, poner titular y
-- capitán, fichar, pujar y hacer una oferta.

revoke insert, update, delete, truncate, references, trigger on public.fantasy_teams from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.bids          from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.operations_log from anon, authenticated;

revoke insert, update, delete, truncate, references, trigger on public.squad_slots   from anon, authenticated;
grant update (titular, capitan) on public.squad_slots to authenticated;

-- ROLLBACK (solo si algo falla; devuelve los permisos que había):
--   grant insert, update, delete on public.fantasy_teams   to authenticated;
--   grant insert, update, delete on public.bids            to authenticated;
--   grant insert, update, delete on public.operations_log  to authenticated;
--   grant insert, update, delete on public.squad_slots     to authenticated;
