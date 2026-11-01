-- 0118: pronósticos de partidas (dentro de Minijuegos, como categoría aparte).
--
-- Sustituye a la "quiniela" del plan de engagement original. Diferencias:
--   - Sin recompensas: no toca saldo, XP ni ranking. Es un juego de opinión.
--   - Separada por torneos: cada torneo tiene su lista de mesas (la última ronda
--     publicada de ese torneo).
--   - Opcional: se pronostica solo las mesas que se quiera, y se puede cambiar o
--     quitar el pronóstico mientras la ronda no haya empezado.
--   - Se cierra antes de empezar la ronda: solo se puede pronosticar si la ronda
--     tiene fecha (matchdays.fecha_inicio), esa fecha es posterior a hoy (día de
--     Madrid), la jornada de la ronda no está cerrada y no hay ningún resultado cargado.
--     Una ronda sin fecha queda cerrada: así no se puede pronosticar con la partida
--     ya jugada mientras el admin aún no ha cargado los resultados.
--   - Sin trigger ni pagos: el acierto se calcula al leer, cruzando el pronóstico
--     con `results`. No añade carga al cargar resultados.
--
-- Los datos quedan guardados (una fila por usuario y mesa) para poder sacar
-- estadísticas avanzadas más adelante. Son PRIVADOS: cada usuario solo ve los suyos.
--
-- Impacto en datos existentes: ninguno. Solo crea una tabla y funciones nuevas.
-- Se puede lanzar con `supabase db push` o en el SQL Editor.

create table if not exists public.pronosticos (
  user_id uuid not null references auth.users (id) on delete cascade,
  pairing_id uuid not null references public.matchday_pairings (id) on delete cascade,
  pronostico text not null check (pronostico in ('blancas', 'tablas', 'negras')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, pairing_id)
);

create index if not exists pronosticos_pairing_idx on public.pronosticos (pairing_id);

alter table public.pronosticos enable row level security;

-- Solo lectura de los propios; se escribe únicamente con guardar_pronostico().
drop policy if exists "ver mis pronosticos" on public.pronosticos;
create policy "ver mis pronosticos" on public.pronosticos
  for select to authenticated
  using (user_id = auth.uid());

-- ¿Se puede pronosticar en esta ronda? (ver reglas arriba)
create or replace function public.pronosticos_abierta(p_matchday_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from matchdays m
    where m.id = p_matchday_id
      and not exists (
        select 1 from jornadas_semanales() js
        where js.matchday_id = m.id and js.terminada_en is not null
      )
      and m.fecha_inicio is not null
      and m.fecha_inicio > (now() at time zone 'Europe/Madrid')::date
      and not exists (select 1 from results r where r.matchday_id = m.id)
  );
$$;

revoke all on function public.pronosticos_abierta(uuid) from public, anon, authenticated;

-- Torneos con una ronda publicada para pronosticar (la última de cada torneo).
create or replace function public.pronosticos_torneos()
returns table (
  tournament_id uuid,
  torneo text,
  matchday_id uuid,
  jornada integer,
  fecha_inicio date,
  abierta boolean,
  mesas integer,
  mis_pronosticos integer
)
language sql
stable
security definer set search_path = public
as $$
  with ultima as (
    select distinct on (m.tournament_id)
      m.tournament_id, m.id as matchday_id, m.numero, m.fecha_inicio
    from matchdays m
    where m.tournament_id is not null
      and exists (
        select 1 from matchday_pairings mp
        where mp.matchday_id = m.id
          and mp.blanco_player_id is not null
          and mp.negro_player_id is not null
          and not mp.descansa
      )
    order by m.tournament_id, m.fecha_inicio desc nulls last, m.created_at desc
  )
  select
    u.tournament_id,
    t.nombre,
    u.matchday_id,
    u.numero,
    u.fecha_inicio,
    public.pronosticos_abierta(u.matchday_id),
    (select count(*)::integer from matchday_pairings mp
      where mp.matchday_id = u.matchday_id
        and mp.blanco_player_id is not null and mp.negro_player_id is not null
        and not mp.descansa),
    (select count(*)::integer from pronosticos p
      join matchday_pairings mp on mp.id = p.pairing_id
      where p.user_id = auth.uid() and mp.matchday_id = u.matchday_id)
  from ultima u
  join tournaments t on t.id = u.tournament_id
  where auth.uid() is not null
  order by u.fecha_inicio desc nulls last, t.nombre;
$$;

