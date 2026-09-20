-- Fórmula del valor inicial, versión 2: sin techo y con la curva más
-- equilibrada. Sustituye a la de 0010 (que saturaba en 100 M y limitaba
-- todo a 120 M). Requiere haber aplicado 0010.
--
--   curva(Elo) = valor_min + elo_k * ((Elo - elo_min) / 100) ^ elo_exponente
--
-- Con elo_exponente < 1 la curva es cóncava: sube más rápido en los Elos
-- bajos-medios que en los altos, pero sin aplanarse del todo, así que entre
-- los mejores jugadores también hay diferencias claras. elo_k es lo que se
-- gana en los primeros 100 puntos de Elo por encima de elo_min.
--
--   valor = curva(Elo) x multiplicador(edad)     (multiplicador: ver 0010)
--
-- No hay valor máximo. Si algún día se quiere uno, basta añadir la clave
-- "valor_max" al JSON de game_config (p. ej. jsonb_set(valor, '{valor_max}', '150')).

insert into game_config (clave, valor) values (
  'valor_inicial',
  jsonb_build_object(
    'valor_min', 10,
    'elo_min', 1400,
    'elo_k', 28,
    'elo_exponente', 0.65,
    'elo_por_defecto', 1500,
    'edad_referencia', 25,
    'juventud_intensidad', 0.8,
    'juventud_max', 2.0,
    'veteranos_desde', 55,
    'veteranos_por_anio', 0.006,
    'veteranos_min', 0.75
  )
)
on conflict (clave) do update set valor = excluded.valor, updated_at = now();

create or replace function public.calcular_valor_inicial(
  p_elo integer,
  p_anio_nacimiento integer default null
)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  c jsonb := coalesce((select valor from game_config where clave = 'valor_inicial'), '{}'::jsonb);
  v_min numeric := coalesce((c ->> 'valor_min')::numeric, 10);
  v_max numeric := (c ->> 'valor_max')::numeric;  -- null = sin techo
  v_elo_min numeric := coalesce((c ->> 'elo_min')::numeric, 1400);
  v_k numeric := coalesce((c ->> 'elo_k')::numeric, 28);
  v_exponente numeric := coalesce((c ->> 'elo_exponente')::numeric, 0.65);
  v_elo_defecto numeric := coalesce((c ->> 'elo_por_defecto')::numeric, 1500);
  v_edad_ref numeric := coalesce((c ->> 'edad_referencia')::numeric, 25);
  v_juv_intensidad numeric := coalesce((c ->> 'juventud_intensidad')::numeric, 0.8);
  v_juv_max numeric := coalesce((c ->> 'juventud_max')::numeric, 2.0);
  v_vet_desde numeric := coalesce((c ->> 'veteranos_desde')::numeric, 55);
  v_vet_por_anio numeric := coalesce((c ->> 'veteranos_por_anio')::numeric, 0.006);
  v_vet_min numeric := coalesce((c ->> 'veteranos_min')::numeric, 0.75);
  v_anio_ref integer := coalesce((c ->> 'anio_referencia')::integer, extract(year from current_date)::integer);
  v_elo numeric;
  v_edad numeric;
  v_mult numeric := 1;
  v_valor numeric;
begin
  v_elo := case when coalesce(p_elo, 0) > 0 then p_elo else v_elo_defecto end;

  v_valor := v_min + v_k * power(greatest(v_elo - v_elo_min, 0) / 100, v_exponente);

  if p_anio_nacimiento is not null then
    v_edad := v_anio_ref - p_anio_nacimiento;
    if v_edad between 5 and 110 then
      if v_edad < v_edad_ref then
        v_mult := least(1 + v_juv_intensidad * ln(v_edad_ref / v_edad), v_juv_max);
      elsif v_edad > v_vet_desde then
        v_mult := greatest(1 - v_vet_por_anio * (v_edad - v_vet_desde), v_vet_min);
      end if;
    end if;
  end if;

  v_valor := greatest(v_valor * v_mult, v_min);
  if v_max is not null then
    v_valor := least(v_valor, v_max);
  end if;

  return round(v_valor);
end;
$$;
