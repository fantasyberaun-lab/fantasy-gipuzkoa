-- 0077: avatares de perfil (fase de prueba, solo root).
--
-- Cada usuario podrá elegir un icono de perfil (retratos de campeones del
-- mundo) que se desbloquearán por nivel. De momento es una prueba: solo los
-- root pueden elegir avatar, y la app solo lo enseña a los root.
--
-- 1) profiles.avatar: id del avatar elegido (null = sin avatar, se ven las
--    iniciales). El catálogo (imagen, nombre, nivel) vive en lib/avatares.ts;
--    aquí solo se guarda el id y se valida contra la lista de abajo.
-- 2) cambiar_avatar(p_avatar): guarda el avatar del usuario actual. Pasar
--    null lo quita. Por ahora exige es_root().
--
-- Para abrirlo a todos más adelante: quitar la comprobación de es_root() en
-- cambiar_avatar (y la de esRoot en la app), y añadir la de nivel.
-- Al añadir avatares nuevos, ampliar la lista de ids aquí y en lib/avatares.ts.
--
-- Impacto en datos existentes: ninguno. Añade una columna que admite null
-- (todos quedan sin avatar) y una función nueva. Se puede lanzar con
-- `supabase db push` o pegándola en el SQL Editor.
--
-- RGPD: no es un dato personal (es un icono elegido de una lista cerrada, no
-- una foto del usuario).

-- 1) Columna ---------------------------------------------------------------------
alter table profiles
  add column if not exists avatar text;

-- 2) Elegir avatar ---------------------------------------------------------------
create or replace function public.cambiar_avatar(p_avatar text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_avatar text := nullif(btrim(coalesce(p_avatar, '')), '');
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No has iniciado sesión.');
  end if;

  -- Fase de prueba: solo root.
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Los avatares todavía no están disponibles.');
  end if;

  if v_avatar is not null and v_avatar not in ('anand', 'morphy') then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese avatar no existe.');
  end if;

  update profiles set avatar = v_avatar where id = auth.uid();

  return jsonb_build_object('ok', true, 'avatar', v_avatar);
end;
$$;

revoke all on function public.cambiar_avatar(text) from public, anon;
grant execute on function public.cambiar_avatar(text) to authenticated;
