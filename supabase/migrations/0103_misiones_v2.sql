-- 0103: misiones v2. Sustituye el catálogo de 0102 por uno mucho más largo y difícil,
-- separado por liga pública, liga privada, cuenta y minijuegos.
--
-- REQUIERE 0102 (xp_movimientos / fijar_xp ya usados, ventas_usuarios) y 0098/0099 (minijuegos).
--
-- Qué cambia respecto a 0102:
--   - 51 familias de misiones, 69 series (una por familia y ámbito) y 357 escalones.
--     Las series acaban en _pub (liga pública activa), _pri (ligas privadas) o no llevan
--     sufijo (cuenta y minijuegos). Un mismo logro de partidas o de mercado existe en pública
--     y en privada con contadores SEPARADOS; la privada da el 60 % de XP.
--   - El progreso ya no se calcula al abrir la pantalla: se guarda en misiones_progreso
--     (valor máximo alcanzado, o el mejor puesto en rankmj) y se refresca como mucho cada
--     10 minutos o al reclamar. Así lo que depende del estado de la plantilla (valor, saldo)
--     no se pierde si luego baja, y la consulta del aviso es barata.
--   - Lo de minijuegos que sale de mj_partidas (se purga a los 60 días) se acumula de forma
--     incremental en misiones_estado.acum a partir de la última vez que se refrescó.
--   - Medidas antiamaños en ligas privadas (las ventas entre managers, clausulazos...):
--       * Mercader: cada venta cuenta como máximo el valor de mercado del jugador (no el
--         precio pactado), una misma venta entre los mismos dos managers cuenta una vez y
--         un jugador comprado en los 7 días anteriores no cuenta al revenderlo.
--       * Clausulazo: jugadores distintos; si el clausulado te lo había vendido o quitado en
--         los 30 días anteriores, no cuenta.
--       * Ganar jornada en liga privada: solo ligas con al menos 5 managers que puntuaron.
--       * Fichajes, blindaje, subir cláusula, pujas: jugadores distintos.
--     Para ello ventas_usuarios (0102) pasa a registrar también las ventas de la liga pública.
--   - Las 4 misiones ya reclamadas con 0102 (clausulazo:1, racha:1, racha:2, elo:1) se quedan
--     como están en xp_movimientos: su XP no se toca y las series nuevas tienen otros nombres.
--
-- Cada serie es una cadena: solo se ve el siguiente escalón, que se reclama con
-- reclamar_mision(serie). Reclamar es idempotente (fijar_xp, fuente 'mision', clave 'serie:escalon').
--
-- Impacto en datos existentes: tablas nuevas (misiones_progreso, misiones_estado), sustituye
-- las funciones de 0102 (estado_misiones, reclamar_mision, misiones_catalogo; borra
-- progreso_mision), cambia el trigger de ventas_usuarios y rellena clausulazos públicos que
-- faltaran. No toca saldos, jugadores ni XP. Lanzar con `supabase db push` o en el SQL Editor.


-- 1) Ventas entre managers: también en la liga pública --------------------------------------
create or replace function public.registrar_venta_usuarios()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_liga uuid;
  v_vendedor uuid;
begin
  select ft.league_id into v_liga from fantasy_teams ft where ft.id = new.fantasy_team_id;

  if v_liga is null or new.player_id is null or coalesce(new.importe, 0) <= 0 then
    return new;
  end if;

  -- El vendedor es quien acaba de perder al jugador EN ESTA MISMA TRANSACCIÓN (su
  -- squad_slot se cierra con fecha_salida = now() justo antes de registrar la operación).
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

-- Clausulazos de la liga pública anteriores a 0102 que no se hubieran registrado.
insert into public.ventas_usuarios (league_id, vendedor_team_id, comprador_team_id, player_id, importe, tipo, created_at)
select ft.league_id, cr.from_team_id, cr.to_team_id, cr.player_id, cr.importe, 'clausulazo', cr.created_at
from public.clause_releases cr
join public.fantasy_teams ft on ft.id = cr.to_team_id
where cr.importe > 0
  and not exists (
    select 1 from public.ventas_usuarios v
    where v.comprador_team_id = cr.to_team_id
      and v.player_id = cr.player_id
      and v.tipo = 'clausulazo'
      and abs(extract(epoch from (v.created_at - cr.created_at))) < 5
  );

create index if not exists ventas_usuarios_comprador_idx on public.ventas_usuarios (comprador_team_id);


-- 2) Tablas de progreso --------------------------------------------------------------------
-- Sin políticas a propósito: solo las leen las funciones security definer de abajo.
create table if not exists public.misiones_progreso (
  user_id uuid not null references auth.users (id) on delete cascade,
  serie text not null,
  valor numeric not null,
  primary key (user_id, serie)
);

create table if not exists public.misiones_estado (
  user_id uuid primary key references auth.users (id) on delete cascade,
  calculado_en timestamptz not null default now(),
  corte_mj timestamptz,
  acum jsonb not null default '{}'::jsonb
);

alter table public.misiones_progreso enable row level security;
alter table public.misiones_estado enable row level security;
revoke all on public.misiones_progreso from anon, authenticated;
revoke all on public.misiones_estado from anon, authenticated;


-- 3) Catálogo ---------------------------------------------------------------------------------
-- Limpieza de 0102 (el progreso ahora se guarda y se calcula en refrescar_misiones).
drop function if exists public.estado_misiones();
drop function if exists public.reclamar_mision(text);
drop function if exists public.progreso_mision(uuid, text);
drop function if exists public.misiones_catalogo();

