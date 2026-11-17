-- 0141: evento temporal "Campeonato del Mundo de ajedrez: Gukesh vs Sindarov".
--
-- Es un evento ACTIVABLE y REVERSIBLE por el administrador (root). Aplicar esta migración
-- NO enciende nada: crea tablas y funciones, siembra el calendario y deja el evento apagado.
-- Cualquier operación masiva (poner 500 M a todos, ocultar el mercado, conceder el icono) es
-- una función admin explícita que hay que llamar a mano desde Admin > Mundial.
--
-- Qué añade
--   1) mundial_evento (1 fila): interruptores y ajustes del evento.
--        activo        evento encendido (lo enciende admin_mundial_activar)
--        modo_match    la pestaña "Plantilla" se sustituye por "Match" y el Mercado se
--                      oculta. La plantilla real NO se toca ni se borra: solo se oculta.
--        cierre_minutos  los pronósticos se cierran N minutos antes de empezar la partida
--        desempate_activo  hay desempate: en vez de votar partida se vota al campeón
--        resultado_final   'gukesh' | 'sindarov' (el campeón), lo pone el admin
--   2) mundial_partidas: calendario (24 nov - 12 dic 2026): 14 partidas, 4 descansos y el
--      día de desempates. Fecha y hora de inicio editables. Hora por defecto: 15:00 de Bakú
--      (UTC+4) = 12:00 de Madrid en invierno; se guarda como timestamptz (instante exacto).
--   3) mundial_pronosticos / mundial_voto_final: lo que predice cada usuario (privado).
--      Acierto de partida = 1 punto; acertar el campeón tras un desempate = +1 punto.
--      Los puntos NO se guardan: se calculan al leer con las funciones de abajo, así que
--      corregir un resultado recalcula todo solo (idempotente).
--   4) mundial_saldos_respaldo: saldo previo de cada equipo antes de poner 500 M.
--      admin_mundial_cerrar() lo restaura. Nada se pierde.
--   5) Icono especial de Sindarov: se registra en iconos_especiales (catálogo de 0140, tipo
--      'evento') y se concede a los participantes con admin_mundial_conceder_icono(), que
--      escribe en iconos_desbloqueados (origen 'evento'). cambiar_avatar() ya lo acepta (0140).
--   6) Histórico de clasificaciones: clasificacion_archivos / _filas. admin_archivar_clasificacion
--      guarda una foto de la clasificación de una liga SIN borrar ni tocar nada de la liga.
--   7) Jugadores Gukesh y Sindarov en `players`, INACTIVOS y con datos PROVISIONALES
--      (Elo y valor orientativos, editables desde Admin > Jugadores). Se activan al encender
--      el evento y se desactivan al cerrarlo (si nadie los tiene en plantilla).
--   NO se crea el torneo del Mundial aquí: al insertar en `tournaments` hay un trigger que
--   envía un push a todos. Créalo a mano desde Admin > Torneos cuando toque.
--
-- Seguridad: RLS activada en todo; las tablas solo se leen (las propias, o todo si root) y se
-- escriben únicamente con funciones SECURITY DEFINER (guardar_pronostico_mundial,
-- admin_mundial_*), que comprueban el reloj del servidor y es_root().
--
-- Requiere 0005 (es_root), 0140 (iconos_especiales/iconos_desbloqueados y cambiar_avatar),
-- 0018/0020 (team_matchday_points), 0100 (liga_sanciones), 0015 (ligas). APLICAR DESPUÉS DE 0140.
--
-- Impacto en datos existentes: ninguno. Solo tablas/funciones nuevas, 2 filas nuevas en
-- players (inactivas) y 1 fila nueva en iconos_especiales.
-- Aplicar con `npx supabase db push` o pegándola en el SQL Editor.
--
-- Para deshacerlo del todo (solo si no se ha usado): drop de las tablas mundial_* y
-- clasificacion_archivo* y de las funciones *mundial*.

