-- 0040: valor base sin Elo, valores con decimales, precio de puja siempre
--       actualizado y control real de pujas/deuda.
--
-- Requiere 0011 (calcular_valor_inicial), 0036 (procesar_mercado_diario).

-- ---------------------------------------------------------------------------
-- 1) Parámetros
-- ---------------------------------------------------------------------------

-- Multiplicador máximo de los jóvenes: x1.25 (sin Elo: 10 M -> 12.5 M como
-- máximo). Corrige el x1.5 que dejó 0039.
update game_config
set valor = valor || jsonb_build_object(
      'juventud_intensidad', 0.4,
      'juventud_max', 1.4,
      'valor_sin_elo', 10
    ),
    updated_at = now()
where clave = 'valor_inicial';

-- Deuda máxima permitida = porcentaje del valor de mercado de la plantilla.
-- ¡Ajusta el porcentaje a tu gusto! (0.2 = 20 %)
insert into game_config (clave, valor)
values ('limite_deuda', jsonb_build_object('porcentaje_plantilla', 0.1))
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Valor inicial: los jugadores sin Elo (0) parten de 10 M y el valor
--    admite 2 decimales (antes se redondeaba al millón).
-- ---------------------------------------------------------------------------
create or replace function public.calcular_valor_inicial(
  p_elo integer,
  p_anio_nacimiento integer default null
)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  c jsonb := coalesce((select valor from game_config where clave = 'valor_inicial'), '{}'::jsonb);
  v_min numeric := coalesce((c ->> 'valor_min')::numeric, 10);
  v_sin_elo numeric := coalesce((c ->> 'valor_sin_elo')::numeric, 10);
  v_max numeric := (c ->> 'valor_max')::numeric;  -- null = sin techo
  v_elo_min numeric := coalesce((c ->> 'elo_min')::numeric, 1400);
  v_k numeric := coalesce((c ->> 'elo_k')::numeric, 28);
  v_exponente numeric := coalesce((c ->> 'elo_exponente')::numeric, 0.65);
  v_edad_ref numeric := coalesce((c ->> 'edad_referencia')::numeric, 25);
  v_juv_intensidad numeric := coalesce((c ->> 'juventud_intensidad')::numeric, 0.4);
  v_juv_max numeric := coalesce((c ->> 'juventud_max')::numeric, 1.25);
  v_vet_desde numeric := coalesce((c ->> 'veteranos_desde')::numeric, 55);
  v_vet_por_anio numeric := coalesce((c ->> 'veteranos_por_anio')::numeric, 0.006);
  v_vet_min numeric := coalesce((c ->> 'veteranos_min')::numeric, 0.75);
  v_anio_ref integer := coalesce((c ->> 'anio_referencia')::integer, extract(year from current_date)::integer);
  v_edad numeric;
  v_mult numeric := 1;
  v_valor numeric;
begin
  if coalesce(p_elo, 0) > 0 then
    v_valor := v_min + v_k * power(greatest(p_elo - v_elo_min, 0) / 100, v_exponente);
  else
    v_valor := v_sin_elo;  -- sin Elo: precio base fijo
  end if;

  if p_anio_nacimiento is not null then
    v_edad := v_anio_ref - p_anio_nacimiento;
    if v_edad between 5 and 110 then
      if v_edad < v_edad_ref then
        v_mult := least(1 + v_juv_intensidad * ln(v_edad_ref / v_edad), v_juv_max);
      elsif v_edad > v_vet_desde then
        v_mult := greatest(1 - v_vet_por_anio * (v_edad - v_vet_desde), v_vet_min);
      end if;
    end if;
  end if;

  v_valor := greatest(v_valor * v_mult, v_min);
  if v_max is not null then
    v_valor := least(v_valor, v_max);
  end if;

  return round(v_valor, 2);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) BUG: el precio de puja no seguía al valor del jugador.
--    market_listings.valor_actual era una copia del valor al abrir la tanda.
--    Ahora (a) se sincroniza cuando cambia players.valor_mercado y
--    (b) pujar_mercado lee el valor directamente de players.
-- ---------------------------------------------------------------------------
create or replace function public.sincronizar_valor_listings()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update market_listings
  set valor_actual = new.valor_mercado
  where player_id = new.id and disponible = true;
  return new;
end;
$$;

drop trigger if exists sincronizar_valor_listings_trg on public.players;
create trigger sincronizar_valor_listings_trg
  after update of valor_mercado on public.players
  for each row
  when (old.valor_mercado is distinct from new.valor_mercado)
  execute function public.sincronizar_valor_listings();

