-- Arreglo: "Recalcular valores iniciales" en el panel de admin fallaba con
-- "UPDATE requires a WHERE clause".
--
-- Supabase activa la extensión pg_safeupdate para las peticiones que llegan
-- por la API (PostgREST/RPC): rechaza cualquier UPDATE o DELETE sin WHERE,
-- incluso dentro de una función. El UPDATE de recalcular_valores_iniciales
-- (0010) actualizaba todos los jugadores sin WHERE. Aquí se añade un
-- `where true` explícito: hace exactamente lo mismo (todos los jugadores)
-- pero pasa la comprobación. No tiene relación con la privacidad de
-- menores (0031): la función es security definer y no se ve afectada.

create or replace function public.recalcular_valores_iniciales()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_actualizados integer;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede hacer esto.');
  end if;

  if exists (select 1 from results) then
    return jsonb_build_object(
      'ok', false,
      'mensaje', 'Ya hay resultados registrados: los valores ya han empezado a evolucionar y no se pueden recalcular desde cero.'
    );
  end if;

  update players
  set valor_mercado = public.calcular_valor_inicial(elo, anio_nacimiento)
  where true;
  get diagnostics v_actualizados = row_count;

  return jsonb_build_object('ok', true, 'actualizados', v_actualizados);
end;
$$;

revoke all on function public.recalcular_valores_iniciales() from public, anon;
grant execute on function public.recalcular_valores_iniciales() to authenticated;
