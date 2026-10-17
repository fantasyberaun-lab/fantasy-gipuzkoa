-- 0086: sistema de niveles (XP) y desbloqueo de iconos de perfil.
--
-- REQUIERE 0075 (racha diaria) y 0081 (avatares) ya aplicadas.
--
-- Cada usuario acumula experiencia (XP) y su nivel sale de ese total. Los 26
-- iconos de perfil se desbloquean uno por nivel, en el orden de
-- avatares_por_nivel() (Peón = nivel 1 ... Carlsen = nivel 26). Después del 26
-- se siguen ganando niveles, sin límite.
--
-- Curva: XP total para llegar al nivel n = 7 x (n-1)^2,3, redondeada al múltiplo
-- de 5 (nivel 2 = 5, nivel 6 = 285, nivel 26 = 11.490). Los dos números viven en
-- game_config ('nivel_curva'). Si los cambias, cambia también lib/niveles.ts:
-- es una regla que vive en dos sitios (ver CLAUDE.md).
--
-- Fuentes de XP:
--   - Inicio de sesión: 10 XP al día, automático (game_config 'xp_login').
--   - Cofre de racha: 100 XP al abrirlo (game_config 'xp_cofre').
--   - Jornada: 3 XP por punto (game_config 'xp_por_punto'). Si el usuario tiene
--     varios equipos cuenta el que más puntos hizo ese fin de semana, para que
--     tener muchas ligas no multiplique la XP. Sale de pagos_semana (se rellena
--     al cerrar la jornada y se corrige solo si se corrige la jornada).
--   - Misiones y minijuegos: todavía no existen; ya están reservados en el
--     registro (xp_movimientos.fuente).
--
-- Inicio de sesión automático: el millón diario y la racha se cobran solos al
-- entrar (registrar_inicio_sesion). Lo único que hay que reclamar es el cofre
-- (abrir_cofre_racha). reclamar_recompensa_diaria() se mantiene como envoltorio
-- para que la web antigua siga funcionando mientras se despliega la nueva.
--
-- XP retroactiva: los puntos de jornada ya pagados (pagos_semana) y, si 0075 ya
-- estaba en uso, los días y cofres ya cobrados se convierten en XP.
--
-- Iconos: cambiar_avatar() deja de exigir root y pasa a exigir el nivel. Quien
-- ya tuviera elegido un icono que todavía no ha desbloqueado (hoy solo root, en
-- pruebas) se queda sin icono.
--
-- Nadie escribe estas tablas desde el navegador: solo las funciones de abajo.
--
-- Impacto en datos existentes: crea tablas y funciones nuevas, añade dos
-- columnas a rachas, sustituye estado_racha, reclamar_recompensa_diaria y
-- cambiar_avatar, y rellena la XP retroactiva. No cambia saldos ni jugadores.
-- Se puede lanzar con `supabase db push` o pegándola en el SQL Editor.

-- 1) Configuración -------------------------------------------------------------------
insert into game_config (clave, valor) values
  ('xp_login', '10'::jsonb),
  ('xp_cofre', '100'::jsonb),
  ('xp_por_punto', '3'::jsonb),
  ('nivel_curva', jsonb_build_object('k', 7, 'exp', 2.3))
on conflict (clave) do nothing;

-- 2) Tablas ----------------------------------------------------------------------------
create table if not exists public.xp_usuarios (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  updated_at timestamptz not null default now()
);

-- Registro de dónde sale cada XP. La clave identifica el hecho (el día, la
-- semana...) y hace que no se pueda cobrar dos veces lo mismo.
create table if not exists public.xp_movimientos (
  user_id uuid not null references auth.users (id) on delete cascade,
  fuente text not null check (fuente in ('login', 'cofre', 'jornada', 'mision', 'minijuego')),
  clave text not null,
  cantidad integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, fuente, clave)
);

alter table public.xp_usuarios enable row level security;
alter table public.xp_movimientos enable row level security;

drop policy if exists "ver mi xp" on public.xp_usuarios;
create policy "ver mi xp" on public.xp_usuarios
  for select to authenticated
  using (user_id = auth.uid() or public.es_root());

