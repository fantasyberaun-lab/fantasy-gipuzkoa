-- 0143: modo PRUEBA del Mundial para usuarios concretos (sin encender el evento para todos).
--
-- Para qué: ver y probar el evento (pestaña Match en lugar de Plantilla, Mercado oculto,
-- votar, ver resultados, histórico) con UNA cuenta, mientras el resto de usuarios sigue
-- exactamente igual que ahora (mundial_evento.activo = false).
--
-- Cómo: tabla mundial_preview (una fila por usuario en prueba). Las funciones del cliente
-- (mundial_config, mundial_match, guardar_pronostico_mundial, guardar_voto_final_mundial)
-- tratan el evento como "activo + modo match + con desempate" SOLO para quien tenga fila ahí.
-- Para todos los demás el resultado es idéntico al de 0141.
--
-- Aplicar NO activa nada: la tabla queda vacía. Se activa/desactiva a mano con los scripts
-- "activar-prueba" y "restaurar-prueba" (SQL Editor), que además tocan el saldo, iconos y el
-- histórico de ESA cuenta y los restauran.
--
-- También arregla una fuga de 0141 que habría salido a la luz con las pruebas: la lista del
-- Histórico mostraba "Mundial" a todo el mundo en cuanto existía cualquier pronóstico. Ahora
-- solo aparece con el evento activo/cerrado o para quien esté en prueba. Y los archivos de
-- clasificación pueden marcarse "visible solo para un usuario" (visible_solo_para), que es lo
-- que usa la prueba para enseñar un "Primera liga (PRUEBA)" a una sola cuenta.
--
-- Requiere 0141 (y por tanto 0140). APLICAR DESPUÉS DE 0141.
-- Impacto en datos existentes: ninguno (tabla nueva vacía, una columna nueva que admite null).

-- 1) Tabla de usuarios en prueba ---------------------------------------------------------
create table if not exists public.mundial_preview (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  fantasy_team_id uuid references public.fantasy_teams (id) on delete set null,
  saldo_previo numeric,
  saldo_aplicado numeric,
  avatar_previo text,
  creado_en timestamptz not null default now()
);

alter table public.mundial_preview enable row level security;
-- Sin políticas: nadie la lee desde el navegador. Solo funciones SECURITY DEFINER / SQL Editor.
revoke all on public.mundial_preview from anon, authenticated;

create or replace function public.mundial_en_prueba(p_uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select p_uid is not null and exists (select 1 from mundial_preview where user_id = p_uid);
$$;
revoke all on function public.mundial_en_prueba(uuid) from public, anon, authenticated;

-- 2) Archivos de clasificación visibles solo para un usuario ---------------------------------
alter table public.clasificacion_archivos
  add column if not exists visible_solo_para uuid references auth.users (id) on delete cascade;

-- 3) Funciones del cliente (iguales a 0141 salvo el bloque marcado "PRUEBA") -----------------

create or replace function public.mundial_config()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'activo', e.activo or p.en,
    'modo_match', (e.activo and e.modo_match) or p.en,
    'nombre', e.nombre
  )
  from mundial_evento e,
       (select public.mundial_en_prueba(auth.uid()) as en) p
  where e.id = 1 and auth.uid() is not null;
$$;
revoke all on function public.mundial_config() from public, anon;
grant execute on function public.mundial_config() to authenticated;

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
    v_e.desempate_activo := true;
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

create or replace function public.guardar_pronostico_mundial(p_partida uuid, p_pronostico text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e mundial_evento%rowtype;
  v_hay boolean;
  v_pa mundial_partidas%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para pronosticar.');
  end if;
  if p_pronostico is not null and p_pronostico not in ('tablas', 'gukesh', 'sindarov') then
    return jsonb_build_object('ok', false, 'mensaje', 'Pronóstico no válido.');
  end if;
  select * into v_e from mundial_evento where id = 1;
  v_hay := found;
  if v_hay and public.mundial_en_prueba(v_uid) then   -- PRUEBA
    v_e.activo := true;
  end if;
  if not v_hay or not v_e.activo then
    return jsonb_build_object('ok', false, 'mensaje', 'El evento no está activo.');
  end if;
  select * into v_pa from mundial_partidas where id = p_partida;
  if not found or v_pa.tipo <> 'partida' or v_pa.inicio is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa partida no se puede pronosticar.');
  end if;
  if v_pa.resultado is not null
     or now() >= v_pa.inicio - make_interval(mins => v_e.cierre_minutos) then
    return jsonb_build_object('ok', false, 'mensaje', 'Los pronósticos de esta partida ya están cerrados.');
  end if;

  if p_pronostico is null then
    delete from mundial_pronosticos where user_id = v_uid and partida_id = p_partida;
  else
    insert into mundial_pronosticos (user_id, partida_id, pronostico)
    values (v_uid, p_partida, p_pronostico)
    on conflict (user_id, partida_id)
    do update set pronostico = excluded.pronostico, updated_at = now();
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.guardar_pronostico_mundial(uuid, text) from public, anon;
grant execute on function public.guardar_pronostico_mundial(uuid, text) to authenticated;

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
    v_e.desempate_activo := true;
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
    and (e.activo or e.cerrado_en is not null or public.mundial_en_prueba(auth.uid()))
  order by 4 desc;
$$;
revoke all on function public.historico_clasificaciones() from public, anon;
grant execute on function public.historico_clasificaciones() to authenticated;

create or replace function public.historico_clasificacion(p_id text)
returns table (
  posicion integer, nombre_equipo text, nombre_manager text, puntos integer,
  aciertos integer, jugadas integer, es_yo boolean
)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uuid uuid;
begin
  if auth.uid() is null then return; end if;

  if p_id = 'mundial' then
    if not (public.mundial_en_prueba(auth.uid()) or exists (
          select 1 from mundial_evento e where e.activo or e.cerrado_en is not null)) then
      return;
    end if;
    return query
      select c.posicion, null::text, c.nombre_manager, c.puntos, c.aciertos, c.jugadas, c.es_yo
      from public.mundial_clasificacion() c;
    return;
  end if;

  begin
    v_uuid := p_id::uuid;
  exception when others then
    return;
  end;

  if not exists (
        select 1 from clasificacion_archivos a
        where a.id = v_uuid
          and (
            a.visible_solo_para = auth.uid()
            or (a.visible_solo_para is null
                and (public.es_root() or exists (
                       select 1 from clasificacion_archivo_filas f
                       where f.archivo_id = a.id and f.user_id = auth.uid())))
          )) then
    return;
  end if;

  return query
    select f.posicion, f.nombre_equipo, f.nombre_manager, f.puntos, null::integer, null::integer,
           f.user_id = auth.uid()
    from clasificacion_archivo_filas f
    where f.archivo_id = v_uuid
    order by f.posicion;
end;
$$;
revoke all on function public.historico_clasificacion(text) from public, anon;
grant execute on function public.historico_clasificacion(text) to authenticated;
