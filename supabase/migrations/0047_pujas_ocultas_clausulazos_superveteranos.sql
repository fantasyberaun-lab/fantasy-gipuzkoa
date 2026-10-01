-- 0047: pujas ocultas las 2 h antes de la tanda, cierre de clausulazos el fin
--       de semana y bonus de Superveteranos.
--
-- 1) Pujas ocultas. El mercado se resuelve a las 0, 8 y 16 UTC (cron, ver
--    0041). Durante las 2 h anteriores (6-8, 14-16 y 22-24 UTC) la función
--    pujas_del_mercado() solo devuelve TU puja; las de los demás equipos
--    desaparecen (ni nombre ni importe). El número de pujas sigue visible
--    porque sale de market_bid_counts. Seguir pujando está permitido.
--    Mantener igual que lib/mercadoCountdown.ts (HORAS_UTC y HORAS_OCULTAS).
--
-- 2) Clausulazos cerrados. Desde el sábado a las 12:00 hasta el lunes a las
--    00:00 (hora de Madrid) pagar_clausula devuelve un aviso y no hace nada.
--    Mantener igual que components/InfoReglasButton.tsx.
--
-- 3) Superveteranos: +2 puntos por victoria (tournaments.bonus_victoria, 0046).
--    Se deduce del nombre del torneo: REVÍSALO en Admin > Torneos.

-- 1) Pujas ocultas ----------------------------------------------------------
create or replace function public.pujas_ocultas()
returns boolean
language sql
stable
as $$
  select (extract(hour from (now() at time zone 'UTC'))::int % 8) >= 6;
$$;

grant execute on function public.pujas_ocultas() to authenticated;

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
    -- Las 2 h antes de la tanda solo ves tu propia puja.
    and (not public.pujas_ocultas() or ft.owner_id = auth.uid())
  order by b.importe desc, b.created_at asc;
$$;

revoke all on function public.pujas_del_mercado(uuid) from public, anon;
grant execute on function public.pujas_del_mercado(uuid) to authenticated;

-- 2) Clausulazos cerrados ------------------------------------------------------
create or replace function public.clausulazos_cerrados()
returns boolean
language sql
stable
as $$
  select case extract(isodow from (now() at time zone 'Europe/Madrid'))
    when 6 then (now() at time zone 'Europe/Madrid')::time >= time '12:00'
    when 7 then true
    else false
  end;
$$;

grant execute on function public.clausulazos_cerrados() to authenticated;

-- Mismo "portero" que en 0036 con un aviso más antes de pagar_clausula_privada.
create or replace function public.pagar_clausula(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if public.es_liga_publica(p_league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'En la liga pública no hay clausulazos: ficha al jugador directamente en el Mercado.');
  end if;

  if public.clausulazos_cerrados() then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Los clausulazos están cerrados: no se pueden hacer desde el sábado a las 12:00 hasta el lunes a las 00:00.'
    );
  end if;

  return public.pagar_clausula_privada(p_player_id, p_league_id);
end;
$$;

grant execute on function public.pagar_clausula(uuid, uuid) to authenticated;

-- 3) Superveteranos: +2 por victoria -------------------------------------------
-- El trigger de 0046 recalcula solo los resultados ya guardados.
update tournaments set bonus_victoria = 2
where nombre ilike '%superveterano%' or nombre ilike '%super veterano%';