-- 0100: Administrador de las ligas privadas.
--
-- (Se creó como 0098 y luego como 0099, pero esos números ya los usan
-- 0098_minijuegos y 0099_minijuegos_resto, aplicadas en producción desde otro
-- repo. Con el mismo número, `supabase db push` la daba por aplicada. Ya está
-- aplicada a mano en producción; se registró como 0100.)
--
-- Quien crea una liga privada (leagues.creado_por) pasa a ser su administrador y
-- puede, desde la app:
--
--   1) Sancionar a un manager quitándole puntos (se restan de la clasificación
--      general) o millones (se restan del saldo), o solo advertirle. Siempre con
--      motivo, y se puede anular si se equivoca (devuelve los millones).
--   2) Expulsar a un manager: se borra su equipo (igual que al salir de la liga) y
--      no puede volver a entrar con el código hasta que el administrador lo readmita.
--   3) Elegir cuántas veces al día se resuelve el mercado de su liga:
--        1 -> 23:00 · 2 -> 8:00 y 23:00 · 3 -> 8:00, 17:00 y 23:00 (lo de siempre).
--      Se guarda en la variable mercado_tandas_dia (por liga, 0092), así que el
--      root también la ve y la cambia desde Admin > Variables. Las pujas ocultas
--      (las 2 h antes de cada tanda) siguen el horario de cada liga. El
--      administrador no lo puede cambiar en esas 2 h (ni del horario actual ni
--      del nuevo): la función le avisa de a qué hora podrá hacerlo.
--
-- Sanciones, advertencias y expulsiones salen en Notificaciones para toda la liga.
-- Si el administrador se va de la liga (o lo expulsa el root), el cargo pasa al
-- manager más antiguo, y la liga recibe un aviso.
--
-- Además se cierra un agujero: la política de UPDATE de fantasy_teams (0001)
-- deja a cada manager cambiar su propia fila desde la API, y solo la liga pública
-- protegía el saldo (0036). Sin eso, una sanción en millones se podría deshacer a
-- mano, y un expulsado podría "mover" un equipo de otra liga a la suya cambiando
-- league_id. Ahora, desde la API, ni el saldo ni la liga ni el dueño de un equipo
-- se pueden tocar en ninguna liga. La app nunca los cambia desde el navegador: lo
-- hacen las funciones security definer, que no se ven afectadas.
--
-- Impacto en datos: no cambia nada existente. Las 14 ligas privadas tienen creador
-- dentro de la liga, así que todas tienen administrador desde ya. Sin valor por
-- liga, el mercado sigue con 3 tandas. clasificacion() y mis_ligas() se vuelven a
-- crear porque devuelven una columna más (no las usa ninguna otra función SQL).
--
-- Aplicar con `supabase db push` (o pegar entera en el SQL Editor). No hay cron
-- nuevo: el job "mercado-horas-madrid" (cada hora) sigue llamando a
-- procesar_mercado_si_toca(), que ahora mira el horario de cada liga.


-- 1) ¿Quién administra una liga? ----------------------------------------------------
-- El creador, mientras siga en ella (y el root, para poder moderar cualquier liga).
create or replace function public.es_admin_liga(p_league_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.es_root() or exists (
    select 1
    from leagues l
    where l.id = p_league_id
      and l.tipo = 'privada'
      and l.creado_por = auth.uid()
      and exists (
        select 1 from fantasy_teams ft
        where ft.league_id = l.id and ft.owner_id = auth.uid()
      )
  );
$$;

revoke all on function public.es_admin_liga(uuid) from public, anon;
grant execute on function public.es_admin_liga(uuid) to authenticated;


-- 2) Tablas -------------------------------------------------------------------------
create table if not exists public.liga_sanciones (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  fantasy_team_id uuid not null references public.fantasy_teams (id) on delete cascade,
  tipo text not null check (tipo in ('puntos', 'millones', 'advertencia')),
  -- Puntos o millones quitados; null en una advertencia.
  cantidad numeric check (cantidad is null or cantidad > 0),
  motivo text not null check (char_length(btrim(motivo)) between 3 and 300),
  impuesta_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((tipo = 'advertencia') = (cantidad is null))
);

