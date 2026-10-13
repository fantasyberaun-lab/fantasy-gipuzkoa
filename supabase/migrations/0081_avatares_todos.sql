-- 0081: todos los avatares de perfil (sigue siendo prueba solo para root).
--
-- 0077 creó profiles.avatar y cambiar_avatar() con solo dos avatares (anand y
-- morphy). Aquí se rehace cambiar_avatar() con el catálogo completo: las
-- piezas, Ruy López, Morphy y los campeones del mundo (ver lib/avatares.ts).
-- Sigue exigiendo es_root(): se abrirá a todos junto con el sistema de niveles.
--
-- Requiere 0077.
--
-- Impacto en datos existentes: ninguno. Solo reemplaza una función; los ids
-- que ya se usaban (anand, morphy) siguen siendo válidos. Se puede lanzar con
-- `supabase db push` o pegándola en el SQL Editor.

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

  if v_avatar is not null and v_avatar not in (
    'peon', 'caballo', 'alfil', 'torre', 'dama', 'rey',
    'ruy-lopez', 'morphy',
    'steinitz', 'lasker', 'capablanca', 'alekhine', 'euwe', 'botvinnik',
    'smyslov', 'tal', 'petrosian', 'spassky', 'fischer', 'karpov',
    'kasparov', 'kramnik', 'anand', 'carlsen', 'ding', 'gukesh'
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese avatar no existe.');
  end if;

  update profiles set avatar = v_avatar where id = auth.uid();

  return jsonb_build_object('ok', true, 'avatar', v_avatar);
end;
$$;

revoke all on function public.cambiar_avatar(text) from public, anon;
grant execute on function public.cambiar_avatar(text) to authenticated;
