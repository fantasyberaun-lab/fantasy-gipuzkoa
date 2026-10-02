-- 0059: la pestaña "Jornadas" salía con el mismo día repetido (una fila por
-- torneo) y la regla de "un jugador solo puntúa en su mejor torneo del fin de
-- semana" no se aplicaba.
--
-- CAUSA: 0055 agrupa las jornadas por matchday_lineups.semana (la foto del
-- sábado a las 16:00). Cuando se crea una jornada y NO hay foto de los últimos
-- 5 días (p. ej. tras borrar weekly_lineups en 0057, o jornadas creadas el
-- viernes), snapshot_alineaciones() guardaba semana = null y cada jornada
-- quedaba en su propio grupo (coalesce(semana, matchday_id)). Con 3 torneos:
-- 3 filas con la misma fecha y los puntos sin deduplicar.
--
-- ARREGLO:
--   1) semana_de(ts): sábado (hora de Madrid) del fin de semana al que
--      pertenece un instante. Lunes a viernes -> el sábado siguiente;
--      sábado y domingo -> ese sábado.
--   2) snapshot_alineaciones(): si no hay foto, usa squad_slots como antes pero
--      guardando semana = semana_de(created_at). Así todos los torneos del
--      mismo fin de semana comparten grupo.
--   3) Relleno de las jornadas que ya están con semana = null.
--   4) registrar_alineaciones_semanales(): al tomar la foto del sábado a las
--      16:00, las jornadas de ese fin de semana que ya existían y todavía no
--      tienen resultados pasan a usar la foto (la plantilla de las 16:00).
--
-- No se tocan las vistas ni alineaciones_equipo_semanas (0055/0058): al tener
-- semana siempre rellena, se agrupan solas.

-- 1) Sábado del fin de semana de un instante -----------------------------------
create or replace function public.semana_de(p_ts timestamptz)
returns date
language sql
immutable
as $$
  select (date_trunc('week', p_ts at time zone 'Europe/Madrid'))::date + 5;
$$;

-- 2) La jornada siempre guarda su semana --------------------------------------
create or replace function public.snapshot_alineaciones()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_semana date;
begin
  select max(wl.semana)
  into v_semana
  from weekly_lineups wl
  where wl.tomada_en <= new.created_at
    and wl.tomada_en > new.created_at - interval '5 days';

  if v_semana is not null then
    insert into matchday_lineups (matchday_id, fantasy_team_id, player_id, es_capitan, semana)
    select new.id, wl.fantasy_team_id, wl.player_id, wl.es_capitan, v_semana
    from weekly_lineups wl
    where wl.semana = v_semana;
  else
    -- Sin foto: plantilla de ahora, pero ya asignada al sábado de este fin de
    -- semana para que se agrupe con el resto de torneos.
    insert into matchday_lineups (matchday_id, fantasy_team_id, player_id, es_capitan, semana)
    select new.id, ss.fantasy_team_id, ss.player_id, ss.capitan, public.semana_de(new.created_at)
    from squad_slots ss
    where ss.fecha_salida is null and ss.titular = true;
  end if;

  return new;
end;
$$;

-- 3) Jornadas ya creadas sin semana --------------------------------------------
update public.matchday_lineups ml
set semana = public.semana_de(m.created_at)
from public.matchdays m
where m.id = ml.matchday_id
  and ml.semana is null;

-- 4) La foto del sábado sustituye a la plantilla provisional --------------------
create or replace function public.registrar_alineaciones_semanales()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_semana date := (now() at time zone 'Europe/Madrid')::date;
  v_filas integer;
begin
  insert into weekly_lineups (semana, fantasy_team_id, player_id, es_capitan)
  select v_semana, ss.fantasy_team_id, ss.player_id, ss.capitan
  from squad_slots ss
  where ss.fecha_salida is null and ss.titular = true
  on conflict (semana, fantasy_team_id, player_id) do nothing;

  get diagnostics v_filas = row_count;

  -- Jornadas de este fin de semana creadas antes de la foto y todavía sin
  -- ningún resultado ni descanso: se rehacen con la plantilla de las 16:00.
  if v_filas > 0 then
    with borradas as (
      delete from matchday_lineups ml
      where ml.semana = v_semana
        and not exists (select 1 from results r where r.matchday_id = ml.matchday_id)
        and not exists (select 1 from matchday_byes b where b.matchday_id = ml.matchday_id)
      returning ml.matchday_id
    )
    insert into matchday_lineups (matchday_id, fantasy_team_id, player_id, es_capitan, semana)
    select d.matchday_id, wl.fantasy_team_id, wl.player_id, wl.es_capitan, v_semana
    from (select distinct matchday_id from borradas) d
    cross join weekly_lineups wl
    where wl.semana = v_semana;
  end if;

  return v_filas;
end;
$$;

revoke all on function public.registrar_alineaciones_semanales() from public, anon, authenticated;
grant execute on function public.registrar_alineaciones_semanales() to postgres;

-- ---------------------------------------------------------------------------
-- Comprobaciones tras ejecutar (SQL Editor):
--
--   -- ¿Quedan lineups sin semana? (debe dar 0)
--   select count(*) from matchday_lineups where semana is null;
--
--   -- ¿Está programado el cron del sábado?
--   select jobname, schedule, active from cron.job;
--   -- Si no sale 'alineaciones-sabado-16h':
--   select cron.schedule(
--     'alineaciones-sabado-16h', '0 * * * *',
--     $$ select public.registrar_alineaciones_si_toca(); $$
--   );
-- ---------------------------------------------------------------------------