-- 0078: cada ronda guarda el día en que se juega, y su jornada (fin de semana)
-- sale de ese día y no del momento en que se crea.
--
-- PROBLEMA: la ronda siguiente se crea en cuanto salen los emparejamientos,
-- normalmente el mismo fin de semana en que acaba la anterior. snapshot_alineaciones()
-- (0059) deducía el fin de semana de created_at (o de la foto de los últimos
-- 5 días), así que la ronda 2 creada el sábado 3 por la noche quedaba en la
-- jornada del 3 aunque se jugara el 10. Consecuencias:
--   - la clasificación por jornada metía los puntos en el fin de semana equivocado;
--   - la regla de "solo cuenta la mejor partida del fin de semana" (0055) juntaba
--     las dos rondas y solo puntuaba una;
--   - la foto del sábado a las 16:00 no rehacía esas rondas (miraba ml.semana) y
--     se puntuaban con la alineación de la semana anterior;
--   - el pago de la jornada (0071) mezclaba dos fines de semana.
--
-- ARREGLO:
--   1) sabado_de(fecha): sábado del fin de semana de un día (lunes a viernes ->
--      el sábado siguiente; sábado y domingo -> ese sábado).
--   2) semana_de_ronda(id): fin de semana de una ronda. Sale de
--      matchdays.fecha_inicio (que ya existía y no se usaba); si la ronda no
--      tiene fecha, como antes (sus alineaciones o el día en que se creó).
--   3) rehacer_alineaciones_ronda(id): rehace la foto de titulares de una ronda
--      para SU fin de semana: la foto del sábado si ya se ha tomado; si no, la
--      plantilla de ahora (provisional, la foto de las 16:00 la sustituye).
--   4) Al crear una ronda (trigger de 0018) y al cambiarle la fecha se llama a 3).
--      No se puede cambiar la fecha de una ronda que ya tiene resultados o
--      descansos, para no cambiar a toro pasado quién puntuó.
--   5) registrar_alineaciones_semanales() (foto del sábado a las 16:00) rehace
--      las rondas de ese fin de semana según su fecha, no según ml.semana.
--   6) jornadas_semanales() usa la fecha de la ronda si la tiene.
--
-- Datos existentes: no se toca ninguna ronda. Las que no tienen fecha siguen
-- igual; al ponerles fecha desde el panel de admin se recolocan (si aún no
-- tienen resultados). El panel pide la fecha al crear rondas nuevas.
--
-- Se puede lanzar con `supabase db push` o pegarla en el SQL Editor.

-- 1) Sábado del fin de semana de un día ----------------------------------------
create or replace function public.sabado_de(p_fecha date)
returns date
language sql
immutable
as $$
  select (date_trunc('week', p_fecha::timestamp))::date + 5;
$$;

-- 2) Fin de semana de una ronda -----------------------------------------------
create or replace function public.semana_de_ronda(p_matchday_id uuid)
returns date
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    public.sabado_de(m.fecha_inicio),
    (select max(ml.semana) from matchday_lineups ml where ml.matchday_id = m.id),
    public.semana_de(m.created_at)
  )
  from matchdays m
  where m.id = p_matchday_id;
$$;

revoke all on function public.semana_de_ronda(uuid) from public, anon;
grant execute on function public.semana_de_ronda(uuid) to authenticated;

