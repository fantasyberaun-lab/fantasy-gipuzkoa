-- 0097: El valor de la plantilla inicial de las ligas privadas pasa a una variable y sube a 400 M.
--
-- Hasta ahora el tope estaba escrito a mano en asignar_plantilla_inicial() (350 M).
-- Los equipos nuevos salían con plantillas de unos 300 M, que es poco, así que:
--
--   - nueva variable plantilla_inicial_valor_max (grupo Plantilla), por defecto 400,
--     editable desde Admin > Variables, global o por liga;
--   - asignar_plantilla_inicial() lee esa variable (con respaldo 400).
--
-- La función es la de producción (0068) con UNA línea cambiada (el tope) y el
-- comentario que lo menciona; se comparó con el código de producción antes.
-- Si los 6 jugadores valen menos del tope, la diferencia se ingresa como saldo,
-- igual que antes. Solo afecta a los equipos que se creen a partir de ahora.
--
-- Es un cambio de juego a propósito (350 -> 400). Requiere 0092 y 0096.

insert into public.config_definiciones
  (clave, grupo, etiqueta, descripcion, tipo, minimo, maximo, unidad, valor_defecto, permite_liga, estado, funcion_sql, orden)
values
  ('plantilla_inicial_valor_max', 'Plantilla', 'Valor máximo de la plantilla inicial',
   'Valor máximo de los 6 jugadores que se reparten al crear una liga privada o unirse a ella. Si valen menos, la diferencia se ingresa como saldo. Solo afecta a los equipos que se creen a partir de ahora.',
   'decimal', 100, 1000, 'M', '400'::jsonb, true, 'activa', null, 13)
on conflict (clave) do nothing;

create or replace function public.asignar_plantilla_inicial(p_equipo_id uuid, p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_tamano_inicial constant integer := 6;
  v_max_tercera_inicial constant integer := 3;
  v_tope_valor numeric := public.config_num('plantilla_inicial_valor_max', p_league_id, 400);
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

  -- Dinero aparte: lo que falte hasta el tope (variable plantilla_inicial_valor_max) se suma al saldo.
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
