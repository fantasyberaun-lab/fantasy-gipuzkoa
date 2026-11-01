-- 0117: resumen semanal del manager (pantallazo al volver tras cerrarse la jornada).
--
-- Cuando se cierra la jornada de un fin de semana y el manager vuelve a entrar, la
-- app le enseña UNA vez una pantalla con su semana: puntos, posición en su liga (por
-- puntos acumulados) y cuántos puestos ha subido o bajado, con un botón para
-- compartirla y otro para cerrarla. No hay aviso push ni notificación.
--
-- Se apoya en `pagos_semana` (0071), que tiene una fila por equipo y semana cerrada.
-- Los resúmenes se calculan la primera vez que alguien entra tras el cierre (no hace
-- falta ningún cron) y se guardan en `resumenes_semanales`. Quién ya ha visto el
-- suyo se guarda en `resumenes_vistos`, para no volver a enseñarlo.
--
-- Si un usuario tiene varios equipos (ligas privadas y pública), se enseña el equipo
-- con más puntos esa semana (desempate por id).
--
-- Impacto en datos existentes: solo crea dos tablas y funciones nuevas. No cambia
-- saldos, jugadores ni plantillas. Se puede lanzar con `supabase db push` o en el
-- SQL Editor.

create table if not exists public.resumenes_semanales (
  fantasy_team_id uuid not null references public.fantasy_teams (id) on delete cascade,
  semana date not null,
  puntos integer not null,
  posicion integer,
  variacion integer,                 -- puestos ganados respecto a la semana anterior (+ sube)
  created_at timestamptz not null default now(),
  primary key (fantasy_team_id, semana)
);

create index if not exists resumenes_semanales_semana_idx
  on public.resumenes_semanales (semana);

alter table public.resumenes_semanales enable row level security;
-- Sin políticas: se lee solo a través de resumen_pendiente().

create table if not exists public.resumenes_vistos (
  user_id uuid not null references auth.users (id) on delete cascade,
  semana date not null,
  visto_en timestamptz not null default now(),
  primary key (user_id, semana)
);

alter table public.resumenes_vistos enable row level security;
-- Sin políticas: se escribe solo con marcar_resumen_visto().

-- Calcula (o recalcula) los resúmenes de una semana cerrada. Interna.
create or replace function public.generar_resumenes_semana(p_semana date)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_anterior date;
begin
  select max(semana) into v_anterior from pagos_semana where semana < p_semana;

  with acum_actual as (
    select ps.fantasy_team_id, ft.league_id, sum(ps.puntos) as total
    from pagos_semana ps
    join fantasy_teams ft on ft.id = ps.fantasy_team_id
    where ps.semana <= p_semana
    group by ps.fantasy_team_id, ft.league_id
  ),
  pos_actual as (
    select fantasy_team_id,
           rank() over (partition by league_id order by total desc) as posicion
    from acum_actual
  ),
  acum_anterior as (
    select ps.fantasy_team_id, ft.league_id, sum(ps.puntos) as total
    from pagos_semana ps
    join fantasy_teams ft on ft.id = ps.fantasy_team_id
    where v_anterior is not null and ps.semana <= v_anterior
    group by ps.fantasy_team_id, ft.league_id
  ),
  pos_anterior as (
    select fantasy_team_id,
           rank() over (partition by league_id order by total desc) as posicion
    from acum_anterior
  )
  insert into resumenes_semanales (fantasy_team_id, semana, puntos, posicion, variacion)
  select
    ps.fantasy_team_id,
    p_semana,
    ps.puntos,
    pa.posicion,
    case when pant.posicion is not null and pa.posicion is not null
         then pant.posicion - pa.posicion end
  from pagos_semana ps
  left join pos_actual pa on pa.fantasy_team_id = ps.fantasy_team_id
  left join pos_anterior pant on pant.fantasy_team_id = ps.fantasy_team_id
  where ps.semana = p_semana
  on conflict (fantasy_team_id, semana) do nothing;
end;
$$;

revoke all on function public.generar_resumenes_semana(date) from public, anon, authenticated;

-- El resumen que le toca ver al manager actual, o hay = false si no hay ninguno
-- nuevo (no tiene equipo con puntos esa semana o ya lo ha visto).
create or replace function public.resumen_pendiente()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_semana date;
  v_fila resumenes_semanales%rowtype;
  v_nombre text;
  v_liga text;
begin
  if v_uid is null then
    return jsonb_build_object('hay', false);
  end if;

  select max(semana) into v_semana from pagos_semana;
  if v_semana is null then
    return jsonb_build_object('hay', false);
  end if;

  if exists (select 1 from resumenes_vistos where user_id = v_uid and semana = v_semana) then
    return jsonb_build_object('hay', false);
  end if;

  if not exists (select 1 from resumenes_semanales where semana = v_semana) then
    perform public.generar_resumenes_semana(v_semana);
  end if;

  select rs.* into v_fila
  from resumenes_semanales rs
  join fantasy_teams ft on ft.id = rs.fantasy_team_id
  where ft.owner_id = v_uid and rs.semana = v_semana
  order by rs.puntos desc, rs.fantasy_team_id
  limit 1;

  if not found then
    return jsonb_build_object('hay', false);
  end if;

  select ft.nombre, l.nombre into v_nombre, v_liga
  from fantasy_teams ft join leagues l on l.id = ft.league_id
  where ft.id = v_fila.fantasy_team_id;

  return jsonb_build_object(
    'hay', true,
    'semana', v_fila.semana,
    'equipo', v_nombre,
    'liga', v_liga,
    'puntos', v_fila.puntos,
    'posicion', v_fila.posicion,
    'variacion', v_fila.variacion
  );
end;
$$;

revoke all on function public.resumen_pendiente() from public, anon;
grant execute on function public.resumen_pendiente() to authenticated;

-- Marca el resumen de una semana como visto (al cerrar o compartir la pantalla).
create or replace function public.marcar_resumen_visto(p_semana date)
returns void
language sql
security definer set search_path = public
as $$
  insert into resumenes_vistos (user_id, semana)
  select auth.uid(), p_semana
  where auth.uid() is not null
  on conflict do nothing;
$$;

revoke all on function public.marcar_resumen_visto(date) from public, anon;
grant execute on function public.marcar_resumen_visto(date) to authenticated;
