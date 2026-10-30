-- 0116: recuperar la racha diaria (reducir el abandono).
--
-- Fase 0 del plan de engagement. Si un manager se salta uno (o unos pocos) días
-- y se le rompe la racha, puede recuperarla pagando saldo, dentro de una ventana
-- de gracia. Así un despiste no echa por tierra semanas de racha.
--
-- Ventana y coste viven en game_config (editables sin desplegar):
--   - racha_recuperar_dias: cuántos días perdidos como mucho se pueden recuperar (1).
--   - racha_recuperar_coste: coste por día perdido, en M (15).
--
-- Recuperar NO registra la entrada de hoy: deja la racha "como si hubieras
-- entrado ayer", y al registrar la entrada de hoy (registrar_inicio_sesion, 0086)
-- la racha sigue subiendo. El coste se cobra en todos los equipos del manager, y
-- solo si todos tienen saldo suficiente.
--
-- Impacto en datos existentes: añade dos claves a game_config, sustituye
-- estado_racha (añade campos, no quita) y crea recuperar_racha. No cambia
-- saldos existentes. Se puede lanzar con `supabase db push` o en el SQL Editor.

insert into game_config (clave, valor) values
  ('racha_recuperar_dias', '1'::jsonb),
  ('racha_recuperar_coste', '15'::jsonb)
on conflict (clave) do nothing;

-- estado_racha: igual que en 0086 más 'recuperable', 'dias_perdidos' y
-- 'recuperar_coste' para pintar el botón de recuperar.
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

  -- Racha rota pero dentro de la ventana de gracia: se puede recuperar.
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
    'recuperar_coste', case when v_recuperable then v_coste * v_perdidos else 0 end
  );
end;
$$;

revoke all on function public.estado_racha() from public, anon;
grant execute on function public.estado_racha() to authenticated;

-- Recupera la racha rota pagando el coste en todos los equipos.
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

  v_total := v_coste * v_perdidos;
  if v_min < v_total then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Necesitas ' || v_total || ' M en cada equipo para recuperar la racha.'
    );
  end if;

  -- "Como si hubieras entrado ayer": al registrar hoy, la racha continúa.
  update rachas set ultimo_dia = v_hoy - 1, updated_at = now() where user_id = v_uid;
  update fantasy_teams set presupuesto = presupuesto - v_total where owner_id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'racha', v_r.racha_actual,
    'coste', v_total,
    'equipos', v_equipos
  );
end;
$$;

revoke all on function public.recuperar_racha() from public, anon;
grant execute on function public.recuperar_racha() to authenticated;
