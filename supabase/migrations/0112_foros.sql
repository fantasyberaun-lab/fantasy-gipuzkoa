-- 0112: foros (temas y respuestas) dentro de la pestaña Chat, reacciones con emoji
-- (en foros y en el chat), encuestas dentro de un tema, hilos automáticos por jornada
-- y avisos de menciones y respuestas.
--
-- REQUIERE 0089, 0090 y 0091 (chat) ya aplicadas. Es ADITIVA: no modifica ninguna
-- tabla ni función del chat, salvo dos cambios mínimos y explicados:
--   * chat_denunciar(): el tope de denuncias al día cuenta también las de foros
--     (un solo tope compartido). Es la única línea que cambia respecto a 0089.
--   * notificaciones_tipo_check: se añaden 'foro_mencion' y 'foro_respuesta' a la
--     lista de 0101.
--
-- Qué hace
--   - Cada liga tiene su foro (como su chat: privada = sus miembros, pública = quienes
--     juegan en ella; root lee todos). Un tema tiene título (5-80), categoría, primer
--     mensaje (hasta 600) y respuestas planas (hasta 300) con cita opcional.
--   - Fijar (máx. 3 por liga) y cerrar/reabrir: root y el administrador de una liga
--     privada. El autor también puede cerrar su tema. Borrar: el autor lo suyo, root y
--     el administrador de la privada cualquier mensaje.
--   - Moderación reutilizada: el baneo de chat_bloqueos vale para chat y foros, las
--     denuncias de foro van a su tabla (foro_denuncias) y aparecen en el mismo panel
--     de admin, y el tope diario de denuncias es compartido.
--   - Reacciones: 👍 🔥 😂 👏 ♟️, una por persona y mensaje (foro y chat).
--   - Encuestas: 2-5 opciones, voto único (no se cambia), cierre manual o a fecha.
--     El voto es SECRETO: foro_votos no se puede leer desde el navegador y la web
--     solo recibe totales. Los resultados se ven tras votar o al cerrarse.
--   - Hilos automáticos: al cerrarse una jornada (insert en jornadas_cerradas) se abre
--     «Jornada N: comentarios» fijado en cada liga pública activa. Se apaga con
--     game_config 'foro_hilos_automaticos' = 0. El trigger NUNCA puede romper el cierre
--     de jornada: si falla, solo emite un aviso.
--   - Avisos: una mención, una respuesta a tu tema o a tu cita crean un aviso en
--     «Avisos» (notificaciones) y cuentan en el globo de Foros. Las respuestas no se
--     acumulan: no hay otro aviso de respuesta mientras tengas uno sin ver en ese tema.
--   - Se borra solo: foro_purgar() borra los temas sin actividad en
--     'foro_dias_conservacion' días (90), salvo los fijados.
--
-- Seguridad: RLS activada en todas las tablas y SIN políticas (igual que el chat):
-- todo pasa por funciones security definer que comprueban sesión, liga, baneo, nivel y
-- límites.
--
-- Impacto en datos existentes: ninguno. Crea tablas y funciones nuevas y una columna
-- con valor por defecto en profiles. Aplicar con `supabase db push` (o pegar entera en
-- el SQL Editor) antes de desplegar la web: la web actual no la usa. El cron de purga
-- va comentado al final (se activa a mano).

-- 1) Configuración ---------------------------------------------------------------------
insert into game_config (clave, valor) values
  ('foro_titulo_min', '5'::jsonb),
  ('foro_titulo_max', '80'::jsonb),
  ('foro_max_caracteres_inicial', '600'::jsonb),
  ('foro_max_caracteres', '300'::jsonb),
  ('foro_max_temas_dia', '2'::jsonb),
  ('foro_segundos_entre_respuestas', '5'::jsonb),
  ('foro_max_respuestas_minuto', '10'::jsonb),
  ('foro_max_fijados', '3'::jsonb),
  ('foro_dias_conservacion', '90'::jsonb),
  ('foro_hilos_automaticos', '1'::jsonb),
  ('foro_max_reacciones_minuto', '30'::jsonb)
on conflict (clave) do nothing;

alter table public.profiles
  add column if not exists foro_normas_vistas boolean not null default false;

-- 2) Tablas ------------------------------------------------------------------------------
create table if not exists public.foro_temas (
  id bigint generated always as identity primary key,
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade, -- null = tema del sistema
  titulo text check (titulo is null or char_length(titulo) between 1 and 200),
  categoria text not null default 'otros'
    check (categoria in ('mercado', 'torneos', 'estrategia', 'propuestas', 'otros')),
  tipo text not null default 'manual' check (tipo in ('manual', 'sistema')),
  clave_sistema text, -- p. ej. 'jornada:2026-10-24'; evita duplicar el hilo automático
  datos jsonb not null default '{}'::jsonb,
  estado text not null default 'abierto' check (estado in ('abierto', 'cerrado')),
  fijado boolean not null default false,
  eliminado boolean not null default false,
  n_respuestas integer not null default 0,
  ultimo_msg_id bigint not null default 0,
  ultima_actividad timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists foro_temas_lista_idx
  on public.foro_temas (league_id, fijado desc, ultima_actividad desc);
create index if not exists foro_temas_nuevos_idx on public.foro_temas (league_id, id desc);
create index if not exists foro_temas_actividad_idx on public.foro_temas (ultima_actividad) where not fijado;
create index if not exists foro_temas_usuario_idx on public.foro_temas (user_id, created_at desc);
create unique index if not exists foro_temas_sistema_uidx
  on public.foro_temas (league_id, clave_sistema) where clave_sistema is not null;

create table if not exists public.foro_mensajes (
  id bigint generated always as identity primary key,
  tema_id bigint not null references public.foro_temas (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade, -- null = mensaje del sistema
  texto text not null check (char_length(texto) <= 1000),
  menciones uuid[] not null default '{}',
  cita_id bigint, -- sin clave foránea: la citada puede haberse borrado
  es_inicial boolean not null default false,
  created_at timestamptz not null default now(),
  editado_en timestamptz
);

create index if not exists foro_mensajes_tema_idx on public.foro_mensajes (tema_id, id);
create index if not exists foro_mensajes_usuario_idx on public.foro_mensajes (user_id, created_at desc);

-- Hasta dónde has leído cada tema. 'sigue' = lo has creado, respondido, o te han
-- mencionado o citado: esos temas cuentan en el globo de Foros.
create table if not exists public.foro_lecturas (
  user_id uuid not null references auth.users (id) on delete cascade,
  tema_id bigint not null references public.foro_temas (id) on delete cascade,
  ultimo_id bigint not null default 0,
  sigue boolean not null default false,
  primary key (user_id, tema_id)
);

create index if not exists foro_lecturas_sigue_idx on public.foro_lecturas (user_id) where sigue;

create table if not exists public.foro_reacciones (
  mensaje_id bigint not null references public.foro_mensajes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '🔥', '😂', '👏', '♟️')),
  created_at timestamptz not null default now(),
  primary key (mensaje_id, user_id)
);

create index if not exists foro_reacciones_usuario_idx on public.foro_reacciones (user_id, created_at desc);

create table if not exists public.chat_reacciones (
  mensaje_id bigint not null references public.chat_mensajes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '🔥', '😂', '👏', '♟️')),
  created_at timestamptz not null default now(),
  primary key (mensaje_id, user_id)
);

create index if not exists chat_reacciones_usuario_idx on public.chat_reacciones (user_id, created_at desc);

-- Encuesta de un tema (una como mucho; la pregunta es el título del tema).
create table if not exists public.foro_encuestas (
  tema_id bigint primary key references public.foro_temas (id) on delete cascade,
  cierra_en timestamptz,
  cerrada boolean not null default false
);

create table if not exists public.foro_opciones (
  id bigint generated always as identity primary key,
  tema_id bigint not null references public.foro_temas (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 60),
  orden smallint not null
);

create index if not exists foro_opciones_tema_idx on public.foro_opciones (tema_id, orden);

-- Voto secreto: una fila por persona y encuesta. Nadie la lee desde el navegador.
create table if not exists public.foro_votos (
  tema_id bigint not null references public.foro_temas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  opcion_id bigint not null references public.foro_opciones (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tema_id, user_id)
);

create index if not exists foro_votos_opcion_idx on public.foro_votos (opcion_id);