-- 1) Evento ----------------------------------------------------------------------------
create table if not exists public.mundial_evento (
  id integer primary key default 1 check (id = 1),
  nombre text not null default 'Campeonato del Mundo de ajedrez: Gukesh vs Sindarov',
  activo boolean not null default false,
  modo_match boolean not null default false,
  cierre_minutos integer not null default 10 check (cierre_minutos between 0 and 1440),
  desempate_activo boolean not null default false,
  resultado_final text check (resultado_final is null or resultado_final in ('gukesh', 'sindarov')),
  saldo_evento numeric not null default 500 check (saldo_evento >= 0),
  iniciado_en timestamptz,
  cerrado_en timestamptz,
  saldos_aplicados_en timestamptz,
  saldos_restaurados_en timestamptz,
  icono_concedido_en timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.mundial_evento (id) values (1) on conflict (id) do nothing;

-- 2) Calendario ------------------------------------------------------------------------
create table if not exists public.mundial_partidas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('partida', 'descanso', 'desempate')),
  numero integer,                       -- nº de partida (1..14); null en descansos/desempates
  fecha date not null,
  inicio timestamptz,                   -- instante de inicio; null en los días de descanso
  resultado text check (resultado is null or resultado in ('tablas', 'gukesh', 'sindarov')),
  created_at timestamptz not null default now(),
  unique (fecha)
);

create unique index if not exists mundial_partidas_numero_idx
  on public.mundial_partidas (numero) where numero is not null;

-- Siembra del calendario (solo si está vacío). 12:00 hora de Madrid = 15:00 de Bakú en invierno.
insert into public.mundial_partidas (tipo, numero, fecha, inicio)
select v.tipo, v.numero, v.fecha,
       case when v.tipo = 'descanso' then null
            else (v.fecha::timestamp + time '12:00') at time zone 'Europe/Madrid' end
from (values
  ('partida',   1, date '2026-11-24'), ('partida',   2, date '2026-11-25'),
  ('partida',   3, date '2026-11-26'), ('descanso', null, date '2026-11-27'),
  ('partida',   4, date '2026-11-28'), ('partida',   5, date '2026-11-29'),
  ('partida',   6, date '2026-11-30'), ('descanso', null, date '2026-12-01'),
  ('partida',   7, date '2026-12-02'), ('partida',   8, date '2026-12-03'),
  ('partida',   9, date '2026-12-04'), ('descanso', null, date '2026-12-05'),
  ('partida',  10, date '2026-12-06'), ('partida',  11, date '2026-12-07'),
  ('partida',  12, date '2026-12-08'), ('descanso', null, date '2026-12-09'),
  ('partida',  13, date '2026-12-10'), ('partida',  14, date '2026-12-11'),
  ('desempate', null, date '2026-12-12')
) as v(tipo, numero, fecha)
where not exists (select 1 from public.mundial_partidas);

-- 3) Pronósticos -----------------------------------------------------------------------
create table if not exists public.mundial_pronosticos (
  user_id uuid not null references auth.users (id) on delete cascade,
  partida_id uuid not null references public.mundial_partidas (id) on delete cascade,
  pronostico text not null check (pronostico in ('tablas', 'gukesh', 'sindarov')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, partida_id)
);
create index if not exists mundial_pronosticos_partida_idx on public.mundial_pronosticos (partida_id);

create table if not exists public.mundial_voto_final (
  user_id uuid primary key references auth.users (id) on delete cascade,
  voto text not null check (voto in ('gukesh', 'sindarov')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Respaldo de saldos ----------------------------------------------------------------
create table if not exists public.mundial_saldos_respaldo (
  fantasy_team_id uuid primary key references public.fantasy_teams (id) on delete cascade,
  saldo_previo numeric not null,
  saldo_aplicado numeric not null,
  guardado_en timestamptz not null default now(),
  restaurado_en timestamptz
);

-- 5) Icono de Sindarov (catálogo de 0140) ------------------------------------------------
insert into public.iconos_especiales (id, edicion, tipo, orden)
values ('sindarov', 'mundial-2026', 'evento', 10)
on conflict (id) do nothing;

-- 6) Histórico de clasificaciones --------------------------------------------------------
create table if not exists public.clasificacion_archivos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  league_id uuid references public.leagues (id) on delete set null,
  archivada_en timestamptz not null default now(),
  creado_por uuid references auth.users (id) on delete set null
);

create table if not exists public.clasificacion_archivo_filas (
  archivo_id uuid not null references public.clasificacion_archivos (id) on delete cascade,
  posicion integer not null,
  user_id uuid,
  equipo_id uuid,
  nombre_equipo text not null,
  nombre_manager text,
  puntos integer not null,
  primary key (archivo_id, posicion)
);
create index if not exists clasificacion_archivo_filas_user_idx on public.clasificacion_archivo_filas (user_id);

