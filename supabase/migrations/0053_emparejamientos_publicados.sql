-- Emparejamientos publicados de cada jornada (antes de que haya resultados).
--
-- Hasta ahora una jornada solo se veía cuando tenía resultados (results). Esto
-- permite que el administrador publique primero los emparejamientos de la
-- ronda ("ronda 5: A-B, C-D...") y más tarde los resultados:
--
--   1) matchday_pairings guarda las mesas publicadas. Solo se guardan las
--      partidas en las que juega al menos un jugador de la base (players).
--      Un rival que no está en la base se guarda solo con su Elo, igual que
--      un "rival externo" en results (no se guarda su nombre).
--   2) publicar_emparejamientos sustituye todas las mesas de la jornada de una
--      vez (atómico) y retirar_emparejamientos las quita. Solo root.
--   3) Los managers ven las mesas que aún no tienen resultado; cuando se
--      guarda el resultado (results) esa mesa pasa a verse como partida
--      jugada y deja de salir como pendiente (lo resuelve la pantalla).
--
-- Los resultados NO se tocan aquí: se siguen guardando con
-- guardar_resultado_partida / marcar_descanso (0021).

create table if not exists matchday_pairings (
  id uuid primary key default gen_random_uuid(),
  matchday_id uuid not null references matchdays (id) on delete cascade,
  tablero integer,
  blanco_player_id uuid references players (id) on delete cascade,
  blanco_elo integer,            -- solo si el jugador de blancas no está en la base
  negro_player_id uuid references players (id) on delete cascade,
  negro_elo integer,             -- solo si el jugador de negras no está en la base
  descansa boolean not null default false, -- true: solo hay blanco_player_id y no juega esta ronda
  created_at timestamptz not null default now(),
  constraint matchday_pairings_algun_jugador
    check (blanco_player_id is not null or negro_player_id is not null)
);

create index if not exists matchday_pairings_matchday_id_idx
  on matchday_pairings (matchday_id);

alter table matchday_pairings enable row level security;

create policy "lectura publica matchday_pairings" on matchday_pairings
  for select using (true);

create policy "root gestiona emparejamientos" on matchday_pairings
  for all using (public.es_root()) with check (public.es_root());

create or replace function public.publicar_emparejamientos(
  p_matchday_id uuid,
  p_partidas jsonb
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_total integer;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede publicar emparejamientos.');
  end if;

  if not exists (select 1 from matchdays where id = p_matchday_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa jornada no existe.');
  end if;

  if p_partidas is null or jsonb_typeof(p_partidas) <> 'array' then
    return jsonb_build_object('ok', false, 'mensaje', 'Emparejamientos no válidos.');
  end if;

  delete from matchday_pairings where matchday_id = p_matchday_id;

  insert into matchday_pairings (
    matchday_id, tablero, blanco_player_id, blanco_elo, negro_player_id, negro_elo, descansa
  )
  select
    p_matchday_id,
    x.tablero,
    x.blanco_player_id,
    x.blanco_elo,
    x.negro_player_id,
    x.negro_elo,
    coalesce(x.descansa, false)
  from jsonb_to_recordset(p_partidas) as x(
    tablero integer,
    blanco_player_id uuid,
    blanco_elo integer,
    negro_player_id uuid,
    negro_elo integer,
    descansa boolean
  );

  get diagnostics v_total = row_count;
  return jsonb_build_object('ok', true, 'total', v_total);
end;
$$;

create or replace function public.retirar_emparejamientos(p_matchday_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede retirar emparejamientos.');
  end if;

  delete from matchday_pairings where matchday_id = p_matchday_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.publicar_emparejamientos(uuid, jsonb) to authenticated;
grant execute on function public.retirar_emparejamientos(uuid) to authenticated;