create index if not exists liga_sanciones_liga_idx on public.liga_sanciones (league_id, created_at desc);
create index if not exists liga_sanciones_equipo_puntos_idx
  on public.liga_sanciones (fantasy_team_id) where tipo = 'puntos';

alter table public.liga_sanciones enable row level security;

-- Las ve toda la liga (también salen en Notificaciones). Solo se escriben con las
-- funciones de abajo.
drop policy if exists "ver sanciones de mi liga" on public.liga_sanciones;
create policy "ver sanciones de mi liga" on public.liga_sanciones
  for select using (
    public.es_root()
    or league_id in (select league_id from public.fantasy_teams where owner_id = auth.uid())
  );

create table if not exists public.liga_expulsados (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  nombre_equipo text not null,
  motivo text not null,
  expulsado_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

alter table public.liga_expulsados enable row level security;

-- Solo el administrador de esa liga (para poder readmitir).
drop policy if exists "el administrador ve los expulsados" on public.liga_expulsados;
create policy "el administrador ve los expulsados" on public.liga_expulsados
  for select using (public.es_admin_liga(league_id));


-- 3) Tipos de notificación nuevos -----------------------------------------------------
-- sancion (puntos o millones), advertencia, expulsion y nuevo_admin.
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (
  tipo in (
    'oferta_recibida', 'fichaje', 'clausulazo', 'clausula_subida', 'oferta_rechazada',
    'actualizacion_elo', 'pago_jornada',
    'sancion', 'advertencia', 'expulsion', 'nuevo_admin'
  )
);