create table if not exists public.foro_denuncias (
  id bigint generated always as identity primary key,
  mensaje_id bigint not null, -- sin clave foránea: puede haberse borrado
  tema_id bigint not null,
  titulo_tema text,
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

create index if not exists foro_denuncias_estado_idx on public.foro_denuncias (estado, created_at desc);
create index if not exists foro_denuncias_denunciante_idx on public.foro_denuncias (denunciante_id, created_at desc);

alter table public.foro_temas enable row level security;
alter table public.foro_mensajes enable row level security;
alter table public.foro_lecturas enable row level security;
alter table public.foro_reacciones enable row level security;
alter table public.chat_reacciones enable row level security;
alter table public.foro_encuestas enable row level security;
alter table public.foro_opciones enable row level security;
alter table public.foro_votos enable row level security;
alter table public.foro_denuncias enable row level security;

revoke all on public.foro_temas from anon, authenticated;
revoke all on public.foro_mensajes from anon, authenticated;
revoke all on public.foro_lecturas from anon, authenticated;
revoke all on public.foro_reacciones from anon, authenticated;
revoke all on public.chat_reacciones from anon, authenticated;
revoke all on public.foro_encuestas from anon, authenticated;
revoke all on public.foro_opciones from anon, authenticated;
revoke all on public.foro_votos from anon, authenticated;
revoke all on public.foro_denuncias from anon, authenticated;

-- Al borrarse una respuesta (a mano, por denuncia o al borrar una cuenta) baja el contador.
create or replace function public.foro_mensaje_borrado()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not old.es_inicial then
    update foro_temas set n_respuestas = greatest(n_respuestas - 1, 0) where id = old.tema_id;
  end if;
  return old;
end;
$$;

drop trigger if exists foro_mensaje_borrado_trg on public.foro_mensajes;
create trigger foro_mensaje_borrado_trg
  after delete on public.foro_mensajes
  for each row execute function public.foro_mensaje_borrado();

-- 3) Ayudas internas (no se llaman desde el navegador) -------------------------------------

-- ¿Puede moderar el foro de esta liga? Root, o el administrador de una liga privada.
create or replace function public.foro_es_mod(p_liga uuid)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v boolean;
begin
  if auth.uid() is null or p_liga is null then
    return false;
  end if;
  if public.es_root() then
    return true;
  end if;
  if public.es_liga_publica(p_liga) then
    return false;
  end if;
  -- 0100 (administrador de liga) si está aplicada; si no, el creador.
  if to_regprocedure('public.es_admin_liga(uuid)') is not null then
    execute 'select public.es_admin_liga($1)' into v using p_liga;
    return coalesce(v, false);
  end if;
  return exists (
    select 1 from leagues l
    where l.id = p_liga and l.creado_por = auth.uid()
      and exists (select 1 from fantasy_teams ft where ft.league_id = l.id and ft.owner_id = auth.uid())
  );
end;
$$;

-- Misma limpieza y filtros que chat_enviar: sin caracteres invisibles, espacios
-- colapsados, longitud, sin enlaces / correos / teléfonos, palabras vetadas.
create or replace function public.foro_limpiar(p_texto text, p_max integer)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_texto text;
  v_vetadas jsonb;
begin
  v_texto := regexp_replace(
    coalesce(p_texto, ''),
    '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤⁦-⁩﻿]',
    '', 'g');
  v_texto := btrim(regexp_replace(v_texto, '\s+', ' ', 'g'));

  if char_length(v_texto) = 0 then
    return jsonb_build_object('ok', false, 'codigo', 'vacia');
  end if;
  if char_length(v_texto) > p_max then
    return jsonb_build_object('ok', false, 'codigo', 'larga', 'maximo', p_max);
  end if;
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

  return jsonb_build_object('ok', true, 'texto', v_texto);
end;
$$;

-- Menciones válidas: miembros de la liga, no uno mismo y, en la pública, quien no la
-- tiene silenciada.
create or replace function public.foro_menciones_validas(p_liga uuid, p_ids uuid[], p_publica boolean)
returns uuid[]
language sql
stable
security definer set search_path = public
as $$
  select coalesce(array_agg(ft.owner_id), '{}')
  from fantasy_teams ft
  join profiles p on p.id = ft.owner_id
  where ft.league_id = p_liga
    and ft.owner_id = any (p_ids)
    and ft.owner_id <> auth.uid()
    and not (p_publica and p.chat_publico_silenciado);
$$;

-- Crea un aviso en «Avisos» para cada persona de p_destinos (una fila por equipo en esa
-- liga). Las respuestas no se acumulan: no se crea otra mientras haya una sin ver en ese
-- tema. Las menciones siempre avisan.
create or replace function public.foro_avisar(
  p_liga uuid,
  p_tema bigint,
  p_msg bigint,
  p_titulo text,
  p_tipo text,
  p_destinos uuid[]
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_actor uuid;
  r record;
begin
  if p_destinos is null or coalesce(array_length(p_destinos, 1), 0) = 0 then
    return;
  end if;
  select id into v_actor from fantasy_teams where league_id = p_liga and owner_id = auth.uid() limit 1;

  for r in
    select ft.id as equipo_id, ft.notificaciones_vistas_en
    from fantasy_teams ft
    where ft.league_id = p_liga and ft.owner_id = any (p_destinos) and ft.owner_id <> auth.uid()
  loop
    if p_tipo = 'foro_respuesta' and exists (
      select 1 from notificaciones n
      where n.objetivo_team_id = r.equipo_id
        and n.tipo in ('foro_respuesta', 'foro_mencion')
        and n.datos ->> 'tema_id' = p_tema::text
        and n.created_at > r.notificaciones_vistas_en
    ) then
      continue;
    end if;
    insert into notificaciones (league_id, tipo, actor_team_id, objetivo_team_id, privada, datos)
    values (
      p_liga, p_tipo, v_actor, r.equipo_id, true,
      jsonb_build_object('tema_id', p_tema, 'mensaje_id', p_msg, 'titulo', left(coalesce(p_titulo, ''), 80))
    );
  end loop;
end;
$$;

-- Marca temas como seguidos (para el globo de Foros) sin retroceder lo leído.
create or replace function public.foro_seguir(p_tema bigint, p_users uuid[], p_hasta_leido bigint)
returns void
language sql
security definer set search_path = public
as $$
  insert into foro_lecturas (user_id, tema_id, ultimo_id, sigue)
  select u, p_tema, coalesce(p_hasta_leido, 0), true from unnest(p_users) u
  on conflict (user_id, tema_id) do update set sigue = true;
$$;

-- 4) Estado del foro para quien lo abre ------------------------------------------------------
create or replace function public.foro_estado(p_liga uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_publica boolean := public.es_liga_publica(p_liga);
  v_perfil record;
  v_baneo record;
  v_xp integer;
  v_nivel_min integer := public.chat_cfg('chat_nivel_minimo_publico', 1)::integer;
  v_mod text := null;
begin
  if not public.chat_puede_leer(p_liga) then
    return jsonb_build_object('ok', false, 'codigo', 'no_miembro');
  end if;

  select foro_normas_vistas, chat_publico_silenciado into v_perfil from profiles where id = v_uid;
  select * into v_baneo from public.chat_baneo_activo(v_uid, p_liga);
  select coalesce(xp, 0) into v_xp from xp_usuarios where user_id = v_uid;

  if public.es_root() then
    v_mod := 'root';
  elsif public.foro_es_mod(p_liga) then
    v_mod := 'admin';
  end if;

  return jsonb_build_object(
    'ok', true,
    'publica', v_publica,
    'miembro', public.chat_es_miembro(p_liga),
    'moderador', v_mod,
    'baneado_hasta', v_baneo.hasta,
    'baneo_motivo', v_baneo.motivo,
    'normas_vistas', coalesce(v_perfil.foro_normas_vistas, false),
    'nivel_ok', not v_publica or public.nivel_de_xp(coalesce(v_xp, 0)) >= v_nivel_min,
    'nivel_minimo', case when v_publica then v_nivel_min else 1 end,
    'titulo_min', public.chat_cfg('foro_titulo_min', 5)::integer,
    'titulo_max', public.chat_cfg('foro_titulo_max', 80)::integer,
    'max_inicial', public.chat_cfg('foro_max_caracteres_inicial', 600)::integer,
    'max_respuesta', public.chat_cfg('foro_max_caracteres', 300)::integer,
    'max_temas_dia', public.chat_cfg('foro_max_temas_dia', 2)::integer,
    'max_denuncias_dia', public.chat_cfg('chat_max_denuncias_dia', 3)::integer,
    'minutos_edicion', greatest(public.chat_cfg('chat_minutos_edicion', 30)::integer, 0)
  );
end;
$$;

create or replace function public.foro_marcar_normas_vistas()
returns void
language sql
security definer set search_path = public
as $$
  update profiles set foro_normas_vistas = true where id = auth.uid();
$$;

-- 5) Lista de temas ---------------------------------------------------------------------------
-- p_filtro: todos | mios | sin_leer | cerrados. p_orden: actividad | nuevos | respuestas |
-- reacciones. Los fijados van siempre arriba. 'nuevos' es null si nunca has abierto ese tema.
create or replace function public.foro_temas(
  p_liga uuid,
  p_filtro text default 'todos',
  p_orden text default 'actividad',
  p_limite integer default 30,
  p_desde integer default 0
)
returns table (
  id bigint,
  titulo text,
  categoria text,
  tipo text,
  clave_sistema text,
  datos jsonb,
  estado text,
  fijado boolean,
  eliminado boolean,
  user_id uuid,
  autor_nombre text,
  autor_avatar text,
  autor_xp integer,
  n_respuestas integer,
  ultima_actividad timestamptz,
  created_at timestamptz,
  tiene_encuesta boolean,
  sigue boolean,
  nuevos integer,
  total_reacciones integer
)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_filtro text := coalesce(p_filtro, 'todos');
  v_orden text := coalesce(p_orden, 'actividad');