-- Series, en el orden de la pantalla. ambito: pub | pri | gen | mj. sentido: max (se
-- cumple al llegar o superar el objetivo) o min (rankmj: se cumple al bajar hasta el puesto).
create or replace function public.misiones_series()
returns table (serie text, base text, ambito text, grupo text, sentido text, orden integer)
language sql
immutable
as $$
  select v.serie, v.base, v.ambito, v.grupo, v.sentido, v.orden
  from (values
    ('top10_pub', 'top10', 'pub', 'clasificacion', 'max', 1),
    ('podio_pub', 'podio', 'pub', 'clasificacion', 'max', 2),
    ('primero_pub', 'primero', 'pub', 'clasificacion', 'max', 3),
    ('lider_pub', 'lider', 'pub', 'clasificacion', 'max', 4),
    ('presencia_pub', 'presencia', 'pub', 'clasificacion', 'max', 5),
    ('valorplantilla_pub', 'valorplantilla', 'pub', 'economia', 'max', 6),
    ('caja_pub', 'caja', 'pub', 'economia', 'max', 7),
    ('estrella_pub', 'estrella', 'pub', 'economia', 'max', 8),
    ('lujo_pub', 'lujo', 'pub', 'economia', 'max', 9),
    ('caz100_pub', 'caz100', 'pub', 'partidas', 'max', 10),
    ('caz200_pub', 'caz200', 'pub', 'partidas', 'max', 11),
    ('caz300_pub', 'caz300', 'pub', 'partidas', 'max', 12),
    ('capitan_pub', 'capitan', 'pub', 'partidas', 'max', 13),
    ('oro_pub', 'oro', 'pub', 'partidas', 'max', 14),
    ('regular_pub', 'regular', 'pub', 'partidas', 'max', 15),
    ('victorias_pub', 'victorias', 'pub', 'partidas', 'max', 16),
    ('capgig_pub', 'capgig', 'pub', 'partidas', 'max', 17),
    ('cuatro_pub', 'cuatro', 'pub', 'partidas', 'max', 18),
    ('pleno_pub', 'pleno', 'pub', 'partidas', 'max', 19),
    ('fiel_pub', 'fiel', 'pub', 'partidas', 'max', 20),
    ('pujas_pub', 'pujas', 'pub', 'mercado', 'max', 21),
    ('fichajes_pub', 'fichajes', 'pub', 'mercado', 'max', 22),
    ('blindaje_pub', 'blindaje', 'pub', 'mercado', 'max', 23),
    ('subircl_pub', 'subircl', 'pub', 'mercado', 'max', 24),
    ('clausulazo_pub', 'clausulazo', 'pub', 'mercado', 'max', 25),
    ('plusvalia_pub', 'plusvalia', 'pub', 'mercado', 'max', 26),
    ('mejorop_pub', 'mejorop', 'pub', 'mercado', 'max', 27),
    ('caz100_pri', 'caz100', 'pri', 'partidas', 'max', 28),
    ('caz200_pri', 'caz200', 'pri', 'partidas', 'max', 29),
    ('caz300_pri', 'caz300', 'pri', 'partidas', 'max', 30),
    ('capitan_pri', 'capitan', 'pri', 'partidas', 'max', 31),
    ('oro_pri', 'oro', 'pri', 'partidas', 'max', 32),
    ('regular_pri', 'regular', 'pri', 'partidas', 'max', 33),
    ('victorias_pri', 'victorias', 'pri', 'partidas', 'max', 34),
    ('capgig_pri', 'capgig', 'pri', 'partidas', 'max', 35),
    ('cuatro_pri', 'cuatro', 'pri', 'partidas', 'max', 36),
    ('pleno_pri', 'pleno', 'pri', 'partidas', 'max', 37),
    ('fiel_pri', 'fiel', 'pri', 'partidas', 'max', 38),
    ('pujas_pri', 'pujas', 'pri', 'mercado', 'max', 39),
    ('fichajes_pri', 'fichajes', 'pri', 'mercado', 'max', 40),
    ('blindaje_pri', 'blindaje', 'pri', 'mercado', 'max', 41),
    ('subircl_pri', 'subircl', 'pri', 'mercado', 'max', 42),
    ('clausulazo_pri', 'clausulazo', 'pri', 'mercado', 'max', 43),
    ('plusvalia_pri', 'plusvalia', 'pri', 'mercado', 'max', 44),
    ('mejorop_pri', 'mejorop', 'pri', 'mercado', 'max', 45),
    ('mercader_pri', 'mercader', 'pri', 'mercado', 'max', 46),
    ('ganajor_pri', 'ganajor', 'pri', 'clasificacion', 'max', 47),
    ('rachadiaria', 'rachadiaria', 'gen', 'progresion', 'max', 48),
    ('nivel', 'nivel', 'gen', 'progresion', 'max', 49),
    ('veterano', 'veterano', 'gen', 'progresion', 'max', 50),
    ('cofres', 'cofres', 'gen', 'progresion', 'max', 51),
    ('semana', 'semana', 'gen', 'progresion', 'max', 52),
    ('diacompleto', 'diacompleto', 'mj', 'minijuegos', 'max', 53),
    ('seguidos', 'seguidos', 'mj', 'minijuegos', 'max', 54),
    ('cadena', 'cadena', 'mj', 'minijuegos', 'max', 55),
    ('cadenaperf', 'cadenaperf', 'mj', 'minijuegos', 'max', 56),
    ('m900v', 'm900v', 'mj', 'minijuegos', 'max', 57),
    ('m900j', 'm900j', 'mj', 'minijuegos', 'max', 58),
    ('perfn', 'perfn', 'mj', 'minijuegos', 'max', 59),
    ('perfleyj', 'perfleyj', 'mj', 'minijuegos', 'max', 60),
    ('perfleyv', 'perfleyv', 'mj', 'minijuegos', 'max', 61),
    ('rankmj', 'rankmj', 'mj', 'minijuegos', 'min', 62),
    ('primerodia', 'primerodia', 'mj', 'minijuegos', 'max', 63),
    ('maraton', 'maraton', 'mj', 'minijuegos', 'max', 64),
    ('cofresmj', 'cofresmj', 'mj', 'minijuegos', 'max', 65),
    ('m500x8', 'm500x8', 'mj', 'minijuegos', 'max', 66),
    ('tt4', 'tt4', 'mj', 'minijuegos', 'max', 67),
    ('tt8', 'tt8', 'mj', 'minijuegos', 'max', 68),
    ('puntosmj', 'puntosmj', 'mj', 'minijuegos', 'max', 69)
  ) as v(serie, base, ambito, grupo, sentido, orden);
$$;

