-- Panel de notificaciones por liga.
--
-- Tres tipos de aviso:
--   - oferta_recibida: alguien ha hecho una oferta (player_offers) por un
--     jugador TUYO. Es privada: solo la ve el dueño del jugador.
--   - fichaje: un equipo ha fichado a un jugador (puja ganada en la tanda
--     de las 12:00, o fichaje directo). La ve toda la liga.
--   - clausulazo: un equipo ha pagado la cláusula de un jugador de otro.
--     La ve toda la liga; el equipo afectado (objetivo_team_id) la ve
--     destacada en el frontend.
--
-- Las notificaciones se generan con triggers sobre player_offers y
-- operations_log, así que no hay que tocar fichar_jugador, pagar_clausula
-- ni procesar_mercado_diario (0017): cualquier camino que ya registre la
-- operación genera su aviso sin más cambios.

-- 1) Tabla. Nadie inserta desde el cliente: solo los triggers (security
--    definer). Por eso solo hay política de lectura.
create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  tipo text not null check (tipo in ('oferta_recibida', 'fichaje', 'clausulazo')),
  actor_team_id uuid references fantasy_teams (id) on delete cascade,
  objetivo_team_id uuid references fantasy_teams (id) on delete cascade,
  player_id uuid references players (id) on delete cascade,
  importe numeric,
  privada boolean not null default false,
  created_at timestamptz not null default now()
);

create index notificaciones_liga_fecha_idx
  on public.notificaciones (league_id, created_at desc);

alter table public.notificaciones enable row level security;

-- Ves las notificaciones de tus ligas; las privadas, solo si van dirigidas
-- a tu equipo.
create policy "ver notificaciones de mi liga" on public.notificaciones
  for select using (
    league_id in (select league_id from fantasy_teams where owner_id = auth.uid())
    and (
      not privada
      or objetivo_team_id in (select id from fantasy_teams where owner_id = auth.uid())
    )
  );

-- 2) "Última vez que abriste el panel", por equipo (y por tanto por liga).
--    Las no leídas son las creadas después de este instante.
alter table public.fantasy_teams
  add column if not exists notificaciones_vistas_en timestamptz not null default now();

create or replace function public.marcar_notificaciones_vistas(p_league_id uuid)
returns timestamptz
language plpgsql
security definer set search_path = public
as $$
declare
  v_ahora timestamptz := clock_timestamp();
begin
  update fantasy_teams
  set notificaciones_vistas_en = v_ahora
  where owner_id = auth.uid() and league_id = p_league_id;

  return v_ahora;
end;
$$;

grant execute on function public.marcar_notificaciones_vistas(uuid) to authenticated;

-- 3) Oferta por un jugador: avisa a su dueño en esa liga.
--    player_offers no tiene league_id: la liga sale del equipo oferente.
--    hacerOfertaDB hace upsert, así que repetir una oferta llega como
--    UPDATE: solo avisamos si es nueva, si cambia el importe o si la
--    anterior ya no estaba pendiente (para no duplicar avisos idénticos).
create or replace function public.notificar_oferta()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga uuid;
  v_dueno uuid;
begin
  if new.estado <> 'pendiente' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.estado = 'pendiente'
     and new.importe is not distinct from old.importe then
    return new;
  end if;

  select league_id into v_liga from fantasy_teams where id = new.equipo_oferente_id;

  select fantasy_team_id into v_dueno
  from squad_slots
  where player_id = new.player_id
    and league_id = v_liga
    and fecha_salida is null
  limit 1;

  -- Jugador libre en esa liga, o es tuyo: no hay a quién avisar.
  if v_dueno is null or v_dueno = new.equipo_oferente_id then
    return new;
  end if;

  insert into notificaciones (league_id, tipo, actor_team_id, objetivo_team_id, player_id, importe, privada)
  values (v_liga, 'oferta_recibida', new.equipo_oferente_id, v_dueno, new.player_id, new.importe, true);

  return new;
end;
$$;

drop trigger if exists notificar_oferta_trg on public.player_offers;
create trigger notificar_oferta_trg
  after insert or update of importe, estado on public.player_offers
  for each row execute function public.notificar_oferta();

-- 4) Fichajes y clausulazos: se cuelgan de operations_log, donde ya
--    escriben fichar_jugador ('fichaje'), procesar_mercado_diario
--    ('oferta_aceptada' = puja ganada) y pagar_clausula ('clausulazo').
--    Las ventas ('venta') no generan aviso.
--
--    En pagar_clausula, clause_releases se inserta ANTES que
--    operations_log, así que aquí ya podemos saber a quién se le ha
--    quitado el jugador.
create or replace function public.notificar_fichaje()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga uuid;
  v_victima uuid;
begin
  if new.player_id is null
     or new.tipo not in ('fichaje', 'oferta_aceptada', 'clausulazo') then
    return new;
  end if;

  select league_id into v_liga from fantasy_teams where id = new.fantasy_team_id;
  if v_liga is null then
    return new;
  end if;

  if new.tipo = 'clausulazo' then
    select from_team_id into v_victima
    from clause_releases
    where player_id = new.player_id and to_team_id = new.fantasy_team_id
    order by created_at desc
    limit 1;

    insert into notificaciones (league_id, tipo, actor_team_id, objetivo_team_id, player_id, importe, privada)
    values (v_liga, 'clausulazo', new.fantasy_team_id, v_victima, new.player_id, new.importe, false);
  else
    insert into notificaciones (league_id, tipo, actor_team_id, player_id, importe, privada)
    values (v_liga, 'fichaje', new.fantasy_team_id, new.player_id, new.importe, false);
  end if;

  return new;
end;
$$;

drop trigger if exists notificar_fichaje_trg on public.operations_log;
create trigger notificar_fichaje_trg
  after insert on public.operations_log
  for each row execute function public.notificar_fichaje();

-- 5) Realtime: para que el aviso aparezca sin recargar la página. Supabase
--    Realtime respeta la RLS de arriba, así que cada manager solo recibe
--    las suyas. Si esta línea da error porque la tabla ya está en la
--    publicación, se puede ignorar.
alter publication supabase_realtime add table public.notificaciones;
