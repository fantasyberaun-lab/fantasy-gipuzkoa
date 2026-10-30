-- 0119: quiniela de emparejamientos (Fase 2 del plan de engagement, "profundidad").
--
-- Cuando el admin publica los emparejamientos de una ronda (matchday_pairings,
-- 0053) y aún no hay resultados, cada manager pronostica cada mesa: ganan
-- blancas / tablas / ganan negras. Al entrar el resultado (results) se resuelve
-- sola y paga saldo por cada acierto. Da algo que hacer entre jornadas y engancha
-- también a quien no juega el torneo.
--
-- Solo se pronostican las mesas con los dos jugadores en la base (players) y que
-- no sean descanso. El resultado de la mesa se lee desde las blancas
-- (results.resultado del jugador de blancas: victoria=blancas, tablas, derrota=negras).
-- El premio por acierto (en M) vive en game_config ('quiniela_acierto_saldo'),
-- editable sin desplegar; se ingresa en TODOS los equipos del manager, como la
-- racha. Es idempotente (pagada_en): reprocesar no vuelve a pagar.
--
-- Impacto en datos existentes: crea una tabla, una clave de game_config,
-- funciones y un trigger sobre results. No cambia saldos, jugadores ni plantillas.
-- Se puede lanzar con `supabase db push` o en el SQL Editor.

insert into game_config (clave, valor) values ('quiniela_acierto_saldo', '1'::jsonb)
on conflict (clave) do nothing;

create table if not exists public.quiniela_predicciones (
  user_id uuid not null references auth.users (id) on delete cascade,
  pairing_id uuid not null references matchday_pairings (id) on delete cascade,
  pronostico text not null check (pronostico in ('blancas', 'tablas', 'negras')),
  acertada boolean,            -- null hasta que la mesa tiene resultado
  pagada_en timestamptz,       -- cuándo se pagó el acierto (idempotencia)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, pairing_id)
);

create index if not exists quiniela_predicciones_pairing_idx
  on public.quiniela_predicciones (pairing_id);

alter table public.quiniela_predicciones enable row level security;

-- El manager ve sus pronósticos; nadie escribe desde el cliente (lo hacen las
-- funciones security definer de abajo).
drop policy if exists "ver mis pronosticos" on public.quiniela_predicciones;
create policy "ver mis pronosticos" on public.quiniela_predicciones
  for select to authenticated
  using (user_id = auth.uid());

-- 1) Guardar/cambiar un pronóstico (solo si la mesa aún no tiene resultado) -----------
create or replace function public.guardar_prediccion(p_pairing_id uuid, p_pronostico text)
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
  if p_pronostico not in ('blancas', 'tablas', 'negras') then
    return jsonb_build_object('ok', false, 'mensaje', 'Pronóstico no válido.');
  end if;

  select * into v_mp from matchday_pairings where id = p_pairing_id;
  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa mesa no existe.');
  end if;
  if v_mp.descansa or v_mp.blanco_player_id is null or v_mp.negro_player_id is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Esta mesa no se puede pronosticar.');
  end if;
  if exists (
    select 1 from results r
    where r.matchday_id = v_mp.matchday_id
      and r.player_id in (v_mp.blanco_player_id, v_mp.negro_player_id)
  ) then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa partida ya tiene resultado.');
  end if;

  insert into quiniela_predicciones (user_id, pairing_id, pronostico)
  values (v_uid, p_pairing_id, p_pronostico)
  on conflict (user_id, pairing_id)
  do update set pronostico = excluded.pronostico, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.guardar_prediccion(uuid, text) from public, anon;
grant execute on function public.guardar_prediccion(uuid, text) to authenticated;

