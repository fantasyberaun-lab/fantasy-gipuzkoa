-- 0147: el icono de Sindarov solo se concede a quien haya pronosticado en al menos una
-- partida (ronda) del Campeonato del Mundo.
--
-- Antes (0141) "participante" era quien tenía al menos un pronóstico O un voto del campeón
-- (mundial_voto_final). Ahora cuenta solo tener al menos una fila en mundial_pronosticos,
-- que solo se puede crear sobre una partida normal (guardar_pronostico_mundial exige
-- tipo = 'partida'). Quien solo votó al campeón y nunca pronosticó una ronda ya no lo recibe.
--
-- Sigue siendo manual (botón "Conceder icono" de Admin > Mundial), idempotente (solo añade a
-- quien aún no lo tenga) y solo para root. Mismo nombre y misma firma que en 0141.
--
-- Requiere 0141. Impacto en datos existentes: ninguno (solo redefine una función; no concede
-- ni borra ningún icono por sí misma).

create or replace function public.admin_mundial_conceder_icono()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_nuevos integer;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador.');
  end if;
  insert into iconos_desbloqueados (user_id, icono, origen, edicion)
  select distinct p.user_id, 'sindarov', 'evento', 'mundial-2026'
  from mundial_pronosticos p
  join mundial_partidas pa on pa.id = p.partida_id and pa.tipo = 'partida'
  join profiles pr on pr.id = p.user_id
  on conflict (user_id, icono) do nothing;
  get diagnostics v_nuevos = row_count;
  update mundial_evento set icono_concedido_en = coalesce(icono_concedido_en, now()) where id = 1;
  return jsonb_build_object('ok', true, 'nuevos', v_nuevos,
    'total', (select count(*) from iconos_desbloqueados where icono = 'sindarov'));
end;
$$;
revoke all on function public.admin_mundial_conceder_icono() from public, anon;
grant execute on function public.admin_mundial_conceder_icono() to authenticated;

-- Consulta de comprobación (solo lectura, no la ejecuta la migración): quiénes lo recibirían.
--   select count(distinct p.user_id) from mundial_pronosticos p
--     join mundial_partidas pa on pa.id = p.partida_id and pa.tipo = 'partida';
