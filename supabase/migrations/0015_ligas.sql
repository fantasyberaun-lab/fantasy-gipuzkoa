-- Ligas privadas (máximo 9 miembros cada una). Un usuario puede estar en
-- varias ligas a la vez, con un equipo/plantilla independiente en cada
-- una (fichajes, saldo, etc. no se comparten entre ligas).
--
-- Este es el paso 1 de varios: aquí solo se crea la tabla leagues y se
-- adapta fantasy_teams para que pertenezca a una liga. squad_slots,
-- market_listings, bids y player_status siguen siendo globales por
-- ahora — eso es el siguiente paso, una vez esto esté probado.

create table leagues (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo text not null unique,
  creado_por uuid not null references profiles (id) on delete cascade,
  max_miembros integer not null default 9,
  created_at timestamptz not null default now()
);

alter table leagues enable row level security;

-- fantasy_teams pasa de "un equipo por usuario" a "un equipo por
-- usuario y por liga". Se añade nullable primero para no romper filas
-- que ya existan (de las pruebas de estas semanas), se rellenan con una
-- liga "de pruebas" generada aquí mismo, y luego se hace obligatoria.
-- Esto va ANTES de la política de leagues de más abajo, porque esa
-- política consulta fantasy_teams.league_id — tiene que existir ya.
alter table fantasy_teams add column if not exists league_id uuid references leagues (id) on delete cascade;

do $$
declare
  v_admin_id uuid;
  v_liga_pruebas_id uuid;
begin
  if exists (select 1 from fantasy_teams where league_id is null) then
    select owner_id into v_admin_id from fantasy_teams where league_id is null limit 1;

    insert into leagues (nombre, codigo, creado_por)
    values ('Liga de pruebas', 'PRUEBA', v_admin_id)
    returning id into v_liga_pruebas_id;

    update fantasy_teams set league_id = v_liga_pruebas_id where league_id is null;
  end if;
end $$;

alter table fantasy_teams alter column league_id set not null;

alter table fantasy_teams drop constraint if exists fantasy_teams_owner_id_key;
alter table fantasy_teams add constraint fantasy_teams_owner_league_unique unique (owner_id, league_id);

-- Ahora sí, con fantasy_teams.league_id ya existiendo: solo se puede
-- ver una liga si eres miembro (tienes un equipo en ella) o si la
-- creaste tú. No hay lectura pública: el código es la forma de entrar,
-- no algo para listar todas las ligas que existen.
create policy "ver ligas de las que soy miembro o creador"
  on leagues for select
  using (
    creado_por = auth.uid()
    or id in (
      select league_id from fantasy_teams where owner_id = auth.uid()
    )
  );

-- Genera un código de 6 caracteres (mayúsculas + dígitos, sin 0/O/1/I
-- para evitar confusiones al escribirlo a mano) que no choque con uno
-- ya existente.
create or replace function public.generar_codigo_liga()
returns text
language plpgsql
as $$
declare
  v_alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  v_existe boolean;
begin
  loop
    v_codigo := '';
    for i in 1..6 loop
      v_codigo := v_codigo || substr(v_alfabeto, floor(random() * length(v_alfabeto) + 1)::int, 1);
    end loop;

    select exists(select 1 from leagues where codigo = v_codigo) into v_existe;
    exit when not v_existe;
  end loop;

  return v_codigo;
end;
$$;

-- Crear una liga nueva: genera el código, crea la liga, y de paso crea
-- tu propio equipo dentro (el creador también necesita un equipo para
-- jugar en su propia liga).
create or replace function public.crear_liga(p_nombre_liga text, p_nombre_equipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga_id uuid;
  v_codigo text;
  v_presupuesto_inicial numeric;
begin
  if trim(p_nombre_liga) = '' or trim(p_nombre_equipo) = '' then
    return jsonb_build_object('ok', false, 'mensaje', 'El nombre de la liga y del equipo no pueden estar vacíos.');
  end if;

  v_codigo := public.generar_codigo_liga();

  insert into leagues (nombre, codigo, creado_por)
  values (trim(p_nombre_liga), v_codigo, auth.uid())
  returning id into v_liga_id;

  select coalesce(valor::text::numeric, 250)
  into v_presupuesto_inicial
  from game_config where clave = 'presupuesto_inicial';

  insert into fantasy_teams (owner_id, league_id, nombre, presupuesto)
  values (auth.uid(), v_liga_id, trim(p_nombre_equipo), coalesce(v_presupuesto_inicial, 250));

  return jsonb_build_object('ok', true, 'liga_id', v_liga_id, 'codigo', v_codigo);
end;
$$;

grant execute on function public.crear_liga(text, text) to authenticated;

-- Unirse a una liga existente con su código. Comprueba el máximo de
-- miembros y que no estés ya dentro.
create or replace function public.unirse_liga(p_codigo text, p_nombre_equipo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga leagues%rowtype;
  v_miembros_actuales integer;
  v_presupuesto_inicial numeric;
begin
  if trim(p_nombre_equipo) = '' then
    return jsonb_build_object('ok', false, 'mensaje', 'El nombre del equipo no puede estar vacío.');
  end if;

  select * into v_liga from leagues where codigo = upper(trim(p_codigo));
  if v_liga.id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No existe ninguna liga con ese código.');
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
  values (auth.uid(), v_liga.id, trim(p_nombre_equipo), coalesce(v_presupuesto_inicial, 250));

  return jsonb_build_object('ok', true, 'liga_id', v_liga.id, 'nombre_liga', v_liga.nombre);
end;
$$;

grant execute on function public.unirse_liga(text, text) to authenticated;

-- Tus ligas (para el selector del frontend): nombre, código y cuántos
-- miembros hay de los 9.
create or replace function public.mis_ligas()
returns table (
  liga_id uuid,
  nombre text,
  codigo text,
  miembros integer,
  max_miembros integer,
  equipo_id uuid,
  nombre_equipo text
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
    ft.nombre
  from leagues l
  join fantasy_teams ft on ft.league_id = l.id
  where ft.owner_id = auth.uid()
  order by l.created_at;
$$;

grant execute on function public.mis_ligas() to authenticated;