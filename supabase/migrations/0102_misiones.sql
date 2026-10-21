-- 0102: misiones. Cada misión completada da XP para subir de nivel.
--
-- REQUIERE 0086 (niveles / xp_movimientos / fijar_xp) y 0096 (multiplicador_capitan).
--
-- Las misiones van en CADENAS ("familias"): cada familia tiene varios escalones y
-- solo se ve el siguiente por reclamar. Al reclamar uno se desbloquea el siguiente,
-- con un objetivo mayor y más XP. Familias:
--   elo        Gana una partida con un jugador de tu once contra un rival con al menos
--              100 / 200 / 300 / 400 de Elo más que él.
--   capitan    Suma 50 / 100 / 200 / 400 / 800 puntos con tu capitán (ya con el
--              multiplicador). Cuenta el equipo en el que más haya sumado.
--   venta      En ligas privadas, vende jugadores a otros managers por un total de
--              1.000 / 2.000 / 4.000 / 8.000 M (oferta directa aceptada o clausulazo).
--   primero    Queda primero en una jornada de la liga pública 1 / 3 / 6 / 10 / 20 veces
--              (los empates en cabeza cuentan para todos los empatados).
--   racha      Alcanza una racha diaria de 7 / 14 / 30 / 60 / 100 días (cuenta tu mejor racha).
--   clausulazo Paga 1 / 3 / 5 / 10 cláusulas.
--
-- El progreso NO se guarda: se calcula al momento con los datos que ya existen
-- (resultados, rachas, operaciones...). Lo único que se guarda es qué escalones se
-- han reclamado, y eso va en xp_movimientos (fuente 'mision', clave 'familia:escalon'),
-- así que reclamar dos veces lo mismo no suma dos veces (fijar_xp). Como el progreso es
-- el total acumulado, las misiones son retroactivas: quien ya cumplía un escalón puede
-- reclamarlo nada más estrenar esta migración.
--
-- Única excepción: las ventas entre managers no se registraban con vendedor (operations_log
-- solo apunta al comprador). Se crea ventas_usuarios, se rellena con los clausulazos
-- pasados de ligas privadas y se alimenta sola con un trigger sobre operations_log. Las
-- ofertas directas aceptadas ANTES de esta migración no cuentan (no se sabe quién vendió).
--
-- Si cambias los números de la tabla de escalones (misiones_catalogo), cambia también los
-- textos de lib/i18n/textos/misiones.ts si mencionan alguna cifra.
--
-- Impacto en datos existentes: tabla nueva (con el relleno de clausulazos), funciones
-- nuevas y un trigger nuevo en operations_log. No toca saldos, jugadores ni XP actual.
-- Se puede lanzar con `supabase db push` o pegándola en el SQL Editor.