-- Escalones: (serie, escalón, objetivo, XP). Para tocar la dificultad o la XP basta con
-- cambiar esta lista en una migración nueva.
create or replace function public.misiones_catalogo()
returns table (serie text, nivel integer, objetivo numeric, xp integer)
language sql
immutable
as $$
  select v.serie, v.nivel, v.objetivo, v.xp
  from (values
    ('top10_pub', 1, 1, 30),
    ('top10_pub', 2, 3, 60),
    ('top10_pub', 3, 6, 105),
    ('top10_pub', 4, 12, 180),
    ('top10_pub', 5, 25, 300),
    ('top10_pub', 6, 50, 540),
    ('podio_pub', 1, 1, 90),
    ('podio_pub', 2, 3, 180),
    ('podio_pub', 3, 6, 300),
    ('podio_pub', 4, 12, 540),
    ('podio_pub', 5, 25, 900),
    ('primero_pub', 1, 1, 180),
    ('primero_pub', 2, 2, 300),
    ('primero_pub', 3, 4, 480),
    ('primero_pub', 4, 8, 780),
    ('primero_pub', 5, 15, 1260),
    ('primero_pub', 6, 30, 2100),
    ('lider_pub', 1, 1, 90),
    ('lider_pub', 2, 3, 210),
    ('lider_pub', 3, 6, 420),
    ('lider_pub', 4, 12, 840),
    ('presencia_pub', 1, 3, 40),
    ('presencia_pub', 2, 6, 90),
    ('presencia_pub', 3, 12, 200),
    ('presencia_pub', 4, 25, 450),
    ('presencia_pub', 5, 50, 1000),
    ('valorplantilla_pub', 1, 600, 80),
    ('valorplantilla_pub', 2, 650, 160),
    ('valorplantilla_pub', 3, 700, 280),
    ('valorplantilla_pub', 4, 750, 480),
    ('valorplantilla_pub', 5, 800, 800),
    ('valorplantilla_pub', 6, 900, 1400),
    ('caja_pub', 1, 300, 10),
    ('caja_pub', 2, 450, 30),
    ('caja_pub', 3, 600, 60),
    ('caja_pub', 4, 800, 110),
    ('caja_pub', 5, 1000, 180),
    ('caja_pub', 6, 1500, 360),
    ('estrella_pub', 1, 120, 80),
    ('estrella_pub', 2, 130, 200),
    ('estrella_pub', 3, 140, 480),
    ('lujo_pub', 1, 2, 40),
    ('lujo_pub', 2, 3, 100),
    ('lujo_pub', 3, 4, 240),
    ('lujo_pub', 4, 5, 520),
    ('lujo_pub', 5, 6, 1120),
    ('caz100_pub', 1, 3, 35),
    ('caz100_pub', 2, 6, 70),
    ('caz100_pub', 3, 12, 125),
    ('caz100_pub', 4, 25, 230),
    ('caz100_pub', 5, 50, 410),
    ('caz100_pub', 6, 100, 720),
    ('caz200_pub', 1, 1, 115),
    ('caz200_pub', 2, 3, 200),
    ('caz200_pub', 3, 6, 340),
    ('caz200_pub', 4, 12, 540),
    ('caz200_pub', 5, 25, 900),
    ('caz200_pub', 6, 50, 1580),
    ('caz300_pub', 1, 1, 450),
    ('caz300_pub', 2, 2, 720),
    ('caz300_pub', 3, 4, 1170),
    ('caz300_pub', 4, 8, 1890),
    ('caz300_pub', 5, 15, 3150),
    ('capitan_pub', 1, 40, 20),
    ('capitan_pub', 2, 80, 45),
    ('capitan_pub', 3, 150, 90),
    ('capitan_pub', 4, 300, 180),
    ('capitan_pub', 5, 600, 360),
    ('capitan_pub', 6, 1000, 680),
    ('capitan_pub', 7, 2000, 1350),
    ('oro_pub', 1, 30, 70),
    ('oro_pub', 2, 34, 135),
    ('oro_pub', 3, 37, 230),
    ('oro_pub', 4, 40, 410),
    ('oro_pub', 5, 45, 680),
    ('oro_pub', 6, 50, 1350),
    ('regular_pub', 1, 3, 45),
    ('regular_pub', 2, 6, 115),
    ('regular_pub', 3, 10, 230),
    ('regular_pub', 4, 20, 540),
    ('regular_pub', 5, 40, 1350),
    ('victorias_pub', 1, 50, 20),
    ('victorias_pub', 2, 100, 45),
    ('victorias_pub', 3, 200, 100),
    ('victorias_pub', 4, 400, 220),
    ('victorias_pub', 5, 800, 480),
    ('victorias_pub', 6, 1600, 1000),
    ('capgig_pub', 1, 3, 45),
    ('capgig_pub', 2, 6, 90),
    ('capgig_pub', 3, 12, 180),
    ('capgig_pub', 4, 25, 360),
    ('capgig_pub', 5, 50, 720),
    ('cuatro_pub', 1, 1, 40),
    ('cuatro_pub', 2, 5, 110),
    ('cuatro_pub', 3, 15, 300),
    ('cuatro_pub', 4, 40, 700),
    ('pleno_pub', 1, 1, 400),
    ('pleno_pub', 2, 2, 700),
    ('pleno_pub', 3, 4, 1200),
    ('pleno_pub', 4, 8, 2200),
    ('fiel_pub', 1, 5, 25),
    ('fiel_pub', 2, 10, 60),
    ('fiel_pub', 3, 20, 150),
    ('fiel_pub', 4, 40, 350),
    ('pujas_pub', 1, 10, 25),
    ('pujas_pub', 2, 25, 60),
    ('pujas_pub', 3, 50, 120),
    ('pujas_pub', 4, 100, 240),
    ('pujas_pub', 5, 200, 450),
    ('pujas_pub', 6, 400, 900),
    ('fichajes_pub', 1, 25, 10),
    ('fichajes_pub', 2, 50, 30),
    ('fichajes_pub', 3, 100, 60),
    ('fichajes_pub', 4, 250, 140),
    ('fichajes_pub', 5, 500, 300),
    ('blindaje_pub', 1, 5, 20),
    ('blindaje_pub', 2, 10, 50),
    ('blindaje_pub', 3, 20, 100),
    ('blindaje_pub', 4, 40, 200),
    ('blindaje_pub', 5, 80, 380),
    ('subircl_pub', 1, 10, 10),
    ('subircl_pub', 2, 25, 30),
    ('subircl_pub', 3, 50, 60),
    ('subircl_pub', 4, 100, 120),
    ('subircl_pub', 5, 200, 240),
    ('clausulazo_pub', 1, 3, 30),
    ('clausulazo_pub', 2, 6, 75),
    ('clausulazo_pub', 3, 10, 135),
    ('clausulazo_pub', 4, 20, 270),
    ('clausulazo_pub', 5, 40, 540),
    ('clausulazo_pub', 6, 80, 1050),
    ('plusvalia_pub', 1, 50, 20),
    ('plusvalia_pub', 2, 150, 50),
    ('plusvalia_pub', 3, 400, 120),
    ('plusvalia_pub', 4, 1000, 280),
    ('plusvalia_pub', 5, 2500, 600),
    ('plusvalia_pub', 6, 6000, 1300),
    ('mejorop_pub', 1, 30, 60),
    ('mejorop_pub', 2, 50, 200),
    ('mejorop_pub', 3, 80, 600),
    ('caz100_pri', 1, 3, 20),
    ('caz100_pri', 2, 6, 40),
    ('caz100_pri', 3, 12, 75),
    ('caz100_pri', 4, 25, 140),
    ('caz100_pri', 5, 50, 250),
    ('caz100_pri', 6, 100, 430),
    ('caz200_pri', 1, 1, 70),
    ('caz200_pri', 2, 3, 120),
    ('caz200_pri', 3, 6, 200),
    ('caz200_pri', 4, 12, 320),
    ('caz200_pri', 5, 25, 540),
    ('caz200_pri', 6, 50, 950),
    ('caz300_pri', 1, 1, 270),
    ('caz300_pri', 2, 2, 430),
    ('caz300_pri', 3, 4, 700),
    ('caz300_pri', 4, 8, 1130),
    ('caz300_pri', 5, 15, 1890),
    ('capitan_pri', 1, 40, 10),
    ('capitan_pri', 2, 80, 25),
    ('capitan_pri', 3, 150, 55),
    ('capitan_pri', 4, 300, 110),
    ('capitan_pri', 5, 600, 220),
    ('capitan_pri', 6, 1000, 410),
    ('capitan_pri', 7, 2000, 810),
    ('oro_pri', 1, 30, 40),
    ('oro_pri', 2, 34, 80),
    ('oro_pri', 3, 37, 140),
    ('oro_pri', 4, 40, 250),
    ('oro_pri', 5, 45, 410),
    ('oro_pri', 6, 50, 810),
    ('regular_pri', 1, 3, 25),
    ('regular_pri', 2, 6, 70),
    ('regular_pri', 3, 10, 140),
    ('regular_pri', 4, 20, 320),
    ('regular_pri', 5, 40, 810),
    ('victorias_pri', 1, 50, 10),
    ('victorias_pri', 2, 100, 25),
    ('victorias_pri', 3, 200, 60),
    ('victorias_pri', 4, 400, 130),
    ('victorias_pri', 5, 800, 290),
    ('victorias_pri', 6, 1600, 600),
    ('capgig_pri', 1, 3, 25),
    ('capgig_pri', 2, 6, 55),
    ('capgig_pri', 3, 12, 110),
    ('capgig_pri', 4, 25, 220),
    ('capgig_pri', 5, 50, 430),
    ('cuatro_pri', 1, 1, 25),
    ('cuatro_pri', 2, 5, 65),
    ('cuatro_pri', 3, 15, 180),
    ('cuatro_pri', 4, 40, 420),
    ('pleno_pri', 1, 1, 240),
    ('pleno_pri', 2, 2, 420),
    ('pleno_pri', 3, 4, 720),
    ('pleno_pri', 4, 8, 1320),
    ('fiel_pri', 1, 5, 15),
    ('fiel_pri', 2, 10, 35),
    ('fiel_pri', 3, 20, 90),
    ('fiel_pri', 4, 40, 210),
    ('pujas_pri', 1, 10, 15),
    ('pujas_pri', 2, 25, 35),
    ('pujas_pri', 3, 50, 70),
    ('pujas_pri', 4, 100, 145),
    ('pujas_pri', 5, 200, 270),
    ('pujas_pri', 6, 400, 540),
    ('fichajes_pri', 1, 25, 5),
    ('fichajes_pri', 2, 50, 20),
    ('fichajes_pri', 3, 100, 35),
    ('fichajes_pri', 4, 250, 85),
    ('fichajes_pri', 5, 500, 180),
    ('blindaje_pri', 1, 5, 10),
    ('blindaje_pri', 2, 10, 30),
    ('blindaje_pri', 3, 20, 60),
    ('blindaje_pri', 4, 40, 120),
    ('blindaje_pri', 5, 80, 230),
    ('subircl_pri', 1, 10, 5),
    ('subircl_pri', 2, 25, 20),
    ('subircl_pri', 3, 50, 35),
    ('subircl_pri', 4, 100, 70),
    ('subircl_pri', 5, 200, 145),
    ('clausulazo_pri', 1, 3, 20),
    ('clausulazo_pri', 2, 6, 45),
    ('clausulazo_pri', 3, 10, 80),
    ('clausulazo_pri', 4, 20, 160),
    ('clausulazo_pri', 5, 40, 320),
    ('clausulazo_pri', 6, 80, 630),
    ('plusvalia_pri', 1, 50, 10),
    ('plusvalia_pri', 2, 150, 30),
    ('plusvalia_pri', 3, 400, 70),
    ('plusvalia_pri', 4, 1000, 170),
    ('plusvalia_pri', 5, 2500, 360),
    ('plusvalia_pri', 6, 6000, 780),
    ('mejorop_pri', 1, 30, 35),
    ('mejorop_pri', 2, 50, 120),
    ('mejorop_pri', 3, 80, 360),
    ('mercader_pri', 1, 100, 10),
    ('mercader_pri', 2, 300, 45),
    ('mercader_pri', 3, 600, 105),
    ('mercader_pri', 4, 1000, 240),
    ('mercader_pri', 5, 2000, 480),
    ('mercader_pri', 6, 4000, 900),
    ('mercader_pri', 7, 8000, 1800),
    ('ganajor_pri', 1, 3, 10),
    ('ganajor_pri', 2, 6, 20),
    ('ganajor_pri', 3, 12, 40),
    ('ganajor_pri', 4, 25, 80),
    ('rachadiaria', 1, 14, 30),
    ('rachadiaria', 2, 30, 75),
    ('rachadiaria', 3, 60, 150),
    ('rachadiaria', 4, 100, 270),
    ('rachadiaria', 5, 200, 540),
    ('rachadiaria', 6, 365, 1050),
    ('rachadiaria', 7, 730, 2100),
    ('nivel', 1, 10, 30),
    ('nivel', 2, 15, 75),
    ('nivel', 3, 20, 150),
    ('nivel', 4, 25, 270),
    ('nivel', 5, 30, 450),
    ('nivel', 6, 40, 900),
    ('nivel', 7, 50, 1800),
    ('veterano', 1, 30, 25),
    ('veterano', 2, 100, 75),
    ('veterano', 3, 200, 150),
    ('veterano', 4, 365, 300),
    ('veterano', 5, 730, 750),
    ('cofres', 1, 5, 20),
    ('cofres', 2, 10, 45),
    ('cofres', 3, 25, 110),
    ('cofres', 4, 50, 250),
    ('cofres', 5, 100, 550),
    ('semana', 1, 1, 60),
    ('semana', 2, 4, 160),
    ('semana', 3, 12, 400),
    ('semana', 4, 26, 800),
    ('semana', 5, 52, 1600),
    ('diacompleto', 1, 7, 40),
    ('diacompleto', 2, 30, 120),
    ('diacompleto', 3, 60, 240),
    ('diacompleto', 4, 100, 400),
    ('diacompleto', 5, 200, 800),
    ('diacompleto', 6, 365, 1600),
    ('seguidos', 1, 7, 60),
    ('seguidos', 2, 14, 140),
    ('seguidos', 3, 30, 320),
    ('seguidos', 4, 60, 600),
    ('seguidos', 5, 100, 1200),
    ('seguidos', 6, 200, 2400),
    ('cadena', 1, 12, 25),
    ('cadena', 2, 15, 80),
    ('cadena', 3, 18, 200),
    ('cadena', 4, 20, 400),
    ('cadenaperf', 1, 1, 400),
    ('cadenaperf', 2, 3, 720),
    ('cadenaperf', 3, 6, 1200),
    ('cadenaperf', 4, 12, 2000),
    ('cadenaperf', 5, 25, 3600),
    ('m900v', 1, 1, 40),
    ('m900v', 2, 5, 100),
    ('m900v', 3, 15, 200),
    ('m900v', 4, 40, 400),
    ('m900v', 5, 100, 800),
    ('m900j', 1, 1, 40),
    ('m900j', 2, 2, 100),
    ('m900j', 3, 4, 240),
    ('m900j', 4, 6, 520),
    ('m900j', 5, 8, 1200),
    ('perfn', 1, 3, 40),
    ('perfn', 2, 4, 100),
    ('perfn', 3, 5, 240),
    ('perfn', 4, 6, 520),
    ('perfn', 5, 7, 900),
    ('perfn', 6, 8, 1700),
    ('perfleyj', 1, 1, 80),
    ('perfleyj', 2, 2, 200),
    ('perfleyj', 3, 4, 480),
    ('perfleyj', 4, 6, 1040),
    ('perfleyj', 5, 8, 2400),
    ('perfleyv', 1, 1, 80),
    ('perfleyv', 2, 5, 240),
    ('perfleyv', 3, 15, 560),
    ('perfleyv', 4, 40, 1200),
    ('rankmj', 1, 10, 40),
    ('rankmj', 2, 5, 100),
    ('rankmj', 3, 3, 200),
    ('rankmj', 4, 2, 400),
    ('rankmj', 5, 1, 1000),
    ('primerodia', 1, 1, 30),
    ('primerodia', 2, 5, 80),
    ('primerodia', 3, 15, 180),
    ('primerodia', 4, 40, 360),
    ('primerodia', 5, 100, 720),
    ('primerodia', 6, 250, 1400),
    ('maraton', 1, 100, 20),
    ('maraton', 2, 250, 50),
    ('maraton', 3, 500, 100),
    ('maraton', 4, 1000, 200),
    ('maraton', 5, 2500, 400),
    ('cofresmj', 1, 10, 20),
    ('cofresmj', 2, 30, 60),
    ('cofresmj', 3, 60, 120),
    ('cofresmj', 4, 120, 240),
    ('cofresmj', 5, 250, 480),
    ('m500x8', 1, 1, 80),
    ('m500x8', 2, 5, 200),
    ('m500x8', 3, 15, 450),
    ('m500x8', 4, 40, 1000),
    ('tt4', 1, 1, 240),
    ('tt4', 2, 5, 600),
    ('tt4', 3, 15, 1600),
    ('tt8', 1, 1, 800),
    ('tt8', 2, 3, 1600),
    ('tt8', 3, 10, 3200),
    ('puntosmj', 1, 100000, 20),
    ('puntosmj', 2, 250000, 50),
    ('puntosmj', 3, 500000, 110),
    ('puntosmj', 4, 1000000, 250),
    ('puntosmj', 5, 2000000, 600),
    ('puntosmj', 6, 4000000, 1400)
  ) as v(serie, nivel, objetivo, xp);
