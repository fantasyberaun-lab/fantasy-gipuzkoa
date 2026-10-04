-- 0073: ubicación aproximada en el registro de actividad.
--
-- Cada vez que un manager abre una pantalla, la ruta /api/actividad (servidor de
-- Vercel) lee las cabeceras de geolocalización de la petición (país, región y
-- ciudad deducidos de la IP) y llama a registrar_actividad con ellas.
--
--   * NO se guarda la dirección IP, ni coordenadas, ni código postal.
--   * Es un contador por (manager, día, país, región, ciudad), igual que
--     actividad_diaria: no es un historial de conexiones.
--   * Solo lo ve el administrador (root), a través de admin_actividad. La tabla
--     tiene RLS activada y sin políticas: nadie la lee ni escribe directamente.
--   * Se borra sola al eliminar la cuenta (on delete cascade).
--
-- Requiere 0005 (es_root) y 0072 (actividad_diaria, registrar_actividad,
-- admin_actividad). El día se cuenta en hora de Madrid.

-- 1) Tabla -----------------------------------------------------------------------------
-- pais/region/ciudad son '' (y no null) cuando no se conocen, porque forman parte
-- de la clave primaria.
create table if not exists public.actividad_ubicacion (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  pais text not null default '',
  region text not null default '',
  ciudad text not null default '',
  visitas integer not null default 1,
  ultima_vez timestamptz not null default now(),
  primary key (user_id, dia, pais, region, ciudad)
);

create index if not exists actividad_ubicacion_dia_idx on public.actividad_ubicacion (dia);

alter table public.actividad_ubicacion enable row level security;

-- 2) registrar_actividad con ubicación -------------------------------------------------
-- Se borra la firma antigua (text): si no, create or replace crearía una segunda
-- función y las llamadas con un solo argumento darían "function is not unique".
drop function if exists public.registrar_actividad(text);

create or replace function public.registrar_actividad(
  p_ruta text,
  p_pais text default null,
  p_region text default null,
  p_ciudad text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ruta text := left(coalesce(nullif(btrim(p_ruta), ''), '/'), 80);
  v_dia date := (now() at time zone 'Europe/Madrid')::date;
  v_pais text := left(upper(nullif(btrim(coalesce(p_pais, '')), '')), 2);
  v_region text := left(upper(nullif(btrim(coalesce(p_region, '')), '')), 6);
  v_ciudad text := left(nullif(btrim(coalesce(p_ciudad, '')), ''), 80);
begin
  if v_uid is null or public.es_root() then
    return;
  end if;

  insert into actividad_diaria (user_id, dia, ruta)
  values (v_uid, v_dia, v_ruta)
  on conflict (user_id, dia, ruta)
  do update set visitas = actividad_diaria.visitas + 1, ultima_vez = now();

  -- Sin ninguna cabecera (p. ej. en local) no se guarda fila de ubicación.
  if v_pais is not null or v_region is not null or v_ciudad is not null then
    insert into actividad_ubicacion (user_id, dia, pais, region, ciudad)
    values (v_uid, v_dia, coalesce(v_pais, ''), coalesce(v_region, ''), coalesce(v_ciudad, ''))
    on conflict (user_id, dia, pais, region, ciudad)
    do update set visitas = actividad_ubicacion.visitas + 1, ultima_vez = now();
  end if;
end;
$$;

revoke all on function public.registrar_actividad(text, text, text, text) from public, anon;
grant execute on function public.registrar_actividad(text, text, text, text) to authenticated;

-- 3) Panel de actividad (solo root), ahora con ubicaciones --------------------------------
-- Igual que en 0072, más:
--   'ubicaciones': de dónde entran los managers en el periodo (managers distintos y visitas).
--   'usuarios[].ubicacion': la ubicación más frecuente de cada manager en el periodo.
create or replace function public.admin_actividad(p_dias integer default 30)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_dias integer := greatest(least(coalesce(p_dias, 30), 365), 1);
  v_hoy date := (now() at time zone 'Europe/Madrid')::date;
  v_desde date := v_hoy - (greatest(least(coalesce(p_dias, 30), 365), 1) - 1);
  v_resultado jsonb;
