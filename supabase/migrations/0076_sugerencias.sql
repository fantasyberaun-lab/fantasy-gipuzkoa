-- 0076: buzón de sugerencias.
--
-- Desde Ajustes > Enviar sugerencia, cualquier manager puede mandar una idea,
-- un error que ha visto o cualquier otra cosa. Les llega a los admins (root) en
-- Admin > Sugerencias, donde las leen y las marcan como leídas, con una
-- respuesta corta opcional.
--
-- Al marcarla como leída, quien la envió lo ve de dos formas:
--   - En su historial (Ajustes > Enviar sugerencia) aparece el check de leída.
--   - En la pestaña Avisos le sale un aviso ("Hemos leído tu sugerencia") que
--     cuenta en el globo de no leídos hasta que entra en Avisos
--     (columna aviso_visto).
--
-- Nadie escribe la tabla directamente desde el navegador: todo pasa por las
-- funciones de abajo (security definer), que validan el texto, limitan el
-- número de envíos al día y comprueban que quien marca como leída es root.
--
-- Impacto en datos existentes: ninguno. Solo crea una tabla y funciones
-- nuevas. Se puede lanzar con `supabase db push` o pegándola en el SQL Editor.
--
-- RGPD: el texto lo escribe el usuario y va ligado a su cuenta. Se borra con la
-- cuenta (on delete cascade). El formulario pide no incluir datos personales.

-- 1) Tabla ---------------------------------------------------------------------------
create table if not exists public.sugerencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null default 'sugerencia'
    check (tipo in ('sugerencia', 'error', 'otro')),
  texto text not null check (char_length(btrim(texto)) between 1 and 2000),
  created_at timestamptz not null default now(),
  leida_en timestamptz, -- null = pendiente de leer por los admins
  respuesta text check (respuesta is null or char_length(respuesta) <= 1000),
  -- El autor ya ha visto en Avisos que se ha leído (o la última respuesta).
  aviso_visto boolean not null default false
);

create index if not exists sugerencias_usuario_idx
  on public.sugerencias (user_id, created_at desc);

create index if not exists sugerencias_pendientes_idx
  on public.sugerencias (created_at desc) where leida_en is null;

alter table public.sugerencias enable row level security;

-- Cada uno ve las suyas; root las ve todas. Sin políticas de escritura: solo
-- las funciones de abajo.
drop policy if exists "ver mis sugerencias" on public.sugerencias;
create policy "ver mis sugerencias" on public.sugerencias
  for select to authenticated
  using (user_id = auth.uid() or public.es_root());

drop policy if exists "root borra sugerencias" on public.sugerencias;
create policy "root borra sugerencias" on public.sugerencias
  for delete to authenticated
  using (public.es_root());

-- Para que el check de leída y el aviso lleguen sin recargar. Realtime respeta
-- la RLS de arriba: cada usuario solo recibe las suyas.
do $$
begin
  alter publication supabase_realtime add table public.sugerencias;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- 2) Enviar --------------------------------------------------------------------------
-- Devuelve { ok, codigo } en vez de lanzar errores para que la app traduzca el
-- mensaje: 'sesion', 'vacia', 'larga', 'tipo', 'limite'.
create or replace function public.enviar_sugerencia(p_tipo text, p_texto text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_texto text := btrim(coalesce(p_texto, ''));
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'codigo', 'sesion');
  end if;
  if p_tipo is null or p_tipo not in ('sugerencia', 'error', 'otro') then
    return jsonb_build_object('ok', false, 'codigo', 'tipo');
  end if;
  if char_length(v_texto) = 0 then
    return jsonb_build_object('ok', false, 'codigo', 'vacia');
  end if;
  if char_length(v_texto) > 2000 then
    return jsonb_build_object('ok', false, 'codigo', 'larga');
  end if;

  -- Freno anti-spam: como mucho 5 en 24 horas por usuario.
  if (select count(*) from sugerencias
      where user_id = v_uid and created_at > now() - interval '24 hours') >= 5 then
    return jsonb_build_object('ok', false, 'codigo', 'limite');
  end if;

  insert into sugerencias (user_id, tipo, texto)
  values (v_uid, p_tipo, v_texto)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.enviar_sugerencia(text, text) from public, anon;
grant execute on function public.enviar_sugerencia(text, text) to authenticated;

-- 3) El autor ha visto los avisos de sugerencias leídas (al entrar en Avisos) -----
create or replace function public.marcar_avisos_sugerencias_vistos()
returns void
language sql
security definer set search_path = public
as $$
  update sugerencias
  set aviso_visto = true
  where user_id = auth.uid()
    and leida_en is not null
    and not aviso_visto;
$$;

revoke all on function public.marcar_avisos_sugerencias_vistos() from public, anon;
grant execute on function public.marcar_avisos_sugerencias_vistos() to authenticated;

-- 4) Admin: listado con el nombre de usuario de quien la envía -----------------------
create or replace function public.admin_sugerencias()
returns table (
  id uuid,
  user_id uuid,
  nombre text,
  tipo text,
  texto text,
  created_at timestamptz,
  leida_en timestamptz,
  respuesta text
)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.es_root() then
    raise exception 'Solo los administradores pueden ver las sugerencias.';
  end if;

  return query
  select s.id, s.user_id, p.nombre, s.tipo, s.texto, s.created_at, s.leida_en, s.respuesta
  from sugerencias s
  left join profiles p on p.id = s.user_id
  order by (s.leida_en is null) desc, s.created_at desc
  limit 500;
end;
$$;

revoke all on function public.admin_sugerencias() from public, anon;
grant execute on function public.admin_sugerencias() to authenticated;

-- 5) Admin: marcar como leída (con respuesta opcional) o volver a pendiente ---------
-- Marcarla leída, o cambiar la respuesta de una ya leída, vuelve a avisar al autor.
create or replace function public.marcar_sugerencia_leida(
  p_id uuid,
  p_leida boolean default true,
  p_respuesta text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_respuesta text := nullif(btrim(coalesce(p_respuesta, '')), '');
begin
  if not public.es_root() then
    raise exception 'Solo los administradores pueden marcar sugerencias.';
  end if;
  if char_length(coalesce(v_respuesta, '')) > 1000 then
    raise exception 'La respuesta no puede pasar de 1000 caracteres.';
  end if;

  if p_leida then
    update sugerencias
    set leida_en = coalesce(leida_en, now()),
        respuesta = v_respuesta,
        aviso_visto = false
    where id = p_id;
  else
    -- Vuelve a pendiente y deja de salir en los Avisos del autor.
    update sugerencias
    set leida_en = null,
        aviso_visto = true
    where id = p_id;
  end if;
end;
$$;

revoke all on function public.marcar_sugerencia_leida(uuid, boolean, text) from public, anon;
grant execute on function public.marcar_sugerencia_leida(uuid, boolean, text) to authenticated;