-- 2) Resolver la quiniela de una jornada: marca aciertos y paga los no pagados -------
create or replace function public.resolver_quiniela(p_matchday_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_saldo numeric := coalesce(
    (select valor::text::numeric from game_config where clave = 'quiniela_acierto_saldo'), 1
  );
  r record;
begin
  -- Marca acertada/fallada en las mesas que ya tienen resultado.
  update quiniela_predicciones qp
  set acertada = (qp.pronostico = o.resultado_quiniela), updated_at = now()
  from (
    select
      mp.id as pairing_id,
      case res.resultado
        when 'victoria' then 'blancas'
        when 'tablas' then 'tablas'
        else 'negras'
      end as resultado_quiniela
    from matchday_pairings mp
    join results res
      on res.matchday_id = mp.matchday_id and res.player_id = mp.blanco_player_id
    where mp.matchday_id = p_matchday_id
      and mp.blanco_player_id is not null
      and mp.negro_player_id is not null
      and not mp.descansa
  ) o
  where qp.pairing_id = o.pairing_id;

  -- Paga los aciertos aún no pagados (en todos los equipos del manager).
  for r in
    select qp.user_id, count(*)::integer as aciertos
    from quiniela_predicciones qp
    join matchday_pairings mp on mp.id = qp.pairing_id
    where mp.matchday_id = p_matchday_id and qp.acertada is true and qp.pagada_en is null
    group by qp.user_id
  loop
    update fantasy_teams
    set presupuesto = presupuesto + r.aciertos * v_saldo
    where owner_id = r.user_id;
  end loop;

  update quiniela_predicciones qp
  set pagada_en = now()
  from matchday_pairings mp
  where mp.id = qp.pairing_id
    and mp.matchday_id = p_matchday_id
    and qp.acertada is true
    and qp.pagada_en is null;
end;
$$;

revoke all on function public.resolver_quiniela(uuid) from public, anon, authenticated;
grant execute on function public.resolver_quiniela(uuid) to service_role;

-- Al guardar/corregir un resultado, resuelve la quiniela de esa jornada.
create or replace function public.resolver_quiniela_trg()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.resolver_quiniela(coalesce(new.matchday_id, old.matchday_id));
  return null;
end;
$$;

revoke all on function public.resolver_quiniela_trg() from public, anon, authenticated;

drop trigger if exists resolver_quiniela_trg on public.results;
create trigger resolver_quiniela_trg
  after insert or update of resultado or delete on public.results
  for each row execute function public.resolver_quiniela_trg();

-- 3) La quiniela actual: mesas de la última ronda publicada + mi pronóstico ----------
create or replace function public.quiniela_actual()
returns table (
  pairing_id uuid,
  tablero integer,
  blanco_nombre text,
  blanco_elo integer,
  negro_nombre text,
  negro_elo integer,
  mi_pronostico text,
  resultado text,        -- blancas/tablas/negras si ya hay resultado, null si no
  acertada boolean,
  jornada integer,
  torneo text
)
language sql
stable
security definer set search_path = public
as $$
  with md as (
    select mp.matchday_id, m.numero, m.created_at, m.tournament_id
    from matchday_pairings mp
    join matchdays m on m.id = mp.matchday_id
    where mp.blanco_player_id is not null
      and mp.negro_player_id is not null
      and not mp.descansa
    group by mp.matchday_id, m.numero, m.created_at, m.tournament_id
    order by m.created_at desc
    limit 1
  )
  select
    mp.id as pairing_id,
    mp.tablero,
    pb.nombre as blanco_nombre,
    pb.elo as blanco_elo,
    pn.nombre as negro_nombre,
    pn.elo as negro_elo,
    qp.pronostico as mi_pronostico,
    case rb.resultado
      when 'victoria' then 'blancas'
      when 'tablas' then 'tablas'
      when 'derrota' then 'negras'
      else null
    end as resultado,
    qp.acertada,
    md.numero as jornada,
    t.nombre as torneo
  from md
  join matchday_pairings mp on mp.matchday_id = md.matchday_id
    and mp.blanco_player_id is not null
    and mp.negro_player_id is not null
    and not mp.descansa
  join players pb on pb.id = mp.blanco_player_id
  join players pn on pn.id = mp.negro_player_id
  left join tournaments t on t.id = md.tournament_id
  left join results rb on rb.matchday_id = mp.matchday_id and rb.player_id = mp.blanco_player_id
  left join quiniela_predicciones qp on qp.pairing_id = mp.id and qp.user_id = auth.uid()
  order by mp.tablero nulls last, pb.nombre;
$$;

revoke all on function public.quiniela_actual() from public, anon;
grant execute on function public.quiniela_actual() to authenticated;
