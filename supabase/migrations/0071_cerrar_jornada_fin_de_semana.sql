-- 0068: la JORNADA es el fin de semana completo (todos sus torneos), y es la
-- jornada la que se cierra y se paga. Sustituye al diseño de 0067, donde se
-- terminaba cada ronda de cada torneo por separado.
--
-- Vocabulario:
--   - Ronda   = una fila de matchdays (la ronda 2 de un torneo).
--   - Jornada = el fin de semana: todas las rondas de todos los torneos que se
--               juegan el mismo sábado/domingo. Se numera 1, 2, 3... por orden.
--               Se identifica por el sábado ("semana", la misma que usa
--               matchday_lineups.semana desde 0055/0059).
--
-- Al cerrar una jornada cada equipo cobra millones_por_punto x los puntos que
-- ha hecho en el fin de semana (game_config 'pago_jornada', 1 M por punto), con
-- una única notificación privada 'pago_jornada' por equipo.
--
-- Esta migración es autosuficiente: funciona tanto si ya ejecutaste la 0067 como
-- si no. Si la 0067 llegó a pagar algo, aquí se devuelve antes de pasar al nuevo
-- sistema (los managers no se quedan con ese dinero).

-- 0) Limpieza del diseño anterior (0067) -----------------------------------------
drop trigger if exists devolver_pagos_al_borrar_jornada_trg on public.matchdays;
drop function if exists public.devolver_pagos_al_borrar_jornada();
drop function if exists public.terminar_jornada(uuid);
drop function if exists public.sincronizar_pagos_jornada(uuid);

do $$
begin
  if to_regclass('public.pagos_jornada') is not null then
    update public.fantasy_teams f
    set presupuesto = f.presupuesto - pj.total
    from (
      select fantasy_team_id, sum(importe) as total
      from public.pagos_jornada
      group by fantasy_team_id
    ) pj
    where pj.fantasy_team_id = f.id;

    drop table public.pagos_jornada;
  end if;
end $$;

delete from public.notificaciones where tipo = 'pago_jornada';
alter table public.matchdays drop column if exists terminada_en;

-- 1) Parámetro y tipo de notificación (por si no se ejecutó la 0067) ------------------
insert into public.game_config (clave, valor)
values ('pago_jornada', jsonb_build_object('millones_por_punto', 1))
on conflict (clave) do nothing;

alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check
  check (tipo in (
    'oferta_recibida', 'fichaje', 'clausulazo', 'clausula_subida',
    'oferta_rechazada', 'actualizacion_elo', 'pago_jornada'
  ));

-- 2) Jornadas cerradas y pagos ------------------------------------------------------
create table if not exists public.jornadas_cerradas (
  semana date primary key,
  terminada_en timestamptz not null default now()
);

alter table public.jornadas_cerradas enable row level security;

drop policy if exists "lectura jornadas cerradas" on public.jornadas_cerradas;
create policy "lectura jornadas cerradas" on public.jornadas_cerradas
  for select to authenticated using (true);

create table if not exists public.pagos_semana (
  semana date not null,
  fantasy_team_id uuid not null references public.fantasy_teams (id) on delete cascade,
  puntos integer not null,
  importe numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (semana, fantasy_team_id)
);

alter table public.pagos_semana enable row level security;

drop policy if exists "ver mis pagos de jornada" on public.pagos_semana;
create policy "ver mis pagos de jornada" on public.pagos_semana
  for select to authenticated
  using (
    fantasy_team_id in (select id from public.fantasy_teams where owner_id = auth.uid())
    or public.es_root()
  );

-- 3) Qué jornada (fin de semana) es cada ronda ---------------------------------------
-- Una fila por ronda: su sábado, el número de jornada (1, 2, 3... por orden) y si
-- esa jornada está cerrada. La semana es la de su foto de alineaciones; si la
-- ronda aún no tiene (ningún equipo), la del día en que se creó.
create or replace function public.jornadas_semanales()
returns table (matchday_id uuid, semana date, numero integer, terminada_en timestamptz)
language sql
stable
security definer set search_path = public
as $$
  with md as (
    select
      m.id,
      coalesce(
        (select max(ml.semana) from matchday_lineups ml where ml.matchday_id = m.id),
        public.semana_de(m.created_at)
      ) as semana
    from matchdays m
  ),
  num as (
    select s.semana, (dense_rank() over (order by s.semana))::integer as numero
    from (select distinct semana from md) s
  )
  select md.id, md.semana, num.numero, jc.terminada_en
  from md
  join num on num.semana = md.semana
  left join jornadas_cerradas jc on jc.semana = md.semana;
$$;

grant execute on function public.jornadas_semanales() to authenticated;

