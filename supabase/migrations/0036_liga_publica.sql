-- Liga pública "todos contra todos".
--
-- Además de las ligas privadas (hasta 9 amigos, plantilla inicial al azar,
-- mercado por tandas con pujas, clausulazos...), existe UNA liga pública a la
-- que puede unirse cualquier usuario. Reglas:
--
--   - Todos los managers empiezan con el mismo presupuesto (game_config,
--     clave 'presupuesto_liga_publica') y SIN plantilla inicial.
--   - No hay mercado por tandas ni pujas: todos los jugadores activos están
--     siempre disponibles, y comprar/vender es instantáneo al valor de mercado.
--   - Un mismo jugador puede estar en la plantilla de todos los managers a la
--     vez (no hay propietario único), así que no hay clausulazos, ofertas,
--     candados ni blindajes.
--   - Siguen valiendo el resto de reglas: plantilla de hasta 10, 6 titulares,
--     máximo 2 titulares de Tercera, capitán x2 y puntuación por jornada
--     (las alineaciones se "fotografían" al crear la jornada, como siempre).
--
-- IMPORTANTE para futuras migraciones: pagar_clausula y fichar_jugador ahora
-- son "porteros" que deciden según el tipo de liga y llaman a
-- pagar_clausula_privada / fichar_jugador_privada (las versiones de siempre,
-- renombradas). Si algún día hay que cambiar la lógica de las ligas privadas,
-- se edita la función *_privada, no el portero.

-- 1) Tipo de liga ------------------------------------------------------------
alter table leagues
  add column if not exists tipo text not null default 'privada'
  check (tipo in ('privada', 'publica'));

-- La liga pública no la crea ningún usuario.
alter table leagues alter column creado_por drop not null;

-- Como mucho una liga pública.
create unique index if not exists leagues_una_publica
  on leagues ((tipo)) where tipo = 'publica';

-- mis_ligas() y clasificacion() buscan equipos por liga: con muchos
-- managers en la pública conviene tener índice.
create index if not exists fantasy_teams_league_id_idx on fantasy_teams (league_id);

insert into leagues (nombre, codigo, tipo, creado_por, max_miembros)
select 'Liga Pública', 'PUBLICA', 'publica', null, 100000
where not exists (select 1 from leagues where tipo = 'publica');

-- Presupuesto inicial de la liga pública (editable desde game_config).
insert into game_config (clave, valor)
values ('presupuesto_liga_publica', '500'::jsonb)
on conflict (clave) do nothing;

create or replace function public.es_liga_publica(p_league_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from leagues where id = p_league_id and tipo = 'publica');
$$;

grant execute on function public.es_liga_publica(uuid) to authenticated;

-- 2) squad_slots: en la pública un jugador puede tener varios dueños --------
-- liga_publica se rellena solo (trigger de más abajo), nunca desde el cliente.
alter table squad_slots add column if not exists liga_publica boolean not null default false;

-- El "un solo propietario por jugador y liga" (0016) pasa a aplicarse solo
-- a las ligas privadas...
drop index if exists squad_slots_un_propietario_activo;
create unique index squad_slots_un_propietario_activo
  on squad_slots (player_id, league_id)
  where fecha_salida is null and not liga_publica;

-- ...y en cualquier liga un equipo no puede tener al mismo jugador dos veces.
create unique index if not exists squad_slots_un_jugador_por_equipo_activo
  on squad_slots (fantasy_team_id, player_id)
  where fecha_salida is null;

-- Rellena liga_publica al insertar, y evita que un cliente (API directa) haga
-- trampas en la liga pública: los fichajes y ventas SOLO pueden hacerse con
-- fichar_jugador() y vender_jugador(). Las funciones security definer corren
-- como su propietario, y las peticiones directas de la API como
-- "authenticated"/"anon" (mismo truco que proteger_blindado, 0033).
create or replace function public.proteger_slots_liga_publica()
returns trigger
language plpgsql
as $$
declare
  v_cliente boolean := current_user in ('authenticated', 'anon');
begin
  if tg_op = 'INSERT' then
    new.liga_publica := public.es_liga_publica(new.league_id);
    if new.liga_publica and v_cliente then
      raise exception 'En la liga pública los jugadores se fichan desde el Mercado.';
    end if;
    return new;
  end if;

  if old.liga_publica and v_cliente and (
       new.player_id is distinct from old.player_id
    or new.fantasy_team_id is distinct from old.fantasy_team_id
    or new.league_id is distinct from old.league_id
    or new.liga_publica is distinct from old.liga_publica
    or new.fecha_incorporacion is distinct from old.fecha_incorporacion
    or new.fecha_salida is distinct from old.fecha_salida
  ) then
    raise exception 'En la liga pública los jugadores se venden desde el Mercado.';
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_slots_liga_publica_trg on public.squad_slots;
create trigger proteger_slots_liga_publica_trg
  before insert or update of player_id, fantasy_team_id, league_id, liga_publica, fecha_incorporacion, fecha_salida
  on public.squad_slots
  for each row execute function public.proteger_slots_liga_publica();

