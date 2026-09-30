-- 0042: con el valor de mercado cambiando (0041), las pujas se mantienen y
--       son visibles para los managers de la liga.
--
-- 1) Una puja hecha por debajo del valor actual NO se descarta.
--    procesar_mercado_diario() (0040) ignoraba las pujas con
--    importe < valor_mercado. Como ahora el valor sube y baja cada día, eso
--    tiraría pujas válidas cuando las hicieron. Ahora la puja se conserva y
--    compite igual: gana el importe más alto (empate: quien pujó antes) y se
--    paga lo pujado. El mínimo solo se exige AL PUJAR (pujar_mercado, 0040):
--    quien pujó ayer al valor de ayer se queda con esa puja, y quien puje hoy
--    tiene que llegar al valor de hoy, así que normalmente lo superará.
--    Estrategia: anticiparse a los resultados reales antes de que el admin
--    los meta y dejar la puja puesta antes de que el valor suba.
--
-- 2) Ver las pujas de la liga. Hasta ahora la pantalla solo enseñaba el número
--    de pujas (market_bid_counts). pujas_del_mercado() devuelve, para los
--    listings abiertos de una liga, la puja de cada equipo (nombre de equipo
--    e importe) y marca cuál es la tuya. Solo la puede leer un miembro de esa
--    liga.
--
-- Requiere 0040 (procesar_mercado_diario, limite_deuda_equipo).

-- ---------------------------------------------------------------------------
-- 1) procesar_mercado_diario: igual que en 0040 salvo que desaparece
--    `and b.importe >= p.valor_mercado`.
-- ---------------------------------------------------------------------------
create or replace function public.procesar_mercado_diario()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga record;
  r record;
  v_validacion jsonb;
  v_saldo numeric;
  v_asignados uuid[];
begin
  for v_liga in select id from leagues where tipo = 'privada' loop
    v_asignados := '{}';

    -- Las pujas se recorren de mayor a menor importe (empate: la más antigua).
    -- Ya no se filtra por valor actual: una puja hecha antes de que el jugador
    -- subiera de precio sigue valiendo, solo que compite con su importe.
    for r in
      select b.market_listing_id, b.fantasy_team_id, b.importe, ml.player_id
      from bids b
      join market_listings ml on ml.id = b.market_listing_id
      where ml.disponible = true
        and ml.league_id = v_liga.id
      order by b.importe desc, b.created_at asc
    loop
      if r.market_listing_id = any (v_asignados) then
        continue;
      end if;

      select presupuesto into v_saldo from fantasy_teams where id = r.fantasy_team_id;
      if v_saldo - r.importe < -public.limite_deuda_equipo(r.fantasy_team_id) then
        continue;
      end if;

      v_validacion := public.validar_composicion_plantilla(
        r.fantasy_team_id,
        (select categoria from players where id = r.player_id)
      );
      if not (v_validacion ->> 'ok')::boolean then
        continue;
      end if;

      begin
        insert into squad_slots (fantasy_team_id, player_id, league_id, candado)
        values (r.fantasy_team_id, r.player_id, v_liga.id, true);
        update fantasy_teams set presupuesto = presupuesto - r.importe where id = r.fantasy_team_id;
        insert into operations_log (fantasy_team_id, tipo, player_id, importe)
        values (r.fantasy_team_id, 'oferta_aceptada', r.player_id, r.importe);
        v_asignados := array_append(v_asignados, r.market_listing_id);
      exception when unique_violation then
        null;
      end;
    end loop;

    update market_listings set disponible = false
    where disponible = true and league_id = v_liga.id;

    delete from bids where market_listing_id in (
      select id from market_listings where disponible = false and league_id = v_liga.id
    );

    perform public.abrir_tanda_mercado(v_liga.id);
  end loop;
end;
$$;

grant execute on function public.procesar_mercado_diario() to postgres;

-- ---------------------------------------------------------------------------
-- 2) Pujas visibles para los miembros de la liga
-- ---------------------------------------------------------------------------
create or replace function public.pujas_del_mercado(p_league_id uuid)
returns table (
  market_listing_id uuid,
  fantasy_team_id uuid,
  nombre_equipo text,
  importe numeric,
  es_mia boolean,
  created_at timestamptz
)
language sql
stable
security definer set search_path = public
as $$
  select
    b.market_listing_id,
    b.fantasy_team_id,
    ft.nombre,
    b.importe,
    (ft.owner_id = auth.uid()) as es_mia,
    b.created_at
  from bids b
  join market_listings ml on ml.id = b.market_listing_id
  join fantasy_teams ft on ft.id = b.fantasy_team_id
  where ml.league_id = p_league_id
    and ml.disponible = true
    -- Solo los miembros de esa liga (el equipo del que llama está en ella).
    and exists (
      select 1 from fantasy_teams mio
      where mio.league_id = p_league_id and mio.owner_id = auth.uid()
    )
  order by b.importe desc, b.created_at asc;
$$;

revoke all on function public.pujas_del_mercado(uuid) from public, anon;
grant execute on function public.pujas_del_mercado(uuid) to authenticated;