-- 1) Ventas entre managers ---------------------------------------------------------------
create table if not exists public.ventas_usuarios (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  vendedor_team_id uuid not null references public.fantasy_teams (id) on delete cascade,
  comprador_team_id uuid not null references public.fantasy_teams (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  importe numeric not null check (importe > 0),
  tipo text not null check (tipo in ('oferta_aceptada', 'clausulazo')),
  created_at timestamptz not null default now()
);

create index if not exists ventas_usuarios_vendedor_idx on public.ventas_usuarios (vendedor_team_id);

-- Sin políticas a propósito: solo la leen las funciones security definer de abajo.
alter table public.ventas_usuarios enable row level security;
revoke all on public.ventas_usuarios from anon, authenticated;

-- Relleno con los clausulazos ya pagados en ligas privadas.
insert into public.ventas_usuarios (league_id, vendedor_team_id, comprador_team_id, player_id, importe, tipo, created_at)
select ft.league_id, cr.from_team_id, cr.to_team_id, cr.player_id, cr.importe, 'clausulazo', cr.created_at
from public.clause_releases cr
join public.fantasy_teams ft on ft.id = cr.to_team_id
join public.leagues l on l.id = ft.league_id and l.tipo = 'privada'
where cr.importe > 0
  and not exists (select 1 from public.ventas_usuarios);

-- Cada oferta aceptada o clausulazo registrado en operations_log (que apunta al
-- comprador) deja aquí una fila con el vendedor. El vendedor es quien acaba de perder
-- al jugador EN ESTA MISMA TRANSACCIÓN (su squad_slot se cierra con fecha_salida = now()
-- justo antes de registrar la operación). Así una puja ganada en el mercado, donde nadie
-- vende, no cuenta. Solo ligas privadas.
create or replace function public.registrar_venta_usuarios()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga uuid;
  v_vendedor uuid;
begin
  select ft.league_id into v_liga
  from fantasy_teams ft
  join leagues l on l.id = ft.league_id and l.tipo = 'privada'
  where ft.id = new.fantasy_team_id;

  if v_liga is null or new.player_id is null or coalesce(new.importe, 0) <= 0 then
    return new;
  end if;

  select s.fantasy_team_id into v_vendedor
  from squad_slots s
  where s.player_id = new.player_id
    and s.league_id = v_liga
    and s.fecha_salida = now()
    and s.fantasy_team_id <> new.fantasy_team_id
  limit 1;

  if v_vendedor is not null then
    insert into ventas_usuarios (league_id, vendedor_team_id, comprador_team_id, player_id, importe, tipo)
    values (v_liga, v_vendedor, new.fantasy_team_id, new.player_id, new.importe, new.tipo);
  end if;

  return new;
end;
$$;

revoke all on function public.registrar_venta_usuarios() from public, anon, authenticated;

drop trigger if exists registrar_venta_usuarios_trg on public.operations_log;
create trigger registrar_venta_usuarios_trg
  after insert on public.operations_log
  for each row
  when (new.tipo in ('oferta_aceptada', 'clausulazo'))
  execute function public.registrar_venta_usuarios();


-- 2) Escalones de cada misión ---------------------------------------------------------------
-- (familia, escalón, objetivo, XP). Más difícil = más XP. Para quitar o añadir
-- escalones basta con cambiar esta lista.
create or replace function public.misiones_catalogo()
returns table (familia text, nivel integer, objetivo numeric, xp integer)
language sql
immutable
as $$
  select v.familia, v.nivel, v.objetivo, v.xp
  from (values
    ('elo',        1,  100,   40),
    ('elo',        2,  200,  100),
    ('elo',        3,  300,  200),
    ('elo',        4,  400,  350),
    ('capitan',    1,   50,   40),
    ('capitan',    2,  100,   80),
    ('capitan',    3,  200,  150),
    ('capitan',    4,  400,  250),
    ('capitan',    5,  800,  400),
    ('venta',      1, 1000,  100),
    ('venta',      2, 2000,  200),
    ('venta',      3, 4000,  350),
    ('venta',      4, 8000,  600),
    ('primero',    1,    1,  100),
    ('primero',    2,    3,  250),
    ('primero',    3,    6,  450),
    ('primero',    4,   10,  700),
    ('primero',    5,   20, 1200),
    ('racha',      1,    7,   50),
    ('racha',      2,   14,  100),
    ('racha',      3,   30,  250),
    ('racha',      4,   60,  500),
    ('racha',      5,  100,  900),
    ('clausulazo', 1,    1,   50),
    ('clausulazo', 2,    3,  120),
    ('clausulazo', 3,    5,  200),
    ('clausulazo', 4,   10,  400)
  ) as v(familia, nivel, objetivo, xp);
$$;

revoke all on function public.misiones_catalogo() from public, anon, authenticated;


-- 3) Progreso de un usuario en una familia -------------------------------------------------
-- Interna. Devuelve el valor ACUMULADO contra el que se comparan los objetivos.
create or replace function public.progreso_mision(p_user uuid, p_familia text)
returns numeric
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_valor numeric := 0;
begin
  if p_familia = 'elo' then
    -- Mayor diferencia de Elo (rival - jugador) en una victoria de un jugador que estaba
    -- en tu once y cuenta. Jugadores sin Elo no cuentan (puntúan como diferencia 0).
    select coalesce(max(r.rival_elo_en_el_momento - p.elo), 0)
    into v_valor
    from puntos_jugador_jornada pj
    join fantasy_teams ft on ft.id = pj.fantasy_team_id
    join results r on r.player_id = pj.player_id and r.matchday_id = pj.matchday_id
    join players p on p.id = pj.player_id
    where ft.owner_id = p_user
      and pj.cuenta
      and r.resultado = 'victoria'
      and coalesce(p.elo, 0) > 0
      and r.rival_elo_en_el_momento is not null;

  elsif p_familia = 'capitan' then
    -- Puntos del capitán con el multiplicador, del equipo donde más ha sumado.
    select coalesce(max(t.puntos), 0)
    into v_valor
    from (
      select pj.fantasy_team_id, sum(pj.puntos_base * public.multiplicador_capitan()) as puntos
      from puntos_jugador_jornada pj
      join fantasy_teams ft on ft.id = pj.fantasy_team_id
      where ft.owner_id = p_user and pj.es_capitan and pj.cuenta
      group by pj.fantasy_team_id
    ) t;

  elsif p_familia = 'venta' then
    select coalesce(sum(vu.importe), 0)
    into v_valor
    from ventas_usuarios vu
    join fantasy_teams ft on ft.id = vu.vendedor_team_id
    where ft.owner_id = p_user;

  elsif p_familia = 'primero' then
    -- Jornadas cerradas de la liga pública (las ligas en prueba no cuentan) en las que
    -- el equipo hizo más puntos que nadie (y al menos uno).
    select count(*)
    into v_valor
    from (
      select ft.owner_id, ps.puntos,
             max(ps.puntos) over (partition by ps.semana, ft.league_id) as maximo
      from pagos_semana ps
      join fantasy_teams ft on ft.id = ps.fantasy_team_id
      join leagues l on l.id = ft.league_id
      where l.tipo = 'publica' and l.estado <> 'prueba'
    ) q
    where q.owner_id = p_user and q.puntos > 0 and q.puntos = q.maximo;

  elsif p_familia = 'racha' then
    select coalesce(max(mejor_racha), 0) into v_valor from rachas where user_id = p_user;

  elsif p_familia = 'clausulazo' then
    select count(*)
    into v_valor
    from operations_log ol
    join fantasy_teams ft on ft.id = ol.fantasy_team_id
    where ft.owner_id = p_user and ol.tipo = 'clausulazo';
  end if;

  return coalesce(v_valor, 0);
