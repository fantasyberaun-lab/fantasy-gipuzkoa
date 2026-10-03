-- 0063: un jugador fichado entra de titular automáticamente si al equipo le
-- quedan huecos de titular (menos de 6).
--
-- Se hace con un trigger BEFORE INSERT sobre squad_slots, así cubre todas las
-- formas de fichar a la vez (mercado, pujas, cláusulas, ofertas directas,
-- plantilla inicial) sin tocar cada función.
--
-- Solo se pone de titular si no se rompe ninguna regla:
--   * el equipo tiene menos de 6 titulares (mantener igual que
--     validar_max_titulares() en 0052 y gameConfig.plantilla.maximoTitulares);
--   * en ninguno de los torneos del jugador el equipo tiene ya 4 titulares
--     (0048 / gameConfig.plantilla.maximoTitularesPorTorneo).
-- Si no cabe, entra de suplente como hasta ahora (nunca falla el fichaje).
--
-- El nombre empieza por "a" para que corra antes que los triggers de
-- validación (que van por orden alfabético: validar_max_titulares_trg y
-- validar_titulares_por_torneo_trg), y usa el mismo advisory lock por equipo
-- que ellos para que dos fichajes simultáneos no cuenten los mismos huecos.
--
-- No cambia a los jugadores que ya están en plantilla.
create or replace function public.asignar_titular_automatico()
returns trigger
language plpgsql
as $$
declare
  v_max constant integer := 6;
  v_max_torneo constant integer := 4;
  r record;
begin
  if new.titular is true or new.fecha_salida is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('titulares:' || new.fantasy_team_id::text, 0));

  if (
    select count(*)
    from squad_slots ss
    where ss.fantasy_team_id = new.fantasy_team_id
      and ss.fecha_salida is null
      and ss.titular = true
  ) >= v_max then
    return new;
  end if;

  for r in
    select tp.tournament_id
    from tournament_players tp
    where tp.player_id = new.player_id
  loop
    if (
      select count(*)
      from squad_slots ss
      join tournament_players tp2
        on tp2.player_id = ss.player_id and tp2.tournament_id = r.tournament_id
      where ss.fantasy_team_id = new.fantasy_team_id
        and ss.fecha_salida is null
        and ss.titular = true
    ) >= v_max_torneo then
      return new;
    end if;
  end loop;

  new.titular := true;
  return new;
end;
$$;

drop trigger if exists asignar_titular_automatico_trg on public.squad_slots;
create trigger asignar_titular_automatico_trg
  before insert on public.squad_slots
  for each row execute function public.asignar_titular_automatico();