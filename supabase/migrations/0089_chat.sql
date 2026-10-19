-- 0089: chat de texto por liga (privadas y pública).
--
-- REQUIERE 0086-0088 (niveles) ya aplicadas: el chat muestra el nivel y el icono
-- de cada autor con la misma lógica que 0088 (xp_usuarios, profiles.avatar).
--
-- Qué hace
--   - Cada liga tiene su chat: el de una liga privada lo ven solo sus miembros; el
--     de la liga pública, quienes juegan en ella. Root puede leer todos para
--     moderar. Solo texto y emojis: no hay columnas para nada más.
--   - Mensajes con fecha y hora. Se borran solos pasados X días
--     (game_config 'chat_dias_conservacion', 90 al inicio) con chat_purgar(),
--     pensada para pg_cron una vez al día (ver el final del archivo).
--   - Menciones: el cliente envía los ids de los mencionados (los alias pueden
--     llevar espacios, no se pueden detectar con una expresión regular). En la
--     liga pública se puede silenciar (profiles.chat_publico_silenciado): quien lo
--     hace no sale al buscar para mencionar, el servidor ignora menciones a esa
--     persona y no le cuentan en el contador.
--   - Moderación: el autor borra lo suyo; root borra cualquier mensaje y banea;
--     el creador de una liga privada borra mensajes de su liga, pero no banea.
--     Se puede denunciar cualquier mensaje ajeno (máx. 'chat_max_denuncias_dia' al
--     día por persona, una vez por mensaje). En las privadas root banea a partir
--     de una denuncia; en la pública puede banear directamente.
--   - Antispam: longitud, separación entre mensajes, máximo por minuto, sin
--     repetir el mismo texto, sin enlaces, correos ni teléfonos, palabras vetadas
--     opcionales, y nivel mínimo opcional para escribir en la pública.
--
-- Seguridad: RLS activada en todas las tablas y SIN políticas. Nadie lee ni escribe
-- las tablas desde el navegador: todo pasa por las funciones de abajo (security
-- definer), que comprueban quién eres y a qué liga perteneces. Por eso no se usa
-- Realtime sobre la tabla: el cliente consulta cada pocos segundos con
-- chat_nuevos() (ver la propuesta, apartado de rendimiento).
--
-- Impacto en datos existentes: ninguno. Crea 5 tablas y funciones nuevas, añade
-- 2 columnas con valor por defecto a profiles y un índice en profiles (nombre en
-- minúsculas, para buscar a quién mencionar sin recorrer la tabla). Se puede lanzar
-- con `supabase db push` o pegándola en el SQL Editor, antes de desplegar la web:
-- la web actual no la usa.
--
-- RGPD: los mensajes van ligados a la cuenta y se borran con ella (on delete
-- cascade; eliminar_mi_cuenta() borra auth.users). No se guarda la IP. Las
-- denuncias guardan una copia del texto denunciado (para poder resolverlas aunque
-- el mensaje se borre) y se conservan 'chat_dias_denuncias' días tras resolverse.

-- 1) Configuración -------------------------------------------------------------------
insert into game_config (clave, valor) values
  ('chat_dias_conservacion', '90'::jsonb),
  ('chat_max_caracteres', '300'::jsonb),
  ('chat_segundos_entre_mensajes', '2'::jsonb),
  ('chat_max_por_minuto', '10'::jsonb),
  ('chat_max_denuncias_dia', '3'::jsonb),
  ('chat_nivel_minimo_publico', '1'::jsonb),
  ('chat_dias_denuncias', '365'::jsonb),
  ('chat_palabras_vetadas', '[]'::jsonb)
on conflict (clave) do nothing;

-- 2) Tablas ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists chat_publico_silenciado boolean not null default false,
  add column if not exists chat_normas_vistas boolean not null default false;

create table if not exists public.chat_mensajes (
  id bigint generated always as identity primary key,
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 1000),
  menciones uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Leer y contar lo nuevo de una liga.
create index if not exists chat_mensajes_liga_idx on public.chat_mensajes (league_id, id desc);
-- Borrado por antigüedad.
create index if not exists chat_mensajes_fecha_idx on public.chat_mensajes (created_at);
-- Antispam: últimos mensajes de una persona.
create index if not exists chat_mensajes_usuario_idx on public.chat_mensajes (user_id, created_at desc);

