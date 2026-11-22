-- 0146: "borrar" un torneo = archivarlo (borrado lógico), Admin > Torneos. Sustituye a la idea de 0145.
--
-- 0145_borrar_torneo_con_jornadas.sql (ya aplicada) creó dos funciones que BORRAN un torneo con sus
-- jornadas, resultados y puntos. Se decidió no usarlas, así que aquí se ELIMINAN para que nadie pueda
-- llamarlas (ni siquiera desde la consola). El frontend no las llama.
--
-- En su lugar: tournaments.archivado_en (timestamptz, null = visible). Un torneo archivado deja de
-- verse en la sección Torneos (managers) y en la vista Torneos del admin (que permite "Mostrar
-- archivados" y "Restaurar"). NO se borra nada: jornadas, resultados, alineaciones, mesas, puntos,
-- valores de mercado, pagos e histórico siguen igual, y las clasificaciones (team_matchday_points,
-- clasificacion, player_status) no miran esta columna. La escritura ya la cubre "root gestiona
-- torneos" (0019); la lectura sigue siendo pública.
--
-- Impacto en datos existentes: ninguno. Añade una columna nullable (instantáneo, no reescribe la
-- tabla) y elimina dos funciones sin uso. Aplicar con `npx supabase db push`.

drop function if exists public.borrar_torneo_con_jornadas(uuid);
drop function if exists public.resumen_borrado_torneo(uuid);

alter table public.tournaments
  add column if not exists archivado_en timestamptz;
