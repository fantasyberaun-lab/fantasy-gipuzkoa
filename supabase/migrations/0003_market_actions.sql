-- Todo lo necesario para que la plantilla, el saldo, las ofertas y los
-- clausulazos dejen de vivir solo en memoria del navegador y pasen a
-- persistir de verdad en Supabase.

-- 1) Un jugador puede marcarse como titular/suplente dentro de su equipo.
--    Simplificación por ahora: es un estado "actual", no por jornada.
alter table squad_slots add column if not exists titular boolean not null default false;

-- 2) Políticas que faltaban: hasta ahora squad_slots solo se podía LEER.
--    Un manager necesita poder dar de alta/baja jugadores en su propio equipo
--    (fichajes, ventas) y marcar titulares.
create policy "un equipo inserta en su propia plantilla" on squad_slots
  for insert with check (
    fantasy_team_id in (select id from fantasy_teams where owner_id = auth.uid())
  );

create policy "un equipo actualiza su propia plantilla" on squad_slots
  for update using (
    fantasy_team_id in (select id from fantasy_teams where owner_id = auth.uid())
  );

-- 3) La política de UPDATE de fantasy_teams no tenía WITH CHECK: un manager
--    podía en teoría cambiar el owner_id de su fila. Lo cerramos.
drop policy if exists "cada manager gestiona su propio equipo" on fantasy_teams;
create policy "cada manager gestiona su propio equipo" on fantasy_teams
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 4) Un manager puede registrar sus propias operaciones (venta, fichaje...).
create policy "un equipo registra sus propias operaciones" on operations_log
  for insert with check (
    fantasy_team_id in (select id from fantasy_teams where owner_id = auth.uid())
  );

-- 5) Ofertas por jugadores que ya pertenecen a otro equipo.
--    (Distinto de "bids" del mercado libre, que ya existía en 0001.)
create type oferta_estado as enum ('pendiente', 'aceptada', 'rechazada');

create table player_offers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  equipo_oferente_id uuid not null references fantasy_teams (id) on delete cascade,
  importe numeric not null,
  estado oferta_estado not null default 'pendiente',
  created_at timestamptz not null default now(),
  unique (player_id, equipo_oferente_id)
);

alter table player_offers enable row level security;

create policy "lectura publica player_offers" on player_offers for select using (true);

create policy "un equipo crea sus propias ofertas" on player_offers
  for insert with check (
    equipo_oferente_id in (select id from fantasy_teams where owner_id = auth.uid())
  );

create policy "un equipo actualiza sus propias ofertas" on player_offers
  for update using (
    equipo_oferente_id in (select id from fantasy_teams where owner_id = auth.uid())
  );

create policy "un equipo borra sus propias ofertas" on player_offers
  for delete using (
    equipo_oferente_id in (select id from fantasy_teams where owner_id = auth.uid())
  );

-- 6) Vista de conveniencia: cada jugador con su propietario actual (si lo
--    tiene), sus puntos acumulados en la temporada, y su historial de
--    puntos jornada a jornada (para el gráfico de HistorialPuntosChart).
--    Esto es lo que alimenta la pestaña "Jugadores".
create or replace view public.player_status as
select
  p.id,
  p.nombre,
  p.club,
  p.categoria,
  p.elo,
  p.valor_mercado,
  p.activo,
  coalesce(pt.puntos_totales, 0)::integer as puntos_totales,
  owner.fantasy_team_id as propietario_team_id,
  ft.nombre as propietario_nombre,
  coalesce(hist.historial, '[]'::jsonb) as historial_puntos
from players p
left join lateral (
  select ss.fantasy_team_id
  from squad_slots ss
  where ss.player_id = p.id and ss.fecha_salida is null
  limit 1
) owner on true
left join fantasy_teams ft on ft.id = owner.fantasy_team_id
left join (
  select player_id, sum(puntos_fantasy) as puntos_totales
  from results
  group by player_id
) pt on pt.player_id = p.id
left join lateral (
  select jsonb_agg(
           jsonb_build_object('jornada', m.numero, 'puntos', r.puntos_fantasy)
           order by m.numero
         ) as historial
  from results r
  join matchdays m on m.id = r.matchday_id
  where r.player_id = p.id
) hist on true;

grant select on public.player_status to anon, authenticated;

-- 7) "Pagar cláusula" toca el dinero y la plantilla de DOS equipos a la
--    vez (el que paga y el que recibe), y eso ninguna política de RLS por
--    fila puede permitirlo de forma segura para un usuario normal. Por
--    eso es una función "security definer": se ejecuta con privilegios
--    de administrador, pero solo hace exactamente estos pasos, en este
--    orden, y comprueba saldo/plantilla antes de tocar nada.
create or replace function public.pagar_clausula(p_player_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_comprador_id uuid;
  v_vendedor_slot squad_slots%rowtype;
  v_valor numeric;
  v_clausula numeric;
  v_saldo_comprador numeric;
  v_plantilla_actual integer;
begin
  select id into v_comprador_id from fantasy_teams where owner_id = auth.uid();
  if v_comprador_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes un equipo Fantasy.');
  end if;

  select * into v_vendedor_slot
  from squad_slots
  where player_id = p_player_id and fecha_salida is null
  limit 1;

  if v_vendedor_slot.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no pertenece a ningún equipo ahora mismo.');
  end if;

  if v_vendedor_slot.fantasy_team_id = v_comprador_id then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya tienes a este jugador en tu plantilla.');
  end if;

  select valor_mercado into v_valor from players where id = p_player_id;
  v_clausula := ceil(v_valor * 1.5);

  select presupuesto into v_saldo_comprador from fantasy_teams where id = v_comprador_id;
  if v_saldo_comprador < v_clausula then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('Saldo insuficiente: necesitas %s M y tienes %s M.', v_clausula, v_saldo_comprador)
    );
  end if;

  select count(*) into v_plantilla_actual
  from squad_slots
  where fantasy_team_id = v_comprador_id and fecha_salida is null;

  if v_plantilla_actual >= 10 then
    return jsonb_build_object('ok', false, 'mensaje', 'Tu plantilla ya está completa (10 jugadores).');
  end if;

  -- A partir de aquí ya se ha validado todo; se ejecutan los cambios.
  update squad_slots set fecha_salida = now() where id = v_vendedor_slot.id;
  update fantasy_teams set presupuesto = presupuesto - v_clausula where id = v_comprador_id;
  update fantasy_teams set presupuesto = presupuesto + v_clausula where id = v_vendedor_slot.fantasy_team_id;

  insert into squad_slots (fantasy_team_id, player_id) values (v_comprador_id, p_player_id);

  insert into clause_releases (player_id, from_team_id, to_team_id, importe)
  values (p_player_id, v_vendedor_slot.fantasy_team_id, v_comprador_id, v_clausula);

  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_comprador_id, 'clausulazo', p_player_id, v_clausula);

  delete from player_offers where player_id = p_player_id and equipo_oferente_id = v_comprador_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.pagar_clausula(uuid) to authenticated;