-- Hasta dónde ha leído cada persona en cada chat (una fila por persona y liga).
create table if not exists public.chat_lecturas (
  user_id uuid not null references auth.users (id) on delete cascade,
  league_id uuid not null references public.leagues (id) on delete cascade,
  ultimo_id bigint not null default 0,
  primary key (user_id, league_id)
);

create table if not exists public.chat_denuncias (
  id bigint generated always as identity primary key,
  mensaje_id bigint not null, -- sin clave foránea: el mensaje puede haberse borrado
  league_id uuid not null references public.leagues (id) on delete cascade,
  autor_id uuid not null references auth.users (id) on delete cascade,
  denunciante_id uuid not null references auth.users (id) on delete cascade,
  texto text not null, -- copia del mensaje denunciado
  created_at timestamptz not null default now(),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  resuelta_en timestamptz,
  resuelta_por uuid references auth.users (id) on delete set null,
  unique (mensaje_id, denunciante_id)
);

create index if not exists chat_denuncias_estado_idx on public.chat_denuncias (estado, created_at desc);
create index if not exists chat_denuncias_denunciante_idx on public.chat_denuncias (denunciante_id, created_at desc);

-- Baneos: no se puede escribir en ese chat hasta 'hasta'; se sigue pudiendo leer.
create table if not exists public.chat_bloqueos (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  league_id uuid not null references public.leagues (id) on delete cascade,
  hasta timestamptz not null,
  motivo text check (motivo is null or char_length(motivo) <= 300),
  puesto_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists chat_bloqueos_usuario_idx on public.chat_bloqueos (user_id, league_id, hasta desc);

-- Buscar a quién mencionar por el principio del alias.
create index if not exists profiles_nombre_prefijo_idx on public.profiles (lower(nombre) text_pattern_ops);

alter table public.chat_mensajes enable row level security;
alter table public.chat_lecturas enable row level security;
alter table public.chat_denuncias enable row level security;
alter table public.chat_bloqueos enable row level security;

revoke all on public.chat_mensajes from anon, authenticated;
revoke all on public.chat_lecturas from anon, authenticated;
revoke all on public.chat_denuncias from anon, authenticated;
revoke all on public.chat_bloqueos from anon, authenticated;

-- 3) Ayudas internas (no se llaman desde el navegador) -----------------------------------
create or replace function public.chat_cfg(p_clave text, p_defecto numeric)
returns numeric
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select valor::text::numeric from game_config where clave = p_clave), p_defecto);
$$;

