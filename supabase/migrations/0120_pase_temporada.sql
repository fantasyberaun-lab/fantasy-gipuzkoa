-- 0120: pase de recompensas por temporada (Fase 2, "profundidad").
--
-- Una barra de progreso PROPIA del pase, que sube con la misma actividad que da
-- XP (entradas diarias, cofres, jornadas, misiones, minijuegos) pero contada por
-- temporada y con su propia tabla de recompensas por escalón. Es independiente
-- del nivel global: la barra se reinicia cada temporada.
--
-- Recompensas por escalón (editables desde pase_escalones): saldo moderado, XP,
-- protectores de racha e insignias de temporada (cosméticas). El saldo se
-- ingresa en todos los equipos del manager (como la racha); la XP se da con
-- fuente 'pase' (que el trigger ignora para no retroalimentar la barra); el
-- protector se guarda en rachas.protecciones y lo consume recuperar_racha gratis.
--
-- Cómo sube la barra: un trigger copia cada ganancia de XP (xp_movimientos) a la
-- temporada activa. El trigger lleva una red de seguridad (si algo falla, no
-- rompe la escritura de XP del login).
--
-- Impacto en datos existentes: crea tablas (una temporada y una tabla de
-- escalones de ejemplo), añade rachas.protecciones y 'pase' al check de
-- xp_movimientos.fuente, y sustituye estado_racha y recuperar_racha (0116) para
-- usar las protecciones. La barra empieza de cero: la XP ya acumulada no se
-- copia. Se puede lanzar con `supabase db push` o en el SQL Editor.

-- 1) Columnas y constraints -----------------------------------------------------------
alter table public.rachas add column if not exists protecciones integer not null default 0;

alter table public.xp_movimientos drop constraint if exists xp_movimientos_fuente_check;
alter table public.xp_movimientos add constraint xp_movimientos_fuente_check
  check (fuente in ('login', 'cofre', 'jornada', 'mision', 'minijuego', 'pase'));

-- 2) Tablas del pase ------------------------------------------------------------------
create table if not exists public.pase_temporadas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activa boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pase_temporadas enable row level security;
drop policy if exists "lectura pase_temporadas" on public.pase_temporadas;
create policy "lectura pase_temporadas" on public.pase_temporadas
  for select to authenticated using (true);

insert into public.pase_temporadas (nombre, activa)
select 'Temporada 1', true
where not exists (select 1 from public.pase_temporadas);

create table if not exists public.pase_puntos (
  user_id uuid not null references auth.users (id) on delete cascade,
  temporada_id uuid not null references public.pase_temporadas (id) on delete cascade,
  puntos integer not null default 0 check (puntos >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, temporada_id)
);

alter table public.pase_puntos enable row level security;
drop policy if exists "ver mis puntos de pase" on public.pase_puntos;
create policy "ver mis puntos de pase" on public.pase_puntos
  for select to authenticated using (user_id = auth.uid() or public.es_root());

create table if not exists public.pase_movimientos (
  user_id uuid not null references auth.users (id) on delete cascade,
  temporada_id uuid not null references public.pase_temporadas (id) on delete cascade,
  fuente text not null,
  clave text not null,
  cantidad integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, temporada_id, fuente, clave)
);

alter table public.pase_movimientos enable row level security;  -- sin políticas: solo el trigger

create table if not exists public.pase_escalones (
  temporada_id uuid not null references public.pase_temporadas (id) on delete cascade,
  nivel integer not null,
  umbral integer not null,       -- puntos de pase necesarios
  tipo text not null check (tipo in ('saldo', 'xp', 'proteccion', 'insignia')),
  cantidad numeric not null default 0,
  etiqueta text not null,
  primary key (temporada_id, nivel)
);

alter table public.pase_escalones enable row level security;
drop policy if exists "lectura pase_escalones" on public.pase_escalones;
create policy "lectura pase_escalones" on public.pase_escalones
  for select to authenticated using (true);

