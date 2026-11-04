-- 0121 · Rendimiento: las políticas RLS calculan auth.uid() una vez por consulta, no una por fila.
--
-- El asesor de rendimiento de Supabase (auth_rls_initplan) marca 30 políticas que
-- reevalúan auth.uid() en cada fila. Aquí solo se sustituye `auth.uid()` por
-- `(select auth.uid())`, que es la forma recomendada por Supabase: Postgres lo calcula una vez
-- y reutiliza el valor.
--
-- NO cambia quién puede ver o escribir qué:
--   * ALTER POLICY conserva el nombre, la operación (SELECT/INSERT/UPDATE/DELETE) y los roles.
--   * La condición es la misma, palabra por palabra, salvo ese envoltorio.
--   * No hay un instante sin política: ALTER POLICY es atómico, no hay DROP + CREATE.
--   * `supabase db push` aplica el archivo entero en una transacción: si algo falla, no se aplica nada.
--
-- Comprobación: supabase/comprobacion-rls.sql (antes y después deben dar las mismas huellas).
-- Para deshacerlo basta con cambiar `(select auth.uid())` por `auth.uid()` en estas mismas líneas.

alter policy "un equipo puja desde su propio equipo" on public.bids
  with check ((fantasy_team_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))));

alter policy "ver mis propias pujas" on public.bids
  using ((fantasy_team_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))));

alter policy "ver config de mis ligas" on public.config_liga
  using ((es_root() OR (league_id IN ( SELECT fantasy_teams.league_id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid()))))));

alter policy "ver mis consentimientos" on public.consentimientos
  using ((user_id = (select auth.uid())));

alter policy "cada manager gestiona su propio equipo" on public.fantasy_teams
  using ((owner_id = (select auth.uid())))
  with check ((owner_id = (select auth.uid())));

alter policy "ver ligas de las que soy miembro o creador" on public.leagues
  using (((creado_por = (select auth.uid())) OR (id IN ( SELECT fantasy_teams.league_id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid()))))));

alter policy "ver categorias de mis ligas" on public.liga_categorias
  using ((es_root() OR (league_id IN ( SELECT fantasy_teams.league_id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid()))))));

alter policy "ver sanciones de mi liga" on public.liga_sanciones
  using ((es_root() OR (league_id IN ( SELECT fantasy_teams.league_id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid()))))));

alter policy "ver listings de mis ligas" on public.market_listings
  using ((league_id IN ( SELECT fantasy_teams.league_id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))));

alter policy "ver notificaciones de mi liga" on public.notificaciones
  using (((league_id IN ( SELECT fantasy_teams.league_id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))) AND ((NOT privada) OR (objetivo_team_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))))));

alter policy "un equipo registra sus propias operaciones" on public.operations_log
  with check ((fantasy_team_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))));

alter policy "ver mis pagos de jornada" on public.pagos_semana
  using (((fantasy_team_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))) OR es_root()));

alter policy "un equipo actualiza sus propias ofertas" on public.player_offers
  using ((equipo_oferente_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))));

alter policy "un equipo borra sus propias ofertas" on public.player_offers
  using ((equipo_oferente_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))));

alter policy "un equipo crea sus propias ofertas" on public.player_offers
  with check ((equipo_oferente_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))));

alter policy "cada manager ve su perfil" on public.profiles
  using ((id = (select auth.uid())));

alter policy "ver mis pronosticos" on public.pronosticos
  using ((user_id = (select auth.uid())));

alter policy "actualizar mi suscripcion push" on public.push_suscripciones
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "alta de mi suscripcion push" on public.push_suscripciones
  with check ((user_id = (select auth.uid())));

alter policy "baja de mi suscripcion push" on public.push_suscripciones
  using ((user_id = (select auth.uid())));

alter policy "ver mis suscripciones push" on public.push_suscripciones
  using ((user_id = (select auth.uid())));

alter policy "ver mi racha" on public.rachas
  using (((user_id = (select auth.uid())) OR es_root()));

alter policy "ver mis recompensas" on public.recompensas_diarias
  using (((user_id = (select auth.uid())) OR es_root()));

alter policy "cada manager ve su propia plantilla" on public.squad_slots
  using ((fantasy_team_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))));

alter policy "un equipo actualiza su propia plantilla" on public.squad_slots
  using ((fantasy_team_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))));

alter policy "un equipo inserta en su propia plantilla" on public.squad_slots
  with check ((fantasy_team_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))));

alter policy "ver mis sugerencias" on public.sugerencias
  using (((user_id = (select auth.uid())) OR es_root()));

alter policy "cada manager ve sus ventas a la maquina" on public.ventas_maquina
  using ((fantasy_team_id IN ( SELECT fantasy_teams.id
   FROM fantasy_teams
  WHERE (fantasy_teams.owner_id = (select auth.uid())))));

alter policy "ver mis movimientos de xp" on public.xp_movimientos
  using (((user_id = (select auth.uid())) OR es_root()));

alter policy "ver mi xp" on public.xp_usuarios
  using (((user_id = (select auth.uid())) OR es_root()));