-- RLS: sin escrituras directas desde el navegador. ----------------------------------------
alter table public.mundial_evento enable row level security;
alter table public.mundial_partidas enable row level security;
alter table public.mundial_pronosticos enable row level security;
alter table public.mundial_voto_final enable row level security;
alter table public.mundial_saldos_respaldo enable row level security;
alter table public.clasificacion_archivos enable row level security;
alter table public.clasificacion_archivo_filas enable row level security;

drop policy if exists "ver evento" on public.mundial_evento;
create policy "ver evento" on public.mundial_evento for select to authenticated using (true);
drop policy if exists "ver calendario" on public.mundial_partidas;
create policy "ver calendario" on public.mundial_partidas for select to authenticated using (true);
drop policy if exists "ver mis pronosticos mundial" on public.mundial_pronosticos;
create policy "ver mis pronosticos mundial" on public.mundial_pronosticos
  for select to authenticated using (user_id = (select auth.uid()) or public.es_root());
drop policy if exists "ver mi voto final" on public.mundial_voto_final;
create policy "ver mi voto final" on public.mundial_voto_final
  for select to authenticated using (user_id = (select auth.uid()) or public.es_root());
drop policy if exists "root ve respaldo saldos" on public.mundial_saldos_respaldo;
create policy "root ve respaldo saldos" on public.mundial_saldos_respaldo
  for select to authenticated using (public.es_root());
drop policy if exists "root ve archivos" on public.clasificacion_archivos;
create policy "root ve archivos" on public.clasificacion_archivos
  for select to authenticated using (public.es_root());
drop policy if exists "root ve filas archivo" on public.clasificacion_archivo_filas;
create policy "root ve filas archivo" on public.clasificacion_archivo_filas
  for select to authenticated using (public.es_root());

-- Los privilegios de escritura se retiran del todo (las funciones son SECURITY DEFINER).
revoke insert, update, delete on
  public.mundial_evento, public.mundial_partidas, public.mundial_pronosticos,
  public.mundial_voto_final, public.mundial_saldos_respaldo,
  public.clasificacion_archivos, public.clasificacion_archivo_filas
from anon, authenticated;

-- 7) Jugadores (PROVISIONALES) -----------------------------------------------------------
-- Elo y valor orientativos; se editan en Admin > Jugadores. Inactivos hasta encender el evento.
insert into public.players (nombre, club, categoria, elo, fide_id, anio_nacimiento, edad, sexo, activo)
select 'Gukesh Dommaraju', 'Mundial 2026 (datos provisionales)', '1'::categoria, 2780, '46616543', 2006, 20, 'M', false
where not exists (select 1 from public.players where nombre = 'Gukesh Dommaraju');

insert into public.players (nombre, club, categoria, elo, fide_id, anio_nacimiento, edad, sexo, activo)
select 'Javokhir Sindarov', 'Mundial 2026 (datos provisionales)', '1'::categoria, 2745, '14205483', 2005, 21, 'M', false
where not exists (select 1 from public.players where nombre = 'Javokhir Sindarov');

update public.players
set valor_mercado = public.calcular_valor_inicial(elo, anio_nacimiento)
where club = 'Mundial 2026 (datos provisionales)' and coalesce(valor_mercado, 0) = 0;

-- 8) Lectura para el cliente ----------------------------------------------------------------

-- Interruptores mínimos (pestaña Match, mercado oculto). Ligera: se pide al cargar la app.
create or replace function public.mundial_config()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'activo', e.activo,
    'modo_match', e.activo and e.modo_match,
    'nombre', e.nombre
  )
  from mundial_evento e
  where e.id = 1 and auth.uid() is not null;
$$;
revoke all on function public.mundial_config() from public, anon;
grant execute on function public.mundial_config() to authenticated;

-- Puntos de un usuario (se calculan al leer): aciertos de partida + 1 si acertó el campeón.
create or replace function public.mundial_puntos_usuario(p_user uuid)
returns integer
language sql
stable
security definer set search_path = public
as $$
  select (
    select count(*)::integer
    from mundial_pronosticos pr
    join mundial_partidas pa on pa.id = pr.partida_id
    where pr.user_id = p_user and pa.tipo = 'partida' and pa.resultado = pr.pronostico
  ) + (
    select count(*)::integer
    from mundial_voto_final v, mundial_evento e
    where v.user_id = p_user and e.id = 1 and e.resultado_final is not null and e.resultado_final = v.voto
  );
