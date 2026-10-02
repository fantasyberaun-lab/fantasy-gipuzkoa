-- 0057: refrescar el mercado y reiniciar las plantillas de todos los managers.
--
-- Depende de 0056 (jugador_inscrito, asignar_plantilla_inicial y
-- abrir_tanda_mercado que solo usan jugadores inscritos en algún torneo).
-- "Inscrito" = está en tournament_players de CUALQUIER torneo, también los que
-- no tienen categoría (abiertos, como el de Gros).
--
-- Se crean dos funciones que solo puede ejecutar el administrador de la base de
-- datos (SQL Editor / migraciones), nunca un cliente:
--
--   1) refrescar_mercado(): en cada liga privada tira la tanda abierta (y sus
--      pujas) y abre una nueva de 9 jugadores inscritos y sin dueño. Sirve para
--      repetirlo cuando haga falta (por ejemplo, tras inscribir a más gente).
--
--   2) reiniciar_plantillas_y_mercado(): lo de arriba, y además:
--        - cierra todas las plantillas (squad_slots.fecha_salida = ahora, el
--          historial se conserva),
--        - borra pujas, ofertas directas y las fotos semanales de alineaciones
--          (weekly_lineups) para que ninguna jornada futura use plantillas viejas,
--        - devuelve el saldo inicial a cada equipo (liga privada:
--          presupuesto_inicial; liga pública: presupuesto_liga_publica),
--        - reparte una plantilla inicial nueva en las ligas privadas (la pública
--          empieza vacía, como siempre).
--
-- NO se tocan los resultados, las jornadas ya creadas, sus alineaciones
-- (matchday_lineups), clausulazos pasados ni el registro de operaciones: los
-- puntos ya conseguidos y la clasificación histórica se quedan como están.
--
-- Al final de este archivo se ejecuta reiniciar_plantillas_y_mercado() UNA vez.

-- 1) Refrescar el mercado de las ligas privadas -------------------------------
create or replace function public.refrescar_mercado()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga record;
begin
  for v_liga in select id from leagues where tipo = 'privada' loop
    delete from bids
    where market_listing_id in (
      select id from market_listings
      where disponible = true and league_id = v_liga.id
    );

    delete from market_listings
    where disponible = true and league_id = v_liga.id;

    perform public.abrir_tanda_mercado(v_liga.id);
  end loop;
end;
$$;

revoke all on function public.refrescar_mercado() from public, anon, authenticated;
grant execute on function public.refrescar_mercado() to postgres;

-- 2) Reiniciar plantillas + mercado --------------------------------------------
create or replace function public.reiniciar_plantillas_y_mercado()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_presupuesto_privada numeric;
  v_presupuesto_publica numeric;
  v_equipo record;
begin
  select coalesce(valor::text::numeric, 100) into v_presupuesto_privada
  from game_config where clave = 'presupuesto_inicial';
  v_presupuesto_privada := coalesce(v_presupuesto_privada, 100);

  select coalesce(valor::text::numeric, 500) into v_presupuesto_publica
  from game_config where clave = 'presupuesto_liga_publica';
  v_presupuesto_publica := coalesce(v_presupuesto_publica, 500);

  -- Fuera plantillas (se cierran, no se borran).
  update squad_slots set fecha_salida = now() where fecha_salida is null;

  -- Fuera lo que dependía de esas plantillas.
  delete from bids;
  delete from player_offers;
  delete from weekly_lineups;

  -- Mercado de las ligas privadas: se vacía; se vuelve a abrir más abajo, ya
  -- con las plantillas nuevas repartidas (para no ofrecer jugadores con dueño).
  delete from market_listings
  where disponible = true
    and league_id in (select id from leagues where tipo = 'privada');

  -- Saldo inicial de vuelta.
  update fantasy_teams ft
  set presupuesto = case
    when l.tipo = 'publica' then v_presupuesto_publica
    else v_presupuesto_privada
  end
  from leagues l
  where l.id = ft.league_id;

  -- Plantilla inicial nueva, solo en ligas privadas, con jugadores inscritos.
  for v_equipo in
    select ft.id as equipo_id, ft.league_id
    from fantasy_teams ft
    join leagues l on l.id = ft.league_id
    where l.tipo = 'privada'
    order by ft.created_at
  loop
    perform public.asignar_plantilla_inicial(v_equipo.equipo_id, v_equipo.league_id);
  end loop;

  -- Mercado nuevo (9 jugadores inscritos y sin dueño por liga privada).
  perform public.refrescar_mercado();
end;
$$;

revoke all on function public.reiniciar_plantillas_y_mercado() from public, anon, authenticated;
grant execute on function public.reiniciar_plantillas_y_mercado() to postgres;

-- 3) Ejecutarlo ahora, una sola vez ------------------------------------------------
select public.reiniciar_plantillas_y_mercado();