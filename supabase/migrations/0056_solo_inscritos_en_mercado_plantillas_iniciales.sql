-- 0056: solo los jugadores inscritos en algún torneo salen en el mercado y en
-- las plantillas iniciales.
--
-- "Inscrito" = tiene fila en tournament_players (de cualquier torneo).
--
--   1) jugador_inscrito(player_id): helper reutilizable.
--   2) asignar_plantilla_inicial: mismo cuerpo que en 0029, pero solo reparte
--      jugadores inscritos.
--   3) abrir_tanda_mercado: mismo cuerpo que en 0036, pero solo abre inscritos.
--   4) Limpieza de la tanda abierta ahora mismo: se quitan del mercado los
--      jugadores no inscritos (y sus pujas, que no reservan saldo).
--   5) pujar_mercado y fichar_jugador rechazan jugadores no inscritos, por si
--      alguien sale de un torneo después de abrirse la tanda o llama a la API
--      a mano.
--
-- NO se tocan las plantillas ya formadas: quien ya tenga a un jugador no
-- inscrito lo conserva (y puede venderlo). Tampoco cambian clausulazos ni
-- ofertas directas, que son sobre jugadores que ya tienen dueño.

-- 1) Helper -------------------------------------------------------------------
create or replace function public.jugador_inscrito(p_player_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from tournament_players tp where tp.player_id = p_player_id
  );
$$;

grant execute on function public.jugador_inscrito(uuid) to authenticated;

-- 2) Plantilla inicial ---------------------------------------------------------
create or replace function public.asignar_plantilla_inicial(p_equipo_id uuid, p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_tamano_inicial constant integer := 6;
  v_max_tercera_inicial constant integer := 3;
  v_tercera_asignados integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_league_id::text, 0));

  insert into squad_slots (fantasy_team_id, player_id, league_id)
  select p_equipo_id, p.id, p_league_id
  from players p
  where p.categoria = '3'
    and p.activo
    and public.jugador_inscrito(p.id)
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
  order by random()
  limit v_max_tercera_inicial;

  get diagnostics v_tercera_asignados = row_count;

  insert into squad_slots (fantasy_team_id, player_id, league_id)
  select p_equipo_id, p.id, p_league_id
  from players p
  where p.categoria in ('1', '2')
    and p.activo
    and public.jugador_inscrito(p.id)
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
  order by random()
  limit greatest(v_tamano_inicial - v_tercera_asignados, 0);
end;
$$;

-- 3) Tanda de mercado (ligas privadas) -----------------------------------------
create or replace function public.abrir_tanda_mercado(p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if public.es_liga_publica(p_league_id) then
    return;
  end if;

  insert into market_listings (player_id, valor_actual, disponible, league_id)
  select p.id, p.valor_mercado, true, p_league_id
  from players p
  where p.activo = true
    and public.jugador_inscrito(p.id)
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
  order by random()
  limit 9;
end;
$$;

-- 4) Limpieza de las tandas abiertas ahora mismo ---------------------------------
delete from bids
where market_listing_id in (
  select ml.id
  from market_listings ml
  where ml.disponible = true
    and not public.jugador_inscrito(ml.player_id)
);

delete from market_listings ml
where ml.disponible = true
  and not public.jugador_inscrito(ml.player_id);

-- 5) Porteros ---------------------------------------------------------------------
-- 5a) pujar_mercado: se conserva la versión de 0040 (renombrada) y se pone delante
--     un portero con el mismo nombre y parámetros.
do $$
begin
  if to_regprocedure('public.pujar_mercado_base(uuid, numeric, uuid)') is null then
    alter function public.pujar_mercado(uuid, numeric, uuid) rename to pujar_mercado_base;
  end if;
end $$;

revoke all on function public.pujar_mercado_base(uuid, numeric, uuid) from public, anon, authenticated;

create or replace function public.pujar_mercado(p_listing_id uuid, p_importe numeric, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_player_id uuid;
begin
  select player_id into v_player_id from market_listings where id = p_listing_id;

  if v_player_id is not null and not public.jugador_inscrito(v_player_id) then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Ese jugador no está inscrito en ningún torneo, así que no se puede fichar.'
    );
  end if;

  return public.pujar_mercado_base(p_listing_id, p_importe, p_league_id);
end;
$$;

grant execute on function public.pujar_mercado(uuid, numeric, uuid) to authenticated;

-- 5b) fichar_jugador: mismo portero que en 0036, más la comprobación de inscripción.
create or replace function public.fichar_jugador(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.jugador_inscrito(p_player_id) then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Ese jugador no está inscrito en ningún torneo, así que no se puede fichar.'
    );
  end if;

  if public.es_liga_publica(p_league_id) then
    return public.fichar_jugador_publica(p_player_id, p_league_id);
  end if;
  return public.fichar_jugador_privada(p_player_id, p_league_id);
end;
$$;

grant execute on function public.fichar_jugador(uuid, uuid) to authenticated;
