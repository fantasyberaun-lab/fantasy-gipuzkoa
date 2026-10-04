-- 0068: la plantilla inicial vale como máximo 350 M. Si la plantilla repartida
--       vale menos, la diferencia se suma al saldo del equipo (dinero aparte).
--
-- Depende de 0060 (asignar_plantilla_inicial sin pisar la tanda abierta y
-- rellenar_mercado).
--
-- Qué cambia respecto a 0060:
--   1) El reparto sigue siendo el mismo (hasta 3 de Tercera + el resto de
--      categorías 1 y 2, 6 jugadores en total, solo inscritos, sin dueño), pero
--      ahora se va jugador a jugador y se descarta quien haría pasar la
--      plantilla de 350 M. También se deja hueco para que los jugadores que
--      faltan por repartir quepan (con el valor del jugador más barato).
--   2) Al terminar, saldo += 350 - valor de la plantilla repartida.
--   3) Se mantiene TAL CUAL lo de 0060 para que no vuelva el bug:
--        - se prefieren jugadores que NO estén en la tanda abierta,
--        - al final se quita de la tanda (con sus pujas) a cualquier jugador
--          que ya tenga dueño y se rellena la tanda.
--
-- Todas las rutas (crear_liga, unirse_liga y reiniciar_plantillas_y_mercado)
-- llaman a esta función después de poner el saldo base, así que el dinero extra
-- se suma encima del saldo base en los tres casos.

create or replace function public.asignar_plantilla_inicial(p_equipo_id uuid, p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_tamano_inicial constant integer := 6;
  v_max_tercera_inicial constant integer := 3;
  v_tope_valor constant numeric := 350;
  v_total numeric := 0;
  v_asignados integer := 0;
  v_tercera integer := 0;
  v_valor_min numeric;
  v_extra numeric;
  v_cand record;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_league_id::text, 0));

  -- Valor del jugador más barato disponible: sirve para reservar hueco a los
  -- jugadores que aún faltan por repartir.
  select coalesce(min(p.valor_mercado), 10) into v_valor_min
  from players p
  where p.categoria in ('1', '2', '3')
    and p.activo
    and public.jugador_inscrito(p.id)
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    );

  -- Fase 1: hasta 3 jugadores de Tercera.
  for v_cand in
    select p.id, coalesce(p.valor_mercado, 0) as valor
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
    order by
      exists (
        select 1 from market_listings ml
        where ml.player_id = p.id and ml.league_id = p_league_id and ml.disponible = true
      ),
      random()
  loop
    exit when v_tercera >= v_max_tercera_inicial or v_asignados >= v_tamano_inicial;

    if v_total + v_cand.valor + (v_tamano_inicial - v_asignados - 1) * v_valor_min <= v_tope_valor then
      insert into squad_slots (fantasy_team_id, player_id, league_id)
      values (p_equipo_id, v_cand.id, p_league_id);

      v_total := v_total + v_cand.valor;
      v_asignados := v_asignados + 1;
      v_tercera := v_tercera + 1;
    end if;
  end loop;

  -- Fase 2: el resto hasta 6, de categorías 1 y 2.
  for v_cand in
    select p.id, coalesce(p.valor_mercado, 0) as valor
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
    order by
      exists (
        select 1 from market_listings ml
        where ml.player_id = p.id and ml.league_id = p_league_id and ml.disponible = true
      ),
      random()
  loop
    exit when v_asignados >= v_tamano_inicial;

    if v_total + v_cand.valor + (v_tamano_inicial - v_asignados - 1) * v_valor_min <= v_tope_valor then
      insert into squad_slots (fantasy_team_id, player_id, league_id)
      values (p_equipo_id, v_cand.id, p_league_id);

      v_total := v_total + v_cand.valor;
      v_asignados := v_asignados + 1;
    end if;
  end loop;

  -- Dinero aparte: lo que falte hasta 350 M se suma al saldo.
  v_extra := greatest(v_tope_valor - v_total, 0);
  if v_extra > 0 then
    update fantasy_teams
    set presupuesto = presupuesto + v_extra
    where id = p_equipo_id;
  end if;

  -- Red de seguridad (igual que en 0060): si algún jugador repartido estaba en
  -- la tanda abierta, sale de ella (con sus pujas) y la tanda se rellena.
  delete from bids
  where market_listing_id in (
    select ml.id
    from market_listings ml
    where ml.league_id = p_league_id
      and ml.disponible = true
      and exists (
        select 1 from squad_slots ss
        where ss.player_id = ml.player_id
          and ss.league_id = p_league_id
          and ss.fecha_salida is null
      )
  );

  delete from market_listings ml
  where ml.league_id = p_league_id
    and ml.disponible = true
    and exists (
      select 1 from squad_slots ss
      where ss.player_id = ml.player_id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    );

  perform public.rellenar_mercado(p_league_id);
end;
$$;