drop policy if exists "ver mis movimientos de xp" on public.xp_movimientos;
create policy "ver mis movimientos de xp" on public.xp_movimientos
  for select to authenticated
  using (user_id = auth.uid() or public.es_root());

revoke insert, update, delete, truncate, references, trigger on public.xp_usuarios from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.xp_movimientos from anon, authenticated;

-- 3) Curva de niveles ------------------------------------------------------------------
-- XP total necesaria para ALCANZAR el nivel p_nivel (el 1 vale 0).
create or replace function public.xp_para_nivel(p_nivel integer)
returns integer
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_k numeric;
  v_exp numeric;
begin
  if p_nivel is null or p_nivel <= 1 then
    return 0;
  end if;
  select coalesce((valor ->> 'k')::numeric, 7), coalesce((valor ->> 'exp')::numeric, 2.3)
  into v_k, v_exp
  from game_config where clave = 'nivel_curva';
  v_k := coalesce(v_k, 7);
  v_exp := coalesce(v_exp, 2.3);
  return (round(v_k * power((p_nivel - 1)::numeric, v_exp) / 5) * 5)::integer;
end;
$$;

-- Nivel que corresponde a un total de XP (mínimo 1, sin máximo).
create or replace function public.nivel_de_xp(p_xp integer)
returns integer
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_nivel integer := 1;
begin
  while public.xp_para_nivel(v_nivel + 1) <= coalesce(p_xp, 0) loop
    v_nivel := v_nivel + 1;
  end loop;
  return v_nivel;
end;
$$;

-- Iconos de perfil por orden de desbloqueo: la posición es el nivel. Si añades
-- uno aquí, añádelo también en lib/avatares.ts (AVATARES, en el mismo orden).
create or replace function public.avatares_por_nivel()
returns text[]
language sql
immutable
as $$
  select array[
    'peon', 'caballo', 'alfil', 'torre', 'dama', 'rey',
    'gukesh', 'smyslov', 'ding', 'euwe', 'ruy-lopez', 'petrosian', 'kramnik',
    'steinitz', 'anand', 'tal', 'morphy', 'spassky', 'alekhine', 'karpov',
    'lasker', 'botvinnik', 'capablanca', 'fischer', 'kasparov', 'carlsen'
  ];
$$;

grant execute on function public.xp_para_nivel(integer) to authenticated;
grant execute on function public.nivel_de_xp(integer) to authenticated;
grant execute on function public.avatares_por_nivel() to authenticated;
revoke all on function public.xp_para_nivel(integer) from public, anon;
revoke all on function public.nivel_de_xp(integer) from public, anon;
revoke all on function public.avatares_por_nivel() from public, anon;

-- 4) Sumar XP (interna) ------------------------------------------------------------
-- Fija la cantidad de un hecho concreto (fuente + clave) y aplica al total solo la
-- diferencia con lo que ya tenía. Repetir la llamada no suma dos veces; llamarla
-- con otra cantidad corrige. Devuelve la diferencia aplicada.
create or replace function public.fijar_xp(
  p_user uuid, p_fuente text, p_clave text, p_cantidad integer
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_antes integer;
  v_delta integer;
begin
  -- Evita que dos llamadas a la vez sobre el mismo hecho sumen dos veces.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || '|' || p_fuente || '|' || p_clave, 0));

  select cantidad into v_antes
  from xp_movimientos
  where user_id = p_user and fuente = p_fuente and clave = p_clave;

  v_delta := p_cantidad - coalesce(v_antes, 0);
  if v_antes is not null and v_delta = 0 then
    return 0;
  end if;

  insert into xp_movimientos (user_id, fuente, clave, cantidad)
  values (p_user, p_fuente, p_clave, p_cantidad)
  on conflict (user_id, fuente, clave)
  do update set cantidad = excluded.cantidad, updated_at = now();

  insert into xp_usuarios (user_id, xp)
  values (p_user, greatest(v_delta, 0))
  on conflict (user_id)
  do update set xp = greatest(xp_usuarios.xp + v_delta, 0), updated_at = now();

  return v_delta;
end;
$$;

revoke all on function public.fijar_xp(uuid, text, text, integer) from public, anon, authenticated;

