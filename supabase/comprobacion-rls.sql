-- Comprobación de RLS: qué filas ve cada tipo de usuario en las 22 tablas con políticas tocadas por 0121.
-- Solo LEE. Crea una tabla temporal y termina con rollback: no deja nada en la base de datos.
-- Se ejecuta en el SQL Editor de Supabase ANTES y DESPUÉS de aplicar 0121. Las dos salidas deben ser IDÉNTICAS
-- (mismo número de filas y misma huella por usuario y tabla). Si algo difiere, no sigas y avísame.
begin;
create temp table res(usuario text, tabla text, filas bigint, huella text);
do $$
declare
  u text; t text; n bigint; h text;
  usuarios text[] := array[
    '4713240b-44d2-4975-839a-a8fc37b7cad1', -- root
    'cf5d6c84-c6ad-4c02-afc8-aff6531206a8', -- manager con varias ligas privadas
    '18898fc7-654c-4409-8f38-dc000875c894', -- manager con una privada y la pública
    '048744b1-ea04-4a87-9357-e140b1adfd49', -- manager solo en la pública
    '0b5b86f5-9839-4422-ba87-56c522a6d8be'  -- manager sin equipo
  ];
  tablas text[] := array['bids','config_liga','consentimientos','fantasy_teams','leagues','liga_categorias',
    'liga_sanciones','market_listings','notificaciones','operations_log','pagos_semana','player_offers','profiles',
    'pronosticos','push_suscripciones','rachas','recompensas_diarias','squad_slots','sugerencias','ventas_maquina',
    'xp_movimientos','xp_usuarios'];
begin
  foreach u in array usuarios loop
    foreach t in array tablas loop
      set local role authenticated;
      perform set_config('request.jwt.claim.sub', u, true);
      perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
      execute format('select count(*), md5(coalesce(string_agg(x::text, '','' order by x::text), '''')) from public.%I x', t) into n, h;
      reset role;
      insert into res values (u, t, n, h);
    end loop;
  end loop;
end $$;
-- 1) Resumen: una huella por usuario. Antes y después deben coincidir las 5.
select left(usuario, 4) as usuario, count(*) as tablas, sum(filas) as filas_total,
       left(md5(string_agg(tabla || ':' || filas || ':' || huella, ',' order by tabla)), 12) as huella
from res group by usuario order by usuario;
-- 2) Detalle (por si una huella difiere y hay que ver en qué tabla).
-- select left(usuario,4) u, tabla, filas, left(huella,8) h from res order by usuario, tabla;
rollback;
