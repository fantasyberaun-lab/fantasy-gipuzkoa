-- 0104: misiones, segunda pasada de dificultad y series nuevas.
--
-- REQUIERE 0103 (misiones v2).
--
-- Cambios de dificultad (solo cambian los objetivos de misiones_catalogo; la XP de cada
-- escalón se queda igual, salvo en las series que se indican):
--   - Cuatro de seis: 6 / 12 / 25 / 50 veces (antes 1 / 5 / 15 / 40), misma XP.
--   - Jugador estrella: 135 / 140 / 145 M (antes 120 / 130 / 140) y XP 60 / 180 / 500 (antes
--     80 / 200 / 480). Con dinero de sobra en el juego, 120 M ya lo tenía casi cualquiera.
--   - Ligas privadas, partidas y puntos: objetivos aproximadamente el doble que en la pública
--     (en la privada hay pocos managers y el mismo equipo se puede repetir en varias ligas).
--     "Ganar jornada en liga privada" pasa a 5 / 10 / 20 / 40 / 80.
--   - Liga pública, clasificación: Top 10 (3 / 6 / 12 / 25 / 50 / 100), Podio (2 / 5 / 10 /
--     20 / 40) y Presencia (5 / 10 / 20 / 40 / 80). Con 50-90 managers, los primeros escalones
--     eran demasiado fáciles.
--   - Los primeros escalones de las series con objetivos nuevos se cuentan por posición: quien
--     ya había reclamado N escalones de una serie sigue en el escalón N+1, ahora con el
--     objetivo nuevo.
--
-- Series nuevas (en 0103 el progreso se guarda con el máximo alcanzado, igual aquí):
--   - alinea120_pub: alinea a 3 / 4 / 5 / 6 titulares de 120 M o más a la vez (liga pública).
--   - sinelo_pub / sinelo_pri: ten 4 / 6 / 8 / 10 jugadores sin Elo a la vez en tu plantilla.
--   - sinelov_pub / sinelov_pri: gana 3 / 6 / 12 / 25 / 50 partidas con jugadores sin Elo en tu
--     once (el doble en privadas).
--
-- Misiones de estado medidas en la FOTO DEL INICIO DE LA JORNADA (sábado, la misma de las
-- alineaciones; por defecto a las 16:00 y ahora la hora es una variable, ver abajo):
--   En la liga pública fichar y vender es instantáneo, así que se podía comprar y vender
--   plantilla solo para cumplir la misión. Ahora valorplantilla_pub, caja_pub, estrella_pub,
--   lujo_pub, alinea120_pub y sinelo_pub/pri se miden en lo que tenías el sábado, antes de que
--   empiece la jornada. Solo cuentan las fotos con saldo NO negativo: con el saldo en
--   negativo cuando empieza la jornada el equipo no puntúa, y tampoco vale para estas misiones:
--     - Valor de plantilla: valor de todos tus jugadores ese sábado.
--     - Caja: saldo ese sábado.
--     - Estrella: valor del jugador más caro de tu plantilla ese sábado.
--     - Plantilla de lujo: jugadores de 100 M o más ALINEADOS (en el once) ese sábado.
--     - Alinea a 120+: titulares de 120 M o más en el once de ese sábado.
--     - Equipo sin Elo: jugadores sin Elo en la plantilla ese sábado.
--   Hora de la foto: variable jornada_hora_inicio (Admin > Variables, 0-23, hora de Madrid,
--   por defecto 16). registrar_alineaciones_si_toca() (cron cada hora, ya existente) la lee en
--   vez de tener el 16 fijo. Si una semana la jornada empieza a otra hora, hay que cambiarla
--   ANTES del sábado (si la hora ya ha pasado ese día, no se toma foto). Solo se puede mover
--   la hora, no el día: el resto del juego asume que la jornada es el sábado.
--   Para ello se guarda plantilla_semanal (una fila por equipo y sábado) desde
--   registrar_alineaciones_semanales(), que se redefine igual que en producción más una
--   llamada nueva. No se puede reconstruir el pasado: estas series empiezan a contar desde la
--   primera foto posterior a lanzar esta migración y valen 0 hasta entonces.
--
-- Se quita la serie pujas_pub: en la liga pública los fichajes son instantáneos, no hay pujas
-- (los escalones ya reclamados se quedan como están). pujas_pri sigue.
--
-- Cómo: misiones_series() y misiones_catalogo() se redefinen completas (misma firma) y las
-- series nuevas se calculan en refrescar_misiones_extra(), que se ejecuta justo después de
-- refrescar_misiones() (de 0103, sin tocar) desde refrescar_misiones_todo(). Esa función
-- sobrescribe los valores de estado calculados en 0103 con los de la foto. estado_misiones()
-- y reclamar_mision() pasan a llamar a refrescar_misiones_todo().
--
-- Impacto en datos existentes: tabla nueva vacía (plantilla_semanal), funciones y borrado del
-- progreso guardado de las series de estado (se recalcula con la foto: hasta el primer
-- sábado valdrán 0, también para quien ya las tuviera cumplidas). No toca saldos, jugadores ni
-- XP. Lanzar con `supabase db push` o en el SQL Editor.


