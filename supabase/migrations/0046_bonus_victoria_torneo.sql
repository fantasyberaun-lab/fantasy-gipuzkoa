-- Bonus por victoria según el torneo.
--
-- Cada torneo tiene un campo bonus_victoria: puntos Fantasy extra que recibe
-- un jugador cada vez que GANA una partida de ese torneo (las tablas y las
-- derrotas no reciben bonus, y el descanso tampoco).
--
--   Tercera y Cadete ........ 0
--   Segunda y Open de Gros .. 2
--   Absoluto ................ 3
--
-- El bonus se suma a los puntos por diferencia de Elo (0014) y, si el
-- jugador es capitán, el total (con bonus) se multiplica por 2 (0033).
--
-- Cómo funciona:
--   1) tournaments.bonus_victoria: se puede cambiar desde Admin > Torneos.
--   2) El trigger que calcula results.puntos_fantasy suma el bonus del
--      torneo de la jornada cuando el resultado es victoria.
--   3) Si cambias el bonus de un torneo, se recalculan solos los puntos de
--      todos sus resultados (se "toca" cada fila para relanzar el trigger).
--
-- El bonus de "jugador de la jornada" (gameConfig.ts) NO se implementa.

-- 1) Columna -------------------------------------------------------------
alter table tournaments
  add column if not exists bonus_victoria integer not null default 0;

alter table tournaments drop constraint if exists tournaments_bonus_victoria_valido;
alter table tournaments
  add constraint tournaments_bonus_victoria_valido check (bonus_victoria >= 0);

-- 2) Trigger de puntos: mismo cuerpo que en 0014 + bonus por victoria ------
create or replace function public.trigger_calcular_puntos_fantasy()
returns trigger
language plpgsql
as $$
declare
  v_elo_jugador integer;
  v_elo_rival integer;
  v_bonus integer := 0;
begin
  select elo into v_elo_jugador from players where id = new.player_id;

  if new.rival_player_id is not null then
    select elo into v_elo_rival from players where id = new.rival_player_id;
    new.rival_elo_en_el_momento := v_elo_rival;
  else
    v_elo_rival := new.rival_elo_en_el_momento;
  end if;

  -- Bonus del torneo al que pertenece la jornada (solo si gana).
  if new.resultado = 'victoria' then
    select coalesce(t.bonus_victoria, 0) into v_bonus
    from matchdays m
    left join tournaments t on t.id = m.tournament_id
    where m.id = new.matchday_id;
    v_bonus := coalesce(v_bonus, 0);
  end if;

  new.puntos_fantasy := public.calcular_puntos_resultado(
    new.resultado,
    coalesce(v_elo_rival, v_elo_jugador) - v_elo_jugador
  ) + v_bonus;

  return new;
end;
$$;

-- 3) Recalcular resultados cuando cambia el bonus de un torneo -------------
create or replace function public.recalcular_resultados_torneo()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update results
  set puntos_fantasy = puntos_fantasy
  where matchday_id in (select id from matchdays where tournament_id = new.id);
  return new;
end;
$$;

drop trigger if exists recalcular_resultados_al_cambiar_bonus on tournaments;
create trigger recalcular_resultados_al_cambiar_bonus
  after update of bonus_victoria on tournaments
  for each row
  when (old.bonus_victoria is distinct from new.bonus_victoria)
  execute function public.recalcular_resultados_torneo();

-- 4) Valores iniciales según el nombre / categoría del torneo ---------------
-- Es una suposición a partir del nombre: REVISA los torneos en Admin >
-- Torneos y corrige el bonus de los que no cuadren.
update tournaments set bonus_victoria = 2
where nombre ilike '%gros%' or nombre ilike '%segunda%' or categoria = '2';

update tournaments set bonus_victoria = 3
where nombre ilike '%absoluto%';

update tournaments set bonus_victoria = 0
where nombre ilike '%tercera%' or nombre ilike '%cadete%';
