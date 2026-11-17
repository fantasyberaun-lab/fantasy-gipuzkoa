-- 0140: iconos de perfil especiales de fin de liga (campeón, subcampeón, tercero y participación).
--
-- Al acabar una liga se regalan iconos que NO se desbloquean por nivel:
--   * campeón / subcampeón / tercero: los tres primeros de la clasificación de la liga,
--   * participación: todos los demás managers de esa liga.
-- Empates en el podio: se entrega el premio más grande que corresponda a todos los empatados
-- (clasificación "olímpica", RANK()): dos primeros empatados -> los dos campeones y el siguiente
-- es tercero (no hay subcampeón); 3º y 4º empatados -> los dos terceros; etc.
--
-- Los iconos son del USUARIO (profiles.avatar es por usuario, no por equipo): si un usuario tiene
-- varios equipos en la liga, cuenta el mejor. Se guardan en iconos_desbloqueados.
--
-- Cómo se lanza (a mano, por seguridad; nada se entrega solo):
--   select entregar_iconos_liga('<id de la liga>');                          -- SIMULA: no escribe nada
--   select entregar_iconos_liga('<id de la liga>', 'fantasy-2026', false);   -- ENTREGA de verdad
-- Es idempotente: repetirla no duplica ni cambia nada. Si después de entregar se corrige un
-- resultado y cambia el podio: entregar_iconos_liga(<liga>, 'fantasy-2026', false, true)
-- ("rehacer") borra los iconos de esa liga y edición y los vuelve a repartir.
-- Solo root (o service_role) puede ejecutarla. Por defecto exige >= 8 jornadas cerradas
-- (parámetro p_min_jornadas) para no entregar por error antes de tiempo.
--
-- Multi-liga: la función recibe la liga y la edición. Para otra liga u otra temporada se añaden
-- sus 4 iconos a iconos_especiales (nueva edición) y a lib/avatares.ts, y se llama con esa edición.
-- iconos_desbloqueados también vale para otros iconos de evento (origen 'evento', p. ej. Sindarov).
--
-- Requiere: 0086 (cambiar_avatar), 0100 (liga_sanciones) y la vista team_matchday_points.
-- Impacto en datos existentes: ninguno. Crea 2 tablas, 2 funciones y reemplaza cambiar_avatar()
-- (igual que en 0086, más la rama de iconos especiales). No toca puntos, saldos ni plantillas.

-- 1) Catálogo de iconos especiales -------------------------------------------------------
create table if not exists public.iconos_especiales (
  id text primary key,
  edicion text not null,
  tipo text not null check (tipo in ('campeon', 'subcampeon', 'tercero', 'participacion', 'evento')),
  orden integer not null default 0
);

alter table public.iconos_especiales enable row level security;

drop policy if exists "lectura iconos especiales" on public.iconos_especiales;
create policy "lectura iconos especiales" on public.iconos_especiales
  for select to authenticated using (true);

-- Edición 'fantasy-2026': primera liga pública (la imagen del icono dice «Fantasy 2026»).
insert into public.iconos_especiales (id, edicion, tipo, orden) values
  ('liga1-campeon',       'fantasy-2026', 'campeon',       1),
  ('liga1-subcampeon',    'fantasy-2026', 'subcampeon',    2),
  ('liga1-tercero',       'fantasy-2026', 'tercero',       3),
  ('liga1-participacion', 'fantasy-2026', 'participacion', 4)
on conflict (id) do nothing;

-- 2) Iconos que tiene cada usuario ------------------------------------------------------
create table if not exists public.iconos_desbloqueados (
  user_id uuid not null references public.profiles (id) on delete cascade,
  icono text not null references public.iconos_especiales (id),
  origen text not null default 'liga' check (origen in ('liga', 'evento', 'manual')),
  league_id uuid references public.leagues (id) on delete set null,
  edicion text,
  puesto integer,
  puntos integer,
  equipo_id uuid references public.fantasy_teams (id) on delete set null,
  obtenido_en timestamptz not null default now(),
  primary key (user_id, icono)
);