-- 5) XP de jornada: sigue a pagos_semana ------------------------------------------
-- Cada vez que se paga, corrige o borra una jornada, se recalcula la XP de ese
-- usuario para esa semana: XP por punto x los puntos de su mejor equipo.
create or replace function public.xp_por_pagos_semana()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo uuid := coalesce(new.fantasy_team_id, old.fantasy_team_id);
  v_semana date := coalesce(new.semana, old.semana);
  v_user uuid;
  v_puntos integer;
  v_por_punto numeric;
begin
  select owner_id into v_user from fantasy_teams where id = v_equipo;
  if v_user is null then
    return null;
  end if;

  select coalesce(max(ps.puntos), 0) into v_puntos
  from pagos_semana ps
  join fantasy_teams ft on ft.id = ps.fantasy_team_id
  where ft.owner_id = v_user and ps.semana = v_semana;

  select coalesce((select valor::text::numeric from game_config where clave = 'xp_por_punto'), 3)
  into v_por_punto;

  perform public.fijar_xp(v_user, 'jornada', v_semana::text, round(v_puntos * v_por_punto)::integer);
  return null;
end;
$$;

revoke all on function public.xp_por_pagos_semana() from public, anon, authenticated;

-- 6) Racha: inicio de sesión automático y cofre por abrir ---------------------------
alter table public.rachas
  add column if not exists cofres_pendientes integer not null default 0;

-- Estado de la racha (para pintar el chip). 'reclamada_hoy' se mantiene por
-- compatibilidad con la web anterior y ahora significa "ya registrada hoy".
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
    'registrada_hoy', coalesce(v_r.ultimo_dia = v_hoy, false),
    'cofres_pendientes', coalesce(v_r.cofres_pendientes, 0),
    'dias_cofre', v_cada,
    'dias_para_cofre', v_cada - (v_racha % v_cada),
    'recompensa_diaria', coalesce(
      (select valor::text::numeric from game_config where clave = 'recompensa_diaria'), 1)
  );
end;
$$;

revoke all on function public.estado_racha() from public, anon;
grant execute on function public.estado_racha() to authenticated;

