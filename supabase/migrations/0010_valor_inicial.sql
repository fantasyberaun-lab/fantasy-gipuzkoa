-- Fórmula del valor de mercado INICIAL de los jugadores.
--
--   valor = curva(Elo) x multiplicador(edad), redondeado a millones enteros
--           y acotado entre valor_min y valor_max_final.
--
-- La curva es cóncava y satura: sube muy rápido en los Elos bajos-medios
-- (donde está casi todo el mundo) y se aplana hacia lo más alto.
--
--   curva(Elo) = valor_min + (valor_max_curva - valor_min)
--                            * (1 - exp(-(Elo - elo_min) / elo_escala))
--
--   multiplicador(edad):
--     edad < edad_referencia : 1 + juventud_intensidad * ln(edad_referencia / edad)
--                              (con tope juventud_max)
--     edad_referencia..veteranos_desde : 1
--     edad > veteranos_desde : 1 - veteranos_por_anio * (edad - veteranos_desde)
--                              (con suelo veteranos_min)
--
-- Sin año de nacimiento, el multiplicador es 1. Sin Elo (elo = 0) se usa
-- elo_por_defecto. Todos los parámetros viven en game_config (clave
-- 'valor_inicial') y se pueden cambiar sin tocar código; los que falten
-- toman el valor por defecto de abajo.

alter table players add column if not exists anio_nacimiento integer
  check (anio_nacimiento is null or anio_nacimiento between 1900 and 2100);

insert into game_config (clave, valor) values
  ('valor_inicial', jsonb_build_object(
    'valor_min', 10,
    'valor_max_curva', 100,
    'valor_max_final', 120,
    'elo_min', 1400,
    'elo_escala', 293,
    'elo_por_defecto', 1500,
    'edad_referencia', 25,
    'juventud_intensidad', 0.8,
    'juventud_max', 2.0,
    'veteranos_desde', 55,
    'veteranos_por_anio', 0.006,
    'veteranos_min', 0.75
  )),
  ('presupuesto_inicial', '250'::jsonb)
on conflict (clave) do nothing;

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
  v_max_curva numeric := coalesce((c ->> 'valor_max_curva')::numeric, 100);
  v_max_final numeric := coalesce((c ->> 'valor_max_final')::numeric, 120);
  v_elo_min numeric := coalesce((c ->> 'elo_min')::numeric, 1400);
  v_escala numeric := coalesce((c ->> 'elo_escala')::numeric, 293);
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

  v_valor := v_min + (v_max_curva - v_min)
             * (1 - exp(-greatest(v_elo - v_elo_min, 0) / v_escala));

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

  return round(least(greatest(v_valor * v_mult, v_min), v_max_final));
end;
$$;

-- Recalcula el valor de TODOS los jugadores con la fórmula. Solo root, y
-- solo antes de que empiece la competición: en cuanto hay resultados, los
-- valores evolucionan con el rendimiento (punto 8 del reglamento) y
-- sobrescribirlos borraría esa evolución.
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

  update players set valor_mercado = public.calcular_valor_inicial(elo, anio_nacimiento);
  get diagnostics v_actualizados = row_count;

  return jsonb_build_object('ok', true, 'actualizados', v_actualizados);
end;
$$;

revoke all on function public.recalcular_valores_iniciales() from public, anon;
grant execute on function public.recalcular_valores_iniciales() to authenticated;

-- El presupuesto inicial deja de estar fijo (100) en el trigger de registro
-- y pasa a leerse de game_config ('presupuesto_inicial'). Con la escala de
-- valores nueva, 100 M ya no alcanza ni para un jugador medio.
-- Solo afecta a los managers que se registren a partir de ahora.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_presupuesto numeric := coalesce(
    (select (valor #>> '{}')::numeric from game_config where clave = 'presupuesto_inicial'),
    100
  );
begin
  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    'manager'
  );

  insert into public.fantasy_teams (owner_id, nombre, presupuesto)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_equipo', 'Mi equipo'),
    v_presupuesto
  )
  returning id into v_equipo_id;

  perform public.asignar_plantilla_inicial(v_equipo_id);

  return new;
end;
$$;