-- 4) Sincroniza lo pagado de UNA jornada con los puntos actuales ------------------------
--    Interna (sin grant). Ingresa o devuelve solo la diferencia con lo ya pagado.
--    p_excluir: ronda que se está borrando (no cuenta para los puntos).
create or replace function public.sincronizar_pagos_semana(p_semana date, p_excluir uuid default null)
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
  r record;
  v_nuevo numeric;
  v_delta numeric;
begin
  select js.numero into v_numero
  from jornadas_semanales() js
  where js.semana = p_semana
  limit 1;

  for r in
    with pts as (
      select tmp.fantasy_team_id, sum(tmp.puntos)::integer as puntos
      from team_matchday_points tmp
      where tmp.matchday_id in (
        select js.matchday_id
        from jornadas_semanales() js
        where js.semana = p_semana
          and js.matchday_id is distinct from p_excluir
      )
      group by tmp.fantasy_team_id
    )
    select
      ft.id as equipo_id,
      ft.league_id,
      coalesce(pts.puntos, 0) as puntos,
      ps.importe as pagado
    from fantasy_teams ft
    left join pts on pts.fantasy_team_id = ft.id
    left join pagos_semana ps on ps.semana = p_semana and ps.fantasy_team_id = ft.id
    where pts.fantasy_team_id is not null or ps.fantasy_team_id is not null
  loop
    v_nuevo := round(r.puntos * v_tarifa, 2);
    v_delta := v_nuevo - coalesce(r.pagado, 0);

    if r.pagado is not null and v_delta = 0 then
      continue;
    end if;

    insert into pagos_semana (semana, fantasy_team_id, puntos, importe)
    values (p_semana, r.equipo_id, r.puntos, v_nuevo)
    on conflict (semana, fantasy_team_id)
    do update set puntos = excluded.puntos, importe = excluded.importe, updated_at = now();

    if v_delta <> 0 then
      update fantasy_teams set presupuesto = presupuesto + v_delta where id = r.equipo_id;

      insert into notificaciones (league_id, tipo, objetivo_team_id, importe, privada, datos)
      values (
        r.league_id, 'pago_jornada', r.equipo_id, v_delta, true,
        jsonb_build_object(
          'semana', p_semana,
          'jornada', v_numero,
          'puntos', r.puntos,
          'correccion', r.pagado is not null
        )
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.sincronizar_pagos_semana(date, uuid) from public, anon, authenticated;

-- 5) Cerrar jornada ------------------------------------------------------------------
-- Si ya estaba cerrada, recalcula (útil tras corregir un resultado).
create or replace function public.cerrar_jornada(p_semana date)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_ya boolean;
  v_equipos integer;
  v_puntos integer;
  v_millones numeric;
begin
  if not (public.es_root() or coalesce(auth.role(), '') = 'service_role') then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador puede hacer esto.');
  end if;

  if not exists (select 1 from jornadas_semanales() js where js.semana = p_semana) then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa jornada ya no existe.');
  end if;

  v_ya := exists (select 1 from jornadas_cerradas where semana = p_semana);
  insert into jornadas_cerradas (semana) values (p_semana) on conflict (semana) do nothing;

  perform public.sincronizar_pagos_semana(p_semana);

  select count(*) filter (where importe > 0), coalesce(sum(puntos), 0), coalesce(sum(importe), 0)
  into v_equipos, v_puntos, v_millones
  from pagos_semana
  where semana = p_semana;

  return jsonb_build_object(
    'ok', true,
    'ya_cerrada', v_ya,
    'equipos_pagados', v_equipos,
    'puntos', v_puntos,
    'millones', v_millones
  );
end;
$$;

grant execute on function public.cerrar_jornada(date) to authenticated;

-- 6) Borrar una ronda de una jornada ya cerrada reajusta los pagos --------------------
-- (sus puntos dejan de contar). Si era la única ronda del fin de semana, la
-- jornada desaparece y se devuelve todo lo pagado.
create or replace function public.reajustar_pagos_al_borrar_ronda()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_semana date;
  v_quedan integer;
begin
  select js.semana into v_semana from jornadas_semanales() js where js.matchday_id = old.id;

  if v_semana is not null and exists (select 1 from jornadas_cerradas where semana = v_semana) then
    perform public.sincronizar_pagos_semana(v_semana, old.id);

    select count(*) into v_quedan
    from jornadas_semanales() js
    where js.semana = v_semana and js.matchday_id <> old.id;

    if v_quedan = 0 then
      delete from jornadas_cerradas where semana = v_semana;
      delete from pagos_semana where semana = v_semana;
    end if;
  end if;

  return old;
end;
$$;

drop trigger if exists reajustar_pagos_al_borrar_ronda_trg on public.matchdays;
create trigger reajustar_pagos_al_borrar_ronda_trg
  before delete on public.matchdays
  for each row execute function public.reajustar_pagos_al_borrar_ronda();
