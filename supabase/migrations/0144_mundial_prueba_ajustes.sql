-- 0144: ajustes del modo prueba del Mundial (tras probarlo en producción con 0143 aplicada).
--
--  1) En modo prueba YA NO se fuerza el desempate: en ronda normal el usuario en prueba ve las
--     3 opciones (Gukesh / Tablas / Sindarov) y no la votación del campeón. La votación final
--     solo sale cuando el desempate está activo de verdad (Admin > Mundial).
--  2) El Histórico solo enseña "Mundial" cuando el evento ya está CERRADO (con el evento
--     activo, la clasificación del Mundial es la "Actual" de la pestaña Clasificación).
--
-- Requiere 0143. Impacto en datos existentes: ninguno (solo redefine 3 funciones).

create or replace function public.mundial_match()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e mundial_evento%rowtype;
  v_hay boolean;
  v_ahora timestamptz := now();
  v_partidas jsonb;
  v_marc_g numeric := 0;
  v_marc_s numeric := 0;
  v_jugadas integer := 0;
  v_aciertos integer := 0;
  v_resueltas integer := 0;
  v_racha integer := 0;
  v_mejor integer := 0;
  v_corriendo integer := 0;
  v_actual_viva boolean := true;
  v_final_inicio timestamptz;
  v_final_cierre timestamptz;
  v_final_cerrada boolean := false;
  v_mi_voto text;
  v_votos_final jsonb := null;
  r record;
begin
  if v_uid is null then return null; end if;
  select * into v_e from mundial_evento where id = 1;
  v_hay := found;
  -- PRUEBA: para quien esté en mundial_preview el evento se ve encendido (solo en esta respuesta).
  if v_hay and public.mundial_en_prueba(v_uid) then
    v_e.activo := true;
    v_e.modo_match := true;
  end if;
  if not v_hay or not v_e.activo then
    return jsonb_build_object('activo', false);
  end if;

  select coalesce(jsonb_agg(x order by x_fecha), '[]'::jsonb) into v_partidas
  from (
    select pa.fecha as x_fecha,
      jsonb_build_object(
        'id', pa.id, 'tipo', pa.tipo, 'numero', pa.numero, 'fecha', pa.fecha,
        'inicio', pa.inicio,
        'cierre', pa.inicio - make_interval(mins => v_e.cierre_minutos),
        'resultado', pa.resultado,
        'cerrada', pa.inicio is null
                   or v_ahora >= pa.inicio - make_interval(mins => v_e.cierre_minutos)
                   or pa.resultado is not null,
        'mi_pronostico', pr.pronostico,
        'acierto', case when pa.resultado is null or pr.pronostico is null then null
                        else pr.pronostico = pa.resultado end,
        'votos', case
          when pa.tipo = 'partida' and (
                 v_ahora >= pa.inicio - make_interval(mins => v_e.cierre_minutos)
                 or pa.resultado is not null) then
            (select jsonb_build_object(
               'tablas', count(*) filter (where p2.pronostico = 'tablas'),
               'gukesh', count(*) filter (where p2.pronostico = 'gukesh'),
               'sindarov', count(*) filter (where p2.pronostico = 'sindarov'),
               'total', count(*))
             from mundial_pronosticos p2 where p2.partida_id = pa.id)
          else null end
      ) as x
    from mundial_partidas pa
    left join mundial_pronosticos pr on pr.partida_id = pa.id and pr.user_id = v_uid
  ) s;

  for r in
    select pa.resultado, pr.pronostico
    from mundial_partidas pa
    left join mundial_pronosticos pr on pr.partida_id = pa.id and pr.user_id = v_uid
    where pa.tipo = 'partida' and pa.resultado is not null
    order by pa.fecha
  loop
    v_jugadas := v_jugadas + 1;
    if r.resultado = 'gukesh' then v_marc_g := v_marc_g + 1;
    elsif r.resultado = 'sindarov' then v_marc_s := v_marc_s + 1;
    else v_marc_g := v_marc_g + 0.5; v_marc_s := v_marc_s + 0.5;
    end if;
    v_resueltas := v_resueltas + 1;
    if r.pronostico is not null and r.pronostico = r.resultado then
      v_aciertos := v_aciertos + 1;
      v_corriendo := v_corriendo + 1;
      if v_corriendo > v_mejor then v_mejor := v_corriendo; end if;
    else
      v_corriendo := 0;
    end if;
  end loop;
  v_racha := v_corriendo;

  select inicio into v_final_inicio from mundial_partidas where tipo = 'desempate' limit 1;
  v_final_cierre := v_final_inicio - make_interval(mins => v_e.cierre_minutos);
  v_final_cerrada := v_e.resultado_final is not null
                     or v_final_inicio is null or v_ahora >= v_final_cierre;
  select voto into v_mi_voto from mundial_voto_final where user_id = v_uid;
  if v_final_cerrada and v_e.desempate_activo then
    select jsonb_build_object(
      'gukesh', count(*) filter (where voto = 'gukesh'),
      'sindarov', count(*) filter (where voto = 'sindarov'),
      'total', count(*)) into v_votos_final from mundial_voto_final;
  end if;

  return jsonb_build_object(
    'activo', true,
    'nombre', v_e.nombre,
    'modo_match', v_e.modo_match,
    'ahora', v_ahora,
    'cierre_minutos', v_e.cierre_minutos,
    'partidas', v_partidas,
    'marcador', jsonb_build_object('gukesh', v_marc_g, 'sindarov', v_marc_s, 'jugadas', v_jugadas),
    'mis_puntos', public.mundial_puntos_usuario(v_uid),
    'mis_aciertos', v_aciertos,
    'mis_resueltas', v_resueltas,
    'racha', v_racha,
    'mejor_racha', v_mejor,
    'final', jsonb_build_object(
      'desempate_activo', v_e.desempate_activo,
      'inicio', v_final_inicio,
      'cierre', v_final_cierre,
      'cerrada', v_final_cerrada,
      'mi_voto', v_mi_voto,
      'resultado', v_e.resultado_final,
      'acierto', case when v_e.resultado_final is null or v_mi_voto is null then null
                      else v_mi_voto = v_e.resultado_final end,
      'votos', v_votos_final
    )
  );