-- 4) Si la liga se queda sin administrador, el cargo pasa al más antiguo -----------------
create or replace function public.reasignar_admin_liga(p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo record;
begin
  if not exists (
    select 1 from leagues l
    where l.id = p_league_id
      and l.tipo = 'privada'
      and not exists (
        select 1 from fantasy_teams ft
        where ft.league_id = l.id and ft.owner_id = l.creado_por
      )
  ) then
    return;
  end if;

  select id, owner_id into v_equipo
  from fantasy_teams
  where league_id = p_league_id
  order by created_at, id
  limit 1;

  if v_equipo.id is null then
    return;
  end if;

  update leagues set creado_por = v_equipo.owner_id where id = p_league_id;

  insert into notificaciones (league_id, tipo, objetivo_team_id, privada)
  values (p_league_id, 'nuevo_admin', v_equipo.id, false);
end;
$$;

revoke all on function public.reasignar_admin_liga(uuid) from public, anon, authenticated;
grant execute on function public.reasignar_admin_liga(uuid) to service_role;


-- 5) Sancionar / advertir y anular -------------------------------------------------------
create or replace function public.admin_liga_sancionar(
  p_league_id uuid,
  p_equipo_id uuid,
  p_tipo text,
  p_cantidad numeric,
  p_motivo text
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_equipo fantasy_teams%rowtype;
  v_admin_team uuid;
  v_cantidad numeric;
  v_id uuid;
begin
  if not exists (select 1 from leagues where id = p_league_id and tipo = 'privada')
     or not public.es_admin_liga(p_league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador de la liga puede sancionar.');
  end if;

  select * into v_equipo
  from fantasy_teams
  where id = p_equipo_id and league_id = p_league_id
  for update;

  if v_equipo.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese equipo no está en esta liga.');
  end if;
  if v_equipo.owner_id = auth.uid() then
    return jsonb_build_object('ok', false, 'mensaje', 'No puedes sancionarte a ti mismo.');
  end if;
  if p_tipo is null or p_tipo not in ('puntos', 'millones', 'advertencia') then
    return jsonb_build_object('ok', false, 'mensaje', 'Tipo de sanción no válido.');
  end if;
  if char_length(v_motivo) < 3 then
    return jsonb_build_object('ok', false, 'mensaje', 'Escribe el motivo (al menos 3 caracteres).');
  end if;
  if char_length(v_motivo) > 300 then
    return jsonb_build_object('ok', false, 'mensaje', 'El motivo no puede pasar de 300 caracteres.');
  end if;

  if p_tipo = 'advertencia' then
    v_cantidad := null;
  elsif p_tipo = 'puntos' then
    if p_cantidad is null or p_cantidad <> trunc(p_cantidad) or p_cantidad < 1 or p_cantidad > 500 then
      return jsonb_build_object('ok', false, 'mensaje', 'Los puntos tienen que ser un número entero entre 1 y 500.');
    end if;
    v_cantidad := p_cantidad;
  else
    v_cantidad := round(p_cantidad, 2);
    if v_cantidad is null or v_cantidad <= 0 or v_cantidad > 1000 then
      return jsonb_build_object('ok', false, 'mensaje', 'Los millones tienen que estar entre 0,01 y 1000.');
    end if;
  end if;

  select id into v_admin_team
  from fantasy_teams
  where league_id = p_league_id and owner_id = auth.uid();

  insert into liga_sanciones (league_id, fantasy_team_id, tipo, cantidad, motivo, impuesta_por)
  values (p_league_id, p_equipo_id, p_tipo, v_cantidad, v_motivo, auth.uid())
  returning id into v_id;

  if p_tipo = 'millones' then
    update fantasy_teams set presupuesto = presupuesto - v_cantidad where id = p_equipo_id;
  end if;

  insert into notificaciones (league_id, tipo, actor_team_id, objetivo_team_id, importe, privada, datos)
  values (
    p_league_id,
    case when p_tipo = 'advertencia' then 'advertencia' else 'sancion' end,
    v_admin_team,
    p_equipo_id,
    v_cantidad,
    false,
    jsonb_build_object('sancion_id', v_id, 'subtipo', p_tipo, 'motivo', v_motivo)
  );

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.admin_liga_sancionar(uuid, uuid, text, numeric, text) from public, anon;
grant execute on function public.admin_liga_sancionar(uuid, uuid, text, numeric, text) to authenticated;

-- Anular: se borra la sanción y su aviso; si era de millones, se devuelven.
create or replace function public.admin_liga_anular_sancion(p_sancion_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_s liga_sanciones%rowtype;
begin
  select * into v_s from liga_sanciones where id = p_sancion_id for update;

  if v_s.id is null or not public.es_admin_liga(v_s.league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'No se ha encontrado esa sanción en tu liga.');
  end if;

  if v_s.tipo = 'millones' then
    update fantasy_teams set presupuesto = presupuesto + v_s.cantidad where id = v_s.fantasy_team_id;
  end if;

  delete from notificaciones
  where league_id = v_s.league_id
    and tipo in ('sancion', 'advertencia')
    and datos ->> 'sancion_id' = v_s.id::text;

  delete from liga_sanciones where id = v_s.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_liga_anular_sancion(uuid) from public, anon;
grant execute on function public.admin_liga_anular_sancion(uuid) to authenticated;


-- 6) Expulsar y readmitir ------------------------------------------------------------------
create or replace function public.admin_liga_expulsar(p_league_id uuid, p_equipo_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_equipo fantasy_teams%rowtype;
  v_admin_team uuid;
begin
  if not exists (select 1 from leagues where id = p_league_id and tipo = 'privada')
     or not public.es_admin_liga(p_league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador de la liga puede expulsar.');
  end if;

  -- Mismo cerrojo que unirse_liga: nadie entra ni sale de la liga mientras tanto.
  perform pg_advisory_xact_lock(hashtextextended(p_league_id::text, 0));

  select * into v_equipo
  from fantasy_teams
  where id = p_equipo_id and league_id = p_league_id
  for update;

  if v_equipo.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese equipo no está en esta liga.');
  end if;
  if v_equipo.owner_id = auth.uid() then
    return jsonb_build_object('ok', false, 'mensaje', 'No puedes expulsarte a ti mismo. Si quieres irte, sal de la liga.');
  end if;
  if char_length(v_motivo) < 3 then
    return jsonb_build_object('ok', false, 'mensaje', 'Escribe el motivo (al menos 3 caracteres).');
  end if;
  if char_length(v_motivo) > 300 then
    return jsonb_build_object('ok', false, 'mensaje', 'El motivo no puede pasar de 300 caracteres.');
  end if;

  insert into liga_expulsados (league_id, user_id, nombre_equipo, motivo, expulsado_por)
  values (p_league_id, v_equipo.owner_id, v_equipo.nombre, v_motivo, auth.uid())
  on conflict (league_id, user_id) do update
    set nombre_equipo = excluded.nombre_equipo,
        motivo = excluded.motivo,
        expulsado_por = excluded.expulsado_por,
        created_at = now();

  select id into v_admin_team
  from fantasy_teams
  where league_id = p_league_id and owner_id = auth.uid();

  -- Sin objetivo_team_id: el equipo se borra justo después (y su fila con él).
  insert into notificaciones (league_id, tipo, actor_team_id, privada, datos)
  values (
    p_league_id, 'expulsion', v_admin_team, false,
    jsonb_build_object('nombre_equipo', v_equipo.nombre, 'motivo', v_motivo)
  );

  -- Igual que salir_liga (0038).
  delete from clause_releases where from_team_id = v_equipo.id or to_team_id = v_equipo.id;
  delete from fantasy_teams where id = v_equipo.id;

  -- Si el root ha expulsado al propio administrador.
  perform public.reasignar_admin_liga(p_league_id);

  if not exists (select 1 from fantasy_teams where league_id = p_league_id) then
    delete from leagues where id = p_league_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_liga_expulsar(uuid, uuid, text) from public, anon;
grant execute on function public.admin_liga_expulsar(uuid, uuid, text) to authenticated;

create or replace function public.admin_liga_readmitir(p_league_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_admin_liga(p_league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador de la liga puede readmitir.');
  end if;

  delete from liga_expulsados where league_id = p_league_id and user_id = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese manager no está expulsado de esta liga.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_liga_readmitir(uuid, uuid) from public, anon;
grant execute on function public.admin_liga_readmitir(uuid, uuid) to authenticated;


-- 7) Mercado: tandas por liga ------------------------------------------------------------------
insert into public.config_definiciones
  (clave, grupo, etiqueta, descripcion, tipo, minimo, maximo, unidad, valor_defecto, permite_liga, estado, funcion_sql, orden)
values
  ('mercado_tandas_dia', 'Mercado', 'Veces al día que se resuelve el mercado',
   '1 = a las 23:00; 2 = a las 8:00 y 23:00; 3 = a las 8:00, 17:00 y 23:00 (hora de Madrid). Solo ligas privadas. El administrador de cada liga privada también lo puede cambiar desde su panel.',
   'entero', 1, 3, 'tandas', '3'::jsonb, true, 'activa', null, 80)
on conflict (clave) do nothing;

-- Horas (Madrid) de cada horario: 1, 2 o 3 tandas al día.
-- Mantener igual que horasTandaMercado() en lib/mercadoCountdown.ts.
create or replace function public.horas_por_tandas(p_tandas integer)
returns integer[]
language sql
immutable
as $$
  select case p_tandas
    when 1 then array[23]
    when 2 then array[8, 23]
    else array[8, 17, 23]
  end;
$$;

-- Horas a las que se resuelve el mercado de una liga.
create or replace function public.horas_mercado(p_league_id uuid)
returns integer[]
language sql
stable
security definer set search_path = public
as $$
  select public.horas_por_tandas(public.config_num('mercado_tandas_dia', p_league_id, 3)::integer);
$$;

-- Si ahora estamos en las 2 h antes de una de esas horas, devuelve esa hora (si no, null).
-- Son las mismas 2 h de las pujas ocultas. Mantener igual que tandaCercana() en
-- lib/mercadoCountdown.ts.
create or replace function public.tanda_cercana(p_horas integer[])
returns integer
language sql
stable
as $$
  select h
  from unnest(p_horas) as h
  where extract(hour from (now() at time zone 'Europe/Madrid'))::integer in ((h + 22) % 24, (h + 23) % 24)
  limit 1;
$$;

revoke all on function public.horas_mercado(uuid) from public, anon;
grant execute on function public.horas_mercado(uuid) to authenticated;

-- Resolver UNA liga: el cuerpo de procesar_mercado_diario() de producción, sin el bucle.
create or replace function public.procesar_mercado_liga(p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  v_validacion jsonb;
  v_saldo numeric;
  v_asignados uuid[] := '{}';
begin
  -- Las pujas se recorren de mayor a menor importe (empate: la más antigua).
  -- Ya no se filtra por valor actual: una puja hecha antes de que el jugador
  -- subiera de precio sigue valiendo, solo que compite con su importe.
  for r in
    select b.market_listing_id, b.fantasy_team_id, b.importe, ml.player_id
    from bids b
    join market_listings ml on ml.id = b.market_listing_id
    where ml.disponible = true
      and ml.league_id = p_league_id
    order by b.importe desc, b.created_at asc
  loop
    if r.market_listing_id = any (v_asignados) then
      continue;
    end if;

    select presupuesto into v_saldo from fantasy_teams where id = r.fantasy_team_id;
    if v_saldo - r.importe < -public.limite_deuda_equipo(r.fantasy_team_id) then
      continue;
    end if;

    v_validacion := public.validar_composicion_plantilla(
      r.fantasy_team_id,
      (select categoria from players where id = r.player_id)
    );
    if not (v_validacion ->> 'ok')::boolean then
      continue;
    end if;

    begin
      insert into squad_slots (fantasy_team_id, player_id, league_id, candado)
      values (r.fantasy_team_id, r.player_id, p_league_id, true);
      update fantasy_teams set presupuesto = presupuesto - r.importe where id = r.fantasy_team_id;
      insert into operations_log (fantasy_team_id, tipo, player_id, importe)
      values (r.fantasy_team_id, 'oferta_aceptada', r.player_id, r.importe);
      v_asignados := array_append(v_asignados, r.market_listing_id);
    exception when unique_violation then
      null;
    end;
  end loop;

  update market_listings set disponible = false
  where disponible = true and league_id = p_league_id;

  delete from bids where market_listing_id in (
    select id from market_listings where disponible = false and league_id = p_league_id
  );

  perform public.abrir_tanda_mercado(p_league_id);
end;
$$;

revoke all on function public.procesar_mercado_liga(uuid) from public, anon, authenticated;
grant execute on function public.procesar_mercado_liga(uuid) to service_role;

-- Todas las ligas privadas a la vez (para lanzarlo a mano si hiciera falta).
create or replace function public.procesar_mercado_diario()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga record;
begin
  for v_liga in select id from leagues where tipo = 'privada' loop
    perform public.procesar_mercado_liga(v_liga.id);
  end loop;
end;
$$;

-- Lo llama el cron cada hora: resuelve solo las ligas a las que les toca a esta hora.
create or replace function public.procesar_mercado_si_toca()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_hora integer := extract(hour from (now() at time zone 'Europe/Madrid'))::integer;
  v_liga record;
begin
  for v_liga in select id from leagues where tipo = 'privada' loop
    if v_hora = any (public.horas_mercado(v_liga.id)) then
      perform public.procesar_mercado_liga(v_liga.id);
    end if;
  end loop;
end;
$$;

-- Pujas ocultas de una liga: las 2 horas antes de cada una de SUS tandas.
-- Mantener igual que pujasOcultas() en lib/mercadoCountdown.ts.
create or replace function public.pujas_ocultas(p_league_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.tanda_cercana(public.horas_mercado(p_league_id)) is not null;
$$;

revoke all on function public.pujas_ocultas(uuid) from public, anon;
grant execute on function public.pujas_ocultas(uuid) to authenticated;

-- Igual que la de producción, con pujas_ocultas(p_league_id) en vez de la global.
create or replace function public.pujas_del_mercado(p_league_id uuid)
returns table (
  market_listing_id uuid,
  fantasy_team_id uuid,
  nombre_equipo text,
  importe numeric,
  es_mia boolean,
  created_at timestamptz
)
language sql
stable
security definer set search_path = public
as $$
  select
    b.market_listing_id,
    b.fantasy_team_id,
    ft.nombre,
    b.importe,
    (ft.owner_id = auth.uid()) as es_mia,
    b.created_at
  from bids b
  join market_listings ml on ml.id = b.market_listing_id
  join fantasy_teams ft on ft.id = b.fantasy_team_id
  where ml.league_id = p_league_id
    and ml.disponible = true
    -- Solo los miembros de esa liga (el equipo del que llama está en ella).
    and exists (
      select 1 from fantasy_teams mio
      where mio.league_id = p_league_id and mio.owner_id = auth.uid()
    )
    -- Las 2 h antes de la tanda solo ves tu propia puja.
    and (not public.pujas_ocultas(p_league_id) or ft.owner_id = auth.uid())
  order by b.importe desc, b.created_at asc;
$$;

-- El administrador cambia las tandas de SU liga (config_guardar solo deja al root).
-- No se puede en las 2 h antes de una tanda, ni del horario actual ni del nuevo:
-- así nadie se salta una tanda en el último momento ni provoca una sin las 2 h
-- de pujas ocultas.
create or replace function public.admin_liga_tandas_mercado(p_league_id uuid, p_tandas integer)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_cercana integer;
begin
  if not exists (select 1 from leagues where id = p_league_id and tipo = 'privada')
     or not public.es_admin_liga(p_league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador de la liga puede cambiar el mercado.');
  end if;
  if p_tandas is null or p_tandas not between 1 and 3 then
    return jsonb_build_object('ok', false, 'mensaje', 'El mercado se puede resolver 1, 2 o 3 veces al día.');
  end if;

  v_cercana := coalesce(
    public.tanda_cercana(public.horas_mercado(p_league_id)),
    public.tanda_cercana(public.horas_por_tandas(p_tandas))
  );
  if v_cercana is not null then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format(
        'Ahora no se puede cambiar: faltan menos de 2 horas para la tanda de las %s:00. Podrás cambiarlo a partir de las %s:00.',
        v_cercana, v_cercana
      )
    );
  end if;

  -- Para el historial de Admin > Variables (config_historial_trg, 0092).
  perform set_config('config.motivo', 'Cambiado por el administrador de la liga', true);
  perform set_config('config.revierte_id', '', true);

  insert into config_liga (league_id, clave, valor)
  values (p_league_id, 'mercado_tandas_dia', to_jsonb(p_tandas))
  on conflict (league_id, clave) do update set valor = excluded.valor;

  return jsonb_build_object('ok', true, 'horas', to_jsonb(public.horas_mercado(p_league_id)));
end;
$$;

revoke all on function public.admin_liga_tandas_mercado(uuid, integer) from public, anon;
grant execute on function public.admin_liga_tandas_mercado(uuid, integer) to authenticated;

-- reglas_liga (0096) con el horario del mercado.
create or replace function public.reglas_liga(p_league_id uuid)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'maxTitulares', public.config_num('plantilla_max_titulares', p_league_id, 6)::integer,
    'maxTitularesPorTorneo', public.config_num('plantilla_max_titulares_torneo', p_league_id, 4)::integer,
    'maxPlantilla', public.config_num('plantilla_tamano', p_league_id, 10)::integer,
    'clausulaPorcentaje', public.config_num('clausula_porcentaje', p_league_id, 1.5),
    'multiplicadorSubida', public.config_num('clausula_multiplicador_subida', p_league_id, 2),
    'blindajePorcentaje', public.config_num('blindaje_porcentaje', null, 0.10),
    'capitanMultiplicador', public.config_num('capitan_multiplicador', null, 2)::integer,
    'horasMercado', to_jsonb(public.horas_mercado(p_league_id))
  );
$$;


-- 8) Panel del administrador -------------------------------------------------------------------
-- Sanciones de la liga (con el equipo) y expulsados. Los equipos los saca la app
-- de la clasificación.
create or replace function public.admin_liga_panel(p_league_id uuid)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select case when not public.es_admin_liga(p_league_id) then null else jsonb_build_object(
    'tandas', public.config_num('mercado_tandas_dia', p_league_id, 3)::integer,
    'sanciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'equipo_id', s.fantasy_team_id,
        'nombre_equipo', ft.nombre,
        'tipo', s.tipo,
        'cantidad', s.cantidad,
        'motivo', s.motivo,
        'creada', s.created_at
      ) order by s.created_at desc)
      from liga_sanciones s
      join fantasy_teams ft on ft.id = s.fantasy_team_id
      where s.league_id = p_league_id
    ), '[]'::jsonb),
    'expulsados', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', e.user_id,
        'nombre_manager', p.nombre,
        'nombre_equipo', e.nombre_equipo,
        'motivo', e.motivo,
        'creado', e.created_at
      ) order by e.created_at desc)
      from liga_expulsados e
      join profiles p on p.id = e.user_id
      where e.league_id = p_league_id
    ), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.admin_liga_panel(uuid) from public, anon;
