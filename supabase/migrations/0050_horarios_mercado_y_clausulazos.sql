-- 0050: nuevos horarios.
--
-- 1) El mercado de las ligas privadas se resuelve a las 8:00, 17:00 y 23:00
--    (hora de Madrid) en vez de cada 8 h en UTC. Como pg_cron trabaja en UTC y
--    Madrid cambia de hora (verano/invierno), el cron se lanza CADA HORA y
--    procesar_mercado_si_toca() solo ejecuta procesar_mercado_diario() cuando
--    en Madrid son las 8, las 17 o las 23.
--    Mantener igual que lib/mercadoCountdown.ts (HORAS_TANDA_MADRID).
--
-- 2) Pujas ocultas las 2 h antes de cada tanda: 6-8, 15-17 y 21-23 (Madrid).
--    Mantener igual que lib/mercadoCountdown.ts (HORAS_OCULTAS).
--
-- 3) Clausulazos cerrados desde el viernes a las 16:00 (un día antes de que
--    empiece la jornada) hasta el sábado a las 18:00 (hora de Madrid).
--    Mantener igual que components/InfoReglasButton.tsx.
--
-- IMPORTANTE: después de ejecutar esta migración hay que cambiar el cron a mano
-- desde el SQL Editor (ver el final del archivo).

-- 1) Resolver el mercado solo a las horas de tanda --------------------------
create or replace function public.procesar_mercado_si_toca()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if extract(hour from (now() at time zone 'Europe/Madrid'))::int in (8, 17, 23) then
    perform public.procesar_mercado_diario();
  end if;
end;
$$;

revoke all on function public.procesar_mercado_si_toca() from public, anon, authenticated;
grant execute on function public.procesar_mercado_si_toca() to postgres;

-- 2) Pujas ocultas ----------------------------------------------------------
create or replace function public.pujas_ocultas()
returns boolean
language sql
stable
as $$
  select extract(hour from (now() at time zone 'Europe/Madrid'))::int in (6, 7, 15, 16, 21, 22);
$$;

grant execute on function public.pujas_ocultas() to authenticated;

-- 3) Clausulazos cerrados ---------------------------------------------------
create or replace function public.clausulazos_cerrados()
returns boolean
language sql
stable
as $$
  select case extract(isodow from (now() at time zone 'Europe/Madrid'))
    when 5 then (now() at time zone 'Europe/Madrid')::time >= time '16:00'
    when 6 then (now() at time zone 'Europe/Madrid')::time < time '18:00'
    else false
  end;
$$;

grant execute on function public.clausulazos_cerrados() to authenticated;

-- Igual que en 0047, solo cambia el texto del aviso.
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
      'mensaje', 'Los clausulazos están cerrados: no se pueden hacer desde el viernes a las 16:00 hasta el sábado a las 18:00.'
    );
  end if;

  return public.pagar_clausula_privada(p_player_id, p_league_id);
end;
$$;

grant execute on function public.pagar_clausula(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Cron (EJECUTAR A MANO en el SQL Editor, una sola vez). No se programa
--    desde la migración porque el cron anterior también se creó a mano.
--
--    select cron.unschedule('mercado-cada-8h');
--
--    select cron.schedule(
--      'mercado-horas-madrid',
--      '0 * * * *',
--      $$ select public.procesar_mercado_si_toca(); $$
--    );
--
--    Si el cron de variacion_diaria_valores() se programó "unos minutos después
--    del mercado" (ver 0041), revisa que su hora siga teniendo sentido.
-- ---------------------------------------------------------------------------