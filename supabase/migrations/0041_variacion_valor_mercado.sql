-- 0041: el valor de mercado de los jugadores evoluciona.
--
-- Hasta ahora players.valor_mercado solo se fijaba al calcular el valor
-- inicial (0010/0040) y nunca se movía. Ahora cambia de dos formas:
--
--   1) Por resultado: cada partida guardada en `results` mueve el valor del
--      jugador según lo esperado que fuera ese resultado (fórmula Elo):
--
--          E        = 1 / (1 + 10^((elo_rival - elo_jugador) / 400))
--          cambio % = K x (resultado - E)     resultado = 1, 0.5 o 0
--
--      Con K = 4: ganar a alguien mucho más fuerte sube casi un 4 %, ganar a
--      alguien más débil apenas sube, y perder contra alguien más débil baja
--      casi un 4 %. Un Elo de 0 (sin Elo) se trata como 1400, en los dos lados.
--      Si el admin corrige o borra un resultado, el cambio se deshace y se
--      aplica el nuevo.
--
--   2) Variación diaria aleatoria (cron): cada jugador activo sube o baja
--      entre 0.1 % y 1.5 %. La probabilidad de subir depende de lo lejos que
--      esté del valor de fórmula (calcular_valor_inicial): por debajo sube
--      más a menudo, por encima baja más a menudo. Así no deriva sin control.
--
-- Suelo: el valor nunca baja de valor_inicial.valor_min (10 M).
-- Histórico: player_value_history guarda cada cambio, sea del motivo que sea.
--
-- Requiere 0014 (results), 0040 (calcular_valor_inicial, decimales).

-- ---------------------------------------------------------------------------
-- 1) Parámetros (editables desde game_config, sin desplegar)
-- ---------------------------------------------------------------------------
insert into game_config (clave, valor)
values (
  'variacion_valor',
  jsonb_build_object(
    'k_resultado_pct', 4,        -- K de la fórmula por resultado, en %
    'elo_sin_dato', 1400,        -- Elo que se usa cuando el Elo es 0
    'diaria_min_pct', 0.1,       -- variación diaria mínima (en valor absoluto)
    'diaria_max_pct', 1.5,       -- variación diaria máxima
    'sesgo_por_pct', 0.01,       -- +1 punto de prob. de subir por cada 1 % bajo la fórmula
    'prob_min', 0.1,             -- la prob. de subir nunca sale de [0.1, 0.9]
    'prob_max', 0.9
  )
)
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Histórico
-- ---------------------------------------------------------------------------
create table if not exists player_value_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  valor numeric not null,            -- valor DESPUÉS del cambio, en M
  valor_anterior numeric,            -- null en el punto inicial
  cambio_pct numeric,                -- cambio efectivo (ya con el suelo aplicado)
  motivo text not null
    check (motivo in ('inicial', 'diaria', 'resultado', 'correccion', 'ajuste')),
  -- Resultado que originó el cambio. Sin FK a propósito: al borrar un
  -- resultado hay que seguir pudiendo leer sus cambios para deshacerlos.
  result_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists player_value_history_player_idx
  on player_value_history (player_id, created_at);
create index if not exists player_value_history_result_idx
  on player_value_history (result_id) where result_id is not null;

alter table player_value_history enable row level security;

-- El valor de mercado ya es público (players), su historia también.
create policy "lectura publica player_value_history" on player_value_history
  for select using (true);
-- Sin políticas de escritura: solo escriben los triggers/funciones security definer.

-- ---------------------------------------------------------------------------
-- 3) Toda modificación de players.valor_mercado deja rastro en el histórico
--    (cambios por resultado, cron diario, y también recálculos o ediciones
--    manuales del admin, que quedan como 'ajuste').
--    Las funciones de más abajo indican el motivo con set_config(..., true)
--    (local a la transacción) justo antes de hacer el UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.registrar_valor_jugador()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_motivo text;
  v_result_id uuid;
begin
  if tg_op = 'INSERT' then
    insert into player_value_history (player_id, valor, motivo)
    values (new.id, new.valor_mercado, 'inicial');
    return new;
  end if;

  v_motivo := coalesce(nullif(current_setting('app.valor_motivo', true), ''), 'ajuste');
  v_result_id := nullif(current_setting('app.valor_result_id', true), '')::uuid;

  insert into player_value_history (player_id, valor, valor_anterior, cambio_pct, motivo, result_id)
  values (
    new.id,
    new.valor_mercado,
    old.valor_mercado,
    case when old.valor_mercado > 0
         then round((new.valor_mercado / old.valor_mercado - 1) * 100, 4)
    end,
    v_motivo,
    v_result_id
  );
  return new;
end;
$$;