-- 0) Foto del sábado: saldo y plantilla de cada equipo ---------------------------------------
-- Sin políticas a propósito: solo la leen las funciones security definer de abajo.
create table if not exists public.plantilla_semanal (
  semana date not null,
  fantasy_team_id uuid not null references public.fantasy_teams (id) on delete cascade,
  presupuesto numeric not null,
  valor_plantilla numeric not null,
  valor_max numeric not null,
  n_sinelo integer not null,
  n_alin100 integer not null,
  n_alin120 integer not null,
  primary key (semana, fantasy_team_id)
);

alter table public.plantilla_semanal enable row level security;
revoke all on public.plantilla_semanal from anon, authenticated;

-- Guarda la foto de todos los equipos para ese sábado (la primera vale: no se pisa).
create or replace function public.registrar_plantillas_semanales(p_semana date)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into plantilla_semanal
    (semana, fantasy_team_id, presupuesto, valor_plantilla, valor_max, n_sinelo, n_alin100, n_alin120)
  select p_semana, t.id, t.presupuesto,
         coalesce(sum(p.valor_mercado), 0),
         coalesce(max(p.valor_mercado), 0),
         count(*) filter (where p.id is not null and coalesce(p.elo, 0) = 0),
         (select count(*) from weekly_lineups wl
          join players p2 on p2.id = wl.player_id
          where wl.semana = p_semana and wl.fantasy_team_id = t.id and p2.valor_mercado >= 100),
         (select count(*) from weekly_lineups wl
          join players p2 on p2.id = wl.player_id
          where wl.semana = p_semana and wl.fantasy_team_id = t.id and p2.valor_mercado >= 120)
  from fantasy_teams t
  left join squad_slots ss on ss.fantasy_team_id = t.id and ss.fecha_salida is null
  left join players p on p.id = ss.player_id
  group by t.id, t.presupuesto
  on conflict (semana, fantasy_team_id) do nothing;
end;
$$;

revoke all on function public.registrar_plantillas_semanales(date) from public, anon, authenticated;

-- La de producción (foto de alineaciones del sábado 16:00) más la foto de plantilla y saldo.
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

  -- 0104: saldo y plantilla de cada equipo en este momento (misiones de estado).
  perform public.registrar_plantillas_semanales(v_semana);

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

-- Hora de la foto de inicio de jornada (variable del panel de administración, global).
insert into public.config_definiciones
  (clave, grupo, etiqueta, descripcion, tipo, minimo, maximo, unidad, valor_defecto, permite_liga, estado, funcion_sql, orden)
values (
  'jornada_hora_inicio', 'Puntuación', 'Hora de inicio de la jornada (sábado)',
  'Hora de Madrid (0-23) a la que, el sábado, se toma la foto de alineaciones, saldo y plantilla de cada equipo: con el saldo en negativo en ese momento no se puntúa, y las misiones de plantilla se miden con esa foto. Cámbiala solo si esa semana la jornada empieza a otra hora, antes del sábado.',
  'entero', 0, 23, 'h', '16'::jsonb, false, 'activa', 'registrar_alineaciones_si_toca()', 22
)
on conflict (clave) do nothing;

-- La de producción (cron cada hora) leyendo la hora de la variable en vez de tener el 16 fijo.
create or replace function public.registrar_alineaciones_si_toca()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_ahora timestamp := now() at time zone 'Europe/Madrid';
begin
  if extract(isodow from v_ahora)::int = 6
     and extract(hour from v_ahora)::int = public.config_num('jornada_hora_inicio', null, 16)::int then
    perform public.registrar_alineaciones_semanales();
  end if;