-- Corrige ya los listings abiertos que tengan un valor desfasado.
update market_listings ml
set valor_actual = p.valor_mercado
from players p
where p.id = ml.player_id
  and ml.disponible = true
  and ml.valor_actual is distinct from p.valor_mercado;

-- ---------------------------------------------------------------------------
-- 4) Control de pujas y deuda
-- ---------------------------------------------------------------------------

-- Deuda máxima de un equipo: porcentaje x valor de mercado de su plantilla.
create or replace function public.limite_deuda_equipo(p_equipo_id uuid)
returns numeric
language sql
stable
security definer set search_path = public
as $$
  select round(
    coalesce(
      (select (valor ->> 'porcentaje_plantilla')::numeric from game_config where clave = 'limite_deuda'),
      0.2
    ) * coalesce(sum(p.valor_mercado), 0),
    2
  )
  from squad_slots ss
  join players p on p.id = ss.player_id
  where ss.fantasy_team_id = p_equipo_id
    and ss.fecha_salida is null;
$$;

revoke all on function public.limite_deuda_equipo(uuid) from public, anon;
grant execute on function public.limite_deuda_equipo(uuid) to authenticated;

-- pujar_mercado: la suma de TODAS las pujas abiertas del equipo no puede
-- superar saldo + deuda máxima permitida.
create or replace function public.pujar_mercado(p_listing_id uuid, p_importe numeric, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_saldo numeric;
  v_disponible boolean;
  v_valor_minimo numeric;
  v_listing_league_id uuid;
  v_importe numeric := round(p_importe, 2);
  v_limite numeric;
  v_comprometido numeric;
  v_margen numeric;
begin
  -- Se bloquea la fila del equipo para que dos pujas simultáneas no se
  -- salten el límite.
  select id, presupuesto into v_equipo_id, v_saldo
  from fantasy_teams
  where owner_id = auth.uid() and league_id = p_league_id
  for update;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  -- El valor mínimo es el valor ACTUAL del jugador, no el de la apertura.
  select ml.disponible, p.valor_mercado, ml.league_id
  into v_disponible, v_valor_minimo, v_listing_league_id
  from market_listings ml
  join players p on p.id = ml.player_id
  where ml.id = p_listing_id;

  if v_disponible is null or v_listing_league_id <> p_league_id then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no está en el mercado de esta liga.');
  end if;
  if not v_disponible then
    return jsonb_build_object('ok', false, 'mensaje', 'La puja por ese jugador ya ha cerrado.');
  end if;

  if v_importe < v_valor_minimo then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('La puja no puede ser inferior al valor de mercado actual (%s M).', v_valor_minimo)
    );
  end if;

  v_limite := public.limite_deuda_equipo(v_equipo_id);

  -- Lo ya comprometido en tus OTRAS pujas abiertas (la de este mismo
  -- jugador se sustituye, no se suma).
  select coalesce(sum(b.importe), 0) into v_comprometido
  from bids b
  join market_listings ml on ml.id = b.market_listing_id
  where b.fantasy_team_id = v_equipo_id
    and ml.disponible = true
    and b.market_listing_id <> p_listing_id;

  v_margen := greatest(v_saldo + v_limite - v_comprometido, 0);

  if v_importe > v_margen then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format(
        'Superas tu límite: saldo %s M + deuda máxima %s M - otras pujas abiertas %s M. Puedes pujar como máximo %s M por este jugador.',
        v_saldo, v_limite, v_comprometido, v_margen
      )
    );
  end if;

  insert into bids (market_listing_id, fantasy_team_id, importe, league_id)
  values (p_listing_id, v_equipo_id, v_importe, p_league_id)
  on conflict (market_listing_id, fantasy_team_id)
  do update set importe = excluded.importe, created_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.pujar_mercado(uuid, numeric, uuid) to authenticated;

-- procesar_mercado_diario: resuelve las pujas de forma secuencial.
--   * Se recorren de mayor a menor importe (empate: quien pujó antes).
--   * Cada puja se valida EN ESE MOMENTO: el jugador sigue libre, la puja
--     alcanza el valor actual, hay hueco en la plantilla y el saldo tras
--     pagar no baja de -(deuda máxima). Si falla, se pasa a la siguiente
--     puja (otro postor puede llevarse al jugador).
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

    for r in
      select b.market_listing_id, b.fantasy_team_id, b.importe, ml.player_id
      from bids b
      join market_listings ml on ml.id = b.market_listing_id
      join players p on p.id = ml.player_id
      where ml.disponible = true
        and ml.league_id = v_liga.id
        and b.importe >= p.valor_mercado
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
