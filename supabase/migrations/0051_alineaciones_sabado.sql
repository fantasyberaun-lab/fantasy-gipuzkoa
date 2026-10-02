-- 0051: plantillas (titulares) de cada manager registradas el sábado a las 16:00.
--
-- 1) weekly_lineups: foto semanal de los titulares y el capitán de TODOS los
--    equipos. Se toma sola los sábados a las 16:00 (hora de Madrid). Nadie la
--    lee directamente (RLS sin políticas): se consulta con alineaciones_equipo().
-- 2) snapshot_alineaciones(): al crear una jornada, la alineación que cuenta es
--    la de la foto del sábado (si hay una de los últimos 5 días). Si no hay, se
--    hace como antes, con el estado actual de squad_slots. Así, cambiar de
--    titulares después del sábado a las 16:00 ya no altera la jornada.
-- 3) alineaciones_equipo(equipo): qué jugadores puso un manager en cada jornada
--    y los puntos de cada uno (con el capitán doble y los descansos). Además
--    devuelve la foto del último sábado si todavía no se ha creado la jornada.
--    Solo la abre quien comparte liga con ese equipo.
--
-- Mantener igual que components/AlineacionesJornadas.tsx.
--
-- IMPORTANTE: después de ejecutar esta migración hay que programar el cron a
-- mano desde el SQL Editor (ver el final del archivo).

-- 1) Foto semanal -------------------------------------------------------------
create table if not exists public.weekly_lineups (
  id uuid primary key default gen_random_uuid(),
  semana date not null,                          -- sábado (Madrid) de la foto
  tomada_en timestamptz not null default now(),
  fantasy_team_id uuid not null references public.fantasy_teams (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  es_capitan boolean not null default false,
  unique (semana, fantasy_team_id, player_id)
);

create index if not exists weekly_lineups_equipo_idx
  on public.weekly_lineups (fantasy_team_id, semana);

alter table public.weekly_lineups enable row level security;

-- Registra la foto de hoy. Es idempotente: si se ejecuta dos veces el mismo día
-- no duplica ni pisa nada (la primera foto del día es la que vale).
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
  return v_filas;
end;
$$;

-- El cron se lanza cada hora (pg_cron trabaja en UTC y Madrid cambia de hora);
-- solo registra cuando en Madrid es sábado y son las 16.
create or replace function public.registrar_alineaciones_si_toca()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_ahora timestamp := now() at time zone 'Europe/Madrid';
begin
  if extract(isodow from v_ahora)::int = 6 and extract(hour from v_ahora)::int = 16 then
    perform public.registrar_alineaciones_semanales();
  end if;
end;
$$;

revoke all on function public.registrar_alineaciones_semanales() from public, anon, authenticated;
revoke all on function public.registrar_alineaciones_si_toca() from public, anon, authenticated;
grant execute on function public.registrar_alineaciones_semanales() to postgres;
grant execute on function public.registrar_alineaciones_si_toca() to postgres;

-- 2) La jornada usa la foto del sábado ---------------------------------------
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
    insert into matchday_lineups (matchday_id, fantasy_team_id, player_id, es_capitan)
    select new.id, wl.fantasy_team_id, wl.player_id, wl.es_capitan
    from weekly_lineups wl
    where wl.semana = v_semana;
  else
    insert into matchday_lineups (matchday_id, fantasy_team_id, player_id, es_capitan)
    select new.id, ss.fantasy_team_id, ss.player_id, ss.capitan
    from squad_slots ss
    where ss.fecha_salida is null and ss.titular = true;
  end if;

  return new;
end;
$$;

-- 3) Qué puso un manager en cada jornada -----------------------------------------
create or replace function public.alineaciones_equipo(p_equipo_id uuid)
returns table (
  jornada_id uuid,
  jornada integer,
  torneo text,
  creada timestamptz,
  puntos_equipo integer,
  pendiente boolean,
  jugadores jsonb
)
language sql
stable
security definer set search_path = public
as $$
  with filas as (
    select
      ml.matchday_id,
      ml.es_capitan,
      p.id as pid,
      p.nombre,
      p.categoria,
      r.resultado,
      (b.player_id is not null) as descanso,
      (
        coalesce(r.puntos_fantasy, 0)
        + case when b.player_id is not null then public.puntos_descanso() else 0 end
      ) as base
    from matchday_lineups ml
    join players p on p.id = ml.player_id
    left join results r
      on r.player_id = ml.player_id and r.matchday_id = ml.matchday_id
    left join matchday_byes b
      on b.player_id = ml.player_id and b.matchday_id = ml.matchday_id
    where ml.fantasy_team_id = p_equipo_id
      and public.puedo_ver_equipo(p_equipo_id)
  )
  select
    m.id,
    m.numero,
    t.nombre,
    m.created_at,
    sum(f.base * case when f.es_capitan then public.multiplicador_capitan() else 1 end)::integer,
    false,
    jsonb_agg(
      jsonb_build_object(
        'id', f.pid,
        'nombre', f.nombre,
        'categoria', f.categoria::text,
        'capitan', f.es_capitan,
        'resultado', f.resultado::text,
        'descanso', f.descanso,
        'base', f.base,
        'puntos', f.base * case when f.es_capitan then public.multiplicador_capitan() else 1 end
      )
      order by f.es_capitan desc, f.base desc, f.nombre
    )
  from filas f
  join matchdays m on m.id = f.matchday_id
  left join tournaments t on t.id = m.tournament_id
  group by m.id, m.numero, t.nombre, m.created_at

  union all

  -- Foto del último sábado cuando todavía no hay jornada creada después.
  select
    null::uuid,
    null::integer,
    null::text,
    max(wl.tomada_en),
    0,
    true,
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'nombre', p.nombre,
        'categoria', p.categoria::text,
        'capitan', wl.es_capitan,
        'resultado', null,
        'descanso', false,
        'base', 0,
        'puntos', 0
      )
      order by wl.es_capitan desc, p.nombre
    )
  from weekly_lineups wl
  join players p on p.id = wl.player_id
  where wl.fantasy_team_id = p_equipo_id
    and public.puedo_ver_equipo(p_equipo_id)
    and wl.semana = (
      select max(w2.semana) from weekly_lineups w2 where w2.fantasy_team_id = p_equipo_id
    )
    and wl.tomada_en > coalesce((select max(created_at) from matchdays), '-infinity'::timestamptz)
  group by wl.semana;
$$;

revoke all on function public.alineaciones_equipo(uuid) from public, anon;
grant execute on function public.alineaciones_equipo(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Cron (EJECUTAR A MANO en el SQL Editor, una sola vez):
--
--    select cron.schedule(
--      'alineaciones-sabado-16h',
--      '0 * * * *',
--      $$ select public.registrar_alineaciones_si_toca(); $$
--    );
--
--    Si ya tienes un cron cada hora para el mercado, este es otro distinto:
--    no hace falta tocar el del mercado.
--
--    Para probarlo sin esperar al sábado (toma la foto de ahora mismo):
--      select public.registrar_alineaciones_semanales();
-- ---------------------------------------------------------------------------