create table if not exists public.pase_reclamados (
  user_id uuid not null references auth.users (id) on delete cascade,
  temporada_id uuid not null references public.pase_temporadas (id) on delete cascade,
  nivel integer not null,
  reclamado_en timestamptz not null default now(),
  primary key (user_id, temporada_id, nivel)
);

alter table public.pase_reclamados enable row level security;
drop policy if exists "ver mis escalones reclamados" on public.pase_reclamados;
create policy "ver mis escalones reclamados" on public.pase_reclamados
  for select to authenticated using (user_id = auth.uid() or public.es_root());

-- Tabla de recompensas de ejemplo para la Temporada 1 (editable por root).
insert into public.pase_escalones (temporada_id, nivel, umbral, tipo, cantidad, etiqueta)
select t.id, v.nivel, v.umbral, v.tipo, v.cantidad, v.etiqueta
from (select id from public.pase_temporadas where activa limit 1) t
cross join (values
  (1, 50,   'saldo',      2, '2 M'),
  (2, 120,  'proteccion', 1, 'Protector de racha'),
  (3, 220,  'xp',         150, '150 XP'),
  (4, 350,  'saldo',      3, '3 M'),
  (5, 500,  'insignia',   0, 'Insignia Bronce'),
  (6, 700,  'saldo',      3, '3 M'),
  (7, 950,  'proteccion', 1, 'Protector de racha'),
  (8, 1250, 'insignia',   0, 'Insignia Oro')
) as v(nivel, umbral, tipo, cantidad, etiqueta)
on conflict (temporada_id, nivel) do nothing;

-- 3) Temporada activa -----------------------------------------------------------------
create or replace function public.pase_temporada_activa()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select id from public.pase_temporadas where activa order by created_at desc limit 1;
$$;

revoke all on function public.pase_temporada_activa() from public, anon;
grant execute on function public.pase_temporada_activa() to authenticated;

-- 4) La barra sube con la XP (copia a la temporada activa) ----------------------------
create or replace function public.pase_mirror_xp()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_temp uuid;
  v_antes integer;
  v_delta integer;
begin
  -- La XP que da el propio pase no cuenta para la barra (evita el bucle).
  if new.fuente = 'pase' then
    return null;
  end if;

  v_temp := (select id from pase_temporadas where activa order by created_at desc limit 1);
  if v_temp is null then
    return null;
  end if;

  select cantidad into v_antes
  from pase_movimientos
  where user_id = new.user_id and temporada_id = v_temp
    and fuente = new.fuente and clave = new.clave;

  v_delta := new.cantidad - coalesce(v_antes, 0);
  if v_antes is not null and v_delta = 0 then
    return null;
  end if;

  insert into pase_movimientos (user_id, temporada_id, fuente, clave, cantidad)
  values (new.user_id, v_temp, new.fuente, new.clave, new.cantidad)
  on conflict (user_id, temporada_id, fuente, clave)
  do update set cantidad = excluded.cantidad, updated_at = now();

  insert into pase_puntos (user_id, temporada_id, puntos)
  values (new.user_id, v_temp, greatest(v_delta, 0))
  on conflict (user_id, temporada_id)
  do update set puntos = greatest(pase_puntos.puntos + v_delta, 0), updated_at = now();

  return null;
exception
  when others then
    -- Red de seguridad: un fallo del pase NUNCA debe romper la escritura de XP.
    return null;
end;
$$;

revoke all on function public.pase_mirror_xp() from public, anon, authenticated;

drop trigger if exists pase_mirror_xp_trg on public.xp_movimientos;
create trigger pase_mirror_xp_trg
  after insert or update of cantidad on public.xp_movimientos
  for each row execute function public.pase_mirror_xp();

