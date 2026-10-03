-- 0061: actualización mensual de Elo y reajuste del valor de mercado.
--
-- Qué añade:
--   1) players.elo_anterior: Elo del periodo anterior (para enseñar ▲/▼ sin joins).
--   2) player_elo_history: un punto por jugador y mes (para la gráfica de Elo).
--   3) aplicar_actualizacion_elo(periodo, datos, aplicar): recibe [{fide_id, elo}],
--      con aplicar = false solo devuelve la VISTA PREVIA y no toca nada.
--      Con aplicar = true actualiza Elo, valor de mercado, histórico y avisa
--      a todos los equipos con una notificación destacada.
--   4) Motivo 'elo' en player_value_history y tipo 'actualizacion_elo' en
--      notificaciones (con una columna `datos` para el resumen de cada equipo).
--
-- Valor de mercado al cambiar el Elo:
--
--     valor nuevo = valor actual x f(Elo nuevo, edad) / f(Elo actual, edad)
--
--   donde f = calcular_valor_inicial (0040). La edad es la misma en los dos
--   lados, así que solo cuenta el efecto del Elo. Se mueve el "ancla" de la
--   fórmula y se conserva lo que el jugador haya ganado o perdido por partidos
--   (0041). Topes por actualización (game_config 'actualizacion_elo'):
--   +25 % / -20 %, salvo en el debut (de "sin Elo" a tener Elo), que salta
--   directo al valor de fórmula. Suelo: valor_inicial.valor_min.
--
-- Requiere 0031 (permisos por columna en players), 0040, 0041 y 0022.

-- ---------------------------------------------------------------------------
-- 1) Columnas, tabla e histórico
-- ---------------------------------------------------------------------------
alter table public.players add column if not exists elo_anterior integer;

-- players tiene permisos de lectura POR COLUMNA (0031): hay que dar el de la nueva.
grant select (elo_anterior) on public.players to anon, authenticated;

create table if not exists public.player_elo_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  periodo date not null,                 -- primer día del mes de la lista FIDE
  elo integer not null,
  elo_anterior integer,                  -- Elo del periodo anterior (0/null = sin Elo)
  created_at timestamptz not null default now(),
  unique (player_id, periodo)
);

create index if not exists player_elo_history_player_idx
  on public.player_elo_history (player_id, periodo);

alter table public.player_elo_history enable row level security;

-- El Elo ya es público (players), su evolución también.
drop policy if exists "lectura publica player_elo_history" on public.player_elo_history;
create policy "lectura publica player_elo_history" on public.player_elo_history
  for select using (true);
-- Sin políticas de escritura: solo escribe la función security definer.

-- Punto de partida para los jugadores que ya tienen Elo.
-- ¡AJUSTA LA FECHA! Debe ser el mes de la lista FIDE de la que salen los Elo
-- que hay ahora mismo en la base de datos (se asume septiembre de 2026).
insert into public.player_elo_history (player_id, periodo, elo)
select p.id, date '2026-09-01', p.elo
from public.players p
where p.elo > 0
on conflict (player_id, periodo) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Nuevos motivos / tipos
-- ---------------------------------------------------------------------------
alter table public.player_value_history drop constraint if exists player_value_history_motivo_check;
alter table public.player_value_history add constraint player_value_history_motivo_check
  check (motivo in ('inicial', 'diaria', 'resultado', 'correccion', 'ajuste', 'elo'));

alter table public.notificaciones add column if not exists datos jsonb;

alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check
  check (tipo in (
    'oferta_recibida', 'fichaje', 'clausulazo', 'clausula_subida',
    'oferta_rechazada', 'actualizacion_elo'
  ));