$$;

revoke all on function public.misiones_series() from public, anon, authenticated;
revoke all on function public.misiones_catalogo() from public, anon, authenticated;

-- Ámbito de una liga: 'pub' (pública activa), 'pri' (privada) o null (pública en prueba).
create or replace function public.ambito_liga(p_tipo text, p_estado text)
returns text
language sql
immutable
as $$
  select case
    when p_tipo = 'publica' and p_estado = 'activa' then 'pub'
    when p_tipo = 'privada' then 'pri'
  end;
$$;

revoke all on function public.ambito_liga(text, text) from public, anon, authenticated;


-- 4) Cálculo del progreso de un usuario -----------------------------------------------------
-- Interna. Recalcula todas las series y las guarda en misiones_progreso (valor máximo
-- alcanzado; en rankmj, el mejor puesto).
create or replace function public.refrescar_misiones(p_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v jsonb := '{}'::jsonb;
  v_ahora timestamptz := clock_timestamp();
  v_est misiones_estado%rowtype;
  v_acum jsonb;
  v_amb text;
  s text;
  r record;
  v_juegos integer := array_length(public.mj_juegos_activos(), 1);
  v_cadena integer := public.config_num('mj_hol_cadena', null, 20)::integer;
  v_perfecto boolean;
  x1 numeric; x2 numeric; x3 numeric; x4 numeric; x5 numeric; x6 numeric;
  x7 numeric; x8 numeric; x9 numeric; x10 numeric;
begin
  perform pg_advisory_xact_lock(hashtextextended('misiones|' || p_user::text, 0));

  insert into misiones_estado (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into v_est from misiones_estado where user_id = p_user;
  v_acum := coalesce(v_est.acum, '{}'::jsonb);

  -- 4.1) Partidas, mercado y jornadas, por ámbito (pública / privada) ----------------------
  foreach v_amb in array array['pub', 'pri'] loop
    s := '_' || v_amb;

    -- Victorias contra rivales de más Elo, puntos del capitán y victorias, por equipo; se
    -- toma el mejor equipo para que tener varias ligas no multiplique el progreso.
    select coalesce(max(c100), 0), coalesce(max(c200), 0), coalesce(max(c300), 0),
           coalesce(max(pcap), 0), coalesce(max(vict), 0), coalesce(max(capgig), 0)
    into x1, x2, x3, x4, x5, x6
    from (
      select b.ft,
        count(*) filter (where b.win and b.dif >= 100) as c100,
        count(*) filter (where b.win and b.dif >= 200) as c200,
        count(*) filter (where b.win and b.dif >= 300) as c300,
        coalesce(sum(b.puntos_base * public.multiplicador_capitan()) filter (where b.es_capitan), 0) as pcap,
        count(*) filter (where b.win) as vict,
        count(*) filter (where b.win and b.es_capitan and b.dif >= 100) as capgig
      from (
        select pj.fantasy_team_id as ft, pj.es_capitan, pj.puntos_base,
               coalesce(rs.resultado = 'victoria', false) as win,
               case when coalesce(p.elo, 0) > 0 and rs.rival_elo_en_el_momento is not null
                    then rs.rival_elo_en_el_momento - p.elo end as dif
        from puntos_jugador_jornada pj
        join fantasy_teams t on t.id = pj.fantasy_team_id and t.owner_id = p_user
        join leagues l on l.id = t.league_id
        join players p on p.id = pj.player_id
        left join results rs on rs.player_id = pj.player_id and rs.matchday_id = pj.matchday_id
        where pj.cuenta and public.ambito_liga(l.tipo, l.estado) = v_amb
      ) b
      group by b.ft
    ) q;
    v := v || jsonb_build_object(
      'caz100' || s, x1, 'caz200' || s, x2, 'caz300' || s, x3,
      'capitan' || s, x4, 'victorias' || s, x5, 'capgig' || s, x6
    );

    -- Jornadas con 4+ victorias de tus titulares y con pleno (todos ganan, mínimo 6).
    select coalesce(max(cu), 0), coalesce(max(pl), 0)
    into x1, x2
    from (
      select q.ft,
             count(*) filter (where q.w >= 4) as cu,
             count(*) filter (where q.w >= 6 and q.w = q.n) as pl
      from (
        select pj.fantasy_team_id as ft, js.semana, count(*) as n,
               count(*) filter (where rs.resultado = 'victoria') as w
        from puntos_jugador_jornada pj
        join fantasy_teams t on t.id = pj.fantasy_team_id and t.owner_id = p_user
        join leagues l on l.id = t.league_id
        join public.jornadas_semanales() js on js.matchday_id = pj.matchday_id
        left join results rs on rs.player_id = pj.player_id and rs.matchday_id = pj.matchday_id
        where pj.cuenta and public.ambito_liga(l.tipo, l.estado) = v_amb
        group by pj.fantasy_team_id, js.semana
      ) q
      group by q.ft
    ) q2;
    v := v || jsonb_build_object('cuatro' || s, x1, 'pleno' || s, x2);

    -- Jugador fiel: mayor racha de fines de semana seguidos con el mismo titular.
    select coalesce(max(len), 0) into x1
    from (
      select z.ft, z.player_id, z.grp, count(*) as len
      from (
        select d.ft, d.player_id,
               d.rk - (row_number() over (partition by d.ft, d.player_id order by d.rk))::integer as grp
        from (
          select distinct ml.fantasy_team_id as ft, ml.player_id, g.rk
          from matchday_lineups ml
          join fantasy_teams t on t.id = ml.fantasy_team_id and t.owner_id = p_user
          join leagues l on l.id = t.league_id
          join public.jornadas_semanales() js on js.matchday_id = ml.matchday_id
          join (
            select w.semana, (dense_rank() over (order by w.semana))::integer as rk
            from (select distinct semana from public.jornadas_semanales()) w
          ) g on g.semana = js.semana
          where public.ambito_liga(l.tipo, l.estado) = v_amb
        ) d
      ) z
      group by z.ft, z.player_id, z.grp
    ) q;
    v := v || jsonb_build_object('fiel' || s, x1);

    -- Jornada de oro (mejor jornada) y regularidad (jornadas seguidas con 25+ puntos).
    select coalesce(max(ps.puntos), 0) into x1
    from pagos_semana ps
    join fantasy_teams t on t.id = ps.fantasy_team_id and t.owner_id = p_user
    join leagues l on l.id = t.league_id
    where public.ambito_liga(l.tipo, l.estado) = v_amb;

    select coalesce(max(len), 0) into x2
    from (
      select z.ft, z.grp, count(*) as len
      from (
        select d.ft, d.rk - (row_number() over (partition by d.ft order by d.rk))::integer as grp
        from (
          select ps.fantasy_team_id as ft, g.rk
          from pagos_semana ps
          join fantasy_teams t on t.id = ps.fantasy_team_id and t.owner_id = p_user
          join leagues l on l.id = t.league_id
          join (
            select w.semana, (dense_rank() over (order by w.semana))::integer as rk
            from (select distinct semana from pagos_semana) w
          ) g on g.semana = ps.semana
          where ps.puntos >= 25 and public.ambito_liga(l.tipo, l.estado) = v_amb
        ) d
      ) z
      group by z.ft, z.grp
    ) q;
    v := v || jsonb_build_object('oro' || s, x1, 'regular' || s, x2);

    -- Mercado: pujas ganadas (sin las ofertas directas), fichajes, blindajes y subidas de
    -- cláusula, siempre jugadores distintos.
    select count(distinct ol.player_id) filter (where ol.tipo = 'oferta_aceptada' and not exists (
             select 1 from ventas_usuarios vu
             where vu.comprador_team_id = ol.fantasy_team_id and vu.player_id = ol.player_id
               and vu.tipo = 'oferta_aceptada'
               and abs(extract(epoch from (vu.created_at - ol.created_at))) < 5)),
           count(distinct ol.player_id) filter (where ol.tipo = 'fichaje'),
           count(distinct ol.player_id) filter (where ol.tipo = 'blindaje'),
           count(distinct ol.player_id) filter (where ol.tipo = 'subida_clausula')
    into x1, x2, x3, x4
    from operations_log ol
    join fantasy_teams t on t.id = ol.fantasy_team_id and t.owner_id = p_user
    join leagues l on l.id = t.league_id
    where public.ambito_liga(l.tipo, l.estado) = v_amb;
    v := v || jsonb_build_object(
      'pujas' || s, x1, 'fichajes' || s, x2, 'blindaje' || s, x3, 'subircl' || s, x4
    );

    -- Clausulazos: jugadores distintos, sin devolver el golpe a quien te lo quitó o vendió
    -- en los 30 días anteriores.
    select count(distinct ol.player_id) into x1
    from operations_log ol
    join fantasy_teams t on t.id = ol.fantasy_team_id and t.owner_id = p_user
    join leagues l on l.id = t.league_id
    left join ventas_usuarios vu
      on vu.comprador_team_id = ol.fantasy_team_id and vu.player_id = ol.player_id
     and vu.tipo = 'clausulazo'
     and abs(extract(epoch from (vu.created_at - ol.created_at))) < 5
    where ol.tipo = 'clausulazo'
      and public.ambito_liga(l.tipo, l.estado) = v_amb
      and not exists (
        select 1 from ventas_usuarios v2
        where vu.id is not null
          and v2.vendedor_team_id = ol.fantasy_team_id
          and v2.comprador_team_id = vu.vendedor_team_id
          and v2.player_id = ol.player_id
          and v2.created_at between ol.created_at - interval '30 days' and ol.created_at
      );
    v := v || jsonb_build_object('clausulazo' || s, x1);

    -- Plusvalía: lo que ganas al vender (al mercado o a la máquina) por más de lo que pagaste.
    select coalesce(sum(q.g) filter (where q.g > 0), 0), coalesce(max(q.g), 0)
    into x1, x2
    from (
      select ol.importe - b.importe as g
      from operations_log ol
      join fantasy_teams t on t.id = ol.fantasy_team_id and t.owner_id = p_user
      join leagues l on l.id = t.league_id
      join lateral (
        select o2.importe
        from operations_log o2
        where o2.fantasy_team_id = ol.fantasy_team_id and o2.player_id = ol.player_id
          and o2.tipo in ('fichaje', 'oferta_aceptada', 'clausulazo')
          and o2.created_at < ol.created_at
        order by o2.created_at desc
        limit 1
      ) b on true
      where ol.tipo = 'venta' and public.ambito_liga(l.tipo, l.estado) = v_amb
    ) q;
    v := v || jsonb_build_object('plusvalia' || s, x1, 'mejorop' || s, greatest(x2, 0));
  end loop;

  -- 4.2) Liga pública: clasificación de cada jornada y de la general -------------------------
  select count(*) filter (where q.rk <= 10), count(*) filter (where q.rk <= 3),
         count(*) filter (where q.rk = 1)
  into x1, x2, x3
  from (
    select ps.puntos, t.owner_id,
           rank() over (partition by ps.semana, t.league_id order by ps.puntos desc) as rk
    from pagos_semana ps
    join fantasy_teams t on t.id = ps.fantasy_team_id
    join leagues l on l.id = t.league_id
    where public.ambito_liga(l.tipo, l.estado) = 'pub' and ps.puntos > 0
  ) q
  where q.owner_id = p_user;

  select count(*) filter (where q.rk = 1), count(*) filter (where q.rk <= 10)
  into x4, x5
  from (
    select q0.owner_id,
           rank() over (partition by q0.semana, q0.league_id order by q0.acum desc) as rk
    from (
      select ps.semana, t.league_id, t.owner_id,
             sum(ps.puntos) over (partition by ps.fantasy_team_id order by ps.semana) as acum
      from pagos_semana ps
      join fantasy_teams t on t.id = ps.fantasy_team_id
      join leagues l on l.id = t.league_id
      where public.ambito_liga(l.tipo, l.estado) = 'pub'
    ) q0
    where q0.acum > 0
  ) q
  where q.owner_id = p_user;
  v := v || jsonb_build_object(
    'top10_pub', x1, 'podio_pub', x2, 'primero_pub', x3, 'lider_pub', x4, 'presencia_pub', x5
  );

  -- Liga privada: jornadas ganadas, solo en ligas con 5+ managers que puntuaron.
  select count(*) into x1
  from (
    select t.owner_id, ps.puntos,
           rank() over (partition by ps.semana, t.league_id order by ps.puntos desc) as rk,
           count(*) filter (where ps.puntos > 0) over (partition by ps.semana, t.league_id) as activos
    from pagos_semana ps
    join fantasy_teams t on t.id = ps.fantasy_team_id
    join leagues l on l.id = t.league_id
    where public.ambito_liga(l.tipo, l.estado) = 'pri'
  ) q
  where q.owner_id = p_user and q.rk = 1 and q.puntos > 0 and q.activos >= 5;
  v := v || jsonb_build_object('ganajor_pri', x1);

  -- Mercader: ventas a otros managers en ligas privadas (antiamaños, ver arriba).
  select coalesce(sum(m.valor), 0) into x1
  from (
    select distinct on (vu.vendedor_team_id, vu.comprador_team_id, vu.player_id)
           least(vu.importe, p.valor_mercado) as valor
    from ventas_usuarios vu
    join fantasy_teams t on t.id = vu.vendedor_team_id and t.owner_id = p_user
    join leagues l on l.id = t.league_id and public.ambito_liga(l.tipo, l.estado) = 'pri'
    join players p on p.id = vu.player_id
    where not exists (
      select 1 from operations_log ol
      where ol.fantasy_team_id = vu.vendedor_team_id and ol.player_id = vu.player_id
        and ol.tipo in ('fichaje', 'oferta_aceptada', 'clausulazo')
        and ol.created_at between vu.created_at - interval '7 days' and vu.created_at - interval '1 second'
    )
    order by vu.vendedor_team_id, vu.comprador_team_id, vu.player_id, vu.importe desc
  ) m;
  v := v || jsonb_build_object('mercader_pri', x1);

  -- 4.3) Liga pública: plantilla y caja (estado actual; se guarda el máximo) ----------------
  select coalesce(max(q.vp) filter (where q.pres >= 0), 0), coalesce(max(q.pres), 0),
         coalesce(max(q.mx), 0), coalesce(max(q.n100), 0)
  into x1, x2, x3, x4
  from (
    select t.id, t.presupuesto as pres, sum(p.valor_mercado) as vp, max(p.valor_mercado) as mx,
           count(*) filter (where p.valor_mercado >= 100) as n100
    from fantasy_teams t
    join leagues l on l.id = t.league_id
    join squad_slots ss on ss.fantasy_team_id = t.id and ss.fecha_salida is null
    join players p on p.id = ss.player_id
    where t.owner_id = p_user and public.ambito_liga(l.tipo, l.estado) = 'pub'
    group by t.id, t.presupuesto
  ) q;
  v := v || jsonb_build_object(
    'valorplantilla_pub', x1, 'caja_pub', x2, 'estrella_pub', x3, 'lujo_pub', x4
  );

  -- 4.4) Cuenta -----------------------------------------------------------------------------------
  v := v || jsonb_build_object(
    'rachadiaria', coalesce((select mejor_racha from rachas where user_id = p_user), 0),
    'nivel', public.nivel_de_xp(coalesce((select xp from xp_usuarios where user_id = p_user), 0)),
    'veterano', (select count(distinct dia) from actividad_diaria where user_id = p_user),
    'cofres', (select count(*) from xp_movimientos where user_id = p_user and fuente = 'cofre')
  );

  -- Semana perfecta: los 7 días de una semana (lunes a domingo) con entrada y día completo.
  select count(*) into x1
  from (
    select date_trunc('week', d.dia::timestamp) as semana
    from (
      select mp.dia from mj_puntuaciones mp
      where mp.user_id = p_user
      group by mp.dia
      having count(distinct mp.juego) >= v_juegos
    ) d
    join recompensas_diarias rd on rd.user_id = p_user and rd.dia = d.dia
    group by 1
    having count(*) = 7
  ) q;
  v := v || jsonb_build_object('semana', x1);

  -- 4.5) Minijuegos: lo que sale de las puntuaciones diarias (se conservan siempre) ---------------
  select count(*) filter (where n >= v_juegos), count(*) filter (where n5 >= v_juegos),
         count(*) filter (where n8 >= 4), count(*) filter (where n8 >= v_juegos)
  into x1, x2, x3, x4
  from (
    select count(distinct juego) as n,
           count(*) filter (where puntos >= 500) as n5,
           count(*) filter (where puntos >= 800) as n8
    from mj_puntuaciones where user_id = p_user group by dia
  ) q;
  v := v || jsonb_build_object('diacompleto', x1, 'm500x8', x2, 'tt4', x3, 'tt8', x4);

  select coalesce(max(len), 0) into x1
  from (
    select z.grp, count(*) as len
    from (
      select d.dia, d.dia - (row_number() over (order by d.dia))::integer as grp
      from (
        select mp.dia from mj_puntuaciones mp
        where mp.user_id = p_user
        group by mp.dia
        having count(distinct mp.juego) >= v_juegos
      ) d
    ) z
    group by z.grp
  ) q;

  select count(*), count(distinct juego)
  into x2, x3
  from mj_puntuaciones where user_id = p_user and puntos >= 900;

  select count(*) into x4
  from (
    select user_id, rank() over (partition by dia, juego order by puntos desc) as rk,
           count(*) over (partition by dia, juego) as participantes
    from mj_puntuaciones
    where puntos > 0 and dia < public.mj_dia()
  ) q
  where q.user_id = p_user and q.rk = 1 and q.participantes >= 5;

  select coalesce(max(puntos_total), 0), coalesce(max(partidas), 0)
  into x5, x6
  from mj_acumulado where user_id = p_user and juego = 'total';

  select count(*) into x7 from mj_dia_usuario where user_id = p_user and cofre_abierto;

  v := v || jsonb_build_object(
    'seguidos', x1, 'm900v', x2, 'm900j', x3, 'primerodia', x4,
    'puntosmj', x5, 'maraton', x6, 'cofresmj', x7
  );

  -- Ranking general de minijuegos (mejor puesto; solo cuenta con 10+ participantes).
  if x5 > 0 then
    select count(*) filter (where puntos_total > x5) + 1, count(*)
    into x8, x9
    from mj_acumulado where juego = 'total' and puntos_total > 0;
    if x9 >= 10 then
      v := v || jsonb_build_object('rankmj', x8);
    end if;
  end if;

  -- Partidas terminadas desde la última vez (mj_partidas se purga a los 60 días): cadena de
  -- Higher or Lower y partidas perfectas, acumuladas en misiones_estado.acum.
  for r in
    select mp.juego, mp.modo, mp.aciertos, jsonb_array_length(mp.preguntas) as n
    from mj_partidas mp
    where mp.user_id = p_user and mp.estado = 'terminada' and mp.terminada_at is not null
      and mp.terminada_at > coalesce(v_est.corte_mj, '-infinity'::timestamptz)
      and mp.terminada_at <= v_ahora
  loop
    if r.juego = 'hol' then
      v_acum := jsonb_set(v_acum, '{cadena}', to_jsonb(greatest(
        coalesce((v_acum ->> 'cadena')::integer, 0), coalesce(r.aciertos, 0))));
      if coalesce(r.aciertos, 0) >= v_cadena then
        v_acum := jsonb_set(v_acum, '{cadenaperf}', to_jsonb(
          coalesce((v_acum ->> 'cadenaperf')::integer, 0) + 1));
      end if;
    end if;

    v_perfecto := coalesce(r.aciertos, 0) > 0
      and r.aciertos >= case when r.juego = 'hol' then v_cadena else r.n end;

    if v_perfecto and r.modo = 'estandar'
       and not (coalesce(v_acum -> 'perfn', '[]'::jsonb) ? r.juego) then
      v_acum := jsonb_set(v_acum, '{perfn}', coalesce(v_acum -> 'perfn', '[]'::jsonb) || to_jsonb(r.juego));
    end if;

    if v_perfecto and r.modo = 'leyenda' then
      if not (coalesce(v_acum -> 'perfley', '[]'::jsonb) ? r.juego) then
        v_acum := jsonb_set(v_acum, '{perfley}', coalesce(v_acum -> 'perfley', '[]'::jsonb) || to_jsonb(r.juego));
      end if;
      v_acum := jsonb_set(v_acum, '{perfleyv}', to_jsonb(
        coalesce((v_acum ->> 'perfleyv')::integer, 0) + 1));
    end if;
  end loop;

  v := v || jsonb_build_object(
    'cadena', coalesce((v_acum ->> 'cadena')::integer, 0),
    'cadenaperf', coalesce((v_acum ->> 'cadenaperf')::integer, 0),
    'perfn', jsonb_array_length(coalesce(v_acum -> 'perfn', '[]'::jsonb)),
    'perfleyj', jsonb_array_length(coalesce(v_acum -> 'perfley', '[]'::jsonb)),
    'perfleyv', coalesce((v_acum ->> 'perfleyv')::integer, 0)
  );

  -- 4.6) Guardar: nunca baja (salvo rankmj, que guarda el mejor puesto = el menor) --------------
  insert into misiones_progreso (user_id, serie, valor)
  select p_user, e.key, e.value::numeric
  from jsonb_each_text(v) e
  on conflict (user_id, serie) do update
    set valor = case when misiones_progreso.serie = 'rankmj'
                     then least(misiones_progreso.valor, excluded.valor)
                     else greatest(misiones_progreso.valor, excluded.valor) end;

  update misiones_estado
  set calculado_en = v_ahora, corte_mj = v_ahora, acum = v_acum
  where user_id = p_user;
