-- 0087: guía de estreno de los niveles (se enseña una sola vez a cada usuario).
--
-- Requiere 0086 (niveles). profiles.tutorial_niveles_visto recuerda quién ya ha
-- visto la guía: empieza en false para todos, así que cada usuario la ve una vez,
-- la primera vez que entra tras publicar los niveles. La web la marca como vista
-- al empezar (marcar_tutorial_niveles), y estado_nivel() dice si ya se vio.
--
-- Para volver a ver la guía en pruebas:
--   update profiles set tutorial_niveles_visto = false where nombre ilike '...';
--
-- Impacto en datos existentes: añade una columna con valor por defecto, crea una
-- función y reemplaza estado_nivel() (solo añade el campo 'tutorial_visto').
-- Se puede lanzar con `supabase db push` o pegándola en el SQL Editor.

alter table public.profiles
  add column if not exists tutorial_niveles_visto boolean not null default false;

create or replace function public.marcar_tutorial_niveles()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update profiles set tutorial_niveles_visto = true where id = auth.uid();
end;
$$;

revoke all on function public.marcar_tutorial_niveles() from public, anon;
grant execute on function public.marcar_tutorial_niveles() to authenticated;

create or replace function public.estado_nivel()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_xp integer;
  v_nivel integer;
  v_visto boolean;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver tu nivel.';
  end if;

  select coalesce((select xp from xp_usuarios where user_id = v_uid), 0) into v_xp;
  v_nivel := public.nivel_de_xp(v_xp);
  select coalesce((select tutorial_niveles_visto from profiles where id = v_uid), true) into v_visto;

  return jsonb_build_object(
    'tutorial_visto', v_visto,
    'xp', v_xp,
    'nivel', v_nivel,
    'xp_nivel_actual', public.xp_para_nivel(v_nivel),
    'xp_nivel_siguiente', public.xp_para_nivel(v_nivel + 1)
  );
end;
$$;

revoke all on function public.estado_nivel() from public, anon;
grant execute on function public.estado_nivel() to authenticated;