-- Un solo premio de liga por usuario, liga y edición.
create unique index if not exists iconos_desbloqueados_un_premio_por_liga
  on public.iconos_desbloqueados (user_id, league_id, edicion)
  where origen = 'liga';

alter table public.iconos_desbloqueados enable row level security;

-- Cada uno ve los suyos. No hay políticas de escritura: solo se escribe desde funciones.
drop policy if exists "ver mis iconos" on public.iconos_desbloqueados;
create policy "ver mis iconos" on public.iconos_desbloqueados
  for select to authenticated
  using (user_id = (select auth.uid()) or public.es_root());

-- 3) Entregar los iconos de una liga ----------------------------------------------------
create or replace function public.entregar_iconos_liga(
  p_league_id uuid,
  p_edicion text default 'fantasy-2026',
  p_simular boolean default true,
  p_rehacer boolean default false,
  p_min_jornadas integer default 8
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_cerradas integer;
  v_liga text;
  v_ranking jsonb;
  v_podio jsonb;
  v_resumen jsonb;
  v_nuevos integer := 0;
  v_total integer;
begin
  if not (public.es_root() or coalesce(auth.role(), '') = 'service_role') then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede hacer esto.');
  end if;

  select nombre into v_liga from leagues where id = p_league_id;
  if v_liga is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa liga no existe.');
  end if;

  if (select count(*) from iconos_especiales
      where edicion = p_edicion and tipo in ('campeon', 'subcampeon', 'tercero', 'participacion')) < 4 then
    return jsonb_build_object('ok', false, 'mensaje', 'La edición «' || p_edicion || '» no tiene sus 4 iconos.');
  end if;

  select count(*) into v_cerradas from jornadas_cerradas;
  if not p_simular and v_cerradas < p_min_jornadas then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Solo hay ' || v_cerradas || ' jornadas cerradas (se piden ' || p_min_jornadas || ').'
    );
  end if;

  -- Una sola ejecución a la vez.
  perform pg_advisory_xact_lock(hashtextextended('entregar-iconos-liga', 0));

  -- Clasificación de la liga: puntos de jornada menos sanciones de puntos (igual que
  -- clasificacion()), un resultado por usuario (su mejor equipo) y puesto olímpico.
  with equipos as (
    select
      ft.id as equipo_id,
      ft.owner_id,
      ft.nombre as equipo,
      pr.nombre as manager,
      (coalesce((
          select sum(t.puntos)
          from team_matchday_points t
          where t.fantasy_team_id = ft.id
        ), 0)
        - coalesce((
          select sum(s.cantidad)
          from liga_sanciones s
          where s.fantasy_team_id = ft.id and s.tipo = 'puntos'
        ), 0))::integer as puntos
    from fantasy_teams ft
    join profiles pr on pr.id = ft.owner_id
    where ft.league_id = p_league_id
  ),
  mejor as (
    select distinct on (owner_id) *
    from equipos
    order by owner_id, puntos desc, equipo_id
  ),
  rk as (
    select m.*, rank() over (order by m.puntos desc)::integer as puesto
    from mejor m
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'user_id', rk.owner_id, 'equipo_id', rk.equipo_id, 'equipo', rk.equipo,
             'manager', rk.manager, 'puntos', rk.puntos, 'puesto', rk.puesto,
             'icono', (
               select ie.id from iconos_especiales ie
               where ie.edicion = p_edicion
                 and ie.tipo = case rk.puesto
                   when 1 then 'campeon' when 2 then 'subcampeon' when 3 then 'tercero'
                   else 'participacion' end
             )
           ) order by rk.puesto, rk.puntos desc, rk.manager),
         '[]'::jsonb)
  into v_ranking
  from rk;

  v_total := jsonb_array_length(v_ranking);
  if v_total = 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa liga no tiene equipos.');
  end if;
  if not exists (select 1 from jsonb_to_recordset(v_ranking) as x(puntos integer) where x.puntos <> 0) then
    return jsonb_build_object('ok', false, 'mensaje', 'Nadie tiene puntos todavía: no hay clasificación.');
  end if;

  select coalesce(jsonb_agg(x order by (x ->> 'puesto')::integer, x ->> 'manager'), '[]'::jsonb)
  into v_podio
  from jsonb_array_elements(v_ranking) x
  where (x ->> 'puesto')::integer <= 3;

  select coalesce(jsonb_object_agg(icono, n), '{}'::jsonb)
  into v_resumen
  from (
    select x ->> 'icono' as icono, count(*) as n
    from jsonb_array_elements(v_ranking) x
    group by 1
  ) q;

  if not p_simular then
    if p_rehacer then
      delete from iconos_desbloqueados
      where origen = 'liga' and league_id = p_league_id and edicion = p_edicion;
    end if;

    insert into iconos_desbloqueados (user_id, icono, origen, league_id, edicion, puesto, puntos, equipo_id)
    select x.user_id, x.icono, 'liga', p_league_id, p_edicion, x.puesto, x.puntos, x.equipo_id
    from jsonb_to_recordset(v_ranking)
      as x(user_id uuid, icono text, puesto integer, puntos integer, equipo_id uuid)
    on conflict do nothing;
    get diagnostics v_nuevos = row_count;

    -- Tras "rehacer": quien llevaba puesto un icono que ya no es suyo se queda sin icono.
    if p_rehacer then
      update profiles p
      set avatar = null
      where p.avatar in (select id from iconos_especiales where edicion = p_edicion)
        and not exists (
          select 1 from iconos_desbloqueados d where d.user_id = p.id and d.icono = p.avatar
        );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'simulado', p_simular,
    'liga', v_liga,
    'edicion', p_edicion,
    'jornadas_cerradas', v_cerradas,
    'managers', v_total,
    'iconos_nuevos', case when p_simular then null else v_nuevos end,
    'ya_entregados', case when p_simular then null else v_total - v_nuevos end,
    'por_icono', v_resumen,
    'podio', v_podio
  );
