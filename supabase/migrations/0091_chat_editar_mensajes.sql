-- 0091: editar mensajes del chat durante 30 minutos (estilo WhatsApp). Requiere 0089 y 0090.
--
-- * El autor edita su mensaje hasta 'chat_minutos_edicion' minutos (30) después de
--   enviarlo. Pasa por los mismos filtros que al enviar (vacío, longitud, enlaces,
--   palabras vetadas, menciones). Mantiene su fecha original y se marca 'editado_en'.
-- * No se puede editar un mensaje con una denuncia pendiente. Las denuncias guardan
--   siempre el texto tal como estaba al denunciar.
-- * A los demás les llega en el siguiente sondeo, por la misma tabla pequeña de
--   0090 (ahora con una columna 'tipo': borrado o editado).
-- * Cambia el tipo de resultado de chat_leer y chat_nuevos (columna nueva al final),
--   por eso se recrean. La web anterior a este cambio sigue funcionando: ignora la
--   columna nueva.

insert into game_config (clave, valor) values ('chat_minutos_edicion', '30'::jsonb)
on conflict (clave) do nothing;

alter table public.chat_mensajes add column if not exists editado_en timestamptz;

alter table public.chat_borrados
  add column if not exists tipo text not null default 'borrado' check (tipo in ('borrado', 'editado'));


-- Estado: añade los minutos de edición.
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
    'max_denuncias_dia', public.chat_cfg('chat_max_denuncias_dia', 3)::integer,
    'minutos_edicion', public.chat_cfg('chat_minutos_edicion', 30)::integer
  );
end;
$$;

-- Leer y sondear: con la columna editado_en.
drop function if exists public.chat_leer(uuid, bigint, integer);
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
  created_at timestamptz,
  editado_en timestamptz
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
         m.created_at, m.editado_en
  from chat_mensajes m
  join profiles p on p.id = m.user_id
  left join xp_usuarios x on x.user_id = m.user_id
  where m.league_id = p_liga
    and (p_antes is null or m.id < p_antes)
  order by m.id desc
  limit least(greatest(coalesce(p_limite, 40), 1), 100);
end;
$$;

drop function if exists public.chat_nuevos(uuid, bigint);
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
  created_at timestamptz,
  editado_en timestamptz
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
         m.created_at, m.editado_en
  from chat_mensajes m
  join profiles p on p.id = m.user_id
  left join xp_usuarios x on x.user_id = m.user_id
  where m.league_id = p_liga
    and m.id > coalesce(p_desde, 0)
  order by m.id asc
  limit 100;
end;
$$;

-- Sondeo: nuevos + borrados + editados desde el cursor.
create or replace function public.chat_novedades(p_liga uuid, p_desde bigint, p_seq bigint)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_nuevos jsonb;
  v_borrados jsonb := '[]'::jsonb;
  v_editados jsonb := '[]'::jsonb;
  v_seq bigint := p_seq;
begin
  if not public.chat_puede_leer(p_liga) then
    return jsonb_build_object('ok', false);
  end if;

  select coalesce(jsonb_agg(to_jsonb(n) order by n.id), '[]'::jsonb)
  into v_nuevos
  from public.chat_nuevos(p_liga, p_desde) n;

  if p_seq is null then
    select coalesce(max(seq), 0) into v_seq from chat_borrados;
  else
    select coalesce(max(seq), p_seq),
           coalesce(jsonb_agg(mensaje_id order by seq) filter (where tipo = 'borrado'), '[]'::jsonb)
    into v_seq, v_borrados
    from (
      select seq, mensaje_id, tipo from chat_borrados
      where league_id = p_liga and seq > p_seq
      order by seq
      limit 200
    ) b;

    select coalesce(jsonb_agg(to_jsonb(e) order by e.id), '[]'::jsonb)
    into v_editados
    from (
      select m.id, m.user_id, p.nombre, coalesce(x.xp, 0) as xp, p.avatar, m.texto, m.menciones,
             array(select pm.nombre from profiles pm where pm.id = any (m.menciones)) as menciones_nombres,
             m.created_at, m.editado_en
      from chat_mensajes m
      join profiles p on p.id = m.user_id
      left join xp_usuarios x on x.user_id = m.user_id
      where m.league_id = p_liga
        and m.id in (
          select mensaje_id from chat_borrados
          where league_id = p_liga and seq > p_seq and seq <= v_seq and tipo = 'editado'
        )
    ) e;
  end if;

  return jsonb_build_object('ok', true, 'nuevos', v_nuevos, 'borrados', v_borrados,
                            'editados', v_editados, 'seq', v_seq);