-- ¿Puede esta persona leer el chat de la liga? Miembro de la liga o root.
create or replace function public.chat_puede_leer(p_liga uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select auth.uid() is not null and p_liga is not null and (
    public.es_root()
    or exists (select 1 from fantasy_teams where league_id = p_liga and owner_id = auth.uid())
  );
$$;

create or replace function public.chat_es_miembro(p_liga uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from fantasy_teams where league_id = p_liga and owner_id = auth.uid()
  );
$$;

-- Fecha hasta la que está baneada esta persona en este chat (null = no lo está).
create or replace function public.chat_baneo_activo(p_user uuid, p_liga uuid)
returns table (hasta timestamptz, motivo text)
language sql
stable
security definer set search_path = public
as $$
  select b.hasta, b.motivo
  from chat_bloqueos b
  where b.user_id = p_user and b.league_id = p_liga and b.hasta > now()
  order by b.hasta desc
  limit 1;
$$;

-- 4) Estado del chat para la persona que lo abre --------------------------------------
create or replace function public.chat_estado(p_liga uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_publica boolean := public.es_liga_publica(p_liga);
  v_miembro boolean := public.chat_es_miembro(p_liga);
  v_perfil record;
  v_baneo record;
  v_mod text := null;
  v_xp integer;
  v_nivel_min integer := public.chat_cfg('chat_nivel_minimo_publico', 1)::integer;
begin
  if not public.chat_puede_leer(p_liga) then
    return jsonb_build_object('ok', false, 'codigo', 'no_miembro');
  end if;

  select chat_publico_silenciado, chat_normas_vistas into v_perfil from profiles where id = v_uid;
  select * into v_baneo from public.chat_baneo_activo(v_uid, p_liga);
  select coalesce(xp, 0) into v_xp from xp_usuarios where user_id = v_uid;

  if public.es_root() then
    v_mod := 'root';
  elsif not v_publica and exists (select 1 from leagues where id = p_liga and creado_por = v_uid) then
    v_mod := 'creador';
  end if;

  return jsonb_build_object(
    'ok', true,
    'publica', v_publica,
    'miembro', v_miembro,
    'moderador', v_mod,
    'baneado_hasta', v_baneo.hasta,
    'baneo_motivo', v_baneo.motivo,
    'silenciado_publico', coalesce(v_perfil.chat_publico_silenciado, false),
    'normas_vistas', coalesce(v_perfil.chat_normas_vistas, false),
    'nivel_ok', not v_publica or public.nivel_de_xp(coalesce(v_xp, 0)) >= v_nivel_min,
    'nivel_minimo', case when v_publica then v_nivel_min else 1 end,
    'max_caracteres', public.chat_cfg('chat_max_caracteres', 300)::integer,
    'max_denuncias_dia', public.chat_cfg('chat_max_denuncias_dia', 3)::integer
  );
end;
$$;

-- 5) Enviar ----------------------------------------------------------------------------
-- Devuelve { ok, codigo } en vez de lanzar errores para que la web traduzca el
-- mensaje: sesion, no_miembro, bloqueado, nivel, vacia, larga, enlace, vetada,
-- rapido, limite, repetido, menciones.
create or replace function public.chat_enviar(
  p_liga uuid,
  p_texto text,
  p_menciones uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_publica boolean;
  v_texto text;
  v_baneo record;
  v_max integer := public.chat_cfg('chat_max_caracteres', 300)::integer;
  v_entre numeric := public.chat_cfg('chat_segundos_entre_mensajes', 2);
  v_por_minuto integer := public.chat_cfg('chat_max_por_minuto', 10)::integer;
  v_nivel_min integer := public.chat_cfg('chat_nivel_minimo_publico', 1)::integer;
  v_ultimo timestamptz;
  v_en_minuto integer;
  v_ids uuid[];
  v_validos uuid[];
  v_id bigint;
  v_creado timestamptz;
  v_vetadas jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;
  if not public.chat_es_miembro(p_liga) then
    return jsonb_build_object('ok', false, 'codigo', 'no_miembro');
  end if;
  v_publica := public.es_liga_publica(p_liga);

  select * into v_baneo from public.chat_baneo_activo(v_uid, p_liga);
  if v_baneo.hasta is not null then
    return jsonb_build_object('ok', false, 'codigo', 'bloqueado', 'hasta', v_baneo.hasta, 'motivo', v_baneo.motivo);
  end if;

  if v_publica and public.nivel_de_xp(coalesce((select xp from xp_usuarios where user_id = v_uid), 0)) < v_nivel_min then
    return jsonb_build_object('ok', false, 'codigo', 'nivel', 'nivel_minimo', v_nivel_min);
  end if;

  -- Limpieza: sin caracteres de control ni invisibles (dirección de texto, ancho
  -- cero...), espacios y saltos de línea colapsados en un solo espacio.
  v_texto := regexp_replace(
    coalesce(p_texto, ''),
    '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤⁦-⁩﻿]',
    '', 'g');
  v_texto := btrim(regexp_replace(v_texto, '\s+', ' ', 'g'));

  if char_length(v_texto) = 0 then
    return jsonb_build_object('ok', false, 'codigo', 'vacia');
  end if;
  if char_length(v_texto) > v_max then
    return jsonb_build_object('ok', false, 'codigo', 'larga', 'maximo', v_max);
  end if;

  -- Solo texto: fuera enlaces, direcciones web, correos y teléfonos.
  if v_texto ~* '(https?://|www\.|\S@\S+\.[a-z]{2,}|\m[a-z0-9-]+\.(com|es|eus|net|org|io|me|ly|gg|tv|xyz|info|co|app|link|ru|cn)\M)'
     or v_texto ~ '(\d[ .\-]?){9,}' then
    return jsonb_build_object('ok', false, 'codigo', 'enlace');
  end if;

  select valor into v_vetadas from game_config where clave = 'chat_palabras_vetadas';
  if v_vetadas is not null and jsonb_typeof(v_vetadas) = 'array' and exists (
    select 1 from jsonb_array_elements_text(v_vetadas) w
    where char_length(w) > 1 and position(lower(w) in lower(v_texto)) > 0
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'vetada');
  end if;

  -- Antispam.
  select max(created_at), count(*) filter (where created_at > now() - interval '1 minute')
  into v_ultimo, v_en_minuto
  from chat_mensajes
  where user_id = v_uid and created_at > now() - interval '1 minute';

  if v_ultimo is not null and extract(epoch from (now() - v_ultimo)) < v_entre then
    return jsonb_build_object('ok', false, 'codigo', 'rapido');
  end if;
  if coalesce(v_en_minuto, 0) >= v_por_minuto then
    return jsonb_build_object('ok', false, 'codigo', 'limite');
  end if;
  if exists (
    select 1 from chat_mensajes
    where user_id = v_uid and created_at > now() - interval '60 seconds' and lower(texto) = lower(v_texto)
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'repetido');
  end if;

  -- Menciones: como mucho 3; se descartan quienes no son de la liga, uno mismo y,
  -- en la pública, quienes la tienen silenciada.
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_menciones, '{}')) x;
  if coalesce(array_length(v_ids, 1), 0) > 3 then
    return jsonb_build_object('ok', false, 'codigo', 'menciones');
  end if;
  select coalesce(array_agg(ft.owner_id), '{}') into v_validos
  from fantasy_teams ft
  join profiles p on p.id = ft.owner_id
  where ft.league_id = p_liga
    and ft.owner_id = any (v_ids)
    and ft.owner_id <> v_uid
    and not (v_publica and p.chat_publico_silenciado);

  insert into chat_mensajes (league_id, user_id, texto, menciones)
  values (p_liga, v_uid, v_texto, v_validos)
  returning id, created_at into v_id, v_creado;

  -- Lo propio no cuenta como no leído.
  insert into chat_lecturas (user_id, league_id, ultimo_id)
  values (v_uid, p_liga, v_id)
  on conflict (user_id, league_id)
  do update set ultimo_id = greatest(chat_lecturas.ultimo_id, excluded.ultimo_id);

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'created_at', v_creado,
    'texto', v_texto,
    'menciones', to_jsonb(v_validos),
    'menciones_ignoradas', coalesce(array_length(v_ids, 1), 0) - coalesce(array_length(v_validos, 1), 0)
  );