$$;
revoke all on function public.mundial_puntos_usuario(uuid) from public, anon, authenticated;

-- Todo lo que necesita la pestaña Match. Los % de la comunidad solo salen cuando esa
-- partida ya está cerrada (para no condicionar), y el voto final cuando su votación cierra.
create or replace function public.mundial_match()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e mundial_evento%rowtype;
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
  if not found or not v_e.activo then
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

  -- Marcador del match, mis aciertos y mi racha (partidas ya resueltas, de la más antigua a la última).
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
      v_corriendo := 0; -- fallar o no pronosticar corta la racha
    end if;
  end loop;
  v_racha := v_corriendo;

  -- Votación final (solo si hay desempate).
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

-- Clasificación del evento (se calcula al leer). Solo quien ha hecho algún pronóstico o voto.
create or replace function public.mundial_clasificacion()
returns table (
  posicion integer,
  nombre_manager text,
  puntos integer,
  aciertos integer,
  jugadas integer,
  es_yo boolean
)
language sql
stable
security definer set search_path = public
as $$
  with participantes as (
    select user_id from mundial_pronosticos
    union
    select user_id from mundial_voto_final
  ),
  base as (
    select
      pa.user_id,
      public.mundial_puntos_usuario(pa.user_id) as puntos,
      (select count(*)::integer from mundial_pronosticos pr
         join mundial_partidas p on p.id = pr.partida_id
        where pr.user_id = pa.user_id and p.tipo = 'partida' and p.resultado = pr.pronostico) as aciertos,
      (select count(*)::integer from mundial_pronosticos pr
         join mundial_partidas p on p.id = pr.partida_id
        where pr.user_id = pa.user_id and p.tipo = 'partida' and p.resultado is not null) as jugadas
    from participantes pa
  )
  select
    (rank() over (order by b.puntos desc, b.aciertos desc))::integer,
    pr.nombre,
    b.puntos, b.aciertos, b.jugadas,
    b.user_id = auth.uid()
  from base b
  join profiles pr on pr.id = b.user_id
  where auth.uid() is not null
  order by 1, pr.nombre;
$$;
revoke all on function public.mundial_clasificacion() from public, anon;
grant execute on function public.mundial_clasificacion() to authenticated;

-- 9) Escritura de los usuarios ----------------------------------------------------------------

-- Guarda, cambia o quita (p_pronostico = null) mi pronóstico de una partida. El cierre lo
-- valida el servidor con su reloj.
create or replace function public.guardar_pronostico_mundial(p_partida uuid, p_pronostico text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e mundial_evento%rowtype;
  v_pa mundial_partidas%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para pronosticar.');
  end if;
  if p_pronostico is not null and p_pronostico not in ('tablas', 'gukesh', 'sindarov') then
    return jsonb_build_object('ok', false, 'mensaje', 'Pronóstico no válido.');
  end if;
  select * into v_e from mundial_evento where id = 1;
  if not found or not v_e.activo then
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

-- Voto del campeón (solo con desempate). Se cierra antes del día de desempates.
create or replace function public.guardar_voto_final_mundial(p_voto text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_e mundial_evento%rowtype;
  v_inicio timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para votar.');
  end if;
  if p_voto is not null and p_voto not in ('gukesh', 'sindarov') then
    return jsonb_build_object('ok', false, 'mensaje', 'Voto no válido.');
  end if;
  select * into v_e from mundial_evento where id = 1;
  if not found or not v_e.activo or not v_e.desempate_activo then
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

-- 10) Funciones de administración (todas comprueban es_root()) ----------------------------------

-- Estado completo para el panel admin.
create or replace function public.admin_mundial_estado()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_e mundial_evento%rowtype;
  v_partidas jsonb;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador.');
  end if;
  select * into v_e from mundial_evento where id = 1;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', pa.id, 'tipo', pa.tipo, 'numero', pa.numero, 'fecha', pa.fecha,
      'inicio', pa.inicio, 'resultado', pa.resultado,
      'pronosticos', (select count(*) from mundial_pronosticos p where p.partida_id = pa.id),
      'votos', (select jsonb_build_object(
          'tablas', count(*) filter (where p.pronostico = 'tablas'),
          'gukesh', count(*) filter (where p.pronostico = 'gukesh'),
          'sindarov', count(*) filter (where p.pronostico = 'sindarov'))
        from mundial_pronosticos p where p.partida_id = pa.id)
    ) order by pa.fecha), '[]'::jsonb) into v_partidas
  from mundial_partidas pa;

  return jsonb_build_object(
    'ok', true,
    'evento', to_jsonb(v_e),
    'partidas', v_partidas,
    'participantes', (select count(*) from (
        select user_id from mundial_pronosticos union select user_id from mundial_voto_final) u),
    'votos_final', (select jsonb_build_object(
        'gukesh', count(*) filter (where voto = 'gukesh'),
        'sindarov', count(*) filter (where voto = 'sindarov')) from mundial_voto_final),
    'saldos_respaldados', (select count(*) from mundial_saldos_respaldo),
    'saldos_pendientes_restaurar',
      (select count(*) from mundial_saldos_respaldo where restaurado_en is null),
    'iconos_concedidos', (select count(*) from iconos_desbloqueados where icono = 'sindarov'),
    'jugadores', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'nombre', nombre, 'elo', elo, 'valor_mercado', valor_mercado, 'activo', activo)), '[]'::jsonb)
      from players where club = 'Mundial 2026 (datos provisionales)')
  );