drop trigger if exists registrar_valor_jugador_ins_trg on public.players;
create trigger registrar_valor_jugador_ins_trg
  after insert on public.players
  for each row execute function public.registrar_valor_jugador();

drop trigger if exists registrar_valor_jugador_upd_trg on public.players;
create trigger registrar_valor_jugador_upd_trg
  after update of valor_mercado on public.players
  for each row
  when (old.valor_mercado is distinct from new.valor_mercado)
  execute function public.registrar_valor_jugador();

-- Punto de partida de la gráfica para los jugadores que ya existen.
insert into player_value_history (player_id, valor, motivo)
select p.id, p.valor_mercado, 'inicial'
from players p
where not exists (select 1 from player_value_history h where h.player_id = p.id);

-- ---------------------------------------------------------------------------
-- 4) Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.valor_minimo_jugador()
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select (valor ->> 'valor_min')::numeric from game_config where clave = 'valor_inicial'),
    10
  );
$$;

-- Cambio % de valor por una partida. p_puntuacion: 1 victoria, 0.5 tablas, 0 derrota.
create or replace function public.cambio_valor_por_resultado(
  p_puntuacion numeric,
  p_elo_jugador integer,
  p_elo_rival integer
)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  c jsonb := coalesce((select valor from game_config where clave = 'variacion_valor'), '{}'::jsonb);
  v_k numeric := coalesce((c ->> 'k_resultado_pct')::numeric, 4);
  v_sin_elo integer := coalesce((c ->> 'elo_sin_dato')::integer, 1400);
  v_ej numeric := case when coalesce(p_elo_jugador, 0) > 0 then p_elo_jugador else v_sin_elo end;
  v_er numeric := case when coalesce(p_elo_rival, 0) > 0 then p_elo_rival else v_sin_elo end;
  v_esperada numeric;
begin
  v_esperada := 1 / (1 + power(10::numeric, (v_er - v_ej) / 400));
  return v_k * (p_puntuacion - v_esperada);
end;
$$;

create or replace function public.puntuacion_de_resultado(p_resultado resultado_partida)
returns numeric
language sql
immutable
as $$
  select case p_resultado when 'victoria' then 1 when 'tablas' then 0.5 else 0 end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Cambio por resultado: trigger sobre results
--    AFTER, para que ya estén rellenados rival_elo_en_el_momento (0014) y la
--    fila espejo se trate igual: cada jugador de la partida tiene su propia
--    fila en results y se mueve con el Elo de su rival.
-- ---------------------------------------------------------------------------
create or replace function public.trigger_valor_por_resultado()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_piso numeric := public.valor_minimo_jugador();
  v_result_id uuid;
  v_player_id uuid;
  v_valor numeric;
  v_elo_jugador integer;
  v_net numeric := 1;            -- factor acumulado que ESTE resultado ya aplicó
  v_nuevo_factor numeric := 1;
  v_nuevo numeric;
begin
  if tg_op = 'DELETE' then
    v_result_id := old.id;
    v_player_id := old.player_id;
  else
    v_result_id := new.id;
    v_player_id := new.player_id;
  end if;

  -- Un UPDATE que no toca nada relevante (p. ej. guardar dos veces lo mismo)
  -- no debe mover el valor otra vez. (player_id de una fila de results nunca
  -- cambia: guardar_resultado_partida hace upsert por (player_id, matchday_id).)
  if tg_op = 'UPDATE'
     and old.resultado = new.resultado
     and old.rival_player_id is not distinct from new.rival_player_id
     and old.rival_elo_en_el_momento is not distinct from new.rival_elo_en_el_momento then
    return new;
  end if;

  select valor_mercado, elo into v_valor, v_elo_jugador
  from players where id = v_player_id
  for update;

  if v_valor is null then
    -- El jugador ya no existe (borrado en cascada): nada que mover.
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  -- Corrección o borrado: primero se quita lo que este resultado ya aplicó.
  if tg_op in ('UPDATE', 'DELETE') then
    select coalesce(exp(sum(ln(1 + h.cambio_pct / 100))), 1) into v_net
    from player_value_history h
    where h.result_id = v_result_id
      and h.player_id = v_player_id
      and h.cambio_pct is not null;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    v_nuevo_factor := 1 + public.cambio_valor_por_resultado(
      public.puntuacion_de_resultado(new.resultado),
      v_elo_jugador,
      new.rival_elo_en_el_momento
    ) / 100;
  end if;

  v_nuevo := greatest(round(v_valor / v_net * v_nuevo_factor, 2), v_piso);

  if v_nuevo is distinct from v_valor then
    perform set_config('app.valor_motivo',
      case when tg_op = 'INSERT' then 'resultado' else 'correccion' end, true);
    perform set_config('app.valor_result_id', v_result_id::text, true);

    update players set valor_mercado = v_nuevo where id = v_player_id;

    perform set_config('app.valor_motivo', '', true);
    perform set_config('app.valor_result_id', '', true);
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists valor_por_resultado_trg on public.results;
create trigger valor_por_resultado_trg
  after insert or update or delete on public.results
  for each row execute function public.trigger_valor_por_resultado();