-- Registra la entrada de hoy: sube la racha, ingresa el millón diario en todos los
-- equipos, da la XP de inicio de sesión y, si toca, deja un cofre por abrir. La web
-- lo llama sola al entrar; si ya estaba registrada hoy devuelve nuevo = false.
create or replace function public.registrar_inicio_sesion()
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
  v_xp integer;
  v_equipos integer;
  v_cofre boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para entrar.');
  end if;

  select count(*) into v_equipos from fantasy_teams where owner_id = v_uid;
  if v_equipos = 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'Únete a una liga para empezar tu racha.');
  end if;

  -- Bloquea la fila de la racha (la crea si es la primera vez).
  insert into rachas (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_r from rachas where user_id = v_uid for update;

  if v_r.ultimo_dia = v_hoy then
    return jsonb_build_object(
      'ok', true, 'nuevo', false,
      'racha', v_r.racha_actual, 'cofres_pendientes', v_r.cofres_pendientes
    );
  end if;

  v_racha := case when v_r.ultimo_dia = v_hoy - 1 then v_r.racha_actual + 1 else 1 end;

  select coalesce((select valor::text::numeric from game_config where clave = 'recompensa_diaria'), 1),
         coalesce((select valor::text::integer from game_config where clave = 'racha_dias_cofre'), 7),
         coalesce((select valor::text::integer from game_config where clave = 'xp_login'), 10)
  into v_diaria, v_cada, v_xp;

  v_cofre := v_cada > 0 and v_racha % v_cada = 0;

  update rachas
  set racha_actual = v_racha,
      mejor_racha = greatest(mejor_racha, v_racha),
      ultimo_dia = v_hoy,
      cofres_pendientes = cofres_pendientes + case when v_cofre then 1 else 0 end,
      updated_at = now()
  where user_id = v_uid
  returning * into v_r;

  update fantasy_teams set presupuesto = presupuesto + v_diaria where owner_id = v_uid;

  insert into recompensas_diarias (user_id, dia, racha, importe_diario, importe_cofre, equipos)
  values (v_uid, v_hoy, v_racha, v_diaria, 0, v_equipos);

  perform public.fijar_xp(v_uid, 'login', v_hoy::text, v_xp);

  return jsonb_build_object(
    'ok', true,
    'nuevo', true,
    'racha', v_racha,
    'importe_diario', v_diaria,
    'xp', v_xp,
    'equipos', v_equipos,
    'cofres_pendientes', v_r.cofres_pendientes,
    'dias_para_cofre', v_cada - (v_racha % v_cada)
  );
end;
$$;

revoke all on function public.registrar_inicio_sesion() from public, anon;
grant execute on function public.registrar_inicio_sesion() to authenticated;

-- Abre un cofre pendiente: premio al azar entre cofre_min y cofre_max (saltos de
-- 0,5 M) en todos los equipos, más la XP del cofre.
create or replace function public.abrir_cofre_racha()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := (now() at time zone 'Europe/Madrid')::date;
  v_r rachas%rowtype;
  v_min numeric;
  v_max numeric;
  v_xp integer;
  v_cofre numeric;
  v_equipos integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para abrir el cofre.');
  end if;

  select * into v_r from rachas where user_id = v_uid for update;
  if not found or v_r.cofres_pendientes <= 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes ningún cofre por abrir.');
  end if;

  select count(*) into v_equipos from fantasy_teams where owner_id = v_uid;
  if v_equipos = 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'Únete a una liga para abrir el cofre.');
  end if;

  select coalesce((select valor::text::numeric from game_config where clave = 'cofre_min'), 5),
         coalesce((select valor::text::numeric from game_config where clave = 'cofre_max'), 10),
         coalesce((select valor::text::integer from game_config where clave = 'xp_cofre'), 100)
  into v_min, v_max, v_xp;

  v_cofre := v_min + floor(random() * (floor((v_max - v_min) * 2) + 1)) / 2;

  update rachas
  set cofres_pendientes = cofres_pendientes - 1, updated_at = now()
  where user_id = v_uid;

  update fantasy_teams set presupuesto = presupuesto + v_cofre where owner_id = v_uid;

  -- Se anota en la fila del día de hoy (existe porque la web registra la entrada
  -- antes de ofrecer el cofre).
  update recompensas_diarias
  set importe_cofre = importe_cofre + v_cofre
  where user_id = v_uid and dia = v_hoy;

  perform public.fijar_xp(v_uid, 'cofre', gen_random_uuid()::text, v_xp);

  return jsonb_build_object(
    'ok', true,
    'racha', v_r.racha_actual,
    'importe_cofre', v_cofre,
    'xp', v_xp,
    'equipos', v_equipos,
    'cofres_pendientes', v_r.cofres_pendientes - 1
  );
end;
$$;

revoke all on function public.abrir_cofre_racha() from public, anon;
grant execute on function public.abrir_cofre_racha() to authenticated;

-- Envoltorio para la web anterior (botón "Reclamar"): registra la entrada y, si
-- ese día tocaba cofre, lo abre. Devuelve la forma de siempre. Se puede borrar
-- cuando ya no haya ninguna pestaña con la web vieja abierta.
create or replace function public.reclamar_recompensa_diaria()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_reg jsonb;
  v_cofre jsonb;
  v_importe_cofre numeric := 0;
begin
  v_reg := public.registrar_inicio_sesion();
  if not (v_reg ->> 'ok')::boolean then
    return v_reg;
  end if;
  if not (v_reg ->> 'nuevo')::boolean then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya has reclamado la recompensa de hoy. ¡Vuelve mañana!');
  end if;

  if (v_reg ->> 'cofres_pendientes')::integer > 0 then
    v_cofre := public.abrir_cofre_racha();
    if (v_cofre ->> 'ok')::boolean then
      v_importe_cofre := (v_cofre ->> 'importe_cofre')::numeric;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'racha', (v_reg ->> 'racha')::integer,
    'importe_diario', (v_reg ->> 'importe_diario')::numeric,
    'importe_cofre', v_importe_cofre,
    'equipos', (v_reg ->> 'equipos')::integer,
    'dias_para_cofre', (v_reg ->> 'dias_para_cofre')::integer
  );
end;
$$;

revoke all on function public.reclamar_recompensa_diaria() from public, anon;
grant execute on function public.reclamar_recompensa_diaria() to authenticated;