begin
  if not public.chat_puede_leer(p_liga) then
    return;
  end if;

  return query
  select t.id, t.titulo, t.categoria, t.tipo, t.clave_sistema, t.datos, t.estado, t.fijado, t.eliminado,
         t.user_id, p.nombre, p.avatar, coalesce(x.xp, 0),
         t.n_respuestas, t.ultima_actividad, t.created_at,
         exists (select 1 from foro_encuestas e where e.tema_id = t.id),
         coalesce(l.sigue, false),
         case when l.user_id is null then null else
           (select count(*)::integer from (
              select 1 from foro_mensajes m
              where m.tema_id = t.id and m.id > l.ultimo_id and m.user_id is distinct from v_uid
              limit 99) s)
         end,
         case when v_orden = 'reacciones' then
           (select count(*)::integer from foro_reacciones r
              join foro_mensajes m on m.id = r.mensaje_id where m.tema_id = t.id)
         else 0 end
  from foro_temas t
  left join profiles p on p.id = t.user_id
  left join xp_usuarios x on x.user_id = t.user_id
  left join foro_lecturas l on l.tema_id = t.id and l.user_id = v_uid
  where t.league_id = p_liga
    and case v_filtro
          when 'cerrados' then t.estado = 'cerrado'
          when 'mios' then t.user_id = v_uid or coalesce(l.sigue, false)
          when 'sin_leer' then l.user_id is not null and t.ultimo_msg_id > l.ultimo_id
          else true
        end
  order by t.fijado desc,
    case when v_orden = 'respuestas' then t.n_respuestas end desc nulls last,
    case when v_orden = 'reacciones' then
      (select count(*) from foro_reacciones r join foro_mensajes m on m.id = r.mensaje_id where m.tema_id = t.id)
    end desc nulls last,
    case when v_orden = 'nuevos' then t.created_at end desc nulls last,
    t.ultima_actividad desc,
    t.id desc
  limit least(greatest(coalesce(p_limite, 30), 1), 60)
  offset greatest(coalesce(p_desde, 0), 0);
end;
$$;

-- 6) Un tema (cabecera, permisos y encuesta) ---------------------------------------------------------
create or replace function public.foro_encuesta_json(p_tema bigint)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_e record;
  v_mi bigint;
  v_cerrada boolean;
  v_visible boolean;
  v_total integer;
begin
  select * into v_e from foro_encuestas where tema_id = p_tema;
  if not found then
    return null;
  end if;
  select opcion_id into v_mi from foro_votos where tema_id = p_tema and user_id = auth.uid();
  v_cerrada := v_e.cerrada or (v_e.cierra_en is not null and v_e.cierra_en <= now());
  v_visible := v_mi is not null or v_cerrada;
  select count(*)::integer into v_total from foro_votos where tema_id = p_tema;

  return jsonb_build_object(
    'cerrada', v_cerrada,
    'cierra_en', v_e.cierra_en,
    'mi_voto', v_mi,
    'visible', v_visible,
    'total', case when v_visible then v_total else null end,
    'opciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'texto', o.texto,
        'votos', case when v_visible then (select count(*) from foro_votos v where v.opcion_id = o.id) else null end
      ) order by o.orden)
      from foro_opciones o where o.tema_id = p_tema
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.foro_tema(p_tema bigint)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  t record;
begin
  select ft.*, p.nombre as autor_nombre into t
  from foro_temas ft left join profiles p on p.id = ft.user_id
  where ft.id = p_tema;
  if not found or not public.chat_puede_leer(t.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', t.id,
    'liga_id', t.league_id,
    'titulo', t.titulo,
    'categoria', t.categoria,
    'tipo', t.tipo,
    'clave_sistema', t.clave_sistema,
    'datos', t.datos,
    'estado', t.estado,
    'fijado', t.fijado,
    'eliminado', t.eliminado,
    'autor_id', t.user_id,
    'autor_nombre', t.autor_nombre,
    'n_respuestas', t.n_respuestas,
    'created_at', t.created_at,
    'encuesta', public.foro_encuesta_json(t.id)
  );
end;
$$;

-- 7) Mensajes de un tema ------------------------------------------------------------------------------
-- p_solo_inicial = true devuelve únicamente el mensaje inicial; si no, las respuestas
-- (de más nuevo a más viejo, el cliente las da la vuelta).
create or replace function public.foro_leer(
  p_tema bigint,
  p_antes bigint default null,
  p_limite integer default 40,
  p_solo_inicial boolean default false
)
returns table (
  id bigint,
  user_id uuid,
  nombre text,
  xp integer,
  avatar text,
  texto text,
  menciones uuid[],
  menciones_nombres text[],
  created_at timestamptz,
  editado_en timestamptz,
  es_inicial boolean,
  cita_id bigint,
  cita_nombre text,
  cita_texto text,
  reacciones jsonb,
  mia text
)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_liga uuid;
begin
  select league_id into v_liga from foro_temas where foro_temas.id = p_tema;
  if v_liga is null or not public.chat_puede_leer(v_liga) then
    return;
  end if;

  return query
  select m.id, m.user_id, p.nombre, coalesce(x.xp, 0), p.avatar, m.texto, m.menciones,
         array(select pm.nombre from profiles pm where pm.id = any (m.menciones)),
         m.created_at, m.editado_en, m.es_inicial,
         c.id, pc.nombre, left(c.texto, 140),
         coalesce((select jsonb_object_agg(g.emoji, g.n)
                   from (select r.emoji, count(*) as n from foro_reacciones r
                         where r.mensaje_id = m.id group by r.emoji) g), '{}'::jsonb),
         (select r.emoji from foro_reacciones r where r.mensaje_id = m.id and r.user_id = auth.uid())
  from foro_mensajes m
  left join profiles p on p.id = m.user_id
  left join xp_usuarios x on x.user_id = m.user_id
  left join foro_mensajes c on c.id = m.cita_id and c.tema_id = m.tema_id
  left join profiles pc on pc.id = c.user_id
  where m.tema_id = p_tema
    and m.es_inicial = coalesce(p_solo_inicial, false)
    and (p_antes is null or m.id < p_antes)
  order by m.id desc
  limit case when coalesce(p_solo_inicial, false) then 1
        else least(greatest(coalesce(p_limite, 40), 1), 100) end;
end;
$$;