-- El saldo de un equipo de la liga pública tampoco se puede tocar a mano
-- (las ligas privadas siguen como estaban).
create or replace function public.proteger_presupuesto_publico()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon')
     and new.presupuesto is distinct from old.presupuesto
     and public.es_liga_publica(new.league_id) then
    raise exception 'El saldo de la liga pública solo cambia al comprar o vender jugadores.';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_presupuesto_publico_trg on public.fantasy_teams;
create trigger proteger_presupuesto_publico_trg
  before update of presupuesto on public.fantasy_teams
  for each row execute function public.proteger_presupuesto_publico();

-- Sin ofertas directas en la liga pública (no hay "dueño" al que ofertar).
create or replace function public.bloquear_ofertas_liga_publica()
returns trigger
language plpgsql
as $$
declare
  v_liga uuid;
begin
  select league_id into v_liga from fantasy_teams where id = new.equipo_oferente_id;
  if public.es_liga_publica(v_liga) then
    raise exception 'En la liga pública no hay ofertas: ficha al jugador directamente en el Mercado.';
  end if;
  return new;
end;
$$;

drop trigger if exists bloquear_ofertas_liga_publica_trg on public.player_offers;
create trigger bloquear_ofertas_liga_publica_trg
  before insert on public.player_offers
  for each row execute function public.bloquear_ofertas_liga_publica();