-- 7) Estado de nivel (para la pestaña de niveles) -------------------------------------
create or replace function public.estado_nivel()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_xp integer;
  v_nivel integer;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver tu nivel.';
  end if;

  select coalesce((select xp from xp_usuarios where user_id = v_uid), 0) into v_xp;
  v_nivel := public.nivel_de_xp(v_xp);

  return jsonb_build_object(
    'xp', v_xp,
    'nivel', v_nivel,
    'xp_nivel_actual', public.xp_para_nivel(v_nivel),
    'xp_nivel_siguiente', public.xp_para_nivel(v_nivel + 1)
  );
end;
$$;

revoke all on function public.estado_nivel() from public, anon;
grant execute on function public.estado_nivel() to authenticated;

-- 8) Elegir icono: ahora por nivel, sin exigir root -----------------------------------
create or replace function public.cambiar_avatar(p_avatar text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_avatar text := nullif(btrim(coalesce(p_avatar, '')), '');
  v_pos integer;
  v_nivel integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No has iniciado sesión.');
  end if;

  if v_avatar is not null then
    v_pos := array_position(public.avatares_por_nivel(), v_avatar);
    if v_pos is null then
      return jsonb_build_object('ok', false, 'mensaje', 'Ese avatar no existe.');
    end if;

    v_nivel := public.nivel_de_xp(
      coalesce((select xp from xp_usuarios where user_id = auth.uid()), 0)
    );
    if v_pos > v_nivel then
      return jsonb_build_object(
        'ok', false,
        'mensaje', 'Todavía no has desbloqueado ese icono (nivel ' || v_pos || ').'
      );
    end if;
  end if;

  update profiles set avatar = v_avatar where id = auth.uid();

  return jsonb_build_object('ok', true, 'avatar', v_avatar);
end;
$$;

revoke all on function public.cambiar_avatar(text) from public, anon;
grant execute on function public.cambiar_avatar(text) to authenticated;

-- 9) XP retroactiva -------------------------------------------------------------------
-- Puntos de jornada ya pagados, a XP por punto, con el mejor equipo de cada usuario.
insert into xp_movimientos (user_id, fuente, clave, cantidad)
select ft.owner_id, 'jornada', ps.semana::text,
       round(max(ps.puntos) * coalesce(
         (select valor::text::numeric from game_config where clave = 'xp_por_punto'), 3))::integer
from pagos_semana ps
join fantasy_teams ft on ft.id = ps.fantasy_team_id
group by ft.owner_id, ps.semana
on conflict (user_id, fuente, clave) do nothing;

-- Días de racha y cofres ya cobrados con 0075 (si ya estaba en uso).
insert into xp_movimientos (user_id, fuente, clave, cantidad)
select user_id, 'login', dia::text,
       coalesce((select valor::text::integer from game_config where clave = 'xp_login'), 10)
from recompensas_diarias
on conflict (user_id, fuente, clave) do nothing;

insert into xp_movimientos (user_id, fuente, clave, cantidad)
select user_id, 'cofre', dia::text,
       coalesce((select valor::text::integer from game_config where clave = 'xp_cofre'), 100)
from recompensas_diarias
where importe_cofre > 0
on conflict (user_id, fuente, clave) do nothing;

-- Totales a partir del registro.
insert into xp_usuarios (user_id, xp)
select user_id, sum(cantidad)::integer
from xp_movimientos
group by user_id
on conflict (user_id) do update set xp = excluded.xp, updated_at = now();

-- A partir de aquí la XP de jornada sigue sola a pagos_semana.
drop trigger if exists xp_por_pagos_semana_trg on public.pagos_semana;
create trigger xp_por_pagos_semana_trg
  after insert or update or delete on public.pagos_semana
  for each row execute function public.xp_por_pagos_semana();

-- Quien tuviera un icono que todavía no ha desbloqueado se queda sin icono.
update profiles p
set avatar = null
where p.avatar is not null
  and coalesce(array_position(public.avatares_por_nivel(), p.avatar), 1000)
      > public.nivel_de_xp(coalesce((select x.xp from xp_usuarios x where x.user_id = p.id), 0));