-- ---------------------------------------------------------------------------
-- 6) Variación diaria aleatoria (para pg_cron)
--    Cambio = +-U(diaria_min, diaria_max) %. El signo sale de un sorteo con
--    P(subir) = clamp(0.5 + sesgo x desviación %, prob_min, prob_max), donde
--    desviación % = (valor de fórmula - valor actual) / valor actual x 100.
--    Ej. con sesgo 0.01: un jugador 10 % por debajo de su fórmula sube con
--    P = 0.6; uno 10 % por encima, con P = 0.4; en la fórmula, 0.5.
--    (Simulado: tras una subida del 15 % por resultados, conserva ~+5 % a los
--    60 días. Sube 'sesgo_por_pct' si quieres que vuelva antes a la fórmula.)
--    Solo jugadores activos. Es idempotente por día: si ya se ejecutó hoy
--    (hora de Madrid) no hace nada, salvo p_forzar = true.
-- ---------------------------------------------------------------------------
create or replace function public.variacion_diaria_valores(p_forzar boolean default false)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  c jsonb := coalesce((select valor from game_config where clave = 'variacion_valor'), '{}'::jsonb);
  v_min numeric := coalesce((c ->> 'diaria_min_pct')::numeric, 0.1);
  v_max numeric := coalesce((c ->> 'diaria_max_pct')::numeric, 1.5);
  v_sesgo numeric := coalesce((c ->> 'sesgo_por_pct')::numeric, 0.01);
  v_pmin numeric := coalesce((c ->> 'prob_min')::numeric, 0.1);
  v_pmax numeric := coalesce((c ->> 'prob_max')::numeric, 0.9);
  v_piso numeric := public.valor_minimo_jugador();
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  r record;
  v_formula numeric;
  v_desviacion numeric;
  v_prob_subir numeric;
  v_pct numeric;
  v_nuevo numeric;
  v_cambiados integer := 0;
begin
  if not p_forzar and exists (
    select 1 from player_value_history
    where motivo = 'diaria'
      and (created_at at time zone 'Europe/Madrid')::date = hoy
  ) then
    return jsonb_build_object('ok', true, 'cambiados', 0, 'mensaje', 'Ya se aplicó hoy.');
  end if;

  perform set_config('app.valor_motivo', 'diaria', true);
  perform set_config('app.valor_result_id', '', true);

  for r in
    select id, elo, anio_nacimiento, valor_mercado
    from players
    where activo = true and valor_mercado > 0
  loop
    v_formula := public.calcular_valor_inicial(r.elo, r.anio_nacimiento);
    v_desviacion := (v_formula - r.valor_mercado) / r.valor_mercado * 100;
    v_prob_subir := least(greatest(0.5 + v_sesgo * v_desviacion, v_pmin), v_pmax);
    v_pct := v_min + random() * (v_max - v_min);
    if random() >= v_prob_subir then
      v_pct := -v_pct;
    end if;

    v_nuevo := greatest(round(r.valor_mercado * (1 + v_pct / 100), 2), v_piso);

    if v_nuevo is distinct from r.valor_mercado then
      update players set valor_mercado = v_nuevo where id = r.id;
      v_cambiados := v_cambiados + 1;
    end if;
  end loop;

  perform set_config('app.valor_motivo', '', true);

  return jsonb_build_object('ok', true, 'cambiados', v_cambiados);
end;
$$;

revoke all on function public.variacion_diaria_valores(boolean) from public, anon, authenticated;
grant execute on function public.variacion_diaria_valores(boolean) to postgres;

-- Las funciones internas no son para la API.
revoke all on function public.trigger_valor_por_resultado() from public, anon, authenticated;
revoke all on function public.registrar_valor_jugador() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7) Programación (pg_cron). NO se activa desde la migración porque el
--    procesar_mercado_diario() se programó a mano y no sé en qué huso. Ejecuta
--    esto en el SQL Editor unos minutos DESPUÉS del mercado: las pujas ya no
--    se descartan por cambios de valor (ver 0042), pero así la tanda nueva
--    arranca con el valor del día. (pg_cron en Supabase usa UTC.)
--
--    select cron.schedule(
--      'variacion-diaria-valores',
--      '5 12 * * *',
--      $$ select public.variacion_diaria_valores(); $$
--    );
-- ---------------------------------------------------------------------------