-- 3) Foto de titulares de una ronda para su fin de semana ------------------------
create or replace function public.rehacer_alineaciones_ronda(p_matchday_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_fecha date;
  v_creada timestamptz;
  v_semana date;
begin
  select fecha_inicio, created_at into v_fecha, v_creada
  from matchdays where id = p_matchday_id;

  -- Sin fecha (rondas antiguas o creadas fuera del panel): el día de creación.
  v_semana := coalesce(public.sabado_de(v_fecha), public.semana_de(v_creada));

  delete from matchday_lineups where matchday_id = p_matchday_id;

  if exists (select 1 from weekly_lineups wl where wl.semana = v_semana) then
    insert into matchday_lineups (matchday_id, fantasy_team_id, player_id, es_capitan, semana)
    select p_matchday_id, wl.fantasy_team_id, wl.player_id, wl.es_capitan, v_semana
    from weekly_lineups wl
    where wl.semana = v_semana;
  else
    -- Aún no hay foto de ese sábado: plantilla de ahora, provisional.
    insert into matchday_lineups (matchday_id, fantasy_team_id, player_id, es_capitan, semana)
    select p_matchday_id, ss.fantasy_team_id, ss.player_id, ss.capitan, v_semana
    from squad_slots ss
    where ss.fecha_salida is null and ss.titular = true;
  end if;
end;
$$;

revoke all on function public.rehacer_alineaciones_ronda(uuid) from public, anon, authenticated;

-- 4) Al crear una ronda y al cambiarle la fecha ---------------------------------
-- El trigger de creación (0018, after insert) sigue llamando a esta función.
create or replace function public.snapshot_alineaciones()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.rehacer_alineaciones_ronda(new.id);
  return new;
end;
$$;

create or replace function public.cambiar_fecha_ronda()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from results r where r.matchday_id = new.id)
     or exists (select 1 from matchday_byes b where b.matchday_id = new.id) then
    raise exception 'Esta ronda ya tiene resultados: borra sus resultados antes de cambiarle la fecha.';
  end if;

  perform public.rehacer_alineaciones_ronda(new.id);
  return new;
end;
$$;

drop trigger if exists cambiar_fecha_ronda_trg on public.matchdays;
create trigger cambiar_fecha_ronda_trg
  after update of fecha_inicio on public.matchdays
  for each row
  when (old.fecha_inicio is distinct from new.fecha_inicio)
  execute function public.cambiar_fecha_ronda();

-- 5) Foto del sábado a las 16:00 ------------------------------------------------
-- Igual que en 0059, pero las rondas de este fin de semana se buscan por su
-- fecha (semana_de_ronda) y no por la semana que tuvieran apuntada.
create or replace function public.registrar_alineaciones_semanales()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_semana date := (now() at time zone 'Europe/Madrid')::date;
  v_filas integer;
  v_ronda uuid;
begin
  insert into weekly_lineups (semana, fantasy_team_id, player_id, es_capitan)
  select v_semana, ss.fantasy_team_id, ss.player_id, ss.capitan
  from squad_slots ss
  where ss.fecha_salida is null and ss.titular = true
  on conflict (semana, fantasy_team_id, player_id) do nothing;

  get diagnostics v_filas = row_count;

  -- Rondas de este fin de semana creadas antes de la foto y todavía sin
  -- ningún resultado ni descanso: se rehacen con la plantilla de las 16:00.
  if v_filas > 0 then
    for v_ronda in
      select m.id
      from matchdays m
      where public.semana_de_ronda(m.id) = v_semana
        and not exists (select 1 from results r where r.matchday_id = m.id)
        and not exists (select 1 from matchday_byes b where b.matchday_id = m.id)
    loop
      perform public.rehacer_alineaciones_ronda(v_ronda);
    end loop;
  end if;

  return v_filas;
end;
$$;

revoke all on function public.registrar_alineaciones_semanales() from public, anon, authenticated;
grant execute on function public.registrar_alineaciones_semanales() to postgres;

-- 6) Jornada (fin de semana) de cada ronda ---------------------------------------
-- Igual que en 0071, pero con la fecha de la ronda por delante.
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
        public.sabado_de(m.fecha_inicio),
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

-- ---------------------------------------------------------------------------
-- Comprobaciones tras ejecutar (SQL Editor):
--
--   -- Rondas, su fecha y su jornada (las nuevas deben tener fecha_inicio):
--   select t.nombre, m.numero, m.fecha_inicio, js.semana, js.numero
--   from matchdays m
--   left join tournaments t on t.id = m.tournament_id
--   left join jornadas_semanales() js on js.matchday_id = m.id
--   order by m.created_at desc limit 15;
-- ---------------------------------------------------------------------------
