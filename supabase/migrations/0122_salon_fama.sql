-- 0122: salón de la fama (Fase 3 del plan de engagement).
--
-- Récords de la liga, derivados de lo que ya existe (no guarda nada):
--   - lider: el equipo con más puntos totales de la temporada.
--   - mejor_jornada: el equipo que más puntos hizo en una sola jornada (semana).
--   - rey_duelos: el equipo con más victorias de duelo (0118; vacío en pública).
--
-- Todo se calcula en el momento. Membresía: solo lo ve quien está en la liga.
--
-- Impacto en datos existentes: ninguno. Solo crea una función. Se puede lanzar
-- con `supabase db push` o en el SQL Editor.

create or replace function public.salon_fama(p_league_id uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_lider jsonb;
  v_mejor jsonb;
  v_duelos jsonb;
begin
  if not exists (
    select 1 from fantasy_teams where league_id = p_league_id and owner_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false);
  end if;

  -- Líder por puntos totales.
  select jsonb_build_object('equipo', ft.nombre, 'manager', pr.nombre, 'valor', t.total)
  into v_lider
  from (
    select tmp.fantasy_team_id, sum(tmp.puntos)::integer as total
    from team_matchday_points tmp
    join fantasy_teams f on f.id = tmp.fantasy_team_id
    where f.league_id = p_league_id
    group by tmp.fantasy_team_id
    order by total desc
    limit 1
  ) t
  join fantasy_teams ft on ft.id = t.fantasy_team_id
  join profiles pr on pr.id = ft.owner_id;

  -- Mejor jornada: más puntos de un equipo en una sola semana.
  select jsonb_build_object('equipo', ft.nombre, 'manager', pr.nombre, 'valor', t.puntos, 'jornada', t.jornada)
  into v_mejor
  from (
    select tmp.fantasy_team_id,
           js.numero as jornada,
           sum(tmp.puntos)::integer as puntos
    from jornadas_semanales() js
    join team_matchday_points tmp on tmp.matchday_id = js.matchday_id
    join fantasy_teams f on f.id = tmp.fantasy_team_id
    where f.league_id = p_league_id
    group by tmp.fantasy_team_id, js.semana, js.numero
    order by puntos desc
    limit 1
  ) t
  join fantasy_teams ft on ft.id = t.fantasy_team_id
  join profiles pr on pr.id = ft.owner_id;

  -- Rey de los duelos (reutiliza la clasificación de duelos).
  select jsonb_build_object('equipo', cd.nombre_equipo, 'manager', cd.nombre_manager, 'valor', cd.ganados)
  into v_duelos
  from clasificacion_duelos(p_league_id) cd
  where cd.ganados > 0
  order by cd.ganados desc, cd.puntos_liguilla desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'lider', v_lider,
    'mejor_jornada', v_mejor,
    'rey_duelos', v_duelos
  );
end;
$$;

revoke all on function public.salon_fama(uuid) from public, anon;
grant execute on function public.salon_fama(uuid) to authenticated;
