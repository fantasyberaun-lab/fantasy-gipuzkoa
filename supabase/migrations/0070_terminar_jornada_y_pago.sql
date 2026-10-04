-- 0067: "Terminar ronda" y pago de millones por punto.
--
-- Cuando el administrador termina una ronda (botón en Admin > Resultados), cada
-- equipo cobra  millones_por_punto x los puntos que ha hecho en esa ronda
-- (game_config 'pago_jornada', por defecto 1 M por punto). Los puntos son los
-- de team_matchday_points (0055): titulares de la foto del sábado, capitán
-- doble y "un jugador solo puntúa en su mejor torneo del fin de semana".
--
-- Qué añade:
--   1) matchdays.terminada_en: cuándo se terminó la ronda (null = abierta).
--   2) pagos_jornada: lo que se ha pagado a cada equipo por cada ronda. Es lo que
--      impide pagar dos veces: terminar de nuevo solo ingresa la DIFERENCIA.
--   3) terminar_jornada(matchday_id): solo root. Paga (o recalcula) y avisa a cada
--      manager con una notificación privada 'pago_jornada'.
--   4) Al borrar una ronda terminada se devuelve lo pagado (y se borra su aviso).
--
-- Corregir resultados de una ronda ya terminada: se vuelve a pulsar el botón
-- ("Recalcular pagos") y cada equipo recibe o devuelve la diferencia.
--
-- Una ronda terminada también recalcula las demás rondas YA terminadas del mismo
-- fin de semana, porque un jugador que juega dos torneos solo puntúa en el mejor
-- y sus puntos pueden pasar de una ronda a otra.
--
-- Requiere 0005 (es_root), 0022 (notificaciones), 0055 (team_matchday_points) y
-- 0061 (notificaciones.datos).

-- 1) Ronda terminada -----------------------------------------------------------
alter table public.matchdays add column if not exists terminada_en timestamptz;

-- 2) Parámetro -----------------------------------------------------------------
insert into public.game_config (clave, valor)
values ('pago_jornada', jsonb_build_object('millones_por_punto', 1))
on conflict (clave) do nothing;

-- 3) Pagos ---------------------------------------------------------------------
create table if not exists public.pagos_jornada (
  matchday_id uuid not null references public.matchdays (id) on delete cascade,
  fantasy_team_id uuid not null references public.fantasy_teams (id) on delete cascade,
  puntos integer not null,
  importe numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (matchday_id, fantasy_team_id)
);

alter table public.pagos_jornada enable row level security;

-- Cada manager ve lo suyo; el root, todo. Solo escriben las funciones de abajo.
drop policy if exists "ver mis pagos de jornada" on public.pagos_jornada;
create policy "ver mis pagos de jornada" on public.pagos_jornada
  for select to authenticated
  using (
    fantasy_team_id in (select id from public.fantasy_teams where owner_id = auth.uid())
    or public.es_root()
  );

-- 4) Nuevo tipo de notificación -------------------------------------------------
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check
  check (tipo in (
    'oferta_recibida', 'fichaje', 'clausulazo', 'clausula_subida',
    'oferta_rechazada', 'actualizacion_elo', 'pago_jornada'
  ));

