-- Dos arreglos pedidos tras revisar el estado antes de publicar:
--
--   1. asignar_plantilla_inicial (0026) ya excluye correctamente, por
--      NOT EXISTS, a cualquier jugador con dueño activo EN ESA LIGA —
--      tanto para la plantilla inicial como para abrir_tanda_mercado.
--      Lo que le faltaba es protección frente a que dos managers se
--      unan a la MISMA liga casi a la vez: cada llamada calcula "quién
--      está libre" con un SELECT que no ve las filas que la otra
--      llamada está insertando todavía (no ha hecho commit), así que
--      ambas podrían escoger el mismo jugador de Tercera y una de las
--      dos reventaría entera contra squad_slots_un_propietario_activo
--      (0016) en vez de fallar limpiamente. Se añade un advisory lock
--      por liga al principio de la función: dos altas en la misma liga
--      quedan serializadas (la segunda espera a que la primera termine
--      y su NOT EXISTS ya ve los jugadores que la primera acaba de
--      coger), así que nunca se llega a intentar la fila duplicada.
--      pg_advisory_xact_lock se libera solo al terminar la transacción
--      (commit o rollback), así que no hace falta soltarlo a mano.
--
--      El mercado (abrir_tanda_mercado / procesar_mercado_diario) no
--      necesita el mismo arreglo: ya excluye a los jugadores con dueño
--      en la liga (NOT EXISTS sobre squad_slots por league_id), y solo
--      se ejecuta una vez por liga (al crearla o desde el cron diario),
--      sin el mismo escenario de dos altas simultáneas.
--
--   2. El límite de "máximo 3 de Tercera" vivía en
--      validar_composicion_plantilla mirando TODA la plantilla, no solo
--      los titulares — por eso un tercero podía mandar una oferta
--      directa (player_offers, 0028) por un cuarto jugador de Tercera
--      sin que nada lo impidiera al crearla, y luego aceptar_oferta sí
--      llamaba a esta validación y la rechazaba, dejando la oferta
--      atascada sin que el dueño pudiera aceptarla ni rechazarla con
--      claridad de por qué. Se quita esa comprobación (ahora puedes
--      tener hasta 10 de Tercera en plantilla, el máximo general) y en
--      su lugar se añade un trigger sobre squad_slots que sí es el sitio
--      correcto para esta regla: "titular" es un interruptor que se
--      cambia directamente desde el cliente (toggleTitularDB, sin pasar
--      por ninguna función), así que la única forma de que el límite de
--      3 titulares de Tercera sea de verdad infranqueable (y no solo un
--      contador visual en plantilla/page.tsx) es validarlo en la propia
--      tabla.

-- 1) validar_composicion_plantilla: fuera el límite de Tercera en toda
--    la plantilla. Se queda solo el máximo general de plantilla (10).
create or replace function public.validar_composicion_plantilla(
  p_equipo_id uuid,
  p_categoria_nueva categoria
)
returns jsonb
language plpgsql
as $$
declare
  v_total integer;
  v_max_plantilla constant integer := 10;
begin
  select count(*)
  into v_total
  from squad_slots
  where squad_slots.fantasy_team_id = p_equipo_id
    and squad_slots.fecha_salida is null;

  if v_total >= v_max_plantilla then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('Tu plantilla ya tiene los %s jugadores permitidos.', v_max_plantilla)
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- 2) asignar_plantilla_inicial: mismo reparto que en 0026, con un
--    advisory lock por liga al principio para que dos altas a la vez en
--    la misma liga no puedan escoger el mismo jugador libre.
create or replace function public.asignar_plantilla_inicial(p_equipo_id uuid, p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_tamano_inicial constant integer := 6;
  v_max_tercera_inicial constant integer := 3;
  v_tercera_asignados integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_league_id::text, 0));

  insert into squad_slots (fantasy_team_id, player_id, league_id)
  select p_equipo_id, p.id, p_league_id
  from players p
  where p.categoria = '3'
    and p.activo
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
  order by random()
  limit v_max_tercera_inicial;

  get diagnostics v_tercera_asignados = row_count;

  insert into squad_slots (fantasy_team_id, player_id, league_id)
  select p_equipo_id, p.id, p_league_id
  from players p
  where p.categoria in ('1', '2')
    and p.activo
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
  order by random()
  limit greatest(v_tamano_inicial - v_tercera_asignados, 0);
end;
$$;

-- 3) Trigger: máximo 3 titulares de Tercera por equipo, a nivel de
--    datos (no solo de UI). Solo entra en juego cuando "titular" pasa a
--    true; apagar un titular, o tocar cualquier otra columna, no lo
--    dispara.
create or replace function public.validar_titular_tercera()
returns trigger
language plpgsql
as $$
declare
  v_categoria categoria;
  v_titulares_tercera integer;
  v_max_titulares_tercera constant integer := 3;
begin
  if new.titular is distinct from true then
    return new;
  end if;

  select categoria into v_categoria from players where id = new.player_id;
  if v_categoria is distinct from '3' then
    return new;
  end if;

  select count(*)
  into v_titulares_tercera
  from squad_slots ss
  join players p on p.id = ss.player_id
  where ss.fantasy_team_id = new.fantasy_team_id
    and ss.fecha_salida is null
    and ss.titular = true
    and p.categoria = '3'
    and ss.id <> new.id;

  if v_titulares_tercera >= v_max_titulares_tercera then
    raise exception 'Ya tienes % titulares de Tercera — es el máximo permitido.', v_max_titulares_tercera;
  end if;

  return new;
end;
$$;

drop trigger if exists validar_titular_tercera_trg on public.squad_slots;
create trigger validar_titular_tercera_trg
  before insert or update of titular on public.squad_slots
  for each row execute function public.validar_titular_tercera();