grant execute on function public.admin_liga_panel(uuid) to authenticated;


-- 9) Salir, unirse, mis ligas -----------------------------------------------------------------
-- salir_liga: la de producción + traspaso del cargo si se va el administrador.
create or replace function public.salir_liga(p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_equipo_id uuid;
  v_tipo text;
  v_restantes integer;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No has iniciado sesión.');
  end if;

  select id into v_equipo_id
  from fantasy_teams
  where owner_id = v_user_id and league_id = p_league_id
  for update;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  delete from clause_releases
  where from_team_id = v_equipo_id or to_team_id = v_equipo_id;

  delete from fantasy_teams where id = v_equipo_id;

  select tipo into v_tipo from leagues where id = p_league_id;
  select count(*) into v_restantes from fantasy_teams where league_id = p_league_id;

  if v_tipo = 'privada' and v_restantes = 0 then
    delete from leagues where id = p_league_id;
  elsif v_tipo = 'privada' then
    perform public.reasignar_admin_liga(p_league_id);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- unirse_liga: la de producción + no deja volver a un expulsado.
create or replace function public.unirse_liga(p_codigo text, p_nombre_equipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga leagues%rowtype;
  v_miembros_actuales integer;
  v_presupuesto_inicial numeric;
  v_equipo_id uuid;
  v_nombre text := trim(coalesce(p_nombre_equipo, ''));
begin
  if v_nombre = '' then
    return jsonb_build_object('ok', false, 'mensaje', 'El nombre del equipo no puede estar vacío.');
  end if;

  select * into v_liga from leagues where codigo = upper(trim(p_codigo));
  if v_liga.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No existe ninguna liga con ese código.');
  end if;

  if v_liga.tipo = 'publica' then
    return public.unirse_liga_publica(v_nombre, v_liga.id);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_liga.id::text, 0));

  if exists (select 1 from liga_expulsados where league_id = v_liga.id and user_id = auth.uid()) then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'El administrador de esta liga te ha expulsado. Para volver a entrar tiene que readmitirte.'
    );
  end if;

  if exists (select 1 from fantasy_teams where owner_id = auth.uid() and league_id = v_liga.id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya estás en esta liga.');
  end if;

  select count(*) into v_miembros_actuales from fantasy_teams where league_id = v_liga.id;
  if v_miembros_actuales >= v_liga.max_miembros then
    return jsonb_build_object('ok', false, 'mensaje', 'Esta liga ya está completa.');
  end if;

  if exists (
    select 1 from fantasy_teams
    where league_id = v_liga.id and lower(btrim(nombre)) = lower(v_nombre)
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya hay un equipo con ese nombre en esta liga. Elige otro.');
  end if;

  select coalesce(valor::text::numeric, 250)
  into v_presupuesto_inicial
  from game_config where clave = 'presupuesto_inicial';

  insert into fantasy_teams (owner_id, league_id, nombre, presupuesto)
  values (auth.uid(), v_liga.id, v_nombre, coalesce(v_presupuesto_inicial, 250))
  returning id into v_equipo_id;

  perform public.asignar_plantilla_inicial(v_equipo_id, v_liga.id);

  return jsonb_build_object('ok', true, 'liga_id', v_liga.id, 'nombre_liga', v_liga.nombre);
end;
$$;

-- mis_ligas: + soy_admin (para enseñar "Administrar liga").
drop function if exists public.mis_ligas();
create function public.mis_ligas()
returns table (
  liga_id uuid,
  nombre text,
  codigo text,
  miembros integer,
  max_miembros integer,
  equipo_id uuid,
  nombre_equipo text,
  saldo numeric,
  tipo text,
  soy_admin boolean
)
language sql
security definer set search_path = public
as $$
  select
    l.id,
    l.nombre,
    l.codigo,
    (select count(*) from fantasy_teams ft2 where ft2.league_id = l.id)::integer,
    l.max_miembros,
    ft.id,
    ft.nombre,
    ft.presupuesto,
    l.tipo,
    (l.tipo = 'privada' and l.creado_por = auth.uid())
  from leagues l
  join fantasy_teams ft on ft.league_id = l.id
  where ft.owner_id = auth.uid()
  order by l.created_at;
$$;

grant execute on function public.mis_ligas() to anon, authenticated, service_role;


-- 10) Los puntos de sanción restan del total ---------------------------------------------------
-- clasificacion: la de producción + puntos_sancion y el total ya descontado.
drop function if exists public.clasificacion(uuid);
create function public.clasificacion(p_league_id uuid)
returns table (
  equipo_id uuid,
  nombre_equipo text,
  nombre_manager text,
  puntos_totales integer,
  historial_puntos jsonb,
  puntos_sancion integer
)
language sql
stable
security definer set search_path = public
as $$
  select
    ft.id as equipo_id,
    ft.nombre as nombre_equipo,
    pr.nombre as nombre_manager,
    (coalesce(sum(tmp.puntos), 0) - coalesce(sanc.puntos, 0))::integer as puntos_totales,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', tmp.matchday_id,
          'jornada', tmp.jornada,
          'torneo', tmp.torneo,
          'puntos', tmp.puntos,
          'creada', tmp.creada
        )
        order by tmp.creada, tmp.matchday_id
      ) filter (where tmp.matchday_id is not null),
      '[]'::jsonb
    ) as historial_puntos,
    coalesce(sanc.puntos, 0)::integer as puntos_sancion
  from fantasy_teams ft
  join profiles pr on pr.id = ft.owner_id
  left join team_matchday_points tmp on tmp.fantasy_team_id = ft.id
  left join lateral (
    select sum(s.cantidad) as puntos
    from liga_sanciones s
    where s.fantasy_team_id = ft.id and s.tipo = 'puntos'
  ) sanc on true
  where ft.league_id = p_league_id
    and exists (
      select 1 from fantasy_teams mio
      where mio.league_id = p_league_id and mio.owner_id = auth.uid()
    )
  group by ft.id, ft.nombre, pr.nombre, sanc.puntos;
