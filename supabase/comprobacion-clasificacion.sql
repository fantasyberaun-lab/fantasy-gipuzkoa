-- Comprobación de la clasificación: una huella por liga (equipos, puntos totales, sanciones e historial).
-- Solo LEE. Crea una tabla temporal y termina con rollback: no deja nada en la base de datos.
-- Ejecútalo en el SQL Editor de Supabase ANTES y DESPUÉS de aplicar 0122. Las huellas deben coincidir.
-- (Si entre una ejecución y otra se han cargado resultados o sanciones, esa liga puede cambiar: es normal.)
begin;
create temp table res(liga text, equipos bigint, puntos_total bigint, filas_historial bigint, huella text);
do $$
declare l record; u uuid; n bigint; pt bigint; fh bigint; h text;
begin
  for l in select id from leagues order by id loop
    select owner_id into u from fantasy_teams where league_id = l.id order by id limit 1;
    if u is null then continue; end if;
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', u::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    select count(*), coalesce(sum(puntos_totales), 0), coalesce(sum(jsonb_array_length(historial_puntos)), 0),
           md5(coalesce(string_agg(c::text, ',' order by c.equipo_id), ''))
      into n, pt, fh, h
      from public.clasificacion(l.id) c;
    reset role;
    insert into res values (left(l.id::text, 8), n, pt, fh, h);
  end loop;
end $$;
select liga, equipos, puntos_total, filas_historial, left(huella, 12) as huella from res order by liga;
rollback;
