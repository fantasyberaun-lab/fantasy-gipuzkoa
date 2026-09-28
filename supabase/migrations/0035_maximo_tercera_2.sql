-- El máximo de titulares de Tercera por equipo baja de 3 a 2.
--
-- Mismo cuerpo que validar_titular_tercera en 0029, solo cambia la
-- constante. Solo se comprueba cuando un jugador pasa a titular, así que
-- los equipos que ya tengan 3 titulares de Tercera los conservan hasta que
-- pasen a suplente a alguno (y ya no podrán volver a ponerlos).
--
-- Mantener igual que lib/gameConfig.ts -> plantilla.maximoTercera y que
-- MAX_TERCERA en app/(dashboard)/plantilla/page.tsx.
create or replace function public.validar_titular_tercera()
returns trigger
language plpgsql
as $$
declare
  v_categoria categoria;
  v_titulares_tercera integer;
  v_max_titulares_tercera constant integer := 2;
begin
  if new.titular is distinct from true then
    return new;
  end if;

  select categoria into v_categoria from players where id = new.player_id;
  if v_categoria is distinct from '3' then
    return new;
  end if;

  select count(*)
  into v_titulares_tercera
  from squad_slots ss
  join players p on p.id = ss.player_id
  where ss.fantasy_team_id = new.fantasy_team_id
    and ss.fecha_salida is null
    and ss.titular = true
    and p.categoria = '3'
    and ss.id <> new.id;

  if v_titulares_tercera >= v_max_titulares_tercera then
    raise exception 'Ya tienes % titulares de Tercera — es el máximo permitido.', v_max_titulares_tercera;
  end if;

  return new;
end;
$$;