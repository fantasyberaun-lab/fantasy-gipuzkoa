-- 0050: tres reglas que hasta ahora no se cumplían (o solo en la interfaz).
--
--   1) Máximo de 6 titulares por equipo, a nivel de datos. Antes solo era un
--      contador visual en plantilla/page.tsx: "titular" se cambia directamente
--      desde el cliente (toggleTitularDB), así que sin trigger se podían poner
--      7 o más.
--   2) Cambio de nombre de usuario desde el perfil (máximo una vez cada 7 días,
--      sin poder coger el nombre de otro usuario).
--   3) Dos clubs de la misma liga no pueden llamarse igual. Solo lo comprobaba
--      unirse_liga_publica(); en las ligas privadas (unirse_liga) no había nada.
--
-- Mantener igual que lib/gameConfig.ts -> plantilla.maximoTitulares y que
-- lib/cuenta.ts -> DIAS_ENTRE_CAMBIOS_DE_NOMBRE.

-- 1) Máximo de titulares -----------------------------------------------------
-- Igual que los límites de 0029/0048, solo se comprueba cuando un jugador PASA
-- a titular: un equipo que ya tenga más de 6 los conserva, pero no podrá poner
-- a nadie más hasta bajar de 6.
--
-- El advisory lock por equipo serializa dos cambios simultáneos del mismo
-- equipo (dos pestañas, doble clic...): sin él, ambas transacciones contarían
-- 5 titulares y las dos pasarían. Como los triggers BEFORE se ejecutan por orden
-- alfabético, este ("validar_max_titulares_trg") corre antes que el de torneos
-- ("validar_titulares_por_torneo_trg", 0048) y el lock también lo cubre a él.
create or replace function public.validar_max_titulares()
returns trigger
language plpgsql
as $$
declare
  v_max constant integer := 6;
begin
  if new.titular is distinct from true or new.fecha_salida is not null then
    return new;
  end if;

  -- Ya era titular: no es un cambio, no hay nada que comprobar.
  if tg_op = 'UPDATE' and old.titular is not distinct from true and old.fecha_salida is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('titulares:' || new.fantasy_team_id::text, 0));

  if (
    select count(*)
    from squad_slots ss
    where ss.fantasy_team_id = new.fantasy_team_id
      and ss.fecha_salida is null
      and ss.titular = true
      and ss.id <> new.id
  ) >= v_max then
    raise exception 'Ya tienes % titulares: es el máximo permitido.', v_max;
  end if;

  return new;
end;
$$;

drop trigger if exists validar_max_titulares_trg on public.squad_slots;
create trigger validar_max_titulares_trg
  before insert or update of titular on public.squad_slots
  for each row execute function public.validar_max_titulares();

-- Para ver qué equipos ya están por encima de 6 (no se tocan automáticamente,
-- porque bajar titulares cambia los puntos de la jornada; que decida cada manager
-- o la organización):
--
--   select ft.id, ft.nombre, count(*) as titulares
--   from squad_slots ss
--   join fantasy_teams ft on ft.id = ss.fantasy_team_id
--   where ss.fecha_salida is null and ss.titular = true
--   group by ft.id, ft.nombre
--   having count(*) > 6;

-- 2) Cambio de nombre de usuario ---------------------------------------------
-- profiles no tiene política de escritura para los managers (ni debe tenerla:
-- tienen la columna "rol"), así que el cambio pasa por esta función.
alter table public.profiles
  add column if not exists nombre_cambiado_en timestamptz;

-- Cuándo podrá volver a cambiarse el nombre el usuario que pregunta.
-- null = ya puede (nunca lo ha cambiado, o ya pasó la semana).
create or replace function public.proximo_cambio_nombre_usuario()
returns timestamptz
language sql
stable
security definer set search_path = public
as $$
  select case
    when p.nombre_cambiado_en is not null
      and p.nombre_cambiado_en + interval '7 days' > now()
    then p.nombre_cambiado_en + interval '7 days'
    else null
  end
  from profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.proximo_cambio_nombre_usuario() from public, anon;
grant execute on function public.proximo_cambio_nombre_usuario() to authenticated;