-- Lo posterior a p_desde (de más viejo a más nuevo): la llamada barata del sondeo.
create or replace function public.foro_nuevos(p_tema bigint, p_desde bigint)
returns table (
  id bigint,
  user_id uuid,
  nombre text,
  xp integer,
  avatar text,
  texto text,
  menciones uuid[],
  menciones_nombres text[],
  created_at timestamptz,
  editado_en timestamptz,
  es_inicial boolean,
  cita_id bigint,
  cita_nombre text,
  cita_texto text,
  reacciones jsonb,
  mia text
)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_liga uuid;
begin
  select league_id into v_liga from foro_temas where foro_temas.id = p_tema;
  if v_liga is null or not public.chat_puede_leer(v_liga) then
    return;
  end if;

  return query
  select m.id, m.user_id, p.nombre, coalesce(x.xp, 0), p.avatar, m.texto, m.menciones,
         array(select pm.nombre from profiles pm where pm.id = any (m.menciones)),
         m.created_at, m.editado_en, m.es_inicial,
         c.id, pc.nombre, left(c.texto, 140),
         coalesce((select jsonb_object_agg(g.emoji, g.n)
                   from (select r.emoji, count(*) as n from foro_reacciones r
                         where r.mensaje_id = m.id group by r.emoji) g), '{}'::jsonb),
         (select r.emoji from foro_reacciones r where r.mensaje_id = m.id and r.user_id = auth.uid())
  from foro_mensajes m
  left join profiles p on p.id = m.user_id
  left join xp_usuarios x on x.user_id = m.user_id
  left join foro_mensajes c on c.id = m.cita_id and c.tema_id = m.tema_id
  left join profiles pc on pc.id = c.user_id
  where m.tema_id = p_tema
    and not m.es_inicial
    and m.id > coalesce(p_desde, 0)
  order by m.id asc
  limit 100;
end;
$$;

-- 8) Crear un tema --------------------------------------------------------------------------------
-- p_encuesta: null o {"opciones": ["Sí", "No"], "dias": 3} (dias: null, 1, 3 o 7).
-- Códigos: sesion, no_miembro, bloqueado, nivel, titulo_corto, titulo_largo, categoria,
-- vacia, larga, enlace, vetada, limite_dia, repetido, menciones, encuesta.
create or replace function public.foro_crear_tema(
  p_liga uuid,
  p_titulo text,
  p_categoria text,
  p_texto text,
  p_menciones uuid[] default '{}',
  p_encuesta jsonb default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_publica boolean;
  v_baneo record;
  v_nivel_min integer := public.chat_cfg('chat_nivel_minimo_publico', 1)::integer;
  v_tmin integer := public.chat_cfg('foro_titulo_min', 5)::integer;
  v_tmax integer := public.chat_cfg('foro_titulo_max', 80)::integer;
  v_max integer := public.chat_cfg('foro_max_caracteres_inicial', 600)::integer;
  v_dia integer := public.chat_cfg('foro_max_temas_dia', 2)::integer;
  v_t jsonb;
  v_x jsonb;
  v_titulo text;
  v_texto text;
  v_ids uuid[];
  v_validos uuid[];
  v_tema bigint;
  v_msg bigint;
  v_ops text[] := '{}';
  v_op text;
  v_o jsonb;
  v_dias integer;
  v_i integer;
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
  if coalesce(p_categoria, '') not in ('mercado', 'torneos', 'estrategia', 'propuestas', 'otros') then
    return jsonb_build_object('ok', false, 'codigo', 'categoria');
  end if;

  -- Título
  v_t := public.foro_limpiar(p_titulo, 1000);
  if (v_t ->> 'ok')::boolean is not true then
    return v_t;
  end if;
  v_titulo := v_t ->> 'texto';
  if char_length(v_titulo) < v_tmin then
    return jsonb_build_object('ok', false, 'codigo', 'titulo_corto', 'minimo', v_tmin);
  end if;
  if char_length(v_titulo) > v_tmax then
    return jsonb_build_object('ok', false, 'codigo', 'titulo_largo', 'maximo', v_tmax);
  end if;

  -- Primer mensaje
  v_x := public.foro_limpiar(p_texto, v_max);
  if (v_x ->> 'ok')::boolean is not true then
    return v_x;
  end if;
  v_texto := v_x ->> 'texto';

  -- Límites
  if (select count(*) from foro_temas
      where user_id = v_uid and created_at > now() - interval '24 hours') >= v_dia then
    return jsonb_build_object('ok', false, 'codigo', 'limite_dia', 'maximo', v_dia);
  end if;
  if exists (
    select 1 from foro_temas
    where user_id = v_uid and created_at > now() - interval '24 hours' and lower(titulo) = lower(v_titulo)
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'repetido');
  end if;

  -- Menciones
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_menciones, '{}')) x;
  if coalesce(array_length(v_ids, 1), 0) > 3 then
    return jsonb_build_object('ok', false, 'codigo', 'menciones');
  end if;
  v_validos := public.foro_menciones_validas(p_liga, v_ids, v_publica);

  -- Encuesta (se valida antes de escribir nada)
  if p_encuesta is not null and jsonb_typeof(p_encuesta) = 'object' then
    if jsonb_typeof(p_encuesta -> 'opciones') <> 'array' then
      return jsonb_build_object('ok', false, 'codigo', 'encuesta');
    end if;
    for v_o in select * from jsonb_array_elements(p_encuesta -> 'opciones') loop
      if jsonb_typeof(v_o) <> 'string' then
        return jsonb_build_object('ok', false, 'codigo', 'encuesta');
      end if;
      v_t := public.foro_limpiar(v_o #>> '{}', 60);
      if (v_t ->> 'ok')::boolean is not true then
        return jsonb_build_object('ok', false, 'codigo', 'encuesta');
      end if;
      v_op := v_t ->> 'texto';
      if lower(v_op) = any (select lower(z) from unnest(v_ops) z) then
        return jsonb_build_object('ok', false, 'codigo', 'encuesta');
      end if;
      v_ops := v_ops || v_op;
    end loop;
    if coalesce(array_length(v_ops, 1), 0) < 2 or array_length(v_ops, 1) > 5 then
      return jsonb_build_object('ok', false, 'codigo', 'encuesta');
    end if;
    v_dias := nullif(p_encuesta ->> 'dias', '')::integer;
    if v_dias is not null and v_dias not in (1, 3, 7) then
      return jsonb_build_object('ok', false, 'codigo', 'encuesta');
    end if;
  end if;

  insert into foro_temas (league_id, user_id, titulo, categoria)
  values (p_liga, v_uid, v_titulo, p_categoria)
  returning id into v_tema;

  insert into foro_mensajes (tema_id, user_id, texto, menciones, es_inicial)
  values (v_tema, v_uid, v_texto, v_validos, true)
  returning id into v_msg;

  update foro_temas set ultimo_msg_id = v_msg where id = v_tema;

  if coalesce(array_length(v_ops, 1), 0) >= 2 then
    insert into foro_encuestas (tema_id, cierra_en)
    values (v_tema, case when v_dias is null then null else now() + make_interval(days => v_dias) end);
    for v_i in 1 .. array_length(v_ops, 1) loop
      insert into foro_opciones (tema_id, texto, orden) values (v_tema, v_ops[v_i], v_i);
    end loop;
  end if;

  perform public.foro_seguir(v_tema, array[v_uid], v_msg);
  update foro_lecturas set ultimo_id = v_msg where user_id = v_uid and tema_id = v_tema;

  if coalesce(array_length(v_validos, 1), 0) > 0 then
    perform public.foro_seguir(v_tema, v_validos, v_msg - 1);
    perform public.foro_avisar(p_liga, v_tema, v_msg, v_titulo, 'foro_mencion', v_validos);
  end if;

  return jsonb_build_object(
    'ok', true, 'id', v_tema,
    'menciones_ignoradas', coalesce(array_length(v_ids, 1), 0) - coalesce(array_length(v_validos, 1), 0)
  );
end;
$$;

-- 9) Responder ------------------------------------------------------------------------------------------
-- Códigos: sesion, no_existe, no_miembro, bloqueado, nivel, cerrado, vacia, larga, enlace,
-- vetada, rapido, limite, repetido, menciones, cita.
create or replace function public.foro_responder(
  p_tema bigint,
  p_texto text,
  p_menciones uuid[] default '{}',
  p_cita bigint default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  t record;
  v_publica boolean;
  v_baneo record;
  v_nivel_min integer := public.chat_cfg('chat_nivel_minimo_publico', 1)::integer;
  v_max integer := public.chat_cfg('foro_max_caracteres', 300)::integer;
  v_entre numeric := public.chat_cfg('foro_segundos_entre_respuestas', 5);
  v_por_minuto integer := public.chat_cfg('foro_max_respuestas_minuto', 10)::integer;
  v_x jsonb;
  v_texto text;
  v_ultimo timestamptz;
  v_en_minuto integer;
  v_ids uuid[];
  v_validos uuid[];
  v_cita_autor uuid;
  v_msg bigint;
  v_avisar_resp uuid[] := '{}';
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;
  select * into t from foro_temas where id = p_tema for update;
  if not found or t.eliminado then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  if not public.chat_es_miembro(t.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'no_miembro');
  end if;
  v_publica := public.es_liga_publica(t.league_id);

  select * into v_baneo from public.chat_baneo_activo(v_uid, t.league_id);
  if v_baneo.hasta is not null then
    return jsonb_build_object('ok', false, 'codigo', 'bloqueado', 'hasta', v_baneo.hasta, 'motivo', v_baneo.motivo);
  end if;
  if v_publica and public.nivel_de_xp(coalesce((select xp from xp_usuarios where user_id = v_uid), 0)) < v_nivel_min then
    return jsonb_build_object('ok', false, 'codigo', 'nivel', 'nivel_minimo', v_nivel_min);
  end if;
  if t.estado = 'cerrado' then
    return jsonb_build_object('ok', false, 'codigo', 'cerrado');
  end if;

  v_x := public.foro_limpiar(p_texto, v_max);
  if (v_x ->> 'ok')::boolean is not true then
    return v_x;
  end if;
  v_texto := v_x ->> 'texto';

  select max(created_at), count(*) filter (where created_at > now() - interval '1 minute')
  into v_ultimo, v_en_minuto
  from foro_mensajes
  where user_id = v_uid and not es_inicial and created_at > now() - interval '1 minute';
  if v_ultimo is not null and extract(epoch from (now() - v_ultimo)) < v_entre then
    return jsonb_build_object('ok', false, 'codigo', 'rapido');
  end if;
  if coalesce(v_en_minuto, 0) >= v_por_minuto then
    return jsonb_build_object('ok', false, 'codigo', 'limite');
  end if;
  if exists (
    select 1 from foro_mensajes
    where user_id = v_uid and created_at > now() - interval '60 seconds' and lower(texto) = lower(v_texto)
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'repetido');
  end if;

  if p_cita is not null then
    select user_id into v_cita_autor from foro_mensajes where id = p_cita and tema_id = p_tema;
    if not found then
      return jsonb_build_object('ok', false, 'codigo', 'cita');
    end if;
  end if;

  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_menciones, '{}')) x;
  if coalesce(array_length(v_ids, 1), 0) > 3 then
    return jsonb_build_object('ok', false, 'codigo', 'menciones');
  end if;
  v_validos := public.foro_menciones_validas(t.league_id, v_ids, v_publica);

  insert into foro_mensajes (tema_id, user_id, texto, menciones, cita_id)
  values (p_tema, v_uid, v_texto, v_validos, p_cita)
  returning id into v_msg;

  update foro_temas
  set n_respuestas = n_respuestas + 1, ultimo_msg_id = v_msg, ultima_actividad = now()
  where id = p_tema;

  -- Yo sigo el tema y lo tengo leído hasta aquí.
  insert into foro_lecturas (user_id, tema_id, ultimo_id, sigue)
  values (v_uid, p_tema, v_msg, true)
  on conflict (user_id, tema_id) do update set ultimo_id = greatest(foro_lecturas.ultimo_id, v_msg), sigue = true;

  -- Menciones: siguen el tema y reciben aviso.
  if coalesce(array_length(v_validos, 1), 0) > 0 then
    perform public.foro_seguir(p_tema, v_validos, v_msg - 1);
    perform public.foro_avisar(t.league_id, p_tema, v_msg, t.titulo, 'foro_mencion', v_validos);
  end if;

  -- Respuesta: al autor del tema y al autor de lo citado (si no se les ha mencionado ya).
  if t.user_id is not null and t.user_id <> v_uid and not (t.user_id = any (v_validos)) then
    v_avisar_resp := v_avisar_resp || t.user_id;
  end if;
  if v_cita_autor is not null and v_cita_autor <> v_uid
     and not (v_cita_autor = any (v_validos)) and not (v_cita_autor = any (v_avisar_resp)) then
    v_avisar_resp := v_avisar_resp || v_cita_autor;
  end if;
  if coalesce(array_length(v_avisar_resp, 1), 0) > 0 then
    perform public.foro_seguir(p_tema, v_avisar_resp, v_msg - 1);
    perform public.foro_avisar(t.league_id, p_tema, v_msg, t.titulo, 'foro_respuesta', v_avisar_resp);
  end if;

  return jsonb_build_object(
    'ok', true, 'id', v_msg,
    'menciones_ignoradas', coalesce(array_length(v_ids, 1), 0) - coalesce(array_length(v_validos, 1), 0)
  );