end;
$$;

revoke all on function public.entregar_iconos_liga(uuid, text, boolean, boolean, integer) from public, anon;
grant execute on function public.entregar_iconos_liga(uuid, text, boolean, boolean, integer) to authenticated;

-- 4) Elegir icono: ahora también los especiales que se tengan -------------------------------
-- Igual que en 0086 (iconos por nivel); solo añade la rama de los iconos especiales.
create or replace function public.cambiar_avatar(p_avatar text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_avatar text := nullif(btrim(coalesce(p_avatar, '')), '');
  v_pos integer;
  v_nivel integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No has iniciado sesión.');
  end if;

  if v_avatar is not null then
    if exists (select 1 from iconos_especiales where id = v_avatar) then
      if not exists (
        select 1 from iconos_desbloqueados where user_id = auth.uid() and icono = v_avatar
      ) then
        return jsonb_build_object('ok', false, 'mensaje', 'Todavía no has conseguido ese icono.');
      end if;
    else
      v_pos := array_position(public.avatares_por_nivel(), v_avatar);
      if v_pos is null then
        return jsonb_build_object('ok', false, 'mensaje', 'Ese avatar no existe.');
      end if;

      v_nivel := public.nivel_de_xp(
        coalesce((select xp from xp_usuarios where user_id = auth.uid()), 0)
      );
      if v_pos > v_nivel then
        return jsonb_build_object(
          'ok', false,
          'mensaje', 'Todavía no has desbloqueado ese icono (nivel ' || v_pos || ').'
        );
      end if;
    end if;
  end if;

  update profiles set avatar = v_avatar where id = auth.uid();

  return jsonb_build_object('ok', true, 'avatar', v_avatar);
end;
$$;

revoke all on function public.cambiar_avatar(text) from public, anon;
grant execute on function public.cambiar_avatar(text) to authenticated;
