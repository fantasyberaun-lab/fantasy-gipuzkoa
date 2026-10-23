-- 0109: un solo aviso por tanda cuando la máquina hace ofertas.
--
-- Con 0101, generar_ofertas_maquina() insertaba una notificación por CADA jugador en
-- venta y por CADA tanda: si no entrabas en un día, el panel de avisos se llenaba de
-- decenas de "la máquina te ofrece X por Y" (casi todas ya caducadas, porque cada tanda
-- sustituye a la oferta anterior).
--
-- Ahora, en cada tanda, cada equipo con jugadores en venta recibe UN aviso general
-- (oferta_maquina, sin jugador ni importe) y el aviso de la tanda anterior se borra:
-- las ofertas se sustituyen en cada tanda, así que el aviso viejo ya no dice nada útil.
-- El detalle de cada oferta se ve en la ficha del jugador, en Plantilla.
--
-- Impacto en datos: BORRA las notificaciones 'oferta_maquina' que hay ahora (una por
-- jugador y tanda) y deja un único aviso por equipo con ofertas pendientes. No toca
-- ventas_maquina ni ninguna oferta. generar_ofertas_maquina() es la de 0101 con solo
-- el último insert cambiado.
--
-- Lanzar a mano en el SQL Editor (o `supabase db push` si ya está al día) y, si se hace
-- a mano, registrarla después:
--   insert into supabase_migrations.schema_migrations (version, name)
--   values ('0109', 'aviso_unico_oferta_maquina');


-- 1) Función: un aviso por equipo, sustituyendo al anterior --------------------------------
create or replace function public.generar_ofertas_maquina(p_league_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- Ventas de jugadores que ya no están en esa plantilla (clausulazo, etc.).
  delete from ventas_maquina v
  using squad_slots s
  where v.league_id = p_league_id
    and s.id = v.squad_slot_id
    and s.fecha_salida is not null;

  -- Una oferta nueva para cada jugador en venta (sustituye a la anterior).
  update ventas_maquina v
  set oferta = greatest(0.01, round(p.valor_mercado * public.factor_oferta_maquina(), 2)),
      oferta_en = now()
  from players p
  where v.league_id = p_league_id
    and p.id = v.player_id;

  -- El aviso de la tanda anterior ya no vale.
  delete from notificaciones
  where league_id = p_league_id
    and tipo = 'oferta_maquina';

  -- Un único aviso general por equipo que tenga jugadores en venta.
  insert into notificaciones (league_id, tipo, objetivo_team_id, privada)
  select distinct v.league_id, 'oferta_maquina', v.fantasy_team_id, true
  from ventas_maquina v
  where v.league_id = p_league_id
    and v.oferta is not null;
end;
$$;

revoke all on function public.generar_ofertas_maquina(uuid) from public, anon, authenticated;
grant execute on function public.generar_ofertas_maquina(uuid) to service_role;


-- 2) Limpieza de lo ya acumulado ---------------------------------------------------------------
delete from public.notificaciones where tipo = 'oferta_maquina';

insert into public.notificaciones (league_id, tipo, objetivo_team_id, privada)
select distinct v.league_id, 'oferta_maquina', v.fantasy_team_id, true
from public.ventas_maquina v
where v.oferta is not null;