-- 3) Entrar en la liga pública --------------------------------------------------
create or replace function public.unirse_liga_publica(p_nombre_equipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga leagues%rowtype;
  v_nombre text := trim(coalesce(p_nombre_equipo, ''));
  v_presupuesto numeric;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Tienes que iniciar sesión.');
  end if;

  if v_nombre = '' then
    return jsonb_build_object('ok', false, 'mensaje', 'El nombre del equipo no puede estar vacío.');
  end if;

  select * into v_liga from leagues where tipo = 'publica';
  if v_liga.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'La liga pública no está disponible.');
  end if;

  -- Serializa las altas para que dos equipos no cojan el mismo nombre a la vez.
  perform pg_advisory_xact_lock(hashtextextended('alta-liga-publica', 0));

  if exists (select 1 from fantasy_teams where owner_id = auth.uid() and league_id = v_liga.id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya estás en la liga pública.');
  end if;

  if exists (
    select 1 from fantasy_teams
    where league_id = v_liga.id and lower(nombre) = lower(v_nombre)
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya hay un equipo con ese nombre en la liga pública. Elige otro.');
  end if;

  select valor::text::numeric into v_presupuesto
  from game_config where clave = 'presupuesto_liga_publica';

  insert into fantasy_teams (owner_id, league_id, nombre, presupuesto)
  values (auth.uid(), v_liga.id, v_nombre, coalesce(v_presupuesto, 500));

  -- Sin plantilla inicial: cada manager la construye desde cero en el Mercado.
  return jsonb_build_object('ok', true, 'liga_id', v_liga.id, 'nombre_liga', v_liga.nombre);
end;
$$;

grant execute on function public.unirse_liga_publica(text) to authenticated;

-- unirse_liga (0026) con un cambio: si el código es el de la pública, no se
-- reparte plantilla inicial, se entra como en unirse_liga_publica().
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
begin
  if trim(p_nombre_equipo) = '' then
    return jsonb_build_object('ok', false, 'mensaje', 'El nombre del equipo no puede estar vacío.');
  end if;

  select * into v_liga from leagues where codigo = upper(trim(p_codigo));
  if v_liga.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No existe ninguna liga con ese código.');
  end if;

  if v_liga.tipo = 'publica' then
    return public.unirse_liga_publica(p_nombre_equipo);
  end if;

  if exists (select 1 from fantasy_teams where owner_id = auth.uid() and league_id = v_liga.id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya estás en esta liga.');
  end if;

  select count(*) into v_miembros_actuales from fantasy_teams where league_id = v_liga.id;
  if v_miembros_actuales >= v_liga.max_miembros then
    return jsonb_build_object('ok', false, 'mensaje', 'Esta liga ya está completa.');
  end if;

  select coalesce(valor::text::numeric, 250)
  into v_presupuesto_inicial
  from game_config where clave = 'presupuesto_inicial';

  insert into fantasy_teams (owner_id, league_id, nombre, presupuesto)
  values (auth.uid(), v_liga.id, trim(p_nombre_equipo), coalesce(v_presupuesto_inicial, 250))
  returning id into v_equipo_id;

  perform public.asignar_plantilla_inicial(v_equipo_id, v_liga.id);

  return jsonb_build_object('ok', true, 'liga_id', v_liga.id, 'nombre_liga', v_liga.nombre);
end;
$$;

grant execute on function public.unirse_liga(text, text) to authenticated;

-- mis_ligas() (0025) devuelve además el tipo de liga.
drop function if exists public.mis_ligas();

create or replace function public.mis_ligas()
returns table (
  liga_id uuid,
  nombre text,
  codigo text,
  miembros integer,
  max_miembros integer,
  equipo_id uuid,
  nombre_equipo text,
  saldo numeric,
  tipo text
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
    l.tipo
  from leagues l
  join fantasy_teams ft on ft.league_id = l.id
  where ft.owner_id = auth.uid()
  order by l.created_at;
$$;

grant execute on function public.mis_ligas() to authenticated;

-- 4) Comprar y vender (liga pública) ----------------------------------------------
-- Comprar: al valor de mercado actual, al instante. El bloqueo de la fila del
-- equipo (for update) evita que dos compras simultáneas (doble clic) se pasen
-- del saldo o de los 10 jugadores.
create or replace function public.fichar_jugador_publica(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_saldo numeric;
  v_categoria categoria;
  v_precio numeric;
  v_activo boolean;
  v_validacion jsonb;
begin
  select id, presupuesto into v_equipo_id, v_saldo
  from fantasy_teams
  where owner_id = auth.uid() and league_id = p_league_id
  for update;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  select categoria, valor_mercado, activo into v_categoria, v_precio, v_activo
  from players where id = p_player_id;

  if v_categoria is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no existe.');
  end if;

  if not v_activo then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no está disponible.');
  end if;

  if exists (
    select 1 from squad_slots
    where fantasy_team_id = v_equipo_id and player_id = p_player_id and fecha_salida is null
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya tienes a este jugador en tu plantilla.');
  end if;

  if v_saldo < v_precio then
    return jsonb_build_object(
      'ok', false,
      'mensaje', format('Saldo insuficiente: necesitas %s M y tienes %s M.', v_precio, v_saldo)
    );
  end if;

  v_validacion := public.validar_composicion_plantilla(v_equipo_id, v_categoria);
  if not (v_validacion ->> 'ok')::boolean then
    return v_validacion;
  end if;

  begin
    insert into squad_slots (fantasy_team_id, player_id, league_id)
    values (v_equipo_id, p_player_id, p_league_id);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya tienes a este jugador en tu plantilla.');
  end;

  update fantasy_teams set presupuesto = presupuesto - v_precio where id = v_equipo_id;

  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_equipo_id, 'fichaje', p_player_id, v_precio);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.fichar_jugador_publica(uuid, uuid) from public, anon, authenticated;

-- Vender: al valor de mercado actual, al instante.
create or replace function public.vender_jugador(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_slot_id uuid;
  v_valor numeric;
begin
  if not public.es_liga_publica(p_league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Esta opción es solo para la liga pública.');
  end if;

  select id into v_equipo_id
  from fantasy_teams
  where owner_id = auth.uid() and league_id = p_league_id
  for update;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  select id into v_slot_id
  from squad_slots
  where fantasy_team_id = v_equipo_id and player_id = p_player_id and fecha_salida is null
  for update;

  if v_slot_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese jugador no está en tu plantilla.');
  end if;

  select valor_mercado into v_valor from players where id = p_player_id;

  update squad_slots set fecha_salida = now() where id = v_slot_id;
  update fantasy_teams set presupuesto = presupuesto + v_valor where id = v_equipo_id;

  insert into operations_log (fantasy_team_id, tipo, player_id, importe)
  values (v_equipo_id, 'venta', p_player_id, v_valor);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.vender_jugador(uuid, uuid) to authenticated;

-- 5) Porteros: fichar_jugador y pagar_clausula según el tipo de liga -------------
-- Se renombran las versiones de siempre (solo para ligas privadas) y se
-- quitan los permisos de llamarlas directamente; los porteros, con el mismo
-- nombre y parámetros que antes, deciden. Así el cliente no cambia.
do $$
begin
  if to_regprocedure('public.fichar_jugador_privada(uuid, uuid)') is null then
    alter function public.fichar_jugador(uuid, uuid) rename to fichar_jugador_privada;
  end if;
  if to_regprocedure('public.pagar_clausula_privada(uuid, uuid)') is null then
    alter function public.pagar_clausula(uuid, uuid) rename to pagar_clausula_privada;
  end if;
end $$;

revoke all on function public.fichar_jugador_privada(uuid, uuid) from public, anon, authenticated;
revoke all on function public.pagar_clausula_privada(uuid, uuid) from public, anon, authenticated;

create or replace function public.fichar_jugador(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if public.es_liga_publica(p_league_id) then
    return public.fichar_jugador_publica(p_player_id, p_league_id);
  end if;
  return public.fichar_jugador_privada(p_player_id, p_league_id);
end;
$$;

grant execute on function public.fichar_jugador(uuid, uuid) to authenticated;

-- Sin clausulazos en la liga pública: no hay propietario al que quitárselo.
create or replace function public.pagar_clausula(p_player_id uuid, p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if public.es_liga_publica(p_league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'En la liga pública no hay clausulazos: ficha al jugador directamente en el Mercado.');
  end if;
  return public.pagar_clausula_privada(p_player_id, p_league_id);
end;
$$;

grant execute on function public.pagar_clausula(uuid, uuid) to authenticated;

-- 6) El mercado por tandas (cron) solo se ocupa de las ligas privadas ----------
-- Mismo cuerpo que en 0027, filtrando por tipo.
create or replace function public.abrir_tanda_mercado(p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if public.es_liga_publica(p_league_id) then
    return;
  end if;

  insert into market_listings (player_id, valor_actual, disponible, league_id)
  select p.id, p.valor_mercado, true, p_league_id
  from players p
  where p.activo = true
    and not exists (
      select 1 from squad_slots ss
      where ss.player_id = p.id
        and ss.league_id = p_league_id
        and ss.fecha_salida is null
    )
  order by random()
  limit 9;
end;
$$;

create or replace function public.procesar_mercado_diario()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga record;
  r record;
  v_validacion jsonb;
  v_categoria categoria;
begin
  for v_liga in select id from leagues where tipo = 'privada' loop
    for r in
      select distinct on (b.market_listing_id)
        b.market_listing_id, b.fantasy_team_id, b.importe, ml.player_id
      from bids b
      join market_listings ml on ml.id = b.market_listing_id
      where ml.disponible = true and ml.league_id = v_liga.id
      order by b.market_listing_id, b.importe desc, b.created_at asc
    loop
      select categoria into v_categoria from players where id = r.player_id;
      v_validacion := public.validar_composicion_plantilla(r.fantasy_team_id, v_categoria);

      if (v_validacion ->> 'ok')::boolean then
        begin
          insert into squad_slots (fantasy_team_id, player_id, league_id, candado)
          values (r.fantasy_team_id, r.player_id, v_liga.id, true);
          update fantasy_teams set presupuesto = presupuesto - r.importe where id = r.fantasy_team_id;
          insert into operations_log (fantasy_team_id, tipo, player_id, importe)
          values (r.fantasy_team_id, 'oferta_aceptada', r.player_id, r.importe);
        exception when unique_violation then
          null;
        end;
      end if;
    end loop;

    update market_listings set disponible = false
    where disponible = true and league_id = v_liga.id;

    delete from bids where market_listing_id in (
      select id from market_listings where disponible = false and league_id = v_liga.id
    );

    perform public.abrir_tanda_mercado(v_liga.id);
  end loop;
end;
$$;

grant execute on function public.procesar_mercado_diario() to postgres;

-- 7) Sin avisos de fichajes en la liga pública -----------------------------------
-- Con cientos de managers, un aviso por cada fichaje sería ruido. Mismo cuerpo
-- que en 0022, saliendo antes si la liga es la pública.
create or replace function public.notificar_fichaje()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga uuid;
  v_victima uuid;
begin
  if new.player_id is null
     or new.tipo not in ('fichaje', 'oferta_aceptada', 'clausulazo') then
    return new;
  end if;

  select league_id into v_liga from fantasy_teams where id = new.fantasy_team_id;
  if v_liga is null then
    return new;
  end if;

  if public.es_liga_publica(v_liga) then
    return new;
  end if;

  if new.tipo = 'clausulazo' then
    select from_team_id into v_victima
    from clause_releases
    where player_id = new.player_id and to_team_id = new.fantasy_team_id
    order by created_at desc
    limit 1;

    insert into notificaciones (league_id, tipo, actor_team_id, objetivo_team_id, player_id, importe, privada)
    values (v_liga, 'clausulazo', new.fantasy_team_id, v_victima, new.player_id, new.importe, false);
  else
    insert into notificaciones (league_id, tipo, actor_team_id, player_id, importe, privada)
    values (v_liga, 'fichaje', new.fantasy_team_id, new.player_id, new.importe, false);
  end if;

  return new;
end;
$$;
