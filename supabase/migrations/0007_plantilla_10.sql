-- Dos cambios de reglas decididos por el manager:
--   1. La plantilla pasa de 6 a 10 jugadores, para dar más variedad de
--      equipos. El límite de Tercera se escala proporcionalmente
--      (antes 2 de 6 ≈ 1/3; ahora 3 de 10).
--   2. Cada manager empieza con 6 jugadores asignados al azar en cuanto
--      se registra, en vez de arrancar con la plantilla vacía.

-- 1) Redefinición de la validación de composición de plantilla (0006),
--    ahora con los límites nuevos. Comparte lógica entre pagar_clausula
--    y fichar_jugador, así que basta con tocarla aquí.
create or replace function public.validar_composicion_plantilla(
  p_equipo_id uuid,
  p_categoria_nueva categoria
)
returns jsonb
language plpgsql
as $$
declare
  v_total integer;
  v_tercera integer;
  v_max_plantilla constant integer := 10;
  v_max_tercera constant integer := 3;
begin
  select
    count(*),
    count(*) filter (where players.categoria = '3')
  into v_total, v_tercera
  from squad_slots
  join players on players.id = squad_slots.player_id
  where squad_slots.fantasy_team_id = p_equipo_id
    and squad_slots.fecha_salida is null;

  if v_total >= v_max_plantilla then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('Tu plantilla ya tiene los %s jugadores permitidos.', v_max_plantilla)
    );
  end if;

  if p_categoria_nueva = '3' and v_tercera >= v_max_tercera then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('Ya tienes %s jugadores de Tercera en plantilla — es el máximo permitido.', v_max_tercera)
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- 2) Reparto inicial: 6 jugadores al azar entre los que estén libres en
--    ese momento, respetando el máximo de Tercera (como manda la
--    composición de plantilla de verdad, no una selección arbitraria).
--    Primero se reserva el cupo de Tercera y luego se completa con
--    Primera/Segunda, para no dejar la plantilla inicial coja de sitio
--    si hay pocos jugadores de Tercera libres.
create or replace function public.asignar_plantilla_inicial(p_equipo_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_tamano_inicial constant integer := 6;
  v_max_tercera_inicial constant integer := 3;
  v_tercera_asignados integer;
begin
  insert into squad_slots (fantasy_team_id, player_id)
  select p_equipo_id, p.id
  from players p
  where p.categoria = '3'
    and p.activo
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id and ss.fecha_salida is null
    )
  order by random()
  limit v_max_tercera_inicial;

  get diagnostics v_tercera_asignados = row_count;

  insert into squad_slots (fantasy_team_id, player_id)
  select p_equipo_id, p.id
  from players p
  where p.categoria in ('1', '2')
    and p.activo
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id and ss.fecha_salida is null
    )
  order by random()
  limit greatest(v_tamano_inicial - v_tercera_asignados, 0);
end;
$$;

-- 3) El trigger de registro (0002_auth_trigger.sql) ya creaba el perfil
--    y el equipo Fantasy; ahora además le asigna su plantilla inicial.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
begin
  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    'manager'
  );

  insert into public.fantasy_teams (owner_id, nombre, presupuesto)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_equipo', 'Mi equipo'),
    100
  )
  returning id into v_equipo_id;

  perform public.asignar_plantilla_inicial(v_equipo_id);

  return new;
end;
$$;

-- Nota: esto solo afecta a managers que se registren a partir de ahora.
-- Para dar plantilla inicial a un equipo que ya existe (por ejemplo, los
-- vuestros de pruebas), ejecutar a mano en el SQL Editor:
--   select public.asignar_plantilla_inicial('id-del-equipo');