end;
$$;

-- 10) Editar y borrar ------------------------------------------------------------------------------------
create or replace function public.foro_editar(p_id bigint, p_texto text, p_menciones uuid[] default '{}')
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m record;
  t record;
  v_publica boolean;
  v_baneo record;
  v_minutos integer := greatest(public.chat_cfg('chat_minutos_edicion', 30)::integer, 0);
  v_max integer;
  v_x jsonb;
  v_ids uuid[];
  v_validos uuid[];
  v_editado timestamptz := now();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;
  select * into m from foro_mensajes where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  select * into t from foro_temas where id = m.tema_id;
  if m.user_id is distinct from v_uid or not public.chat_es_miembro(t.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;
  if t.estado = 'cerrado' or t.eliminado then
    return jsonb_build_object('ok', false, 'codigo', 'cerrado');
  end if;
  if m.created_at < now() - make_interval(mins => v_minutos) then
    return jsonb_build_object('ok', false, 'codigo', 'plazo', 'minutos', v_minutos);
  end if;
  if exists (select 1 from foro_denuncias where mensaje_id = p_id and estado = 'pendiente') then
    return jsonb_build_object('ok', false, 'codigo', 'denunciado');
  end if;
  if m.editado_en is not null and m.editado_en > now() - interval '2 seconds' then
    return jsonb_build_object('ok', false, 'codigo', 'rapido');
  end if;
  select * into v_baneo from public.chat_baneo_activo(v_uid, t.league_id);
  if v_baneo.hasta is not null then
    return jsonb_build_object('ok', false, 'codigo', 'bloqueado', 'hasta', v_baneo.hasta, 'motivo', v_baneo.motivo);
  end if;
  v_publica := public.es_liga_publica(t.league_id);

  v_max := case when m.es_inicial then public.chat_cfg('foro_max_caracteres_inicial', 600)::integer
                else public.chat_cfg('foro_max_caracteres', 300)::integer end;
  v_x := public.foro_limpiar(p_texto, v_max);
  if (v_x ->> 'ok')::boolean is not true then
    return v_x;
  end if;

  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_menciones, '{}')) x;
  if coalesce(array_length(v_ids, 1), 0) > 3 then
    return jsonb_build_object('ok', false, 'codigo', 'menciones');
  end if;
  v_validos := public.foro_menciones_validas(t.league_id, v_ids, v_publica);

  if (v_x ->> 'texto') = m.texto then
    return jsonb_build_object('ok', true, 'texto', m.texto, 'editado_en', m.editado_en, 'cambio', false, 'menciones_ignoradas', 0);
  end if;

  update foro_mensajes
  set texto = v_x ->> 'texto', menciones = v_validos, editado_en = v_editado
  where id = p_id;

  -- Menciones nuevas: aviso solo a quien no estaba mencionado antes.
  v_validos := array(select u from unnest(v_validos) u where not (u = any (m.menciones)));
  if coalesce(array_length(v_validos, 1), 0) > 0 then
    perform public.foro_seguir(m.tema_id, v_validos, p_id - 1);
    perform public.foro_avisar(t.league_id, m.tema_id, p_id, t.titulo, 'foro_mencion', v_validos);
  end if;

  return jsonb_build_object(
    'ok', true, 'texto', v_x ->> 'texto', 'editado_en', v_editado, 'cambio', true,
    'menciones_ignoradas', coalesce(array_length(v_ids, 1), 0) - coalesce(array_length(public.foro_menciones_validas(t.league_id, v_ids, v_publica), 1), 0)
  );
