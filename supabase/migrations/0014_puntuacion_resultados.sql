-- Motor de puntuación (Reglamento V3.1, punto 4). Hasta ahora la tabla
-- `results` existía pero nada la rellenaba: sin esto, puntosJornada,
-- historialPuntos, puntosTotales y la clasificación se quedan siempre a 0.
--
-- Diseño: puntos_fantasy NUNCA se envía desde el cliente. Se calcula
-- aquí, en un trigger, a partir de resultado + diferencia de Elo, cada
-- vez que se inserta o corrige una fila de results. Así:
--   - El admin (o la pantalla de Resultados) solo elige resultado y
--     rival — no puede "puntuar mal" un partido aunque quisiera.
--   - Corregir un resultado (punto 12 del reglamento) es tan simple
--     como hacer UPDATE: los puntos se recalculan solos.
--   - Si el rival es un jugador de la propia tabla `players`, su Elo se
--     usa siempre actualizado en el momento de guardar (y se copia a
--     rival_elo_en_el_momento para dejar constancia histórica). Si no
--     está en la tabla (rival de fuera del sistema), se usa el Elo
--     manual que se haya introducido.

create or replace function public.calcular_puntos_resultado(
  p_resultado resultado_partida,
  p_diferencia_elo integer
)
returns integer
language plpgsql
immutable
as $$
declare
  v_victoria integer;
  v_tablas integer;
begin
  if p_diferencia_elo <= 29 then
    v_victoria := 3; v_tablas := 1;
  elsif p_diferencia_elo <= 99 then
    v_victoria := 4; v_tablas := 2;
  elsif p_diferencia_elo <= 199 then
    v_victoria := 5; v_tablas := 3;
  elsif p_diferencia_elo <= 299 then
    v_victoria := 7; v_tablas := 4;
  else
    v_victoria := 9; v_tablas := 5;
  end if;

  return case p_resultado
    when 'victoria' then v_victoria
    when 'tablas' then v_tablas
    else 0
  end;
end;
$$;

create or replace function public.trigger_calcular_puntos_fantasy()
returns trigger
language plpgsql
as $$
declare
  v_elo_jugador integer;
  v_elo_rival integer;
begin
  select elo into v_elo_jugador from players where id = new.player_id;

  if new.rival_player_id is not null then
    select elo into v_elo_rival from players where id = new.rival_player_id;
    new.rival_elo_en_el_momento := v_elo_rival;
  else
    v_elo_rival := new.rival_elo_en_el_momento;
  end if;

  new.puntos_fantasy := public.calcular_puntos_resultado(
    new.resultado,
    coalesce(v_elo_rival, v_elo_jugador) - v_elo_jugador
  );

  return new;
end;
$$;

drop trigger if exists calcular_puntos_antes_de_guardar on results;
create trigger calcular_puntos_antes_de_guardar
  before insert or update on results
  for each row execute function public.trigger_calcular_puntos_fantasy();

-- Nota: results ya tenía RLS de solo-root para escritura (política "root
-- gestiona resultados", ver 0005_admin_root.sql) y lectura pública desde
-- 0001, así que no hace falta tocar permisos aquí.
