-- 0065: los jugadores sin Elo (elo = 0) puntúan SIEMPRE como si no hubiera
-- diferencia de Elo con su rival: victoria 3, tablas 1, derrota 0 (+ el bonus
-- por victoria del torneo, que se sigue sumando).
--
-- PROBLEMA: el trigger de 0046 calculaba "Elo del rival - Elo del jugador".
-- Con el jugador a 0, la diferencia era enorme (ej. rival de 1583) y la
-- victoria daba 9 puntos + bonus en vez de 3 + bonus.
--
-- Es lo mismo que dice el botón de información de la app. Si el rival es el
-- que no tiene Elo, no cambia nada (ya daba 3).
--
-- Mantener igual que 0046: solo cambia el cálculo de la diferencia de Elo.

create or replace function public.trigger_calcular_puntos_fantasy()
returns trigger
language plpgsql
as $$
declare
  v_elo_jugador integer;
  v_elo_rival integer;
  v_bonus integer := 0;
  v_diferencia integer;
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

  -- Sin Elo: se puntúa como diferencia 0 (3 · 1 · 0).
  if coalesce(v_elo_jugador, 0) <= 0 then
    v_diferencia := 0;
  else
    v_diferencia := coalesce(v_elo_rival, v_elo_jugador) - v_elo_jugador;
  end if;

  new.puntos_fantasy := public.calcular_puntos_resultado(new.resultado, v_diferencia) + v_bonus;

  return new;
end;
$$;

-- Recalcular los resultados ya guardados de jugadores sin Elo (se "toca" la
-- fila para relanzar el trigger). Solo victorias y tablas: las derrotas
-- siguen en 0 y no cambian.
update results
set puntos_fantasy = puntos_fantasy
where resultado in ('victoria', 'tablas')
  and player_id in (select id from players where coalesce(elo, 0) <= 0);