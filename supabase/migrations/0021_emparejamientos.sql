-- Emparejamientos de las jornadas.
--
-- Hasta ahora cada fila de results era un jugador con SU resultado, sin
-- relación con la fila de su rival: al meter "A gana a B" solo puntuaba A,
-- y B seguía "pendiente" y sin partida jugada aunque hubiera jugado. Esto
-- lo arregla:
--
--   1) Una partida contra un rival de la base de jugadores se guarda ahora
--      en las DOS filas (A: victoria, B: derrota; tablas <-> tablas), así
--      los dos puntúan, cuentan la partida y salen como ya emparejados.
--   2) Descanso: con un número impar de jugadores, uno puede quedar sin
--      emparejar. Se guarda en matchday_byes; no cuenta como partida ni da
--      puntos, pero deja de aparecer como pendiente.
--   3) Las tres operaciones (guardar, marcar descanso, borrar) son funciones
--      que tocan las filas necesarias de una vez y solo puede ejecutarlas root.
--   4) Se completan las partidas ya guardadas que solo tenían una fila.
--
-- Contra un rival externo (Elo manual) sigue habiendo una sola fila.

-- 1) Descansos ---------------------------------------------------------------
create table if not exists matchday_byes (
  matchday_id uuid not null references matchdays (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (matchday_id, player_id)
);

create index if not exists matchday_byes_player_id_idx on matchday_byes (player_id);

alter table matchday_byes enable row level security;

create policy "lectura publica matchday_byes" on matchday_byes
  for select using (true);

create policy "root gestiona descansos" on matchday_byes
  for all using (public.es_root()) with check (public.es_root());

-- 2) Resultado visto desde el otro lado ---------------------------------------
create or replace function public.resultado_inverso(p_resultado resultado_partida)
returns resultado_partida
language sql
immutable
as $$
  select case p_resultado
    when 'victoria' then 'derrota'::resultado_partida
    when 'derrota' then 'victoria'::resultado_partida
    else 'tablas'::resultado_partida
  end;
$$;

-- 3) Completar las partidas antiguas de una sola fila ---------------------------
-- El trigger de 0014 calcula los puntos del rival con su propio Elo y el del
-- jugador, igual que si se hubiera introducido la fila a mano.
insert into results (player_id, matchday_id, rival_player_id, resultado)
select r.rival_player_id,
       r.matchday_id,
       r.player_id,
       public.resultado_inverso(r.resultado)
from results r
where r.rival_player_id is not null
  and not exists (
    select 1 from results x
    where x.player_id = r.rival_player_id
      and x.matchday_id = r.matchday_id
  );

-- 4) Guardar una partida -------------------------------------------------------
create or replace function public.guardar_resultado_partida(
  p_matchday_id uuid,
  p_player_id uuid,
  p_resultado resultado_partida,
  p_rival_player_id uuid,
  p_rival_elo integer
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_rival_anterior uuid;
  v_puntos integer;
  v_puntos_rival integer;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede guardar resultados.');
  end if;

  if p_rival_player_id is not null then
    if p_rival_player_id = p_player_id then
      return jsonb_build_object('ok', false, 'mensaje', 'Un jugador no puede jugar contra sí mismo.');
    end if;

    if exists (
      select 1 from matchday_byes
      where matchday_id = p_matchday_id and player_id = p_rival_player_id
    ) then
      return jsonb_build_object('ok', false, 'mensaje', 'Ese rival está marcado como "descansa" en esta jornada.');
    end if;

    if exists (
      select 1 from results
      where matchday_id = p_matchday_id
        and player_id = p_rival_player_id
        and rival_player_id is distinct from p_player_id
    ) then
      return jsonb_build_object('ok', false, 'mensaje', 'Ese rival ya está emparejado con otro jugador en esta jornada.');
    end if;
  end if;

  select rival_player_id into v_rival_anterior
  from results
  where matchday_id = p_matchday_id and player_id = p_player_id;

  delete from matchday_byes
  where matchday_id = p_matchday_id and player_id = p_player_id;

  -- Si cambia de rival, el anterior queda libre (se quita su fila espejo).
  if v_rival_anterior is not null and v_rival_anterior is distinct from p_rival_player_id then
    delete from results
    where matchday_id = p_matchday_id
      and player_id = v_rival_anterior
      and rival_player_id = p_player_id;
  end if;

  insert into results (player_id, matchday_id, rival_player_id, rival_elo_en_el_momento, resultado)
  values (p_player_id, p_matchday_id, p_rival_player_id, p_rival_elo, p_resultado)
  on conflict (player_id, matchday_id) do update
    set rival_player_id = excluded.rival_player_id,
        rival_elo_en_el_momento = excluded.rival_elo_en_el_momento,
        resultado = excluded.resultado
  returning puntos_fantasy into v_puntos;

  if p_rival_player_id is not null then
    insert into results (player_id, matchday_id, rival_player_id, resultado)
    values (p_rival_player_id, p_matchday_id, p_player_id, public.resultado_inverso(p_resultado))
    on conflict (player_id, matchday_id) do update
      set rival_player_id = excluded.rival_player_id,
          resultado = excluded.resultado
    returning puntos_fantasy into v_puntos_rival;
  end if;

  return jsonb_build_object('ok', true, 'puntos', v_puntos, 'puntos_rival', v_puntos_rival);
end;
$$;

-- 5) Marcar a un jugador como "descansa" (sin emparejar) ------------------------
create or replace function public.marcar_descanso(p_matchday_id uuid, p_player_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_rival_anterior uuid;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede marcar descansos.');
  end if;

  select rival_player_id into v_rival_anterior
  from results
  where matchday_id = p_matchday_id and player_id = p_player_id;

  if v_rival_anterior is not null then
    delete from results
    where matchday_id = p_matchday_id
      and player_id = v_rival_anterior
      and rival_player_id = p_player_id;
  end if;

  delete from results where matchday_id = p_matchday_id and player_id = p_player_id;

  insert into matchday_byes (matchday_id, player_id)
  values (p_matchday_id, p_player_id)
  on conflict do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

-- 6) Borrar el resultado (o el descanso) de un jugador --------------------------
create or replace function public.borrar_resultado_partida(p_matchday_id uuid, p_player_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_rival_anterior uuid;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede borrar resultados.');
  end if;

  select rival_player_id into v_rival_anterior
  from results
  where matchday_id = p_matchday_id and player_id = p_player_id;

  if v_rival_anterior is not null then
    delete from results
    where matchday_id = p_matchday_id
      and player_id = v_rival_anterior
      and rival_player_id = p_player_id;
  end if;

  delete from results where matchday_id = p_matchday_id and player_id = p_player_id;
  delete from matchday_byes where matchday_id = p_matchday_id and player_id = p_player_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.guardar_resultado_partida(uuid, uuid, resultado_partida, uuid, integer) to authenticated;
grant execute on function public.marcar_descanso(uuid, uuid) to authenticated;
grant execute on function public.borrar_resultado_partida(uuid, uuid) to authenticated;
