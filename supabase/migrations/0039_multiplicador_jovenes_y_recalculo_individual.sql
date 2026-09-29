-- 1) Multiplicador de los jóvenes más suave.
--
--    Antes: 1 + 0.8 * ln(25 / edad), con tope x2.0.
--    Ahora: 1 + 0.4 * ln(25 / edad), con tope x1.5.
--    (Se reduce a la mitad el plus por juventud: p. ej. a los 12 años pasa
--    de x1.59 a x1.29 y a los 18 de x1.26 a x1.13.)
--
--    Solo cambia game_config: la función calcular_valor_inicial (0011) ya
--    lee estos parámetros. Los valores YA guardados no cambian hasta que se
--    recalculen (todos con "Recalcular valores iniciales", o uno a uno con
--    el botón de cada fila del panel de admin).

update game_config
set valor = valor || jsonb_build_object(
      'juventud_intensidad', 0.4,
      'juventud_max', 1.5
    ),
    updated_at = now()
where clave = 'valor_inicial';

-- 2) Recalcular el valor inicial de UN jugador concreto, sin tocar al resto
--    (así se respetan los valores puestos a mano).

create or replace function public.recalcular_valor_jugador(p_player_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_valor numeric;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede hacer esto.');
  end if;

  -- `where id = ...` también satisface pg_safeupdate (ver 0032).
  update players
  set valor_mercado = public.calcular_valor_inicial(elo, anio_nacimiento)
  where id = p_player_id
  returning valor_mercado into v_valor;

  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Jugador no encontrado.');
  end if;

  return jsonb_build_object('ok', true, 'valor', v_valor);
end;
$$;

revoke all on function public.recalcular_valor_jugador(uuid) from public, anon;
grant execute on function public.recalcular_valor_jugador(uuid) to authenticated;