end;
$$;

-- Borra una respuesta, o un tema entero si es el mensaje inicial. Un tema con respuestas
-- no desaparece: queda como «tema eliminado» y se cierra (su encuesta se borra).
create or replace function public.foro_borrar(p_id bigint)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m record;
  t record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;
  select * into m from foro_mensajes where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  select * into t from foro_temas where id = m.tema_id;
  if m.user_id is distinct from v_uid and not public.foro_es_mod(t.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;
  if m.user_id is null and not public.es_root() then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;

  if m.es_inicial then
    if t.n_respuestas = 0 then
      delete from foro_temas where id = t.id;
    else
      delete from foro_encuestas where tema_id = t.id;
      delete from foro_opciones where tema_id = t.id;
      delete from foro_mensajes where id = p_id;
      update foro_temas set eliminado = true, estado = 'cerrado', fijado = false, titulo = null where id = t.id;
    end if;
  else
    delete from foro_mensajes where id = p_id;
  end if;

  if m.user_id is distinct from v_uid then
    update foro_denuncias
    set estado = 'aceptada', resuelta_en = now(), resuelta_por = v_uid
    where mensaje_id = p_id and estado = 'pendiente';
  end if;

  return jsonb_build_object('ok', true, 'tema_borrado', m.es_inicial and t.n_respuestas = 0);
end;
$$;

-- 11) Cerrar, fijar y encuestas ---------------------------------------------------------------------------
create or replace function public.foro_cerrar(p_tema bigint, p_cerrar boolean)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  t record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;
  select * into t from foro_temas where id = p_tema;
  if not found or t.eliminado then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  if t.user_id is distinct from v_uid and not public.foro_es_mod(t.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;
  -- Quien lo cerró por ser moderador, solo un moderador lo reabre.
  if not coalesce(p_cerrar, true) and t.user_id = v_uid and not public.foro_es_mod(t.league_id)
     and t.estado = 'cerrado' and t.datos ->> 'cerrado_por_mod' = 'true' then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;

  update foro_temas
  set estado = case when coalesce(p_cerrar, true) then 'cerrado' else 'abierto' end,
      datos = case
        when coalesce(p_cerrar, true) and public.foro_es_mod(t.league_id) and t.user_id is distinct from v_uid
          then datos || '{"cerrado_por_mod": "true"}'::jsonb
        else datos - 'cerrado_por_mod' end
  where id = p_tema;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.foro_fijar(p_tema bigint, p_fijar boolean)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  t record;
  v_max integer := public.chat_cfg('foro_max_fijados', 3)::integer;
begin
  select * into t from foro_temas where id = p_tema;
  if not found or t.eliminado then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  if not public.foro_es_mod(t.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;
  if coalesce(p_fijar, true) and not t.fijado
     and (select count(*) from foro_temas where league_id = t.league_id and fijado) >= v_max then
    return jsonb_build_object('ok', false, 'codigo', 'max_fijados', 'maximo', v_max);
  end if;
  update foro_temas set fijado = coalesce(p_fijar, true) where id = p_tema;
  return jsonb_build_object('ok', true);
end;
$$;

-- Voto único y secreto. Códigos: sesion, no_existe, no_miembro, bloqueado, cerrada,
-- ya_votado, opcion.
create or replace function public.foro_votar(p_tema bigint, p_opcion bigint)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  t record;
  e record;
  v_baneo record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;
  select * into t from foro_temas where id = p_tema;
  select * into e from foro_encuestas where tema_id = p_tema;
  if t.id is null or e.tema_id is null or t.eliminado then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  if not public.chat_es_miembro(t.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'no_miembro');
  end if;
  select * into v_baneo from public.chat_baneo_activo(v_uid, t.league_id);
  if v_baneo.hasta is not null then
    return jsonb_build_object('ok', false, 'codigo', 'bloqueado', 'hasta', v_baneo.hasta);
  end if;
  if t.estado = 'cerrado' or e.cerrada or (e.cierra_en is not null and e.cierra_en <= now()) then
    return jsonb_build_object('ok', false, 'codigo', 'cerrada');
  end if;
  if not exists (select 1 from foro_opciones where id = p_opcion and tema_id = p_tema) then
    return jsonb_build_object('ok', false, 'codigo', 'opcion');
  end if;
  insert into foro_votos (tema_id, user_id, opcion_id) values (p_tema, v_uid, p_opcion)
  on conflict (tema_id, user_id) do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'ya_votado');
  end if;
  return jsonb_build_object('ok', true, 'encuesta', public.foro_encuesta_json(p_tema));
end;
$$;

create or replace function public.foro_cerrar_encuesta(p_tema bigint)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  t record;
begin
  select * into t from foro_temas where id = p_tema;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  if t.user_id is distinct from auth.uid() and not public.foro_es_mod(t.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;
  update foro_encuestas set cerrada = true where tema_id = p_tema;
  return jsonb_build_object('ok', true, 'encuesta', public.foro_encuesta_json(p_tema));
end;
$$;

-- 12) Reacciones --------------------------------------------------------------------------------------------
-- Una por persona y mensaje. Pulsar el mismo emoji la quita; pulsar otro la cambia.
-- Códigos: sesion, no_existe, no_miembro, bloqueado, emoji, limite, cerrado.
create or replace function public.foro_reaccionar(p_mensaje bigint, p_emoji text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m record;
  t record;
  v_baneo record;
  v_actual text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;
  if p_emoji is not null and p_emoji not in ('👍', '🔥', '😂', '👏', '♟️') then
    return jsonb_build_object('ok', false, 'codigo', 'emoji');
  end if;
  select * into m from foro_mensajes where id = p_mensaje;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  select * into t from foro_temas where id = m.tema_id;
  if not public.chat_es_miembro(t.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'no_miembro');
  end if;
  if t.estado = 'cerrado' then
    return jsonb_build_object('ok', false, 'codigo', 'cerrado');
  end if;
  select * into v_baneo from public.chat_baneo_activo(v_uid, t.league_id);
  if v_baneo.hasta is not null then
    return jsonb_build_object('ok', false, 'codigo', 'bloqueado', 'hasta', v_baneo.hasta);
  end if;
  if (select count(*) from foro_reacciones where user_id = v_uid and created_at > now() - interval '1 minute')
       >= public.chat_cfg('foro_max_reacciones_minuto', 30)::integer then
    return jsonb_build_object('ok', false, 'codigo', 'limite');
  end if;

  select emoji into v_actual from foro_reacciones where mensaje_id = p_mensaje and user_id = v_uid;
  if p_emoji is null or p_emoji = v_actual then
    delete from foro_reacciones where mensaje_id = p_mensaje and user_id = v_uid;
    return jsonb_build_object('ok', true, 'mia', null);
  end if;
  insert into foro_reacciones (mensaje_id, user_id, emoji) values (p_mensaje, v_uid, p_emoji)
  on conflict (mensaje_id, user_id) do update set emoji = excluded.emoji, created_at = now();
  return jsonb_build_object('ok', true, 'mia', p_emoji);
end;
$$;

create or replace function public.chat_reaccionar(p_mensaje bigint, p_emoji text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_liga uuid;
  v_baneo record;
  v_actual text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;
  if p_emoji is not null and p_emoji not in ('👍', '🔥', '😂', '👏', '♟️') then
    return jsonb_build_object('ok', false, 'codigo', 'emoji');
  end if;
  select league_id into v_liga from chat_mensajes where id = p_mensaje;
  if v_liga is null then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  if not public.chat_es_miembro(v_liga) then
    return jsonb_build_object('ok', false, 'codigo', 'no_miembro');
  end if;
  select * into v_baneo from public.chat_baneo_activo(v_uid, v_liga);
  if v_baneo.hasta is not null then
    return jsonb_build_object('ok', false, 'codigo', 'bloqueado', 'hasta', v_baneo.hasta);
  end if;
  if (select count(*) from chat_reacciones where user_id = v_uid and created_at > now() - interval '1 minute')
       >= public.chat_cfg('foro_max_reacciones_minuto', 30)::integer then
    return jsonb_build_object('ok', false, 'codigo', 'limite');
  end if;

  select emoji into v_actual from chat_reacciones where mensaje_id = p_mensaje and user_id = v_uid;
  if p_emoji is null or p_emoji = v_actual then
    delete from chat_reacciones where mensaje_id = p_mensaje and user_id = v_uid;
    return jsonb_build_object('ok', true, 'mia', null);
  end if;
  insert into chat_reacciones (mensaje_id, user_id, emoji) values (p_mensaje, v_uid, p_emoji)
  on conflict (mensaje_id, user_id) do update set emoji = excluded.emoji, created_at = now();
  return jsonb_build_object('ok', true, 'mia', p_emoji);
end;
$$;

-- Reacciones de un grupo de mensajes del chat (hasta 100): una fila por mensaje y emoji.
create or replace function public.chat_reacciones_de(p_liga uuid, p_ids bigint[])
returns table (mensaje_id bigint, emoji text, total integer, mia boolean)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.chat_puede_leer(p_liga) then
    return;
  end if;
  return query
  select r.mensaje_id, r.emoji, count(*)::integer, bool_or(r.user_id = auth.uid())
  from chat_reacciones r
  join chat_mensajes m on m.id = r.mensaje_id
  where r.mensaje_id = any (p_ids[1:100]) and m.league_id = p_liga
  group by r.mensaje_id, r.emoji;
end;
$$;

-- 13) Lectura, contadores ---------------------------------------------------------------------------------------
create or replace function public.foro_marcar_leido(p_tema bigint, p_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga uuid;
begin
  select league_id into v_liga from foro_temas where id = p_tema;
  if v_liga is null or not public.chat_puede_leer(v_liga) then
    return;
  end if;
  insert into foro_lecturas (user_id, tema_id, ultimo_id)
  values (auth.uid(), p_tema, coalesce(p_id, 0))
  on conflict (user_id, tema_id)
  do update set ultimo_id = greatest(foro_lecturas.ultimo_id, excluded.ultimo_id);
end;
$$;

-- Temas que sigues (los has creado, respondido o te han mencionado o citado) con algo
-- sin leer en esta liga. Tope 100.
create or replace function public.foro_resumen(p_liga uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_n integer;
begin
  if not public.chat_puede_leer(p_liga) then
    return jsonb_build_object('temas_con_novedades', 0);
  end if;
  select count(*)::integer into v_n from (
    select 1
    from foro_lecturas l
    join foro_temas t on t.id = l.tema_id
    where l.user_id = auth.uid() and l.sigue and t.league_id = p_liga
      and not t.eliminado and t.ultimo_msg_id > l.ultimo_id
    limit 100
  ) s;
  return jsonb_build_object('temas_con_novedades', v_n);
end;
$$;

-- 14) Buscar a quién mencionar en un tema: la misma función del chat vale (misma liga).

-- 15) Denuncias --------------------------------------------------------------------------------------------------------
-- Códigos: sesion, no_existe, no_miembro, propio, repetida, limite.
create or replace function public.foro_denunciar(p_id bigint)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m record;
  t record;
  v_max integer := public.chat_cfg('chat_max_denuncias_dia', 3)::integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;
  select * into m from foro_mensajes where id = p_id;
  if not found or m.user_id is null then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  select * into t from foro_temas where id = m.tema_id;
  if not public.chat_es_miembro(t.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'no_miembro');
  end if;
  if m.user_id = v_uid then
    return jsonb_build_object('ok', false, 'codigo', 'propio');
  end if;
  if exists (select 1 from foro_denuncias where mensaje_id = p_id and denunciante_id = v_uid) then
    return jsonb_build_object('ok', false, 'codigo', 'repetida');
  end if;
  -- Un solo tope diario para chat y foros.
  if (select count(*) from chat_denuncias where denunciante_id = v_uid and created_at > now() - interval '24 hours')
     + (select count(*) from foro_denuncias where denunciante_id = v_uid and created_at > now() - interval '24 hours')
     >= v_max then
    return jsonb_build_object('ok', false, 'codigo', 'limite', 'maximo', v_max);
  end if;

  insert into foro_denuncias (mensaje_id, tema_id, titulo_tema, league_id, autor_id, denunciante_id, texto)
  values (p_id, t.id, t.titulo, t.league_id, m.user_id, v_uid, m.texto);
  return jsonb_build_object('ok', true);
end;
$$;

-- chat_denunciar de 0089 con UNA línea cambiada: el tope diario suma las denuncias de foros.
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
      where denunciante_id = v_uid and created_at > now() - interval '24 hours')
     + (select count(*) from foro_denuncias
        where denunciante_id = v_uid and created_at > now() - interval '24 hours') >= v_max then
    return jsonb_build_object('ok', false, 'codigo', 'limite', 'maximo', v_max);
  end if;

  insert into chat_denuncias (mensaje_id, league_id, autor_id, denunciante_id, texto)
  values (p_id, v_m.league_id, v_m.user_id, v_uid, v_m.texto);

  return jsonb_build_object('ok', true);
end;
$$;

-- Panel de admin (solo root).
create or replace function public.foro_denuncias_admin()
returns table (
  id bigint,
  mensaje_id bigint,
  tema_id bigint,
  titulo_tema text,
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
  select d.id, d.mensaje_id, d.tema_id, d.titulo_tema, d.league_id, l.nombre, (l.tipo = 'publica'),
         d.autor_id, pa.nombre, d.denunciante_id, pd.nombre, d.texto, d.created_at,
         d.estado, d.resuelta_en,
         exists (select 1 from foro_mensajes m where m.id = d.mensaje_id),
         (select max(b.hasta) from chat_bloqueos b
           where b.user_id = d.autor_id and b.league_id = d.league_id and b.hasta > now()),
         ((select count(*) from foro_denuncias r
            where r.denunciante_id = d.denunciante_id and r.estado = 'rechazada'
              and r.created_at > now() - interval '30 days')
          + (select count(*) from chat_denuncias r
              where r.denunciante_id = d.denunciante_id and r.estado = 'rechazada'
                and r.created_at > now() - interval '30 days'))::integer
  from foro_denuncias d
  join leagues l on l.id = d.league_id
  left join profiles pa on pa.id = d.autor_id
  left join profiles pd on pd.id = d.denunciante_id
  order by (d.estado = 'pendiente') desc, d.created_at desc
  limit 200;
end;
$$;

create or replace function public.foro_denuncias_pendientes()
returns integer
language sql
stable
security definer set search_path = public
as $$
  select case when public.es_root()
    then (select count(*)::integer from foro_denuncias where estado = 'pendiente')
    else 0 end;
$$;

-- Aceptar (borra el mensaje y, si se indica, banea al autor en esa liga: el baneo vale
-- para chat y foros) o rechazar.
create or replace function public.foro_resolver_denuncia(
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
  d record;
  m record;
  v_motivo text := nullif(left(btrim(coalesce(p_motivo, '')), 300), '');
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;
  select * into d from foro_denuncias where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;

  if p_aceptar then
    select * into m from foro_mensajes where id = d.mensaje_id;
    if found then
      perform public.foro_borrar(d.mensaje_id);
    end if;
    if coalesce(p_ban_horas, 0) > 0 then
      insert into chat_bloqueos (user_id, league_id, hasta, motivo, puesto_por)
      values (d.autor_id, d.league_id, now() + make_interval(hours => least(p_ban_horas, 8760)), v_motivo, v_uid);
    end if;
  end if;

  update foro_denuncias
  set estado = case when p_aceptar then 'aceptada' else 'rechazada' end,
      resuelta_en = now(), resuelta_por = v_uid
  where id = p_id;

  update foro_denuncias
  set estado = 'aceptada', resuelta_en = now(), resuelta_por = v_uid
  where mensaje_id = d.mensaje_id and estado = 'pendiente' and id <> p_id and p_aceptar;

  return jsonb_build_object('ok', true);
end;
$$;

-- 16) Hilo automático por jornada ------------------------------------------------------------------------------------------
-- Se dispara al cerrarse una jornada. Un hilo por liga pública activa y jornada (índice
-- único sobre clave_sistema); el fijado anterior del sistema se suelta. NUNCA debe romper
-- el cierre de jornada: cualquier error se queda en un aviso.
create or replace function public.foro_hilo_de_jornada()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_numero integer;
  v_clave text := 'jornada:' || new.semana::text;
  r record;
  v_tema bigint;
  v_msg bigint;
begin
  begin
    if public.chat_cfg('foro_hilos_automaticos', 1) = 0 then
      return new;
    end if;
    select js.numero into v_numero from jornadas_semanales() js where js.semana = new.semana limit 1;

    for r in
      select l.id from leagues l
      where l.tipo = 'publica' and coalesce(l.estado, 'activa') = 'activa'
    loop
      v_tema := null;
      insert into foro_temas (league_id, user_id, titulo, categoria, tipo, clave_sistema, datos, fijado)
      values (r.id, null, null, 'torneos', 'sistema', v_clave,
              jsonb_build_object('jornada', v_numero, 'semana', new.semana), true)
      on conflict do nothing
      returning id into v_tema;

      if v_tema is not null then
        insert into foro_mensajes (tema_id, user_id, texto, es_inicial)
        values (v_tema, null, '', true)
        returning id into v_msg;
        update foro_temas set ultimo_msg_id = v_msg where id = v_tema;
        update foro_temas set fijado = false
        where league_id = r.id and tipo = 'sistema' and fijado and id <> v_tema;
      end if;
    end loop;
  exception when others then
    raise warning 'foro_hilo_de_jornada: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists foro_hilo_de_jornada_trg on public.jornadas_cerradas;
create trigger foro_hilo_de_jornada_trg
  after insert on public.jornadas_cerradas
  for each row execute function public.foro_hilo_de_jornada();

-- 17) Borrado por antigüedad ------------------------------------------------------------------------------------------------
-- Borra en lotes los temas sin actividad en 'foro_dias_conservacion' días (salvo los
-- fijados) y las denuncias de foro resueltas hace más de 'chat_dias_denuncias' días.
create or replace function public.foro_purgar()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_dias integer := greatest(public.chat_cfg('foro_dias_conservacion', 90)::integer, 1);
  v_dias_den integer := greatest(public.chat_cfg('chat_dias_denuncias', 365)::integer, 1);
  v_lote integer;
  v_temas integer := 0;
  v_denuncias integer;
  v_vueltas integer := 0;
begin
  loop
    delete from foro_temas
    where id in (
      select id from foro_temas
      where not fijado and ultima_actividad < now() - make_interval(days => v_dias)
      limit 1000
    );
    get diagnostics v_lote = row_count;
    v_temas := v_temas + v_lote;
    v_vueltas := v_vueltas + 1;
    exit when v_lote < 1000 or v_vueltas >= 20;
  end loop;

  delete from foro_denuncias
  where estado <> 'pendiente' and resuelta_en < now() - make_interval(days => v_dias_den);
  get diagnostics v_denuncias = row_count;

  return jsonb_build_object('temas', v_temas, 'denuncias', v_denuncias);
end;
$$;

-- 18) Avisos: dos tipos nuevos (lista de 0101 + los del foro) ---------------------------------------------------------------------
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (
  tipo in (
    'oferta_recibida', 'fichaje', 'clausulazo', 'clausula_subida', 'oferta_rechazada',
    'actualizacion_elo', 'pago_jornada',
    'sancion', 'advertencia', 'expulsion', 'nuevo_admin',
    'oferta_maquina',
    'foro_mencion', 'foro_respuesta'
  )
);