-- 5) Sincroniza los pagos de UNA ronda con sus puntos actuales -------------------
--    Interna: sin grant. Ingresa (o devuelve) solo la diferencia con lo ya pagado.
create or replace function public.sincronizar_pagos_jornada(p_matchday_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_tarifa numeric := coalesce(
    (select (valor ->> 'millones_por_punto')::numeric from game_config where clave = 'pago_jornada'),
    1
  );
  v_numero integer;
  v_torneo text;
  r record;
  v_nuevo numeric;
  v_delta numeric;
begin
  select m.numero, t.nombre
  into v_numero, v_torneo
  from matchdays m
  left join tournaments t on t.id = m.tournament_id
  where m.id = p_matchday_id;

  for r in
    select
      tmp.fantasy_team_id as equipo_id,
      f.league_id,
      tmp.puntos,
      pj.importe as pagado
    from team_matchday_points tmp
    join fantasy_teams f on f.id = tmp.fantasy_team_id
    left join pagos_jornada pj
      on pj.matchday_id = tmp.matchday_id and pj.fantasy_team_id = tmp.fantasy_team_id
    where tmp.matchday_id = p_matchday_id
  loop
    v_nuevo := round(r.puntos * v_tarifa, 2);
    v_delta := v_nuevo - coalesce(r.pagado, 0);

    -- Ya estaba pagado igual: nada que hacer.
    if r.pagado is not null and v_delta = 0 then
      continue;
    end if;

    insert into pagos_jornada (matchday_id, fantasy_team_id, puntos, importe)
    values (p_matchday_id, r.equipo_id, r.puntos, v_nuevo)
    on conflict (matchday_id, fantasy_team_id)
    do update set puntos = excluded.puntos, importe = excluded.importe, updated_at = now();

    if v_delta <> 0 then
      update fantasy_teams set presupuesto = presupuesto + v_delta where id = r.equipo_id;

      insert into notificaciones (league_id, tipo, objetivo_team_id, importe, privada, datos)
      values (
        r.league_id, 'pago_jornada', r.equipo_id, v_delta, true,
        jsonb_build_object(
          'matchday_id', p_matchday_id,
          'torneo', v_torneo,
          'ronda', v_numero,
          'puntos', r.puntos,
          'correccion', r.pagado is not null
        )
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.sincronizar_pagos_jornada(uuid) from public, anon, authenticated;

-- 6) Terminar ronda --------------------------------------------------------------
create or replace function public.terminar_jornada(p_matchday_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_ya boolean;
  v_otra uuid;
  v_equipos integer;
  v_puntos integer;
  v_millones numeric;
begin
  if not (public.es_root() or coalesce(auth.role(), '') = 'service_role') then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede hacer esto.');
  end if;

  select (terminada_en is not null)
  into v_ya
  from matchdays
  where id = p_matchday_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa ronda ya no existe.');
  end if;

  update matchdays set terminada_en = coalesce(terminada_en, now()) where id = p_matchday_id;

  perform public.sincronizar_pagos_jornada(p_matchday_id);

  -- Otras rondas YA terminadas del mismo fin de semana: sus puntos pueden haberse
  -- movido a esta (un jugador solo puntúa en su mejor torneo).
  for v_otra in
    select distinct m2.id
    from matchday_lineups l1
    join matchday_lineups l2
      on l2.semana = l1.semana and l2.matchday_id <> l1.matchday_id
    join matchdays m2 on m2.id = l2.matchday_id
    where l1.matchday_id = p_matchday_id
      and l1.semana is not null
      and m2.terminada_en is not null
  loop
    perform public.sincronizar_pagos_jornada(v_otra);
  end loop;

  select count(*) filter (where importe > 0), coalesce(sum(puntos), 0), coalesce(sum(importe), 0)
  into v_equipos, v_puntos, v_millones
  from pagos_jornada
  where matchday_id = p_matchday_id;

  return jsonb_build_object(
    'ok', true,
    'ya_terminada', v_ya,
    'equipos_pagados', v_equipos,
    'puntos', v_puntos,
    'millones', v_millones
  );
end;
$$;

grant execute on function public.terminar_jornada(uuid) to authenticated;

-- 7) Borrar una ronda terminada devuelve lo pagado ---------------------------------
create or replace function public.devolver_pagos_al_borrar_jornada()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update fantasy_teams f
  set presupuesto = f.presupuesto - pj.importe
  from pagos_jornada pj
  where pj.matchday_id = old.id and pj.fantasy_team_id = f.id;

  delete from notificaciones
  where tipo = 'pago_jornada' and datos ->> 'matchday_id' = old.id::text;

  return old;
end;
$$;

drop trigger if exists devolver_pagos_al_borrar_jornada_trg on public.matchdays;
create trigger devolver_pagos_al_borrar_jornada_trg
  before delete on public.matchdays
  for each row execute function public.devolver_pagos_al_borrar_jornada();
