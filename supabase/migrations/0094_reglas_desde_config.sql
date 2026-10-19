-- 0094: Las reglas de titulares y de descanso pasan a leerse de la tabla de variables.
--
-- Hasta ahora estaban escritas a mano en funciones SQL y duplicadas en
-- lib/gameConfig.ts (ver CLAUDE.md, "Reglas que viven en dos sitios"):
--
--   - Máximo de titulares por equipo (6)    validar_max_titulares()        0052
--   - Máximo de titulares por torneo (4)    validar_titulares_por_torneo() 0048
--   - Puntos por descanso (1)               puntos_descanso()              0023
--
-- Mismos cuerpos que las versiones anteriores; solo cambia de dónde sale el número.
-- Los valores por defecto son los de siempre (6, 4 y 1), así que con la tabla
-- vacía el juego se comporta EXACTAMENTE igual que antes. Además, si la variable
-- no se puede leer por cualquier motivo, se usa ese mismo valor de siempre.
--
--   - Los dos límites de titulares admiten sobrescritura por liga (se lee con la
--     liga de la propia fila de squad_slots).
--   - Los puntos por descanso son globales: la función no recibe liga.
--
-- Al final, las tres variables pasan a 'activa' en el registro (0092), y se crea
-- reglas_liga() para que el frontend enseñe los mismos límites que aplica la base
-- de datos.
--
-- Sigue sin tocarse (fase posterior, economía): cláusula, blindaje y capitán, y
-- también el tamaño de plantilla (10) de validar_composicion_plantilla().
-- Impacto en datos existentes: ninguno. Requiere 0092.

-- 1) Máximo de titulares por equipo (cuerpo de 0052) ------------------------------------
create or replace function public.validar_max_titulares()
returns trigger
language plpgsql
as $$
declare
  v_max integer := public.config_num('plantilla_max_titulares', new.league_id, 6)::integer;
begin
  if new.titular is distinct from true or new.fecha_salida is not null then
    return new;
  end if;

  -- Ya era titular: no es un cambio, no hay nada que comprobar.
  if tg_op = 'UPDATE' and old.titular is not distinct from true and old.fecha_salida is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('titulares:' || new.fantasy_team_id::text, 0));

  if (
    select count(*)
    from squad_slots ss
    where ss.fantasy_team_id = new.fantasy_team_id
      and ss.fecha_salida is null
      and ss.titular = true
      and ss.id <> new.id
  ) >= v_max then
    raise exception 'Ya tienes % titulares: es el máximo permitido.', v_max;
  end if;

  return new;
end;
$$;

-- 2) Máximo de titulares por torneo (cuerpo de 0048) ------------------------------------
create or replace function public.validar_titulares_por_torneo()
returns trigger
language plpgsql
as $$
declare
  v_max integer := public.config_num('plantilla_max_titulares_torneo', new.league_id, 4)::integer;
  r record;
begin
  if new.titular is distinct from true then
    return new;
  end if;

  for r in
    select tp.tournament_id, t.nombre
    from tournament_players tp
    join tournaments t on t.id = tp.tournament_id
    where tp.player_id = new.player_id
  loop
    if (
      select count(*)
      from squad_slots ss
      join tournament_players tp2
        on tp2.player_id = ss.player_id and tp2.tournament_id = r.tournament_id
      where ss.fantasy_team_id = new.fantasy_team_id
        and ss.fecha_salida is null
        and ss.titular = true
        and ss.id <> new.id
    ) >= v_max then
      raise exception 'Ya tienes % titulares en %: es el máximo permitido por torneo.', v_max, r.nombre;
    end if;
  end loop;

  return new;
end;
$$;

-- 3) Puntos por descanso (global) ---------------------------------------------------------
-- SQL puro y sin security definer para que Postgres pueda sustituirla dentro de las
-- consultas (team_matchday_points, 0023) y evaluar el valor una sola vez.
create or replace function public.puntos_descanso()
returns integer
language sql
stable
as $$
  select coalesce(
    (select case when jsonb_typeof(valor) = 'number' then (valor #>> '{}')::integer end
       from public.game_config where clave = 'puntos_descanso'),
    1);
$$;

-- 4) Reglas efectivas para el frontend -----------------------------------------------------
-- Lo que la base de datos aplica de verdad a una liga (con su sobrescritura).
create or replace function public.reglas_liga(p_league_id uuid)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'maxTitulares', public.config_num('plantilla_max_titulares', p_league_id, 6)::integer,
    'maxTitularesPorTorneo', public.config_num('plantilla_max_titulares_torneo', p_league_id, 4)::integer
  );
$$;

revoke all on function public.reglas_liga(uuid) from public, anon;
grant execute on function public.reglas_liga(uuid) to authenticated;

-- 5) Las tres variables ya son editables --------------------------------------------------
update public.config_definiciones
set estado = 'activa', funcion_sql = null
where clave in ('plantilla_max_titulares', 'plantilla_max_titulares_torneo', 'puntos_descanso')
  and estado <> 'activa';