end;
$$;
revoke all on function public.mundial_match() from public, anon;
grant execute on function public.mundial_match() to authenticated;

create or replace function public.guardar_voto_final_mundial(p_voto text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e mundial_evento%rowtype;
  v_hay boolean;
  v_inicio timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para votar.');
  end if;
  if p_voto is not null and p_voto not in ('gukesh', 'sindarov') then
    return jsonb_build_object('ok', false, 'mensaje', 'Voto no válido.');
  end if;
  select * into v_e from mundial_evento where id = 1;
  v_hay := found;
  if v_hay and public.mundial_en_prueba(v_uid) then   -- PRUEBA
    v_e.activo := true;
  end if;
  if not v_hay or not v_e.activo or not v_e.desempate_activo then
    return jsonb_build_object('ok', false, 'mensaje', 'Ahora no hay votación del campeón.');
  end if;
  select inicio into v_inicio from mundial_partidas where tipo = 'desempate' limit 1;
  if v_e.resultado_final is not null
     or v_inicio is null
     or now() >= v_inicio - make_interval(mins => v_e.cierre_minutos) then
    return jsonb_build_object('ok', false, 'mensaje', 'La votación del campeón ya está cerrada.');
  end if;

  if p_voto is null then
    delete from mundial_voto_final where user_id = v_uid;
  else
    insert into mundial_voto_final (user_id, voto) values (v_uid, p_voto)
    on conflict (user_id) do update set voto = excluded.voto, updated_at = now();
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.guardar_voto_final_mundial(text) from public, anon;
grant execute on function public.guardar_voto_final_mundial(text) to authenticated;

-- 4) Histórico -----------------------------------------------------------------------------

create or replace function public.historico_clasificaciones()
returns table (id text, nombre text, tipo text, fecha timestamptz)
language sql
stable
security definer set search_path = public
as $$
  select a.id::text, a.nombre, 'liga'::text, a.archivada_en
  from clasificacion_archivos a
  where auth.uid() is not null
    and (
      a.visible_solo_para = auth.uid()
      or (a.visible_solo_para is null
          and (public.es_root()
               or exists (select 1 from clasificacion_archivo_filas f
                           where f.archivo_id = a.id and f.user_id = auth.uid())))
    )
  union all
  select 'mundial', e.nombre, 'mundial', coalesce(e.cerrado_en, e.iniciado_en, e.updated_at)
  from mundial_evento e
  where auth.uid() is not null
    and e.cerrado_en is not null and not e.activo and not public.mundial_en_prueba(auth.uid())
  order by 4 desc;
$$;
revoke all on function public.historico_clasificaciones() from public, anon;
grant execute on function public.historico_clasificaciones() to authenticated;