revoke all on function public.pronosticos_torneos() from public, anon;
grant execute on function public.pronosticos_torneos() to authenticated;

-- Mesas de la última ronda publicada de un torneo, con mi pronóstico.
create or replace function public.pronosticos_mesas(p_tournament_id uuid)
returns table (
  pairing_id uuid,
  tablero integer,
  blanco_nombre text,
  blanco_elo integer,
  negro_nombre text,
  negro_elo integer,
  mi_pronostico text,
  resultado text,
  acertada boolean,
  abierta boolean
)
language sql
stable
security definer set search_path = public
as $$
  with md as (
    select m.id
    from matchdays m
    where m.tournament_id = p_tournament_id
      and exists (
        select 1 from matchday_pairings mp
        where mp.matchday_id = m.id
          and mp.blanco_player_id is not null
          and mp.negro_player_id is not null
          and not mp.descansa
      )
    order by m.fecha_inicio desc nulls last, m.created_at desc
    limit 1
  )
  select
    mp.id,
    mp.tablero,
    pb.nombre,
    coalesce(pb.elo, mp.blanco_elo),
    pn.nombre,
    coalesce(pn.elo, mp.negro_elo),
    p.pronostico,
    case rb.resultado
      when 'victoria' then 'blancas'
      when 'tablas' then 'tablas'
      when 'derrota' then 'negras'
      else null
    end,
    case
      when p.pronostico is null or rb.resultado is null then null
      else p.pronostico = case rb.resultado
        when 'victoria' then 'blancas'
        when 'tablas' then 'tablas'
        else 'negras'
      end
    end,
    public.pronosticos_abierta(mp.matchday_id)
  from md
  join matchday_pairings mp on mp.matchday_id = md.id
    and mp.blanco_player_id is not null
    and mp.negro_player_id is not null
    and not mp.descansa
  join players pb on pb.id = mp.blanco_player_id
  join players pn on pn.id = mp.negro_player_id
  left join results rb on rb.matchday_id = mp.matchday_id and rb.player_id = mp.blanco_player_id
  left join pronosticos p on p.pairing_id = mp.id and p.user_id = auth.uid()
  where auth.uid() is not null
  order by mp.tablero nulls last, pb.nombre;
$$;

revoke all on function public.pronosticos_mesas(uuid) from public, anon;
grant execute on function public.pronosticos_mesas(uuid) to authenticated;

-- Guarda, cambia o quita (p_pronostico = null) un pronóstico.
create or replace function public.guardar_pronostico(p_pairing_id uuid, p_pronostico text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mp matchday_pairings%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para pronosticar.');
  end if;
  if p_pronostico is not null and p_pronostico not in ('blancas', 'tablas', 'negras') then
    return jsonb_build_object('ok', false, 'mensaje', 'Pronóstico no válido.');
  end if;

  select * into v_mp from matchday_pairings where id = p_pairing_id;
  if not found or v_mp.descansa or v_mp.blanco_player_id is null or v_mp.negro_player_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa mesa no se puede pronosticar.');
  end if;

  if not public.pronosticos_abierta(v_mp.matchday_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Los pronósticos de esta ronda ya están cerrados.');
  end if;

  if p_pronostico is null then
    delete from pronosticos where user_id = v_uid and pairing_id = p_pairing_id;
  else
    insert into pronosticos (user_id, pairing_id, pronostico)
    values (v_uid, p_pairing_id, p_pronostico)
    on conflict (user_id, pairing_id)
    do update set pronostico = excluded.pronostico, updated_at = now();
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.guardar_pronostico(uuid, text) from public, anon;
grant execute on function public.guardar_pronostico(uuid, text) to authenticated;

-- Resumen personal: cuántos has hecho y cuántos has acertado (solo lectura).
create or replace function public.mis_pronosticos_resumen()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'total', count(*),
    'resueltos', count(rb.resultado),
    'aciertos', count(*) filter (
      where p.pronostico = case rb.resultado
        when 'victoria' then 'blancas'
        when 'tablas' then 'tablas'
        else 'negras'
      end
    )
  )
  from pronosticos p
  join matchday_pairings mp on mp.id = p.pairing_id
  left join results rb on rb.matchday_id = mp.matchday_id and rb.player_id = mp.blanco_player_id
  where p.user_id = auth.uid();
$$;

revoke all on function public.mis_pronosticos_resumen() from public, anon;
grant execute on function public.mis_pronosticos_resumen() to authenticated;