end;
$$;

-- 6) Leer ------------------------------------------------------------------------------
-- Página de mensajes anteriores a p_antes (o los más recientes si es null), de
-- más nuevo a más viejo. El cliente los da la vuelta para pintarlos.
create or replace function public.chat_leer(p_liga uuid, p_antes bigint default null, p_limite integer default 40)
returns table (
  id bigint,
  user_id uuid,
  nombre text,
  xp integer,
  avatar text,
  texto text,
  menciones uuid[],
  menciones_nombres text[],
  created_at timestamptz
)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.chat_puede_leer(p_liga) then
    return;
  end if;

  return query
  select m.id, m.user_id, p.nombre, coalesce(x.xp, 0), p.avatar, m.texto, m.menciones,
         array(select pm.nombre from profiles pm where pm.id = any (m.menciones)),
         m.created_at
  from chat_mensajes m
  join profiles p on p.id = m.user_id
  left join xp_usuarios x on x.user_id = m.user_id
  where m.league_id = p_liga
    and (p_antes is null or m.id < p_antes)
  order by m.id desc
  limit least(greatest(coalesce(p_limite, 40), 1), 100);
end;
$$;

-- Lo posterior a p_desde, de más viejo a más nuevo. Es la llamada barata del
-- sondeo: casi siempre devuelve 0 filas.
create or replace function public.chat_nuevos(p_liga uuid, p_desde bigint)
returns table (
  id bigint,
  user_id uuid,
  nombre text,
  xp integer,
  avatar text,
  texto text,
  menciones uuid[],
  menciones_nombres text[],
  created_at timestamptz
)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.chat_puede_leer(p_liga) then
    return;
  end if;

  return query
  select m.id, m.user_id, p.nombre, coalesce(x.xp, 0), p.avatar, m.texto, m.menciones,
         array(select pm.nombre from profiles pm where pm.id = any (m.menciones)),
         m.created_at
  from chat_mensajes m
  join profiles p on p.id = m.user_id
  left join xp_usuarios x on x.user_id = m.user_id
  where m.league_id = p_liga
    and m.id > coalesce(p_desde, 0)
  order by m.id asc
  limit 100;