end;
$$;

-- Las series de estado se vuelven a calcular desde cero con la foto (y las de pujas públicas
-- ya no existen): se borra el progreso guardado y se fuerza el refresco de todos.
delete from public.misiones_progreso
where serie in (
  'valorplantilla_pub', 'caja_pub', 'estrella_pub', 'lujo_pub',
  'alinea120_pub', 'sinelo_pub', 'sinelo_pri', 'pujas_pub'
);
update public.misiones_estado set calculado_en = now() - interval '1 day';


-- 1) Series y escalones ----------------------------------------------------------------------
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
    ('alinea120_pub', 'alinea120', 'pub', 'economia', 'max', 10),
    ('sinelo_pub', 'sinelo', 'pub', 'economia', 'max', 11),
    ('caz100_pub', 'caz100', 'pub', 'partidas', 'max', 12),
    ('caz200_pub', 'caz200', 'pub', 'partidas', 'max', 13),
    ('caz300_pub', 'caz300', 'pub', 'partidas', 'max', 14),
    ('capitan_pub', 'capitan', 'pub', 'partidas', 'max', 15),
    ('oro_pub', 'oro', 'pub', 'partidas', 'max', 16),
    ('regular_pub', 'regular', 'pub', 'partidas', 'max', 17),
    ('victorias_pub', 'victorias', 'pub', 'partidas', 'max', 18),
    ('capgig_pub', 'capgig', 'pub', 'partidas', 'max', 19),
    ('cuatro_pub', 'cuatro', 'pub', 'partidas', 'max', 20),
    ('pleno_pub', 'pleno', 'pub', 'partidas', 'max', 21),
    ('fiel_pub', 'fiel', 'pub', 'partidas', 'max', 22),
    ('sinelov_pub', 'sinelov', 'pub', 'partidas', 'max', 23),
    ('fichajes_pub', 'fichajes', 'pub', 'mercado', 'max', 24),
    ('blindaje_pub', 'blindaje', 'pub', 'mercado', 'max', 25),
    ('subircl_pub', 'subircl', 'pub', 'mercado', 'max', 26),
    ('clausulazo_pub', 'clausulazo', 'pub', 'mercado', 'max', 27),
    ('plusvalia_pub', 'plusvalia', 'pub', 'mercado', 'max', 28),
    ('mejorop_pub', 'mejorop', 'pub', 'mercado', 'max', 29),
    ('caz100_pri', 'caz100', 'pri', 'partidas', 'max', 30),
    ('caz200_pri', 'caz200', 'pri', 'partidas', 'max', 31),
    ('caz300_pri', 'caz300', 'pri', 'partidas', 'max', 32),
    ('capitan_pri', 'capitan', 'pri', 'partidas', 'max', 33),
    ('oro_pri', 'oro', 'pri', 'partidas', 'max', 34),
    ('regular_pri', 'regular', 'pri', 'partidas', 'max', 35),
    ('victorias_pri', 'victorias', 'pri', 'partidas', 'max', 36),
    ('capgig_pri', 'capgig', 'pri', 'partidas', 'max', 37),
    ('cuatro_pri', 'cuatro', 'pri', 'partidas', 'max', 38),
    ('pleno_pri', 'pleno', 'pri', 'partidas', 'max', 39),
    ('fiel_pri', 'fiel', 'pri', 'partidas', 'max', 40),
    ('sinelov_pri', 'sinelov', 'pri', 'partidas', 'max', 41),
    ('fichajes_pri', 'fichajes', 'pri', 'mercado', 'max', 42),
    ('blindaje_pri', 'blindaje', 'pri', 'mercado', 'max', 43),
    ('subircl_pri', 'subircl', 'pri', 'mercado', 'max', 44),
    ('clausulazo_pri', 'clausulazo', 'pri', 'mercado', 'max', 45),
    ('plusvalia_pri', 'plusvalia', 'pri', 'mercado', 'max', 46),
    ('mejorop_pri', 'mejorop', 'pri', 'mercado', 'max', 47),
    ('mercader_pri', 'mercader', 'pri', 'mercado', 'max', 48),
    ('ganajor_pri', 'ganajor', 'pri', 'clasificacion', 'max', 49),
    ('sinelo_pri', 'sinelo', 'pri', 'economia', 'max', 50),
    ('pujas_pri', 'pujas', 'pri', 'mercado', 'max', 51),
    ('rachadiaria', 'rachadiaria', 'gen', 'progresion', 'max', 52),
    ('nivel', 'nivel', 'gen', 'progresion', 'max', 53),
    ('veterano', 'veterano', 'gen', 'progresion', 'max', 54),
    ('cofres', 'cofres', 'gen', 'progresion', 'max', 55),
    ('semana', 'semana', 'gen', 'progresion', 'max', 56),
    ('diacompleto', 'diacompleto', 'mj', 'minijuegos', 'max', 57),
    ('seguidos', 'seguidos', 'mj', 'minijuegos', 'max', 58),
    ('cadena', 'cadena', 'mj', 'minijuegos', 'max', 59),
    ('cadenaperf', 'cadenaperf', 'mj', 'minijuegos', 'max', 60),
    ('m900v', 'm900v', 'mj', 'minijuegos', 'max', 61),
    ('m900j', 'm900j', 'mj', 'minijuegos', 'max', 62),
    ('perfn', 'perfn', 'mj', 'minijuegos', 'max', 63),
    ('perfleyj', 'perfleyj', 'mj', 'minijuegos', 'max', 64),
    ('perfleyv', 'perfleyv', 'mj', 'minijuegos', 'max', 65),
    ('rankmj', 'rankmj', 'mj', 'minijuegos', 'min', 66),
    ('primerodia', 'primerodia', 'mj', 'minijuegos', 'max', 67),
    ('maraton', 'maraton', 'mj', 'minijuegos', 'max', 68),
    ('cofresmj', 'cofresmj', 'mj', 'minijuegos', 'max', 69),
    ('m500x8', 'm500x8', 'mj', 'minijuegos', 'max', 70),
    ('tt4', 'tt4', 'mj', 'minijuegos', 'max', 71),
    ('tt8', 'tt8', 'mj', 'minijuegos', 'max', 72),
    ('puntosmj', 'puntosmj', 'mj', 'minijuegos', 'max', 73)
  ) as v(serie, base, ambito, grupo, sentido, orden);
