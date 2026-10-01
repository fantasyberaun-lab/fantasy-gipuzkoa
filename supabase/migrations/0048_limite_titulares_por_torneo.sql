-- 0048: máximo de titulares por torneo.
--
-- Un equipo no puede tener más de 4 titulares inscritos en el mismo torneo
-- (tournament_players). Un jugador que juega varios torneos cuenta en cada uno.
--
-- Igual que el límite de Tercera (0029/0035), solo se comprueba cuando un
-- jugador pasa a titular: los equipos que ya tengan más de 4 en algún torneo
-- los conservan, pero no podrán poner a nadie más de ese torneo.
--
-- Mantener igual que lib/gameConfig.ts -> plantilla.maximoTitularesPorTorneo.
create or replace function public.validar_titulares_por_torneo()
returns trigger
language plpgsql
as $$
declare
  v_max constant integer := 4;
  r record;
begin
  if new.titular is distinct from true then
    return new;
  end if;

  for r in
    select tp.tournament_id, t.nombre
    from tournament_players tp
    join tournaments t on t.id = tp.tournament_id
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
        and ss.id <> new.id
    ) >= v_max then
      raise exception 'Ya tienes % titulares en %: es el máximo permitido por torneo.', v_max, r.nombre;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists validar_titulares_por_torneo_trg on public.squad_slots;
create trigger validar_titulares_por_torneo_trg
  before insert or update of titular on public.squad_slots
  for each row execute function public.validar_titulares_por_torneo();

-- Pujas ocultas de verdad -------------------------------------------------
-- La política de 0016 dejaba leer TODAS las pujas de tu liga directamente
-- desde la tabla (la clave pública de Supabase va en el navegador), así que
-- las 2 h de pujas ocultas de 0047 se podían saltar. Ahora la tabla solo
-- enseña tus propias pujas; el resto de pujas solo llegan a través de
-- pujas_del_mercado() (security definer), que ya las oculta en esas 2 h.
drop policy if exists "ver bids de mis ligas" on bids;
create policy "ver mis propias pujas"
  on bids for select
  using (
    fantasy_team_id in (select id from fantasy_teams where owner_id = auth.uid())
  );