-- ---------------------------------------------------------------------------
-- 3) Parámetros
-- ---------------------------------------------------------------------------
insert into public.game_config (clave, valor)
values (
  'actualizacion_elo',
  jsonb_build_object(
    'tope_subida_pct', 25,     -- máxima subida de valor por actualización
    'tope_bajada_pct', 20,     -- máxima bajada de valor por actualización
    'aviso_delta_elo', 150     -- en la vista previa, avisa si el Elo cambia más que esto
  )
)
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------------
-- 4) Función principal
--    p_datos: [{"fide_id": "2225131", "elo": 1990}, ...]
-- ---------------------------------------------------------------------------
create or replace function public.aplicar_actualizacion_elo(
  p_periodo date,
  p_datos jsonb,
  p_aplicar boolean default false
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  c jsonb := coalesce((select valor from game_config where clave = 'actualizacion_elo'), '{}'::jsonb);
  v_tope_sube numeric := coalesce((c ->> 'tope_subida_pct')::numeric, 25);
  v_tope_baja numeric := coalesce((c ->> 'tope_bajada_pct')::numeric, 20);
  v_aviso numeric := coalesce((c ->> 'aviso_delta_elo')::numeric, 150);
  v_piso numeric := public.valor_minimo_jugador();
  v_periodo date := date_trunc('month', p_periodo)::date;
  r record;
  t record;
  v_elo_prev integer;
  v_ratio numeric;
  v_nuevo numeric;
  v_filas jsonb := '[]'::jsonb;
  v_sin_dato integer;
  v_no_encontrados jsonb;
  v_coinciden integer := 0;
  v_cambian_elo integer := 0;
  v_suben integer := 0;
  v_bajan integer := 0;
  v_debuts integer := 0;
  v_antes jsonb;
  v_valor_antes numeric;
  v_valor_despues numeric;
  v_mejor jsonb;
  v_peor jsonb;
  v_n_cambios integer;
begin
  if not (public.es_root() or coalesce(auth.role(), '') = 'service_role') then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede hacer esto.');
  end if;

  if p_datos is null or jsonb_typeof(p_datos) <> 'array' or jsonb_array_length(p_datos) = 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'No hay datos de Elo que aplicar.');
  end if;

  -- Fichas de la lista, sin duplicados y con Elo razonable.
  create temp table if not exists _elo_lista (fide_id text primary key, elo integer not null) on commit drop;
  truncate _elo_lista;
  insert into _elo_lista (fide_id, elo)
  select distinct on (btrim(d.fide_id)) btrim(d.fide_id), d.elo
  from jsonb_to_recordset(p_datos) as d(fide_id text, elo integer)
  where btrim(coalesce(d.fide_id, '')) <> '' and d.elo between 100 and 3500
  order by btrim(d.fide_id), d.elo desc;

  -- Valor de cada plantilla ANTES de tocar nada (para el aviso).
  select coalesce(jsonb_object_agg(x.team_id::text, x.valor), '{}'::jsonb) into v_antes
  from (
    select ss.fantasy_team_id as team_id, sum(p.valor_mercado) as valor
    from squad_slots ss
    join players p on p.id = ss.player_id
    where ss.fecha_salida is null
    group by ss.fantasy_team_id
  ) x;

  for r in
    select p.id, p.nombre, p.club, p.elo, p.anio_nacimiento, p.valor_mercado, l.elo as elo_nuevo
    from players p
    join _elo_lista l on l.fide_id = p.fide_id
    order by p.nombre
  loop
    v_coinciden := v_coinciden + 1;

    -- Elo del periodo anterior (para el ▲/▼); si no hay histórico, el actual.
    select h.elo into v_elo_prev
    from player_elo_history h
    where h.player_id = r.id and h.periodo < v_periodo
    order by h.periodo desc
    limit 1;
    v_elo_prev := coalesce(v_elo_prev, nullif(r.elo, 0));

    v_nuevo := r.valor_mercado;

    if r.elo_nuevo is distinct from r.elo then
      v_cambian_elo := v_cambian_elo + 1;
      if r.elo = 0 then
        v_debuts := v_debuts + 1;
      elsif r.elo_nuevo > r.elo then
        v_suben := v_suben + 1;
      else
        v_bajan := v_bajan + 1;
      end if;

      -- Razón de las dos evaluaciones de la fórmula (misma edad en ambas).
      v_ratio := public.calcular_valor_inicial(r.elo_nuevo, r.anio_nacimiento)
               / nullif(public.calcular_valor_inicial(r.elo, r.anio_nacimiento), 0);
      v_ratio := coalesce(v_ratio, 1);
      if r.elo > 0 then   -- el debut (sin Elo -> con Elo) no tiene tope
        v_ratio := least(greatest(v_ratio, 1 - v_tope_baja / 100), 1 + v_tope_sube / 100);
      end if;
      v_nuevo := greatest(round(r.valor_mercado * v_ratio, 2), v_piso);
    end if;

    if r.elo_nuevo is distinct from r.elo or v_nuevo is distinct from r.valor_mercado then
      v_filas := v_filas || jsonb_build_array(jsonb_build_object(
        'id', r.id,
        'nombre', r.nombre,
        'club', r.club,
        'elo_antes', r.elo,
        'elo_despues', r.elo_nuevo,
        'valor_antes', r.valor_mercado,
        'valor_despues', v_nuevo,
        'cambio_pct', case when r.valor_mercado > 0 then round((v_nuevo / r.valor_mercado - 1) * 100, 2) end,
        'aviso', r.elo > 0 and abs(r.elo_nuevo - r.elo) > v_aviso
      ));
    end if;

    if p_aplicar then
      if v_nuevo is distinct from r.valor_mercado then
        perform set_config('app.valor_motivo', 'elo', true);
        perform set_config('app.valor_result_id', '', true);
      end if;

      update players
      set elo = r.elo_nuevo,
          elo_anterior = v_elo_prev,
          valor_mercado = v_nuevo
      where id = r.id;

      perform set_config('app.valor_motivo', '', true);

      insert into player_elo_history (player_id, periodo, elo, elo_anterior)
      values (r.id, v_periodo, r.elo_nuevo, v_elo_prev)
      on conflict (player_id, periodo)
      do update set elo = excluded.elo, elo_anterior = excluded.elo_anterior;
    end if;
  end loop;

  select count(*) into v_sin_dato
  from players p
  where p.fide_id is not null and btrim(p.fide_id) <> ''
    and not exists (select 1 from _elo_lista l where l.fide_id = p.fide_id);

  select coalesce(jsonb_agg(l.fide_id), '[]'::jsonb) into v_no_encontrados
  from (
    select l.fide_id from _elo_lista l
    where not exists (select 1 from players p where p.fide_id = l.fide_id)
    limit 20
  ) l;

  -- Aviso destacado a cada equipo (una vez por periodo).
  if p_aplicar and v_cambian_elo > 0
     and not exists (
       select 1 from notificaciones
       where tipo = 'actualizacion_elo' and datos ->> 'periodo' = v_periodo::text
     )
  then
    for t in select ft.id, ft.league_id from fantasy_teams ft loop
      select coalesce(sum(p.valor_mercado), 0),
             count(*) filter (where h.elo_anterior is not null and h.elo is distinct from h.elo_anterior)
      into v_valor_despues, v_n_cambios
      from squad_slots ss
      join players p on p.id = ss.player_id
      left join player_elo_history h on h.player_id = p.id and h.periodo = v_periodo
      where ss.fantasy_team_id = t.id and ss.fecha_salida is null;

      v_valor_antes := coalesce((v_antes ->> t.id::text)::numeric, 0);

      select jsonb_build_object('nombre', p.nombre, 'delta', h.elo - h.elo_anterior) into v_mejor
      from squad_slots ss
      join players p on p.id = ss.player_id
      join player_elo_history h on h.player_id = p.id and h.periodo = v_periodo
      where ss.fantasy_team_id = t.id and ss.fecha_salida is null
        and h.elo_anterior > 0 and h.elo > h.elo_anterior
      order by h.elo - h.elo_anterior desc, p.nombre
      limit 1;

      select jsonb_build_object('nombre', p.nombre, 'delta', h.elo - h.elo_anterior) into v_peor
      from squad_slots ss
      join players p on p.id = ss.player_id
      join player_elo_history h on h.player_id = p.id and h.periodo = v_periodo
      where ss.fantasy_team_id = t.id and ss.fecha_salida is null
        and h.elo_anterior > 0 and h.elo < h.elo_anterior
      order by h.elo - h.elo_anterior, p.nombre
      limit 1;

      insert into notificaciones (league_id, tipo, objetivo_team_id, privada, datos)
      values (
        t.league_id, 'actualizacion_elo', t.id, true,
        jsonb_build_object(
          'periodo', v_periodo,
          'valor_antes', round(v_valor_antes, 2),
          'valor_despues', round(v_valor_despues, 2),
          'jugadores_con_cambio', v_n_cambios,
          'mejor', v_mejor,
          'peor', v_peor,
          'jugadores_actualizados', v_cambian_elo
        )
      );
    end loop;
  end if;

  return jsonb_build_object(
    'ok', true,
    'aplicado', p_aplicar,
    'periodo', v_periodo,
    'resumen', jsonb_build_object(
      'en_lista', (select count(*) from _elo_lista),
      'coinciden', v_coinciden,
      'cambian_elo', v_cambian_elo,
      'suben', v_suben,
      'bajan', v_bajan,
      'debuts', v_debuts,
      'sin_dato_en_lista', v_sin_dato,
      'no_encontrados', v_no_encontrados
    ),
    'filas', v_filas
  );
end;
$$;

revoke all on function public.aplicar_actualizacion_elo(date, jsonb, boolean) from public, anon;
grant execute on function public.aplicar_actualizacion_elo(date, jsonb, boolean) to authenticated, service_role;