end;
$$;

revoke all on function public.refrescar_misiones(uuid) from public, anon, authenticated;


-- 5) Estado de las misiones (pantalla y aviso) ----------------------------------------------------
-- Una entrada por serie con su siguiente escalón por reclamar. 'lista' = ya se puede
-- reclamar; 'terminada' = todos reclamados (objetivo y xp son los del último). Refresca el
-- progreso si hace más de 10 minutos.
create or replace function public.estado_misiones()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_est misiones_estado%rowtype;
  v_res jsonb;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver tus misiones.';
  end if;

  select * into v_est from misiones_estado where user_id = v_uid;
  if not found or v_est.calculado_en < now() - interval '10 minutes' then
    perform public.refrescar_misiones(v_uid);
  end if;

  with hechas as (
    select split_part(clave, ':', 1) as serie, count(*)::integer as n
    from xp_movimientos
    where user_id = v_uid and fuente = 'mision'
    group by 1
  ),
  niveles as (
    select serie, count(*)::integer as total from misiones_catalogo() group by serie
  ),
  det as (
    select s.serie, s.base, s.ambito, s.grupo, s.sentido, s.orden, n.total,
           coalesce(h.n, 0) as hechas,
           least(coalesce(h.n, 0) + 1, n.total) as nivel
    from misiones_series() s
    join niveles n on n.serie = s.serie
    left join hechas h on h.serie = s.serie
  ),
  fila as (
    select d.*, k.objetivo, k.xp, pr.valor,
           d.hechas >= d.total as terminada,
           (d.hechas < d.total and pr.valor is not null and case
              when d.sentido = 'min' then pr.valor <= k.objetivo
              else pr.valor >= k.objetivo end) as lista
    from det d
    join misiones_catalogo() k on k.serie = d.serie and k.nivel = d.nivel
    left join misiones_progreso pr on pr.user_id = v_uid and pr.serie = d.serie
  )
  select jsonb_build_object(
    'misiones', coalesce(jsonb_agg(jsonb_build_object(
      'serie', serie, 'base', base, 'ambito', ambito, 'grupo', grupo, 'sentido', sentido,
      'nivel', nivel, 'niveles', total, 'objetivo', objetivo, 'xp', xp,
      'progreso', case when valor is null and sentido = 'max' then 0 else valor end,
      'lista', lista, 'terminada', terminada
    ) order by orden), '[]'::jsonb),
    'pendientes', count(*) filter (where lista)
  ) into v_res
  from fila;

  return v_res;