end;
$$;
revoke all on function public.admin_mundial_estado() from public, anon;
grant execute on function public.admin_mundial_estado() to authenticated;

-- Ajustes (los que se pasan a null no cambian).
create or replace function public.admin_mundial_ajustes(
  p_cierre_minutos integer default null,
  p_modo_match boolean default null,
  p_desempate_activo boolean default null,
  p_saldo_evento numeric default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador.');
  end if;
  if p_cierre_minutos is not null and p_cierre_minutos not between 0 and 1440 then
    return jsonb_build_object('ok', false, 'mensaje', 'El cierre debe estar entre 0 y 1440 minutos.');
  end if;
  if p_saldo_evento is not null and p_saldo_evento < 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'El saldo no puede ser negativo.');
  end if;
  update mundial_evento set
    cierre_minutos = coalesce(p_cierre_minutos, cierre_minutos),
    modo_match = coalesce(p_modo_match, modo_match),
    desempate_activo = coalesce(p_desempate_activo, desempate_activo),
    -- el saldo del evento solo se puede cambiar mientras no se haya aplicado
    saldo_evento = case when saldos_aplicados_en is null then coalesce(p_saldo_evento, saldo_evento)
                        else saldo_evento end,
    updated_at = now()
  where id = 1;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_mundial_ajustes(integer, boolean, boolean, numeric) from public, anon;
grant execute on function public.admin_mundial_ajustes(integer, boolean, boolean, numeric) to authenticated;