end;
$$;

revoke all on function public.progreso_mision(uuid, text) from public, anon, authenticated;


-- 4) Estado de las misiones (para la pantalla y el aviso) ------------------------------------
-- Una entrada por familia con su siguiente escalón por reclamar. 'lista' = ya se puede
-- reclamar; 'terminada' = todos los escalones reclamados (entonces objetivo y xp son los
-- del último). 'pendientes' cuenta las listas, para el punto de aviso.
create or replace function public.estado_misiones()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_orden text[] := array['elo', 'capitan', 'venta', 'primero', 'racha', 'clausulazo'];
  v_fam text;
  v_total integer;
  v_hechas integer;
  v_nivel integer;
  v_c record;
  v_progreso numeric;
  v_lista jsonb := '[]'::jsonb;
  v_pendientes integer := 0;
  v_es_lista boolean;
  v_terminada boolean;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver tus misiones.';
  end if;

  foreach v_fam in array v_orden loop
    select count(*) into v_total from misiones_catalogo() where familia = v_fam;

    select count(*) into v_hechas
    from xp_movimientos
    where user_id = v_uid and fuente = 'mision' and clave like v_fam || ':%';

    v_terminada := v_hechas >= v_total;
    v_nivel := least(v_hechas + 1, v_total);

    select * into v_c from misiones_catalogo() where familia = v_fam and nivel = v_nivel;
    v_progreso := public.progreso_mision(v_uid, v_fam);
    v_es_lista := not v_terminada and v_progreso >= v_c.objetivo;
    if v_es_lista then
      v_pendientes := v_pendientes + 1;
    end if;

    v_lista := v_lista || jsonb_build_object(
      'familia', v_fam,
      'nivel', v_nivel,
      'niveles', v_total,
      'objetivo', v_c.objetivo,
      'xp', v_c.xp,
      'progreso', v_progreso,
      'lista', v_es_lista,
      'terminada', v_terminada
    );
  end loop;

  return jsonb_build_object('misiones', v_lista, 'pendientes', v_pendientes);
end;
$$;

revoke all on function public.estado_misiones() from public, anon;
grant execute on function public.estado_misiones() to authenticated;


-- 5) Reclamar el siguiente escalón de una familia --------------------------------------------
create or replace function public.reclamar_mision(p_familia text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_total integer;
  v_hechas integer;
  v_c record;
  v_progreso numeric;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para reclamar misiones.');
  end if;

  select count(*) into v_total from misiones_catalogo() where familia = p_familia;
  if v_total = 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa misión no existe.');
  end if;

  select count(*) into v_hechas
  from xp_movimientos
  where user_id = v_uid and fuente = 'mision' and clave like p_familia || ':%';

  if v_hechas >= v_total then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya has completado todas las misiones de esta serie.');
  end if;

  select * into v_c from misiones_catalogo() where familia = p_familia and nivel = v_hechas + 1;
  v_progreso := public.progreso_mision(v_uid, p_familia);

  if v_progreso < v_c.objetivo then
    return jsonb_build_object('ok', false, 'mensaje', 'Todavía no has cumplido esta misión.');
  end if;

  -- fijar_xp es idempotente por clave: pulsar dos veces no suma dos veces.
  perform public.fijar_xp(v_uid, 'mision', p_familia || ':' || v_c.nivel, v_c.xp);

  return jsonb_build_object('ok', true, 'familia', p_familia, 'nivel', v_c.nivel, 'xp', v_c.xp);
end;
$$;

revoke all on function public.reclamar_mision(text) from public, anon;
grant execute on function public.reclamar_mision(text) to authenticated;