-- 5) Estado del pase (para la pantalla) -----------------------------------------------
create or replace function public.estado_pase()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_temp uuid;
  v_nombre text;
  v_puntos integer;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver el pase.';
  end if;

  select id, nombre into v_temp, v_nombre
  from pase_temporadas where activa order by created_at desc limit 1;
  if v_temp is null then
    return jsonb_build_object('hay', false);
  end if;

  select coalesce(puntos, 0) into v_puntos
  from pase_puntos where user_id = v_uid and temporada_id = v_temp;
  v_puntos := coalesce(v_puntos, 0);

  return jsonb_build_object(
    'hay', true,
    'temporada', v_nombre,
    'puntos', v_puntos,
    'escalones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nivel', e.nivel,
        'umbral', e.umbral,
        'tipo', e.tipo,
        'cantidad', e.cantidad,
        'etiqueta', e.etiqueta,
        'alcanzado', v_puntos >= e.umbral,
        'reclamado', rc.nivel is not null
      ) order by e.nivel)
      from pase_escalones e
      left join pase_reclamados rc
        on rc.temporada_id = e.temporada_id and rc.nivel = e.nivel and rc.user_id = v_uid
      where e.temporada_id = v_temp
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.estado_pase() from public, anon;
grant execute on function public.estado_pase() to authenticated;

-- 6) Reclamar un escalón --------------------------------------------------------------
create or replace function public.reclamar_escalon_pase(p_nivel integer)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_temp uuid;
  v_puntos integer;
  v_esc pase_escalones%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión.');
  end if;

  select id into v_temp from pase_temporadas where activa order by created_at desc limit 1;
  if v_temp is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No hay temporada activa.');
  end if;

  select * into v_esc from pase_escalones where temporada_id = v_temp and nivel = p_nivel;
  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese escalón no existe.');
  end if;

  if exists (select 1 from pase_reclamados where user_id = v_uid and temporada_id = v_temp and nivel = p_nivel) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya has reclamado este escalón.');
  end if;

  select coalesce(puntos, 0) into v_puntos from pase_puntos where user_id = v_uid and temporada_id = v_temp;
  v_puntos := coalesce(v_puntos, 0);
  if v_puntos < v_esc.umbral then
    return jsonb_build_object('ok', false, 'mensaje', 'Aún no has alcanzado este escalón.');
  end if;

  -- Entregar la recompensa.
  if v_esc.tipo = 'saldo' then
    update fantasy_teams set presupuesto = presupuesto + v_esc.cantidad where owner_id = v_uid;
  elsif v_esc.tipo = 'xp' then
    perform public.fijar_xp(v_uid, 'pase', 'escalon:' || v_temp::text || ':' || p_nivel::text, v_esc.cantidad::integer);
  elsif v_esc.tipo = 'proteccion' then
    insert into rachas (user_id, protecciones) values (v_uid, v_esc.cantidad::integer)
    on conflict (user_id) do update set protecciones = rachas.protecciones + v_esc.cantidad::integer, updated_at = now();
  end if;
  -- 'insignia': cosmética, no entrega nada material (se marca como reclamada).

  insert into pase_reclamados (user_id, temporada_id, nivel) values (v_uid, v_temp, p_nivel);

  return jsonb_build_object('ok', true, 'tipo', v_esc.tipo, 'etiqueta', v_esc.etiqueta);
end;
$$;

revoke all on function public.reclamar_escalon_pase(integer) from public, anon;
grant execute on function public.reclamar_escalon_pase(integer) to authenticated;

