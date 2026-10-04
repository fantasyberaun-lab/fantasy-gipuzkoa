-- 0069: medir la actividad de los usuarios.
--
-- Dos fuentes, las dos solo visibles para el administrador (root):
--   1) actividad_diaria: registro propio de la app. Cada vez que un manager abre
--      una pantalla, la app llama a registrar_actividad(ruta) y se suma una visita
--      a (usuario, día, ruta). Es un contador por día, no un historial de clics.
--      No se registra la actividad del propio root (no ensucia las métricas).
--   2) auth.users.last_sign_in_at: último inicio de sesión (lo guarda Supabase).
--
-- admin_actividad(dias) devuelve todo lo que enseña Admin > Actividad en un solo
-- JSON: totales, usuarios activos por día, páginas más vistas y una fila por manager.
--
-- Requiere 0005 (es_root). El día se cuenta en hora de Madrid.

-- 1) Registro propio ---------------------------------------------------------------
create table if not exists public.actividad_diaria (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  ruta text not null,
  visitas integer not null default 1,
  primera_vez timestamptz not null default now(),
  ultima_vez timestamptz not null default now(),
  primary key (user_id, dia, ruta)
);

create index if not exists actividad_diaria_dia_idx on public.actividad_diaria (dia);

-- Sin políticas: nadie la lee ni escribe directamente. Solo las funciones de abajo.
alter table public.actividad_diaria enable row level security;

create or replace function public.registrar_actividad(p_ruta text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ruta text := left(coalesce(nullif(btrim(p_ruta), ''), '/'), 80);
  v_dia date := (now() at time zone 'Europe/Madrid')::date;
begin
  if v_uid is null or public.es_root() then
    return;
  end if;

  insert into actividad_diaria (user_id, dia, ruta)
  values (v_uid, v_dia, v_ruta)
  on conflict (user_id, dia, ruta)
  do update set visitas = actividad_diaria.visitas + 1, ultima_vez = now();
end;
$$;

revoke all on function public.registrar_actividad(text) from public, anon;
grant execute on function public.registrar_actividad(text) to authenticated;

-- 2) Panel de actividad (solo root) -----------------------------------------------------
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
          )::integer as operaciones
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