end;
$$;

-- Editar -----------------------------------------------------------------------------
create or replace function public.chat_editar(p_id bigint, p_texto text, p_menciones uuid[] default '{}')
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_m record;
  v_publica boolean;
  v_texto text;
  v_baneo record;
  v_max integer := public.chat_cfg('chat_max_caracteres', 300)::integer;
  v_minutos integer := greatest(public.chat_cfg('chat_minutos_edicion', 30)::integer, 0);
  v_vetadas jsonb;
  v_ids uuid[];
  v_validos uuid[];
  v_editado timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;

  select league_id, user_id, texto, menciones, created_at, editado_en into v_m
  from chat_mensajes where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'no_existe');
  end if;
  if v_m.user_id <> v_uid or not public.chat_es_miembro(v_m.league_id) then
    return jsonb_build_object('ok', false, 'codigo', 'permiso');
  end if;
  if v_m.created_at < now() - make_interval(mins => v_minutos) then
    return jsonb_build_object('ok', false, 'codigo', 'plazo', 'minutos', v_minutos);
  end if;
  if exists (select 1 from chat_denuncias where mensaje_id = p_id and estado = 'pendiente') then
    return jsonb_build_object('ok', false, 'codigo', 'denunciado');
  end if;
  if v_m.editado_en is not null and v_m.editado_en > now() - interval '2 seconds' then
    return jsonb_build_object('ok', false, 'codigo', 'rapido');
  end if;

  v_publica := public.es_liga_publica(v_m.league_id);
  select * into v_baneo from public.chat_baneo_activo(v_uid, v_m.league_id);
  if v_baneo.hasta is not null then
    return jsonb_build_object('ok', false, 'codigo', 'bloqueado', 'hasta', v_baneo.hasta, 'motivo', v_baneo.motivo);
  end if;

  -- Misma limpieza y filtros que chat_enviar.
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

  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_menciones, '{}')) x;
  if coalesce(array_length(v_ids, 1), 0) > 3 then
    return jsonb_build_object('ok', false, 'codigo', 'menciones');
  end if;
  select coalesce(array_agg(ft.owner_id), '{}') into v_validos
  from fantasy_teams ft
  join profiles p on p.id = ft.owner_id
  where ft.league_id = v_m.league_id
    and ft.owner_id = any (v_ids)
    and ft.owner_id <> v_uid
    and not (v_publica and p.chat_publico_silenciado)
    -- al editar solo se conservan los mencionados cuyo "@alias" sigue en el texto
    and position(lower('@' || p.nombre) in lower(v_texto)) > 0;

  -- Sin cambios: no se marca como editado.
  if v_texto = v_m.texto and v_validos <@ coalesce(v_m.menciones, '{}') and coalesce(v_m.menciones, '{}') <@ v_validos then
    return jsonb_build_object('ok', true, 'cambio', false, 'texto', v_texto, 'editado_en', v_m.editado_en,
                              'menciones', to_jsonb(v_validos), 'menciones_ignoradas', 0);
  end if;

  update chat_mensajes
  set texto = v_texto, menciones = v_validos, editado_en = now()
  where id = p_id
  returning editado_en into v_editado;

  insert into chat_borrados (league_id, mensaje_id, tipo) values (v_m.league_id, p_id, 'editado');

  return jsonb_build_object(
    'ok', true,
    'cambio', true,
    'texto', v_texto,
    'editado_en', v_editado,
    'menciones', to_jsonb(v_validos),
    'menciones_ignoradas', coalesce(array_length(v_ids, 1), 0) - coalesce(array_length(v_validos, 1), 0)
  );
end;
$$;

-- Permisos (recrear una función los pierde).
revoke all on function public.chat_leer(uuid, bigint, integer) from public, anon;
revoke all on function public.chat_nuevos(uuid, bigint) from public, anon;
revoke all on function public.chat_novedades(uuid, bigint, bigint) from public, anon;
revoke all on function public.chat_editar(bigint, text, uuid[]) from public, anon;
grant execute on function public.chat_leer(uuid, bigint, integer) to authenticated;
grant execute on function public.chat_nuevos(uuid, bigint) to authenticated;
grant execute on function public.chat_novedades(uuid, bigint, bigint) to authenticated;
grant execute on function public.chat_editar(bigint, text, uuid[]) to authenticated;