end;
$$;

-- 7) Contadores y lectura ----------------------------------------------------------------
-- No leídos y menciones sin leer en una liga (con tope de 100). La primera vez que
-- se llama para una liga se fija el punto de partida en el último mensaje, para que
-- el contador no arranque con meses de historial.
create or replace function public.chat_resumen(p_liga uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ultimo bigint;
  v_max bigint;
  v_no_leidos integer;
  v_menciones integer;
begin
  if not public.chat_puede_leer(p_liga) then
    return jsonb_build_object('no_leidos', 0, 'menciones', 0, 'ultimo_id', 0);
  end if;

  select coalesce(max(id), 0) into v_max from chat_mensajes where league_id = p_liga;

  insert into chat_lecturas (user_id, league_id, ultimo_id)
  values (v_uid, p_liga, v_max)
  on conflict (user_id, league_id) do nothing;

  select ultimo_id into v_ultimo from chat_lecturas where user_id = v_uid and league_id = p_liga;

  select count(*) into v_no_leidos from (
    select 1 from chat_mensajes
    where league_id = p_liga and id > v_ultimo and user_id <> v_uid
    limit 100
  ) s;

  select count(*) into v_menciones from (
    select 1 from chat_mensajes
    where league_id = p_liga and id > v_ultimo and v_uid = any (menciones)
    limit 100
  ) s;

  -- Con el chat público silenciado no cuentan menciones.
  if public.es_liga_publica(p_liga)
     and coalesce((select chat_publico_silenciado from profiles where id = v_uid), false) then
    v_menciones := 0;
  end if;

  return jsonb_build_object('no_leidos', v_no_leidos, 'menciones', v_menciones, 'ultimo_id', v_max);
end;
$$;

create or replace function public.chat_marcar_leido(p_liga uuid, p_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.chat_puede_leer(p_liga) then
    return;
  end if;
  insert into chat_lecturas (user_id, league_id, ultimo_id)
  values (auth.uid(), p_liga, coalesce(p_id, 0))
  on conflict (user_id, league_id)
  do update set ultimo_id = greatest(chat_lecturas.ultimo_id, excluded.ultimo_id);
end;
$$;

-- 8) Preferencias ----------------------------------------------------------------------
create or replace function public.chat_silenciar_publico(p_silenciar boolean)
returns void
language sql
security definer set search_path = public
as $$
  update profiles set chat_publico_silenciado = coalesce(p_silenciar, false) where id = auth.uid();
$$;

create or replace function public.chat_marcar_normas_vistas()
returns void
language sql
security definer set search_path = public
as $$
  update profiles set chat_normas_vistas = true where id = auth.uid();
$$;

-- 9) A quién mencionar -----------------------------------------------------------------
-- Alias que empiezan por p_prefijo y pertenecen a la liga. En la pública exige al
-- menos 1 carácter (no se lista a toda la liga) y se excluye a quien la silencia.
create or replace function public.chat_buscar_managers(p_liga uuid, p_prefijo text)
returns table (user_id uuid, nombre text, xp integer, avatar text)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_pref text := lower(btrim(coalesce(p_prefijo, '')));
  v_publica boolean := public.es_liga_publica(p_liga);
