-- 0110: una oferta directa no puede ser inferior al valor de mercado del jugador.
--
-- Igual que en el mercado (donde las pujas empiezan en el valor del jugador), un manager
-- no puede ofrecer a otro manager menos de lo que vale el jugador. Hasta ahora la oferta
-- se escribía directamente en player_offers y solo se comprobaba el saldo.
--
-- Se hace con un trigger para que valga igual venga de la app o de una llamada directa a
-- la API. Solo comprueba al crear o al cambiar el importe de la oferta: las ofertas que ya
-- existen no se tocan, aunque el valor del jugador haya subido después.
--
-- Impacto en datos: ninguno (no modifica filas). Solo afecta a ofertas nuevas.
--
-- Lanzar con `supabase db push` y, si se hace a mano, registrarla después:
--   insert into supabase_migrations.schema_migrations (version, name)
--   values ('0110', 'oferta_minima_valor_mercado');

create or replace function public.validar_oferta_minima()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_valor numeric;
begin
  select valor_mercado into v_valor from players where id = new.player_id;

  if v_valor is not null and new.importe < v_valor then
    raise exception 'La oferta no puede ser inferior al valor de mercado del jugador (% M).', v_valor;
  end if;

  return new;
end;
$$;

drop trigger if exists validar_oferta_minima_trg on public.player_offers;
create trigger validar_oferta_minima_trg
  before insert or update of importe on public.player_offers
  for each row execute function public.validar_oferta_minima();