$$;

revoke all on function public.clasificacion(uuid) from public, anon;
grant execute on function public.clasificacion(uuid) to authenticated, service_role;

-- perfil_manager: la de producción con los puntos de sanción descontados del total.
create or replace function public.perfil_manager(p_equipo_id uuid)
returns table (
  equipo_id uuid,
  nombre_equipo text,
  nombre_manager text,
  liga_nombre text,
  liga_publica boolean,
  miembro_desde timestamptz,
  ligas_ganadas integer,
  ligas_jugadas integer,
  puntos_totales integer,
  mejor_jornada integer,
  es_mio boolean
)
language sql
stable
security definer set search_path = public
as $$
  select
    ft.id,
    ft.nombre,
    p.nombre,
    l.nombre,
    (l.tipo = 'publica'),
    p.created_at,
    p.ligas_ganadas,
    (select count(*) from fantasy_teams x where x.owner_id = ft.owner_id)::integer,
    (coalesce((select sum(t.puntos) from team_matchday_points t
               where t.fantasy_team_id = ft.id), 0)
     - coalesce((select sum(s.cantidad) from liga_sanciones s
                 where s.fantasy_team_id = ft.id and s.tipo = 'puntos'), 0))::integer,
    coalesce((select max(t.puntos) from team_matchday_points t
              where t.fantasy_team_id = ft.id), 0)::integer,
    (ft.owner_id = auth.uid())
  from fantasy_teams ft
  join profiles p on p.id = ft.owner_id
  join leagues l on l.id = ft.league_id
  where ft.id = p_equipo_id
    and public.puedo_ver_equipo(p_equipo_id);
$$;


-- 11) Saldo, liga y dueño de un equipo: no se tocan desde la API ---------------------------------
-- Sustituye a proteger_presupuesto_publico (0036), que solo cubría la liga pública.
create or replace function public.proteger_equipo()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.presupuesto is distinct from old.presupuesto then
      raise exception 'El saldo solo cambia con las operaciones del juego.';
    end if;
    if new.league_id is distinct from old.league_id or new.owner_id is distinct from old.owner_id then
      raise exception 'Un equipo no se puede cambiar de liga ni de dueño.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_presupuesto_publico_trg on public.fantasy_teams;
drop trigger if exists proteger_equipo_trg on public.fantasy_teams;
create trigger proteger_equipo_trg
  before update of presupuesto, league_id, owner_id on public.fantasy_teams
  for each row execute function public.proteger_equipo();

drop function if exists public.proteger_presupuesto_publico();