begin
  if not public.chat_puede_leer(p_liga) then
    return;
  end if;
  if v_publica and char_length(v_pref) = 0 then
    return;
  end if;
  -- Escapa los comodines de LIKE.
  v_pref := replace(replace(replace(v_pref, '\', '\\'), '%', '\%'), '_', '\_');

  return query
  select p.id, p.nombre, coalesce(x.xp, 0), p.avatar
  from profiles p
  left join xp_usuarios x on x.user_id = p.id
  where lower(p.nombre) like v_pref || '%'
    and p.id <> auth.uid()
    and not (v_publica and p.chat_publico_silenciado)
    and exists (select 1 from fantasy_teams ft where ft.owner_id = p.id and ft.league_id = p_liga)
  order by lower(p.nombre)
  limit case when v_publica then 6 else 12 end;
end;
$$;

-- 10) Borrar ----------------------------------------------------------------------------
-- El autor, root, o el creador de una liga privada en su liga. Si lo borra otra
-- persona, las denuncias pendientes de ese mensaje se dan por aceptadas.
create or replace function public.chat_borrar(p_id bigint)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_m record;
  v_creador boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;

  select league_id, user_id into v_m from chat_mensajes where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;

  v_creador := not public.es_liga_publica(v_m.league_id)
    and exists (select 1 from leagues where id = v_m.league_id and creado_por = v_uid);

  if v_m.user_id <> v_uid and not public.es_root() and not v_creador then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;

  delete from chat_mensajes where id = p_id;

  if v_m.user_id <> v_uid then
    update chat_denuncias
    set estado = 'aceptada', resuelta_en = now(), resuelta_por = v_uid
    where mensaje_id = p_id and estado = 'pendiente';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- 11) Denunciar -------------------------------------------------------------------------
-- Códigos: sesion, no_existe, no_miembro, propio, repetida, limite.
create or replace function public.chat_denunciar(p_id bigint)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_m record;
  v_max integer := public.chat_cfg('chat_max_denuncias_dia', 3)::integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;

  select league_id, user_id, texto into v_m from chat_mensajes where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  if not public.chat_es_miembro(v_m.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'no_miembro');
  end if;
  if v_m.user_id = v_uid then
    return jsonb_build_object('ok', false, 'codigo', 'propio');
  end if;
  if exists (select 1 from chat_denuncias where mensaje_id = p_id and denunciante_id = v_uid) then
    return jsonb_build_object('ok', false, 'codigo', 'repetida');
  end if;
  if (select count(*) from chat_denuncias
      where denunciante_id = v_uid and created_at > now() - interval '24 hours') >= v_max then
    return jsonb_build_object('ok', false, 'codigo', 'limite', 'maximo', v_max);
  end if;

  insert into chat_denuncias (mensaje_id, league_id, autor_id, denunciante_id, texto)
  values (p_id, v_m.league_id, v_m.user_id, v_uid, v_m.texto);

  return jsonb_build_object('ok', true);
end;
$$;

-- 12) Administración (solo root) ---------------------------------------------------------
create or replace function public.chat_denuncias_admin()
returns table (
  id bigint,
  mensaje_id bigint,
  league_id uuid,
  liga_nombre text,
  liga_publica boolean,
  autor_id uuid,
  autor_nombre text,
  denunciante_id uuid,
  denunciante_nombre text,
  texto text,
  created_at timestamptz,
  estado text,
  resuelta_en timestamptz,
  mensaje_existe boolean,
  autor_baneado_hasta timestamptz,
  rechazadas_denunciante integer
)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.es_root() then
    raise exception 'Solo el administrador puede ver las denuncias.';
  end if;

  return query
  select d.id, d.mensaje_id, d.league_id, l.nombre, (l.tipo = 'publica'),
         d.autor_id, pa.nombre, d.denunciante_id, pd.nombre, d.texto, d.created_at,
         d.estado, d.resuelta_en,
         exists (select 1 from chat_mensajes m where m.id = d.mensaje_id),
         (select max(b.hasta) from chat_bloqueos b
           where b.user_id = d.autor_id and b.league_id = d.league_id and b.hasta > now()),
         (select count(*)::integer from chat_denuncias r
           where r.denunciante_id = d.denunciante_id and r.estado = 'rechazada'
             and r.created_at > now() - interval '30 days')
  from chat_denuncias d
  join leagues l on l.id = d.league_id
  left join profiles pa on pa.id = d.autor_id
  left join profiles pd on pd.id = d.denunciante_id
  order by (d.estado = 'pendiente') desc, d.created_at desc
  limit 200;
end;
$$;

create or replace function public.chat_denuncias_pendientes()
returns integer
language sql
stable
security definer set search_path = public
as $$
  select case when public.es_root()
    then (select count(*)::integer from chat_denuncias where estado = 'pendiente')
    else 0 end;
$$;

