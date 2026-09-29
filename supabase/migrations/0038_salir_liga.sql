-- Salir de una liga.
--
-- Borra SOLO tu equipo en esa liga (no tu cuenta ni tus otras ligas).
-- Al borrar la fila de fantasy_teams se van por cascada su plantilla
-- (squad_slots), pujas, ofertas, registro de operaciones, alineaciones de
-- jornada y notificaciones. Tus jugadores quedan libres otra vez.
--
-- clause_releases apunta a fantasy_teams SIN "on delete cascade" (0001), así
-- que hay que limpiarla a mano antes, igual que hace eliminar_mi_cuenta (0008).
--
-- Si eras el último miembro de una liga privada, la liga se borra también
-- (si no, quedaría un código huérfano). La liga pública nunca se borra.
--
-- security definer porque el cliente no puede borrar de clause_releases.
-- Solo actúa sobre el equipo de auth.uid() en la liga indicada.

create or replace function public.salir_liga(p_league_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_equipo_id uuid;
  v_tipo text;
  v_restantes integer;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No has iniciado sesión.');
  end if;

  select id into v_equipo_id
  from fantasy_teams
  where owner_id = v_user_id and league_id = p_league_id
  for update;

  if v_equipo_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'No tienes equipo en esa liga.');
  end if;

  delete from clause_releases
  where from_team_id = v_equipo_id or to_team_id = v_equipo_id;

  delete from fantasy_teams where id = v_equipo_id;

  select tipo into v_tipo from leagues where id = p_league_id;
  select count(*) into v_restantes from fantasy_teams where league_id = p_league_id;

  if v_tipo = 'privada' and v_restantes = 0 then
    delete from leagues where id = p_league_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.salir_liga(uuid) from public, anon;
grant execute on function public.salir_liga(uuid) to authenticated;