begin
  if not public.es_root() then
    raise exception 'Solo el administrador puede ver la actividad.';
  end if;

  select jsonb_build_object(
    'dias', v_dias,
    'registro_desde', (select min(dia) from actividad_diaria),
    'totales', jsonb_build_object(
      'registrados', (select count(*) from profiles where rol <> 'root'),
      'nuevos_periodo', (
        select count(*) from profiles
        where rol <> 'root' and (created_at at time zone 'Europe/Madrid')::date >= v_desde
      ),
      'activos_hoy', (select count(distinct user_id) from actividad_diaria where dia = v_hoy),
      'activos_7d', (select count(distinct user_id) from actividad_diaria where dia > v_hoy - 7),
      'activos_30d', (select count(distinct user_id) from actividad_diaria where dia > v_hoy - 30),
      'visitas_periodo', (select coalesce(sum(visitas), 0) from actividad_diaria where dia >= v_desde),
      'login_7d', (
        select count(*) from auth.users u
        join profiles p on p.id = u.id and p.rol <> 'root'
        where u.last_sign_in_at > now() - interval '7 days'
      ),
      'sin_entrar_14d', (
        select count(*) from profiles p
        left join auth.users u on u.id = p.id
        where p.rol <> 'root'
          and coalesce(
            greatest(u.last_sign_in_at, (select max(a.ultima_vez) from actividad_diaria a where a.user_id = p.id)),
            p.created_at
          ) < now() - interval '14 days'
      )
    ),
    'por_dia', (
      select coalesce(jsonb_agg(
        jsonb_build_object('dia', d.dia, 'usuarios', coalesce(a.usuarios, 0), 'visitas', coalesce(a.visitas, 0))
        order by d.dia
      ), '[]'::jsonb)
      from generate_series(v_desde, v_hoy, interval '1 day') as g(dia_ts)
      cross join lateral (select g.dia_ts::date as dia) d
      left join (
        select dia, count(distinct user_id) as usuarios, sum(visitas) as visitas
        from actividad_diaria
        where dia >= v_desde
        group by dia
      ) a on a.dia = d.dia
    ),
    'paginas', (
      select coalesce(jsonb_agg(x order by x.visitas desc), '[]'::jsonb)
      from (
        select ruta, sum(visitas)::integer as visitas, count(distinct user_id)::integer as usuarios
        from actividad_diaria
        where dia >= v_desde
        group by ruta
        order by sum(visitas) desc
        limit 15
      ) x
    ),
    'ubicaciones', (
      select coalesce(jsonb_agg(x order by x.managers desc, x.visitas desc), '[]'::jsonb)
      from (
        select pais, region, ciudad,
               count(distinct user_id)::integer as managers,
               sum(visitas)::integer as visitas
        from actividad_ubicacion
        where dia >= v_desde
        group by pais, region, ciudad
        order by count(distinct user_id) desc, sum(visitas) desc
        limit 15
      ) x
    ),
    'usuarios', (
      select coalesce(jsonb_agg(u order by u.ultima_actividad desc nulls last, u.nombre), '[]'::jsonb)
      from (
        select
          p.id,
          p.nombre,
          p.created_at as registrado,
          (select string_agg(ft.nombre, ', ' order by ft.nombre) from fantasy_teams ft where ft.owner_id = p.id) as equipos,
          au.last_sign_in_at as ultimo_login,
          (select max(a.ultima_vez) from actividad_diaria a where a.user_id = p.id) as ultima_actividad,
          (select count(distinct a.dia) from actividad_diaria a where a.user_id = p.id and a.dia >= v_desde)::integer as dias_activos,
          (select coalesce(sum(a.visitas), 0) from actividad_diaria a where a.user_id = p.id and a.dia >= v_desde)::integer as visitas,
          (
            select count(*) from operations_log o
            join fantasy_teams ft on ft.id = o.fantasy_team_id
            where ft.owner_id = p.id and (o.created_at at time zone 'Europe/Madrid')::date >= v_desde
          )::integer as operaciones,
          (
            select jsonb_build_object('pais', l.pais, 'region', l.region, 'ciudad', l.ciudad)
            from actividad_ubicacion l
            where l.user_id = p.id and l.dia >= v_desde
            group by l.pais, l.region, l.ciudad
            order by sum(l.visitas) desc
            limit 1
          ) as ubicacion
        from profiles p
        left join auth.users au on au.id = p.id
        where p.rol <> 'root'
      ) u
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;

revoke all on function public.admin_actividad(integer) from public, anon;
grant execute on function public.admin_actividad(integer) to authenticated;