-- Aceptar (borra el mensaje y, si se indica, banea al autor en ese chat) o
-- rechazar. p_ban_horas null o 0 = sin baneo.
create or replace function public.chat_resolver_denuncia(
  p_id bigint,
  p_aceptar boolean,
  p_ban_horas integer default null,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_d record;
  v_motivo text := nullif(left(btrim(coalesce(p_motivo, '')), 300), '');
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;

  select * into v_d from chat_denuncias where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;

  if p_aceptar then
    delete from chat_mensajes where id = v_d.mensaje_id;
    if coalesce(p_ban_horas, 0) > 0 then
      insert into chat_bloqueos (user_id, league_id, hasta, motivo, puesto_por)
      values (v_d.autor_id, v_d.league_id, now() + make_interval(hours => least(p_ban_horas, 8760)), v_motivo, v_uid);
    end if;
  end if;

  update chat_denuncias
  set estado = case when p_aceptar then 'aceptada' else 'rechazada' end,
      resuelta_en = now(), resuelta_por = v_uid
  where id = p_id;

  -- Otras denuncias pendientes del mismo mensaje se resuelven igual.
  update chat_denuncias
  set estado = case when p_aceptar then 'aceptada' else 'rechazada' end,
      resuelta_en = now(), resuelta_por = v_uid
  where mensaje_id = v_d.mensaje_id and estado = 'pendiente' and id <> p_id and p_aceptar;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.chat_banear(p_user uuid, p_liga uuid, p_horas integer, p_motivo text default null)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;
  if p_user is null or p_liga is null or coalesce(p_horas, 0) <= 0 then
    return jsonb_build_object('ok', false, 'codigo', 'datos');
  end if;
  if p_user = auth.uid() then
    return jsonb_build_object('ok', false, 'codigo', 'propio');
  end if;

  insert into chat_bloqueos (user_id, league_id, hasta, motivo, puesto_por)
  values (p_user, p_liga, now() + make_interval(hours => least(p_horas, 8760)),
          nullif(left(btrim(coalesce(p_motivo, '')), 300), ''), auth.uid());
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.chat_desbanear(p_user uuid, p_liga uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;
  update chat_bloqueos set hasta = now() where user_id = p_user and league_id = p_liga and hasta > now();
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.chat_bloqueos_admin()
returns table (
  user_id uuid,
  nombre text,
  league_id uuid,
  liga_nombre text,
  hasta timestamptz,
  motivo text
)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.es_root() then
    raise exception 'Solo el administrador puede ver los baneos.';
  end if;
  return query
  select b.user_id, p.nombre, b.league_id, l.nombre, max(b.hasta), (array_agg(b.motivo order by b.hasta desc))[1]
  from chat_bloqueos b
  left join profiles p on p.id = b.user_id
  join leagues l on l.id = b.league_id
  where b.hasta > now()
  group by b.user_id, p.nombre, b.league_id, l.nombre
  order by max(b.hasta) desc;
end;
$$;

-- 13) Borrado por antigüedad -----------------------------------------------------------
-- Borra en lotes de 5.000 (hasta 20 lotes por llamada) los mensajes con más de
-- 'chat_dias_conservacion' días, las denuncias resueltas hace más de
-- 'chat_dias_denuncias' días y los baneos caducados hace más de 90 días.
create or replace function public.chat_purgar()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_dias integer := greatest(public.chat_cfg('chat_dias_conservacion', 90)::integer, 1);
  v_dias_den integer := greatest(public.chat_cfg('chat_dias_denuncias', 365)::integer, 1);
  v_lote integer;
  v_mensajes integer := 0;
  v_denuncias integer;
  v_bloqueos integer;
  v_vueltas integer := 0;
begin
  loop
    delete from chat_mensajes
    where id in (
      select id from chat_mensajes
      where created_at < now() - make_interval(days => v_dias)
      limit 5000
    );
    get diagnostics v_lote = row_count;
    v_mensajes := v_mensajes + v_lote;
    v_vueltas := v_vueltas + 1;
    exit when v_lote < 5000 or v_vueltas >= 20;
  end loop;

  delete from chat_denuncias
  where estado <> 'pendiente' and resuelta_en < now() - make_interval(days => v_dias_den);
  get diagnostics v_denuncias = row_count;

  delete from chat_bloqueos where hasta < now() - interval '90 days';
  get diagnostics v_bloqueos = row_count;

  return jsonb_build_object('mensajes', v_mensajes, 'denuncias', v_denuncias, 'bloqueos', v_bloqueos);
end;
$$;

-- 14) Permisos -------------------------------------------------------------------------
-- Ayudas internas: nadie las llama desde el navegador.
revoke all on function public.chat_cfg(text, numeric) from public, anon, authenticated;
revoke all on function public.chat_puede_leer(uuid) from public, anon, authenticated;
revoke all on function public.chat_es_miembro(uuid) from public, anon, authenticated;
revoke all on function public.chat_baneo_activo(uuid, uuid) from public, anon, authenticated;

