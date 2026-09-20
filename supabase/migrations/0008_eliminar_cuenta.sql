-- Permite que un usuario elimine su propia cuenta desde la app.
--
-- Borrar la fila de auth.users arrastra por cascada todo lo demás:
--   auth.users -> profiles -> fantasy_teams -> squad_slots, bids,
--   matchday_captains, operations_log, player_offers.
-- Sus jugadores quedan libres otra vez (desaparecen sus squad_slots) y
-- vuelven a aparecer en el mercado.
--
-- Dos tablas apuntan a datos del usuario SIN "on delete cascade" y
-- bloquearían el borrado, así que se limpian antes a mano:
--   - clause_releases (from_team_id / to_team_id -> fantasy_teams)
--   - game_config.updated_by (-> profiles)
--
-- Tiene que ser "security definer" porque un usuario normal no puede
-- borrar filas de auth.users. Solo actúa sobre auth.uid(), es decir,
-- sobre quien la llama: nadie puede borrar la cuenta de otro.

create or replace function public.eliminar_mi_cuenta()
returns jsonb
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_equipo_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No has iniciado sesión.');
  end if;

  select id into v_equipo_id from fantasy_teams where owner_id = v_user_id;

  if v_equipo_id is not null then
    delete from clause_releases
    where from_team_id = v_equipo_id or to_team_id = v_equipo_id;
  end if;

  update game_config set updated_by = null where updated_by = v_user_id;

  delete from auth.users where id = v_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;