-- 7) estado_racha y recuperar_racha: ahora con protecciones (sustituyen a 0116) -------
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
  v_dias_max integer;
  v_coste numeric;
  v_perdidos integer := 0;
  v_recuperable boolean := false;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver tu racha.';
  end if;

  select coalesce((select valor::text::integer from game_config where clave = 'racha_dias_cofre'), 7),
         coalesce((select valor::text::integer from game_config where clave = 'racha_recuperar_dias'), 1),
         coalesce((select valor::text::numeric from game_config where clave = 'racha_recuperar_coste'), 15)
  into v_cada, v_dias_max, v_coste;

  select * into v_r from rachas where user_id = v_uid;
  if found and v_r.ultimo_dia >= v_hoy - 1 then
    v_racha := v_r.racha_actual;
  end if;

  if found and v_r.racha_actual > 0 and v_r.ultimo_dia is not null
     and v_r.ultimo_dia < v_hoy - 1 then
    v_perdidos := (v_hoy - v_r.ultimo_dia) - 1;
    v_recuperable := v_perdidos >= 1 and v_perdidos <= v_dias_max;
  end if;

  return jsonb_build_object(
    'racha', v_racha,
    'mejor_racha', coalesce(v_r.mejor_racha, 0),
    'reclamada_hoy', coalesce(v_r.ultimo_dia = v_hoy, false),
    'registrada_hoy', coalesce(v_r.ultimo_dia = v_hoy, false),
    'cofres_pendientes', coalesce(v_r.cofres_pendientes, 0),
    'dias_cofre', v_cada,
    'dias_para_cofre', v_cada - (v_racha % v_cada),
    'recompensa_diaria', coalesce(
      (select valor::text::numeric from game_config where clave = 'recompensa_diaria'), 1),
    'recuperable', v_recuperable,
    'racha_perdida', case when v_recuperable then v_r.racha_actual else 0 end,
    'dias_perdidos', v_perdidos,
    'recuperar_coste', case when v_recuperable then v_coste * v_perdidos else 0 end,
    'protecciones', coalesce(v_r.protecciones, 0)
  );
end;
$$;

revoke all on function public.estado_racha() from public, anon;
grant execute on function public.estado_racha() to authenticated;

create or replace function public.recuperar_racha()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := (now() at time zone 'Europe/Madrid')::date;
  v_r rachas%rowtype;
  v_dias_max integer;
  v_coste numeric;
  v_perdidos integer;
  v_total numeric;
  v_equipos integer;
  v_min numeric;
  v_con_proteccion boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para recuperar la racha.');
  end if;

  select count(*), coalesce(min(presupuesto), 0) into v_equipos, v_min
  from fantasy_teams where owner_id = v_uid;
  if v_equipos = 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'Únete a una liga para tener racha.');
  end if;

  select * into v_r from rachas where user_id = v_uid for update;
  if not found or v_r.racha_actual = 0 or v_r.ultimo_dia is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes ninguna racha que recuperar.');
  end if;
  if v_r.ultimo_dia >= v_hoy - 1 then
    return jsonb_build_object('ok', false, 'mensaje', 'Tu racha sigue viva. No hace falta recuperarla.');
  end if;

  select coalesce((select valor::text::integer from game_config where clave = 'racha_recuperar_dias'), 1),
         coalesce((select valor::text::numeric from game_config where clave = 'racha_recuperar_coste'), 15)
  into v_dias_max, v_coste;

  v_perdidos := (v_hoy - v_r.ultimo_dia) - 1;
  if v_perdidos < 1 or v_perdidos > v_dias_max then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya es tarde para recuperar esta racha.');
  end if;

  -- Con un protector de racha (pase), la recuperación es gratis.
  if v_r.protecciones > 0 then
    v_con_proteccion := true;
    update rachas set protecciones = protecciones - 1, ultimo_dia = v_hoy - 1, updated_at = now()
    where user_id = v_uid;
  else
    v_total := v_coste * v_perdidos;
    if v_min < v_total then
      return jsonb_build_object(
        'ok', false,
        'mensaje', 'Necesitas ' || v_total || ' M en cada equipo (o un protector de racha).'
      );
    end if;
    update rachas set ultimo_dia = v_hoy - 1, updated_at = now() where user_id = v_uid;
    update fantasy_teams set presupuesto = presupuesto - v_total where owner_id = v_uid;
  end if;

  return jsonb_build_object(
    'ok', true,
    'racha', v_r.racha_actual,
    'coste', case when v_con_proteccion then 0 else v_total end,
    'con_proteccion', v_con_proteccion,
    'equipos', v_equipos
  );
end;
$$;

revoke all on function public.recuperar_racha() from public, anon;
grant execute on function public.recuperar_racha() to authenticated;