-- Fecha y hora de inicio de una partida (p_inicio = instante exacto; la web lo da desde Madrid).
create or replace function public.admin_mundial_partida_guardar(
  p_partida uuid, p_fecha date, p_inicio timestamptz
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_pa mundial_partidas%rowtype;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador.');
  end if;
  select * into v_pa from mundial_partidas where id = p_partida;
  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa partida no existe.');
  end if;
  if p_fecha is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Falta la fecha.');
  end if;
  if v_pa.tipo <> 'descanso' and p_inicio is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Falta la hora de inicio.');
  end if;
  if exists (select 1 from mundial_partidas where fecha = p_fecha and id <> p_partida) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya hay otra entrada ese día.');
  end if;
  update mundial_partidas
  set fecha = p_fecha,
      inicio = case when tipo = 'descanso' then null else p_inicio end
  where id = p_partida;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_mundial_partida_guardar(uuid, date, timestamptz) from public, anon;
grant execute on function public.admin_mundial_partida_guardar(uuid, date, timestamptz) to authenticated;

-- Resultado de una partida ('tablas' | 'gukesh' | 'sindarov'; null lo borra). Recalcula solo.
create or replace function public.admin_mundial_resultado_partida(p_partida uuid, p_resultado text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_pa mundial_partidas%rowtype;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador.');
  end if;
  if p_resultado is not null and p_resultado not in ('tablas', 'gukesh', 'sindarov') then
    return jsonb_build_object('ok', false, 'mensaje', 'Resultado no válido.');
  end if;
  select * into v_pa from mundial_partidas where id = p_partida;
  if not found or v_pa.tipo <> 'partida' then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa entrada no es una partida.');
  end if;
  update mundial_partidas set resultado = p_resultado where id = p_partida;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_mundial_resultado_partida(uuid, text) from public, anon;
grant execute on function public.admin_mundial_resultado_partida(uuid, text) to authenticated;

-- Campeón del mundo ('gukesh' | 'sindarov'; null lo borra). Da +1 a quien lo votó tras el desempate.
create or replace function public.admin_mundial_resultado_final(p_ganador text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador.');
  end if;
  if p_ganador is not null and p_ganador not in ('gukesh', 'sindarov') then
    return jsonb_build_object('ok', false, 'mensaje', 'Ganador no válido.');
  end if;
  update mundial_evento set resultado_final = p_ganador, updated_at = now() where id = 1;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_mundial_resultado_final(text) from public, anon;
grant execute on function public.admin_mundial_resultado_final(text) to authenticated;

-- ENCENDER el evento. Opcionalmente pone el saldo del evento a todos los equipos guardando
-- antes el saldo previo. Idempotente: si ya se aplicó, no vuelve a tocar a quien ya está
-- respaldado (solo a equipos nuevos sin respaldo). p_solo_publicas = true limita a las ligas públicas.
create or replace function public.admin_mundial_activar(
  p_aplicar_saldos boolean default true,
  p_solo_publicas boolean default false
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_e mundial_evento%rowtype;
  v_equipos integer := 0;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador.');
  end if;
  select * into v_e from mundial_evento where id = 1 for update;
  if v_e.cerrado_en is not null and v_e.saldos_restaurados_en is not null then
    -- Evento ya cerrado una vez: se permite reabrir, pero los saldos se vuelven a respaldar
    -- (los respaldos restaurados se limpian para poder repetir el ciclo).
    delete from mundial_saldos_respaldo where restaurado_en is not null;
  end if;

  update mundial_evento set
    activo = true,
    modo_match = true,
    iniciado_en = coalesce(iniciado_en, now()),
    cerrado_en = null,
    updated_at = now()
  where id = 1;

  update players set activo = true where club = 'Mundial 2026 (datos provisionales)';

  if p_aplicar_saldos then
    with nuevos as (
      insert into mundial_saldos_respaldo (fantasy_team_id, saldo_previo, saldo_aplicado)
      select ft.id, ft.presupuesto, v_e.saldo_evento
      from fantasy_teams ft
      where not exists (select 1 from mundial_saldos_respaldo b where b.fantasy_team_id = ft.id)
        and (not p_solo_publicas or ft.league_id in (select id from leagues where tipo = 'publica'))
      on conflict (fantasy_team_id) do nothing
      returning fantasy_team_id
    ), act as (
      update fantasy_teams ft set presupuesto = v_e.saldo_evento
      from nuevos n where ft.id = n.fantasy_team_id
      returning ft.id
    )
    select count(*) into v_equipos from act;

    update mundial_evento set saldos_aplicados_en = coalesce(saldos_aplicados_en, now()),
                              saldos_restaurados_en = null
    where id = 1;
  end if;

  return jsonb_build_object('ok', true, 'equipos_con_saldo_nuevo', v_equipos);
end;
$$;
revoke all on function public.admin_mundial_activar(boolean, boolean) from public, anon;
grant execute on function public.admin_mundial_activar(boolean, boolean) to authenticated;

-- CERRAR el evento: apaga Match (vuelven Plantilla y Mercado) y restaura los saldos previos.
-- p_conservar_variaciones = true restaura "saldo previo + lo ganado/gastado durante el evento".
-- Devuelve cuántos equipos tenían un saldo distinto del aplicado (variaciones durante el evento).
create or replace function public.admin_mundial_cerrar(
  p_restaurar_saldos boolean default true,
  p_conservar_variaciones boolean default false
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_restaurados integer := 0;
  v_con_variacion integer := 0;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador.');
  end if;

  if p_restaurar_saldos then
    select count(*) into v_con_variacion
    from mundial_saldos_respaldo b
    join fantasy_teams ft on ft.id = b.fantasy_team_id
    where b.restaurado_en is null and ft.presupuesto <> b.saldo_aplicado;

    with rest as (
      update fantasy_teams ft
      set presupuesto = case when p_conservar_variaciones
                             then b.saldo_previo + (ft.presupuesto - b.saldo_aplicado)
                             else b.saldo_previo end
      from mundial_saldos_respaldo b
      where b.fantasy_team_id = ft.id and b.restaurado_en is null
      returning b.fantasy_team_id
    )
    update mundial_saldos_respaldo b set restaurado_en = now()
    from rest where b.fantasy_team_id = rest.fantasy_team_id;
    get diagnostics v_restaurados = row_count;

    update mundial_evento set saldos_restaurados_en = now() where id = 1;
  end if;

  update mundial_evento set activo = false, modo_match = false, cerrado_en = now(), updated_at = now()
  where id = 1;

  -- Los jugadores del evento vuelven a inactivos si nadie los tiene en plantilla.
  update players p set activo = false
  where p.club = 'Mundial 2026 (datos provisionales)'
    and not exists (select 1 from squad_slots s where s.player_id = p.id and s.fecha_salida is null);

  return jsonb_build_object('ok', true, 'saldos_restaurados', v_restaurados,
                            'equipos_con_variacion', v_con_variacion);
end;
$$;
revoke all on function public.admin_mundial_cerrar(boolean, boolean) from public, anon;
grant execute on function public.admin_mundial_cerrar(boolean, boolean) to authenticated;

-- Participantes (con al menos un pronóstico o voto), con sus puntos.
create or replace function public.admin_mundial_participantes()
returns table (
  user_id uuid, nombre text, pronosticos integer, aciertos integer, puntos integer,
  voto_final text, icono boolean
)
language sql
stable
security definer set search_path = public
as $$
  select
    u.user_id, pr.nombre,
    (select count(*)::integer from mundial_pronosticos p where p.user_id = u.user_id),
    (select count(*)::integer from mundial_pronosticos p
       join mundial_partidas pa on pa.id = p.partida_id
      where p.user_id = u.user_id and pa.tipo = 'partida' and pa.resultado = p.pronostico),
    public.mundial_puntos_usuario(u.user_id),
    (select voto from mundial_voto_final v where v.user_id = u.user_id),
    exists (select 1 from iconos_desbloqueados i where i.user_id = u.user_id and i.icono = 'sindarov')
  from (select p.user_id from mundial_pronosticos p union select v.user_id from mundial_voto_final v) u
  join profiles pr on pr.id = u.user_id
  where public.es_root()
  order by 5 desc, 2;
$$;
revoke all on function public.admin_mundial_participantes() from public, anon;
grant execute on function public.admin_mundial_participantes() to authenticated;

-- Concede el icono de Sindarov a todos los participantes. Idempotente: se puede lanzar
-- varias veces (solo añade a quien aún no lo tenga). Solo con el evento terminado.
create or replace function public.admin_mundial_conceder_icono()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_e mundial_evento%rowtype;
  v_nuevos integer;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador.');
  end if;
  select * into v_e from mundial_evento where id = 1;
  if v_e.resultado_final is null and v_e.cerrado_en is null then
    return jsonb_build_object('ok', false,
      'mensaje', 'El evento aún no ha terminado: pon el resultado final o ciérralo antes.');
  end if;
  insert into iconos_desbloqueados (user_id, icono, origen, edicion)
  select u.user_id, 'sindarov', 'evento', 'mundial-2026'
  from (select user_id from mundial_pronosticos union select user_id from mundial_voto_final) u
  join profiles pr on pr.id = u.user_id
  on conflict (user_id, icono) do nothing;
  get diagnostics v_nuevos = row_count;
  update mundial_evento set icono_concedido_en = coalesce(icono_concedido_en, now()) where id = 1;
  return jsonb_build_object('ok', true, 'nuevos', v_nuevos,
    'total', (select count(*) from iconos_desbloqueados where icono = 'sindarov'));
end;
$$;
revoke all on function public.admin_mundial_conceder_icono() from public, anon;
grant execute on function public.admin_mundial_conceder_icono() to authenticated;

-- 11) Histórico de clasificaciones ------------------------------------------------------------

-- Foto de la clasificación de una liga (no borra ni modifica nada de la liga). Evita duplicar
-- el mismo nombre para la misma liga.
create or replace function public.admin_archivar_clasificacion(p_league_id uuid, p_nombre text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_nombre text := nullif(btrim(coalesce(p_nombre, '')), '');
  v_id uuid;
  v_filas integer;
begin
  if not public.es_root() then
    return jsonb_build_object('ok', false, 'mensaje', 'Solo el administrador.');
  end if;
  if v_nombre is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Pon un nombre al archivo (p. ej. "Primera liga").');
  end if;
  if not exists (select 1 from leagues where id = p_league_id) then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa liga no existe.');
  end if;
  if exists (select 1 from clasificacion_archivos where league_id = p_league_id and nombre = v_nombre) then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa liga ya está archivada con ese nombre.');
  end if;

  insert into clasificacion_archivos (nombre, league_id, creado_por)
  values (v_nombre, p_league_id, auth.uid())
  returning id into v_id;

  insert into clasificacion_archivo_filas
    (archivo_id, posicion, user_id, equipo_id, nombre_equipo, nombre_manager, puntos)
  select v_id,
         (row_number() over (order by x.puntos desc, x.nombre_equipo, x.equipo_id))::integer,
         x.owner_id, x.equipo_id, x.nombre_equipo, x.nombre_manager, x.puntos
  from (
    select ft.id as equipo_id, ft.owner_id, ft.nombre as nombre_equipo, pr.nombre as nombre_manager,
           (coalesce((select sum(t.puntos) from team_matchday_points t where t.fantasy_team_id = ft.id), 0)
            - coalesce((select sum(s.cantidad) from liga_sanciones s
                         where s.fantasy_team_id = ft.id and s.tipo = 'puntos'), 0))::integer as puntos
    from fantasy_teams ft
    join profiles pr on pr.id = ft.owner_id
    where ft.league_id = p_league_id
  ) x;
  get diagnostics v_filas = row_count;

  return jsonb_build_object('ok', true, 'archivo_id', v_id, 'equipos', v_filas);
end;
$$;
revoke all on function public.admin_archivar_clasificacion(uuid, text) from public, anon;
grant execute on function public.admin_archivar_clasificacion(uuid, text) to authenticated;

-- Lista del selector "Histórico": archivos de ligas en las que participé (o todos si root)
-- + el Mundial (id 'mundial') si el evento ha tenido actividad.
create or replace function public.historico_clasificaciones()
returns table (id text, nombre text, tipo text, fecha timestamptz)
language sql
stable
security definer set search_path = public
as $$
  select a.id::text, a.nombre, 'liga'::text, a.archivada_en
  from clasificacion_archivos a
  where auth.uid() is not null
    and (public.es_root()
         or exists (select 1 from clasificacion_archivo_filas f
                     where f.archivo_id = a.id and f.user_id = auth.uid()))
  union all
  select 'mundial', e.nombre, 'mundial', coalesce(e.cerrado_en, e.iniciado_en, e.updated_at)
  from mundial_evento e
  where auth.uid() is not null
    and (e.activo or e.cerrado_en is not null or exists (select 1 from mundial_pronosticos))
  order by 4 desc;
$$;
revoke all on function public.historico_clasificaciones() from public, anon;
grant execute on function public.historico_clasificaciones() to authenticated;

-- Clasificación de un elemento del histórico.
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

  if not (public.es_root() or exists (
        select 1 from clasificacion_archivo_filas f
        where f.archivo_id = v_uuid and f.user_id = auth.uid())) then
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

-- CHECKLIST DE ACTIVACIÓN (a mano, desde Admin > Mundial; nada de esto es automático):
--   1. Revisar Elo/valor de Gukesh y Sindarov (Admin > Jugadores) y las horas del calendario.
--   2. (Opcional) Admin > Mundial > "Archivar clasificación" de la primera liga, ANTES de encender.
--   3. Crear el torneo del Mundial en Admin > Torneos si se quiere (enviará un push de torneo nuevo).
--   4. "Encender evento": activa Match, oculta Mercado/Plantilla y pone el saldo a todos.
--   5. Tras terminar: "Cerrar evento" (restaura saldos) y "Conceder icono".
