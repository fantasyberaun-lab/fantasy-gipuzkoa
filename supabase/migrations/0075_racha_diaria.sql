-- 0075: recompensa diaria y racha (estilo Duolingo).
--
-- Reglas:
--   - Una vez al día (día de Madrid, 00:00-23:59) el manager pulsa "Reclamar" y
--     cobra la recompensa diaria (game_config 'recompensa_diaria', 1 M por defecto)
--     en TODOS sus equipos, uno por liga.
--   - Si reclamó ayer, la racha sube en 1; si se saltó algún día, vuelve a 1.
--   - Cada vez que la racha llega a un múltiplo de 'racha_dias_cofre' (7), además
--     abre un cofre con un premio al azar entre 'cofre_min' y 'cofre_max'
--     (5-10 M, en saltos de 0,5 M), también en todos sus equipos.
--   - La racha es por usuario, no por liga.
--
-- Nadie escribe estas tablas desde el navegador: solo reclamar_recompensa_diaria().
-- Como es security definer, corre como su propietario y el trigger
-- proteger_presupuesto_publico (0036) le deja sumar saldo en la liga pública.
--
-- Impacto en datos existentes: ninguno. Solo crea tablas, funciones y claves
-- nuevas en game_config. Se puede lanzar con `supabase db push` o pegándola en
-- el SQL Editor.

-- 1) Configuración (editable sin desplegar) ----------------------------------------
insert into game_config (clave, valor) values
  ('recompensa_diaria', '1'::jsonb),
  ('racha_dias_cofre', '7'::jsonb),
  ('cofre_min', '5'::jsonb),
  ('cofre_max', '10'::jsonb)
on conflict (clave) do nothing;

-- 2) Racha de cada usuario ----------------------------------------------------------
create table if not exists public.rachas (
  user_id uuid primary key references auth.users (id) on delete cascade,
  racha_actual integer not null default 0,
  mejor_racha integer not null default 0,
  ultimo_dia date, -- último día (Madrid) en que reclamó
  updated_at timestamptz not null default now()
);

alter table public.rachas enable row level security;

drop policy if exists "ver mi racha" on public.rachas;
create policy "ver mi racha" on public.rachas
  for select to authenticated
  using (user_id = auth.uid() or public.es_root());

-- 3) Registro de lo cobrado (una fila por usuario y día) --------------------------
-- La clave primaria (user_id, dia) impide cobrar dos veces el mismo día aunque
-- se pulse el botón dos veces a la vez.
create table if not exists public.recompensas_diarias (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  racha integer not null,
  importe_diario numeric not null,
  importe_cofre numeric not null default 0, -- 0 si ese día no tocaba cofre
  equipos integer not null, -- en cuántos equipos se ingresó
  created_at timestamptz not null default now(),
  primary key (user_id, dia)
);

create index if not exists recompensas_diarias_dia_idx on public.recompensas_diarias (dia);

alter table public.recompensas_diarias enable row level security;

drop policy if exists "ver mis recompensas" on public.recompensas_diarias;
create policy "ver mis recompensas" on public.recompensas_diarias
  for select to authenticated
  using (user_id = auth.uid() or public.es_root());

-- 4) Estado de la racha (para pintar la tarjeta) ----------------------------------
-- racha: la racha que sigue viva (0 si ya se rompió).
-- dias_para_cofre: cuántas reclamaciones faltan (contando la de hoy si no se ha hecho).
create or replace function public.estado_racha()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := (now() at time zone 'Europe/Madrid')::date;
  v_r rachas%rowtype;
  v_racha integer := 0;
  v_cada integer;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver tu racha.';
  end if;

  select coalesce((select valor::text::integer from game_config where clave = 'racha_dias_cofre'), 7)
  into v_cada;

  select * into v_r from rachas where user_id = v_uid;
  if found and v_r.ultimo_dia >= v_hoy - 1 then
    v_racha := v_r.racha_actual;
  end if;

  return jsonb_build_object(
    'racha', v_racha,
    'mejor_racha', coalesce(v_r.mejor_racha, 0),
    'reclamada_hoy', coalesce(v_r.ultimo_dia = v_hoy, false),
    'dias_cofre', v_cada,
    'dias_para_cofre', v_cada - (v_racha % v_cada),
    'recompensa_diaria', coalesce(
      (select valor::text::numeric from game_config where clave = 'recompensa_diaria'), 1)
  );
end;
$$;

revoke all on function public.estado_racha() from public, anon;
grant execute on function public.estado_racha() to authenticated;

-- 5) Reclamar ------------------------------------------------------------------------
create or replace function public.reclamar_recompensa_diaria()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := (now() at time zone 'Europe/Madrid')::date;
  v_r rachas%rowtype;
  v_racha integer;
  v_diaria numeric;
  v_cada integer;
  v_min numeric;
  v_max numeric;
  v_cofre numeric := 0;
  v_equipos integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para reclamar.');
  end if;

  select count(*) into v_equipos from fantasy_teams where owner_id = v_uid;
  if v_equipos = 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'Únete a una liga para empezar tu racha.');
  end if;

  -- Bloquea la fila de la racha (la crea si es la primera vez) para que dos
  -- peticiones a la vez no cobren dos veces.
  insert into rachas (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_r from rachas where user_id = v_uid for update;

  if v_r.ultimo_dia = v_hoy then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya has reclamado la recompensa de hoy. ¡Vuelve mañana!');
  end if;

  v_racha := case when v_r.ultimo_dia = v_hoy - 1 then v_r.racha_actual + 1 else 1 end;

  select coalesce((select valor::text::numeric from game_config where clave = 'recompensa_diaria'), 1),
         coalesce((select valor::text::integer from game_config where clave = 'racha_dias_cofre'), 7),
         coalesce((select valor::text::numeric from game_config where clave = 'cofre_min'), 5),
         coalesce((select valor::text::numeric from game_config where clave = 'cofre_max'), 10)
  into v_diaria, v_cada, v_min, v_max;

  if v_cada > 0 and v_racha % v_cada = 0 then
    -- Al azar entre min y max, en saltos de 0,5 M (5; 5,5; ... 10).
    v_cofre := v_min + floor(random() * (floor((v_max - v_min) * 2) + 1)) / 2;
  end if;

  update rachas
  set racha_actual = v_racha,
      mejor_racha = greatest(mejor_racha, v_racha),
      ultimo_dia = v_hoy,
      updated_at = now()
  where user_id = v_uid;

  update fantasy_teams
  set presupuesto = presupuesto + v_diaria + v_cofre
  where owner_id = v_uid;

  insert into recompensas_diarias (user_id, dia, racha, importe_diario, importe_cofre, equipos)
  values (v_uid, v_hoy, v_racha, v_diaria, v_cofre, v_equipos);

  return jsonb_build_object(
    'ok', true,
    'racha', v_racha,
    'importe_diario', v_diaria,
    'importe_cofre', v_cofre,
    'equipos', v_equipos,
    'dias_para_cofre', v_cada - (v_racha % v_cada)
  );
end;
$$;

revoke all on function public.reclamar_recompensa_diaria() from public, anon;
grant execute on function public.reclamar_recompensa_diaria() to authenticated;