create or replace function public.cambiar_nombre_usuario(p_nombre text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_actual text;
  v_ultimo timestamptz;
  v_proximo timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Tienes que iniciar sesión.');
  end if;

  -- Mismo formato que el registro (app/(auth)/registro/page.tsx): sin "@" para
  -- que el login pueda distinguir un nombre de usuario de un email.
  if v_nombre !~ '^[A-Za-z0-9_.-]{3,20}$' then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'El nombre de usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo (sin espacios).'
    );
  end if;

  -- Serializa los cambios de nombre para que dos usuarios no cojan el mismo a la vez.
  perform pg_advisory_xact_lock(hashtextextended('nombre-usuario', 0));

  select nombre, nombre_cambiado_en into v_actual, v_ultimo
  from profiles where id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'No se ha encontrado tu perfil.');
  end if;

  if v_nombre = v_actual then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese ya es tu nombre de usuario.');
  end if;

  if v_ultimo is not null then
    v_proximo := v_ultimo + interval '7 days';
    if v_proximo > now() then
      return jsonb_build_object(
        'ok', false,
        'mensaje', format(
          'Solo puedes cambiar tu nombre de usuario una vez a la semana. Podrás volver a cambiarlo el %s.',
          to_char(v_proximo at time zone 'Europe/Madrid', 'DD/MM/YYYY "a las" HH24:MI')
        ),
        'puede_cambiar_desde', v_proximo
      );
    end if;
  end if;

  -- Sin distinguir mayúsculas, como el índice profiles_nombre_unico (0009).
  if exists (
    select 1 from profiles where lower(nombre) = lower(v_nombre) and id <> v_uid
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese nombre de usuario ya está en uso.');
  end if;

  update profiles
  set nombre = v_nombre, nombre_cambiado_en = now()
  where id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'nombre', v_nombre,
    'puede_cambiar_desde', now() + interval '7 days'
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese nombre de usuario ya está en uso.');
end;
$$;

revoke all on function public.cambiar_nombre_usuario(text) from public, anon;
grant execute on function public.cambiar_nombre_usuario(text) to authenticated;

-- 3) Nombre de club único dentro de cada liga ----------------------------------
-- 3a) Limpieza previa para que el índice no falle: a los duplicados que ya
--     existan (mismo nombre, sin distinguir mayúsculas ni espacios, en la misma
--     liga) se les añade un sufijo " (2)", " (3)"... El más antiguo conserva su
--     nombre.
with repetidos as (
  select id,
         row_number() over (
           partition by league_id, lower(btrim(nombre))
           order by created_at, id
         ) as n
  from public.fantasy_teams
)
update public.fantasy_teams ft
set nombre = btrim(ft.nombre) || ' (' || r.n || ')'
from repetidos r
where r.id = ft.id and r.n > 1;

-- 3b) Garantía a nivel de datos (también frena un UPDATE directo del nombre).
create unique index if not exists fantasy_teams_nombre_unico_por_liga
  on public.fantasy_teams (league_id, lower(btrim(nombre)));

-- 3c) unirse_liga: mismo cuerpo que en 0036, más el aviso claro de nombre repetido
--     (sin él, el índice rechazaría el alta con un error técnico). El lock por
--     liga es el mismo que usa asignar_plantilla_inicial (0035): dos altas a la
--     vez en la misma liga quedan en fila y la segunda ya ve el nombre de la primera.
--     crear_liga no necesita comprobación: la liga acaba de nacer y no tiene más equipos.
--     unirse_liga_publica (0036) ya comprobaba el nombre y se queda como está.
create or replace function public.unirse_liga(p_codigo text, p_nombre_equipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga leagues%rowtype;
  v_miembros_actuales integer;
  v_presupuesto_inicial numeric;
  v_equipo_id uuid;
  v_nombre text := trim(coalesce(p_nombre_equipo, ''));
begin
  if v_nombre = '' then
    return jsonb_build_object('ok', false, 'mensaje', 'El nombre del equipo no puede estar vacío.');
  end if;

  select * into v_liga from leagues where codigo = upper(trim(p_codigo));
  if v_liga.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No existe ninguna liga con ese código.');
  end if;

  if v_liga.tipo = 'publica' then
    return public.unirse_liga_publica(v_nombre);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_liga.id::text, 0));

  if exists (select 1 from fantasy_teams where owner_id = auth.uid() and league_id = v_liga.id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya estás en esta liga.');
  end if;

  select count(*) into v_miembros_actuales from fantasy_teams where league_id = v_liga.id;
  if v_miembros_actuales >= v_liga.max_miembros then
    return jsonb_build_object('ok', false, 'mensaje', 'Esta liga ya está completa.');
  end if;

  if exists (
    select 1 from fantasy_teams
    where league_id = v_liga.id and lower(btrim(nombre)) = lower(v_nombre)
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya hay un equipo con ese nombre en esta liga. Elige otro.');
  end if;

  select coalesce(valor::text::numeric, 250)
  into v_presupuesto_inicial
  from game_config where clave = 'presupuesto_inicial';

  insert into fantasy_teams (owner_id, league_id, nombre, presupuesto)
  values (auth.uid(), v_liga.id, v_nombre, coalesce(v_presupuesto_inicial, 250))
  returning id into v_equipo_id;

  perform public.asignar_plantilla_inicial(v_equipo_id, v_liga.id);

  return jsonb_build_object('ok', true, 'liga_id', v_liga.id, 'nombre_liga', v_liga.nombre);
end;
$$;

grant execute on function public.unirse_liga(text, text) to authenticated;