end;
$$;

revoke all on function public.estado_misiones() from public, anon;
grant execute on function public.estado_misiones() to authenticated;


-- 6) Reclamar el siguiente escalón de una serie ---------------------------------------------------
create or replace function public.reclamar_mision(p_serie text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_total integer;
  v_hechas integer;
  v_sentido text;
  v_k record;
  v_valor numeric;
  v_est misiones_estado%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para reclamar misiones.');
  end if;

  select s.sentido into v_sentido from misiones_series() s where s.serie = p_serie;
  select count(*) into v_total from misiones_catalogo() where serie = p_serie;
  if v_sentido is null or v_total = 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'Esa misión no existe.');
  end if;

  select count(*) into v_hechas
  from xp_movimientos
  where user_id = v_uid and fuente = 'mision' and split_part(clave, ':', 1) = p_serie;

  if v_hechas >= v_total then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya has completado todas las misiones de esta serie.');
  end if;

  select * into v_est from misiones_estado where user_id = v_uid;
  if not found or v_est.calculado_en < now() - interval '1 minute' then
    perform public.refrescar_misiones(v_uid);
  end if;

  select * into v_k from misiones_catalogo() where serie = p_serie and nivel = v_hechas + 1;
  select valor into v_valor from misiones_progreso where user_id = v_uid and serie = p_serie;

  if v_valor is null
     or (v_sentido = 'min' and v_valor > v_k.objetivo)
     or (v_sentido = 'max' and v_valor < v_k.objetivo) then
    return jsonb_build_object('ok', false, 'mensaje', 'Todavía no has cumplido esta misión.');
  end if;

  -- fijar_xp es idempotente por clave: pulsar dos veces no suma dos veces.
  perform public.fijar_xp(v_uid, 'mision', p_serie || ':' || v_k.nivel, v_k.xp);

  return jsonb_build_object('ok', true, 'serie', p_serie, 'nivel', v_k.nivel, 'xp', v_k.xp);
end;
$$;

revoke all on function public.reclamar_mision(text) from public, anon;
grant execute on function public.reclamar_mision(text) to authenticated;
