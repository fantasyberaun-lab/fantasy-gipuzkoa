-- 0121: invita a un amigo (Fase 3 del plan de engagement, "crecimiento").
--
-- Cada manager tiene un código. Un manager NUEVO (dentro de sus primeros días)
-- puede canjear el código de un amigo: ambos reciben saldo en todos sus equipos.
-- Crecimiento dentro del club sin tocar el registro (se canjea desde la app).
--
-- Recompensa y ventana editables en game_config ('referido_recompensa' en M,
-- 'referido_dias'). Un manager solo puede ser invitado una vez y no por sí mismo.
--
-- Impacto en datos existentes: crea dos tablas y dos claves de game_config. No
-- cambia saldos existentes. Se puede lanzar con `supabase db push` o en el SQL Editor.

insert into game_config (clave, valor) values
  ('referido_recompensa', '5'::jsonb),
  ('referido_dias', '14'::jsonb)
on conflict (clave) do nothing;

-- Código de cada manager (se crea la primera vez que lo pide).
create table if not exists public.referido_codigos (
  user_id uuid primary key references auth.users (id) on delete cascade,
  codigo text not null unique,
  created_at timestamptz not null default now()
);

alter table public.referido_codigos enable row level security;
drop policy if exists "ver mi codigo" on public.referido_codigos;
create policy "ver mi codigo" on public.referido_codigos
  for select to authenticated using (user_id = auth.uid());

-- Quién invitó a quién (un invitado, una sola vez).
create table if not exists public.referidos (
  invitado_id uuid primary key references auth.users (id) on delete cascade,
  padrino_id uuid not null references auth.users (id) on delete cascade,
  codigo text not null,
  created_at timestamptz not null default now()
);

create index if not exists referidos_padrino_idx on public.referidos (padrino_id);

alter table public.referidos enable row level security;
-- Ves los referidos donde participas (tú invitaste o te invitaron).
drop policy if exists "ver mis referidos" on public.referidos;
create policy "ver mis referidos" on public.referidos
  for select to authenticated
  using (invitado_id = auth.uid() or padrino_id = auth.uid());

-- Devuelve (creándolo la primera vez) el código del manager actual.
create or replace function public.mi_codigo_referido()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cod text;
  v_try integer := 0;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver tu código.';
  end if;

  select codigo into v_cod from referido_codigos where user_id = v_uid;
  if v_cod is not null then
    return v_cod;
  end if;

  loop
    v_try := v_try + 1;
    v_cod := upper(substring(md5(random()::text || clock_timestamp()::text || v_uid::text) from 1 for 7));
    begin
      insert into referido_codigos (user_id, codigo) values (v_uid, v_cod);
      return v_cod;
    exception
      when unique_violation then
        -- Si ya tiene código (otra llamada a la vez), devuélvelo; si fue el
        -- código el que colisionó, reintenta.
        select codigo into v_cod from referido_codigos where user_id = v_uid;
        if v_cod is not null then
          return v_cod;
        end if;
    end;
    if v_try > 20 then
      raise exception 'No se pudo generar el código. Inténtalo de nuevo.';
    end if;
  end loop;
end;
$$;

revoke all on function public.mi_codigo_referido() from public, anon;
grant execute on function public.mi_codigo_referido() to authenticated;

-- Canjea el código de un amigo. Paga a los dos.
create or replace function public.canjear_referido(p_codigo text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cod text := upper(btrim(coalesce(p_codigo, '')));
  v_padrino uuid;
  v_creado timestamptz;
  v_dias integer;
  v_rec numeric;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión.');
  end if;
  if v_cod = '' then
    return jsonb_build_object('ok', false, 'mensaje', 'Escribe un código.');
  end if;

  if exists (select 1 from referidos where invitado_id = v_uid) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya has canjeado un código.');
  end if;

  select created_at into v_creado from profiles where id = v_uid;
  select coalesce((select valor::text::integer from game_config where clave = 'referido_dias'), 14),
         coalesce((select valor::text::numeric from game_config where clave = 'referido_recompensa'), 5)
  into v_dias, v_rec;

  if v_creado is null or v_creado < now() - make_interval(days => v_dias) then
    return jsonb_build_object('ok', false, 'mensaje', 'El código solo se puede canjear en tus primeros días.');
  end if;

  select user_id into v_padrino from referido_codigos where codigo = v_cod;
  if v_padrino is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese código no existe.');
  end if;
  if v_padrino = v_uid then
    return jsonb_build_object('ok', false, 'mensaje', 'No puedes usar tu propio código.');
  end if;

  insert into referidos (invitado_id, padrino_id, codigo) values (v_uid, v_padrino, v_cod);

  update fantasy_teams set presupuesto = presupuesto + v_rec
  where owner_id in (v_uid, v_padrino);

  return jsonb_build_object('ok', true, 'recompensa', v_rec);
end;
$$;

revoke all on function public.canjear_referido(text) from public, anon;
grant execute on function public.canjear_referido(text) to authenticated;

-- Cuántos amigos ha traído el manager (para enseñarlo en la pantalla).
create or replace function public.mis_referidos_total()
returns integer
language sql
stable
security definer set search_path = public
as $$
  select count(*)::integer from referidos where padrino_id = auth.uid();
$$;

revoke all on function public.mis_referidos_total() from public, anon;
grant execute on function public.mis_referidos_total() to authenticated;