-- 19) Permisos ---------------------------------------------------------------------------------------------------------------------
-- Ayudas internas: nadie las llama desde el navegador.
revoke all on function public.foro_mensaje_borrado() from public, anon, authenticated;
revoke all on function public.foro_es_mod(uuid) from public, anon, authenticated;
revoke all on function public.foro_limpiar(text, integer) from public, anon, authenticated;
revoke all on function public.foro_menciones_validas(uuid, uuid[], boolean) from public, anon, authenticated;
revoke all on function public.foro_avisar(uuid, bigint, bigint, text, text, uuid[]) from public, anon, authenticated;
revoke all on function public.foro_seguir(bigint, uuid[], bigint) from public, anon, authenticated;
revoke all on function public.foro_encuesta_json(bigint) from public, anon, authenticated;
revoke all on function public.foro_hilo_de_jornada() from public, anon, authenticated;
revoke all on function public.foro_purgar() from public, anon, authenticated;

-- Las llama la web.
revoke all on function public.foro_estado(uuid) from public, anon;
revoke all on function public.foro_marcar_normas_vistas() from public, anon;
revoke all on function public.foro_temas(uuid, text, text, integer, integer) from public, anon;
revoke all on function public.foro_tema(bigint) from public, anon;
revoke all on function public.foro_leer(bigint, bigint, integer, boolean) from public, anon;
revoke all on function public.foro_nuevos(bigint, bigint) from public, anon;
revoke all on function public.foro_crear_tema(uuid, text, text, text, uuid[], jsonb) from public, anon;
revoke all on function public.foro_responder(bigint, text, uuid[], bigint) from public, anon;
revoke all on function public.foro_editar(bigint, text, uuid[]) from public, anon;
revoke all on function public.foro_borrar(bigint) from public, anon;
revoke all on function public.foro_cerrar(bigint, boolean) from public, anon;
revoke all on function public.foro_fijar(bigint, boolean) from public, anon;
revoke all on function public.foro_votar(bigint, bigint) from public, anon;
revoke all on function public.foro_cerrar_encuesta(bigint) from public, anon;
revoke all on function public.foro_reaccionar(bigint, text) from public, anon;
revoke all on function public.chat_reaccionar(bigint, text) from public, anon;
revoke all on function public.chat_reacciones_de(uuid, bigint[]) from public, anon;
revoke all on function public.foro_marcar_leido(bigint, bigint) from public, anon;
revoke all on function public.foro_resumen(uuid) from public, anon;
revoke all on function public.foro_denunciar(bigint) from public, anon;
revoke all on function public.foro_denuncias_admin() from public, anon;
revoke all on function public.foro_denuncias_pendientes() from public, anon;
revoke all on function public.foro_resolver_denuncia(bigint, boolean, integer, text) from public, anon;
revoke all on function public.chat_denunciar(bigint) from public, anon;