-- Funciones para la web.
revoke all on function public.chat_estado(uuid) from public, anon;
revoke all on function public.chat_enviar(uuid, text, uuid[]) from public, anon;
revoke all on function public.chat_leer(uuid, bigint, integer) from public, anon;
revoke all on function public.chat_nuevos(uuid, bigint) from public, anon;
revoke all on function public.chat_resumen(uuid) from public, anon;
revoke all on function public.chat_marcar_leido(uuid, bigint) from public, anon;
revoke all on function public.chat_silenciar_publico(boolean) from public, anon;
revoke all on function public.chat_marcar_normas_vistas() from public, anon;
revoke all on function public.chat_buscar_managers(uuid, text) from public, anon;
revoke all on function public.chat_borrar(bigint) from public, anon;
revoke all on function public.chat_denunciar(bigint) from public, anon;
revoke all on function public.chat_denuncias_admin() from public, anon;
revoke all on function public.chat_denuncias_pendientes() from public, anon;
revoke all on function public.chat_resolver_denuncia(bigint, boolean, integer, text) from public, anon;
revoke all on function public.chat_banear(uuid, uuid, integer, text) from public, anon;
revoke all on function public.chat_desbanear(uuid, uuid) from public, anon;
revoke all on function public.chat_bloqueos_admin() from public, anon;

grant execute on function public.chat_estado(uuid) to authenticated;
grant execute on function public.chat_enviar(uuid, text, uuid[]) to authenticated;
grant execute on function public.chat_leer(uuid, bigint, integer) to authenticated;
grant execute on function public.chat_nuevos(uuid, bigint) to authenticated;
grant execute on function public.chat_resumen(uuid) to authenticated;
grant execute on function public.chat_marcar_leido(uuid, bigint) to authenticated;
grant execute on function public.chat_silenciar_publico(boolean) to authenticated;
grant execute on function public.chat_marcar_normas_vistas() to authenticated;
grant execute on function public.chat_buscar_managers(uuid, text) to authenticated;
grant execute on function public.chat_borrar(bigint) to authenticated;
grant execute on function public.chat_denunciar(bigint) to authenticated;
grant execute on function public.chat_denuncias_admin() to authenticated;
grant execute on function public.chat_denuncias_pendientes() to authenticated;
grant execute on function public.chat_resolver_denuncia(bigint, boolean, integer, text) to authenticated;
grant execute on function public.chat_banear(uuid, uuid, integer, text) to authenticated;
grant execute on function public.chat_desbanear(uuid, uuid) to authenticated;
grant execute on function public.chat_bloqueos_admin() to authenticated;

-- El borrado automático solo lo ejecuta el cron (o la service role).
revoke all on function public.chat_purgar() from public, anon, authenticated;
grant execute on function public.chat_purgar() to service_role;

-- 15) Cron del borrado (NO lo programa esta migración) ---------------------------------
-- Actívalo a mano en Supabase (SQL Editor) una vez aplicada la migración:
--
--   select cron.schedule('chat-purgar', '17 3 * * *', $$select public.chat_purgar()$$);
--
-- Para comprobarlo o quitarlo:
--   select * from cron.job where jobname = 'chat-purgar';
--   select cron.unschedule('chat-purgar');
--
-- Para cambiar cuántos días se conservan (por ejemplo, a 60):
--   update game_config set valor = '60'::jsonb where clave = 'chat_dias_conservacion';
-- Hay que cambiar a la vez el número de días que dicen las Condiciones de Uso y la
-- Política de Privacidad (lib/legal/condiciones.ts y privacidad.ts).