$$;

create or replace function public.misiones_catalogo()
returns table (serie text, nivel integer, objetivo numeric, xp integer)
language sql
immutable
as $$
  select v.serie, v.nivel, v.objetivo, v.xp
  from (values
    ('top10_pub', 1, 3, 30),
    ('top10_pub', 2, 6, 60),
    ('top10_pub', 3, 12, 105),
    ('top10_pub', 4, 25, 180),
    ('top10_pub', 5, 50, 300),
    ('top10_pub', 6, 100, 540),
    ('podio_pub', 1, 2, 90),
    ('podio_pub', 2, 5, 180),
    ('podio_pub', 3, 10, 300),
    ('podio_pub', 4, 20, 540),
    ('podio_pub', 5, 40, 900),
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
    ('presencia_pub', 1, 5, 40),
    ('presencia_pub', 2, 10, 90),
    ('presencia_pub', 3, 20, 200),
    ('presencia_pub', 4, 40, 450),
    ('presencia_pub', 5, 80, 1000),
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
    ('estrella_pub', 1, 135, 60),
    ('estrella_pub', 2, 140, 180),
    ('estrella_pub', 3, 145, 500),
    ('lujo_pub', 1, 2, 40),
    ('lujo_pub', 2, 3, 100),
    ('lujo_pub', 3, 4, 240),
    ('lujo_pub', 4, 5, 520),
    ('lujo_pub', 5, 6, 1120),
    ('alinea120_pub', 1, 3, 250),
    ('alinea120_pub', 2, 4, 600),
    ('alinea120_pub', 3, 5, 1300),
    ('alinea120_pub', 4, 6, 2800),
    ('sinelo_pub', 1, 4, 30),
    ('sinelo_pub', 2, 6, 70),
    ('sinelo_pub', 3, 8, 150),
    ('sinelo_pub', 4, 10, 300),
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
    ('cuatro_pub', 1, 6, 40),
    ('cuatro_pub', 2, 12, 110),
    ('cuatro_pub', 3, 25, 300),
    ('cuatro_pub', 4, 50, 700),
    ('pleno_pub', 1, 1, 400),
    ('pleno_pub', 2, 2, 700),
    ('pleno_pub', 3, 4, 1200),
    ('pleno_pub', 4, 8, 2200),
    ('fiel_pub', 1, 5, 25),
    ('fiel_pub', 2, 10, 60),
    ('fiel_pub', 3, 20, 150),
    ('fiel_pub', 4, 40, 350),
    ('sinelov_pub', 1, 3, 40),
    ('sinelov_pub', 2, 6, 90),
    ('sinelov_pub', 3, 12, 200),
    ('sinelov_pub', 4, 25, 450),
    ('sinelov_pub', 5, 50, 1000),
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
    ('caz100_pri', 1, 6, 20),
    ('caz100_pri', 2, 12, 40),
    ('caz100_pri', 3, 25, 75),
    ('caz100_pri', 4, 50, 140),
    ('caz100_pri', 5, 100, 250),
    ('caz100_pri', 6, 200, 430),
    ('caz200_pri', 1, 2, 70),
    ('caz200_pri', 2, 5, 120),
    ('caz200_pri', 3, 10, 200),
    ('caz200_pri', 4, 25, 320),
    ('caz200_pri', 5, 50, 540),
    ('caz200_pri', 6, 100, 950),
    ('caz300_pri', 1, 2, 270),
    ('caz300_pri', 2, 4, 430),
    ('caz300_pri', 3, 8, 700),
    ('caz300_pri', 4, 15, 1130),
    ('caz300_pri', 5, 30, 1890),
    ('capitan_pri', 1, 80, 10),
    ('capitan_pri', 2, 160, 25),
    ('capitan_pri', 3, 300, 55),
    ('capitan_pri', 4, 600, 110),
    ('capitan_pri', 5, 1200, 220),
    ('capitan_pri', 6, 2000, 410),
    ('capitan_pri', 7, 4000, 810),
    ('oro_pri', 1, 34, 40),
    ('oro_pri', 2, 37, 80),
    ('oro_pri', 3, 40, 140),
    ('oro_pri', 4, 45, 250),
    ('oro_pri', 5, 50, 410),
    ('oro_pri', 6, 55, 810),
    ('regular_pri', 1, 5, 25),
    ('regular_pri', 2, 10, 70),
    ('regular_pri', 3, 20, 140),
    ('regular_pri', 4, 40, 320),
    ('regular_pri', 5, 80, 810),
    ('victorias_pri', 1, 100, 10),
    ('victorias_pri', 2, 200, 25),
    ('victorias_pri', 3, 400, 60),
    ('victorias_pri', 4, 800, 130),
    ('victorias_pri', 5, 1600, 290),
    ('victorias_pri', 6, 3200, 600),
    ('capgig_pri', 1, 6, 25),
    ('capgig_pri', 2, 12, 55),
    ('capgig_pri', 3, 25, 110),
    ('capgig_pri', 4, 50, 220),
    ('capgig_pri', 5, 100, 430),
    ('cuatro_pri', 1, 12, 25),
    ('cuatro_pri', 2, 25, 65),
    ('cuatro_pri', 3, 50, 180),
    ('cuatro_pri', 4, 100, 420),
    ('pleno_pri', 1, 2, 240),
    ('pleno_pri', 2, 4, 420),
    ('pleno_pri', 3, 8, 720),
    ('pleno_pri', 4, 16, 1320),
    ('fiel_pri', 1, 10, 15),
    ('fiel_pri', 2, 20, 35),
    ('fiel_pri', 3, 40, 90),
    ('fiel_pri', 4, 80, 210),
    ('sinelov_pri', 1, 6, 25),
    ('sinelov_pri', 2, 12, 55),
    ('sinelov_pri', 3, 25, 120),
    ('sinelov_pri', 4, 50, 270),
    ('sinelov_pri', 5, 100, 600),
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
    ('ganajor_pri', 1, 5, 10),
    ('ganajor_pri', 2, 10, 20),
    ('ganajor_pri', 3, 20, 40),
    ('ganajor_pri', 4, 40, 80),
    ('ganajor_pri', 5, 80, 150),
    ('sinelo_pri', 1, 4, 20),
    ('sinelo_pri', 2, 6, 40),
    ('sinelo_pri', 3, 8, 90),
    ('sinelo_pri', 4, 10, 180),
    ('pujas_pri', 1, 10, 15),
    ('pujas_pri', 2, 25, 35),
    ('pujas_pri', 3, 50, 70),
    ('pujas_pri', 4, 100, 145),
    ('pujas_pri', 5, 200, 270),
    ('pujas_pri', 6, 400, 540),
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


-- 2) Series de estado (foto del sábado) y victorias sin Elo --------------------------------------
-- Interna. Las de estado se calculan desde plantilla_semanal y SOBRESCRIBEN lo que 0103 hubiera
-- guardado (que miraba la plantilla de ahora mismo); las victorias sin Elo, como siempre, solo
-- suben.
create or replace function public.refrescar_misiones_extra(p_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v jsonb := '{}'::jsonb;  -- progreso que solo sube
  w jsonb := '{}'::jsonb;  -- progreso recalculado desde la foto del sábado
  v_amb text;
  s text;
  x1 numeric;
  x2 numeric;
  x3 numeric;
  x4 numeric;
  x5 numeric;
begin
  foreach v_amb in array array['pub', 'pri'] loop
    s := '_' || v_amb;

    -- Jugadores sin Elo en la plantilla de un sábado (la mejor foto del ámbito).
    select coalesce(max(ps.n_sinelo), 0) into x1
    from plantilla_semanal ps
    join fantasy_teams t on t.id = ps.fantasy_team_id and t.owner_id = p_user
    join leagues l on l.id = t.league_id
    where public.ambito_liga(l.tipo, l.estado) = v_amb and ps.presupuesto >= 0;

    -- Victorias de jugadores sin Elo que estaban en tu once.
    select coalesce(max(q.n), 0) into x2
    from (
      select pj.fantasy_team_id, count(*) filter (where rs.resultado = 'victoria') as n
      from puntos_jugador_jornada pj
      join fantasy_teams t on t.id = pj.fantasy_team_id and t.owner_id = p_user
      join leagues l on l.id = t.league_id
      join players p on p.id = pj.player_id
      left join results rs on rs.player_id = pj.player_id and rs.matchday_id = pj.matchday_id
      where pj.cuenta and coalesce(p.elo, 0) = 0
        and public.ambito_liga(l.tipo, l.estado) = v_amb
      group by pj.fantasy_team_id
    ) q;

    w := w || jsonb_build_object('sinelo' || s, x1);
    v := v || jsonb_build_object('sinelov' || s, x2);
  end loop;

  -- Liga pública, en la foto del sábado (solo equipos con saldo no negativo): valor de plantilla,
  -- caja, jugador más caro y jugadores alineados de 100 M y de 120 M o más.
  select coalesce(max(ps.valor_plantilla), 0),
         coalesce(max(ps.presupuesto), 0),
         coalesce(max(ps.valor_max), 0),
         coalesce(max(ps.n_alin100), 0),
         coalesce(max(ps.n_alin120), 0)
  into x1, x2, x3, x4, x5
  from plantilla_semanal ps
  join fantasy_teams t on t.id = ps.fantasy_team_id and t.owner_id = p_user
  join leagues l on l.id = t.league_id
  where public.ambito_liga(l.tipo, l.estado) = 'pub' and ps.presupuesto >= 0;

  w := w || jsonb_build_object(
    'valorplantilla_pub', x1, 'caja_pub', x2, 'estrella_pub', x3,
    'lujo_pub', x4, 'alinea120_pub', x5
  );

  insert into misiones_progreso (user_id, serie, valor)
  select p_user, e.key, e.value::numeric
  from jsonb_each_text(v) e
  on conflict (user_id, serie) do update
    set valor = greatest(misiones_progreso.valor, excluded.valor);

  insert into misiones_progreso (user_id, serie, valor)
  select p_user, e.key, e.value::numeric
  from jsonb_each_text(w) e
  on conflict (user_id, serie) do update set valor = excluded.valor;
end;
$$;

revoke all on function public.refrescar_misiones_extra(uuid) from public, anon, authenticated;

create or replace function public.refrescar_misiones_todo(p_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.refrescar_misiones(p_user);
  perform public.refrescar_misiones_extra(p_user);
end;
$$;

revoke all on function public.refrescar_misiones_todo(uuid) from public, anon, authenticated;


-- 3) Estado y reclamar: igual que 0103 pero llamando a refrescar_misiones_todo ----------------------
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
    perform public.refrescar_misiones_todo(v_uid);
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
    perform public.refrescar_misiones_todo(v_uid);
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