grant execute on function public.foro_estado(uuid) to authenticated;
grant execute on function public.foro_marcar_normas_vistas() to authenticated;
grant execute on function public.foro_temas(uuid, text, text, integer, integer) to authenticated;
grant execute on function public.foro_tema(bigint) to authenticated;
grant execute on function public.foro_leer(bigint, bigint, integer, boolean) to authenticated;
grant execute on function public.foro_nuevos(bigint, bigint) to authenticated;
grant execute on function public.foro_crear_tema(uuid, text, text, text, uuid[], jsonb) to authenticated;
grant execute on function public.foro_responder(bigint, text, uuid[], bigint) to authenticated;
grant execute on function public.foro_editar(bigint, text, uuid[]) to authenticated;
grant execute on function public.foro_borrar(bigint) to authenticated;
grant execute on function public.foro_cerrar(bigint, boolean) to authenticated;
grant execute on function public.foro_fijar(bigint, boolean) to authenticated;
grant execute on function public.foro_votar(bigint, bigint) to authenticated;
grant execute on function public.foro_cerrar_encuesta(bigint) to authenticated;
grant execute on function public.foro_reaccionar(bigint, text) to authenticated;
grant execute on function public.chat_reaccionar(bigint, text) to authenticated;
grant execute on function public.chat_reacciones_de(uuid, bigint[]) to authenticated;
grant execute on function public.foro_marcar_leido(bigint, bigint) to authenticated;
grant execute on function public.foro_resumen(uuid) to authenticated;
grant execute on function public.foro_denunciar(bigint) to authenticated;
grant execute on function public.foro_denuncias_admin() to authenticated;
grant execute on function public.foro_denuncias_pendientes() to authenticated;
grant execute on function public.foro_resolver_denuncia(bigint, boolean, integer, text) to authenticated;
grant execute on function public.chat_denunciar(bigint) to authenticated;

-- 20) Cron (NO se activa desde aquí) ----------------------------------------------------------------------------------------------------
-- Pegar a mano en el SQL Editor, una vez, para que la purga de foros corra cada día de
-- madrugada (el del chat, chat_purgar, ya existe y no cambia):
--
--   select cron.schedule('foro-purgar', '15 3 * * *', $$select public.foro_purgar()$$);
