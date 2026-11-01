-- 0119: logro nuevo de minijuegos "Pleno de pronósticos" (serie plenopron).
--
-- REQUIERE 0118 (pronósticos) y 0107 (catálogo de misiones vigente).
--
-- Qué hace: añade a las misiones de la categoría Minijuegos una serie que cuenta las rondas de
-- torneo en las que has pronosticado TODAS las mesas y las has acertado todas. Escalones: 1 / 3 /
-- 6 / 10 / 20 rondas, con 20 / 45 / 90 / 160 / 320 XP.
--   - Solo cuentan rondas con 4 mesas o más (en torneos pequeños sería demasiado fácil) y con
--     todos los resultados ya cargados; una mesa sin pronóstico o sin resultado rompe el pleno.
--   - Se cuenta por ronda (cada ronda publicada de un torneo), no por torneo entero.
--   - El progreso solo sube, igual que el resto de contadores de refrescar_misiones_extra.
-- Los pronósticos siguen sin dar monedas ni XP por sí mismos: solo este logro da XP.
--
-- Funciones sustituidas (copia de las vigentes con el cambio): misiones_series (0106),
-- misiones_catalogo (0107) y refrescar_misiones_extra (0106).
--
-- Impacto en datos existentes: ninguno (solo funciones). Se puede lanzar con `supabase db push` o
-- en el SQL Editor.


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
    ('puntosmj', 'puntosmj', 'mj', 'minijuegos', 'max', 73),
    ('plenopron', 'plenopron', 'mj', 'minijuegos', 'max', 74)
  ) as v(serie, base, ambito, grupo, sentido, orden);
$$;

create or replace function public.misiones_catalogo()
returns table (serie text, nivel integer, objetivo numeric, xp integer)
language sql
immutable
as $$
  select v.serie, v.nivel, v.objetivo, v.xp
  from (values
    ('top10_pub', 1, 3, 5),
    ('top10_pub', 2, 6, 5),
    ('top10_pub', 3, 12, 10),
    ('top10_pub', 4, 25, 15),
    ('top10_pub', 5, 50, 25),
    ('top10_pub', 6, 100, 45),
    ('podio_pub', 1, 2, 10),
    ('podio_pub', 2, 5, 15),
    ('podio_pub', 3, 10, 25),
    ('podio_pub', 4, 20, 45),
    ('podio_pub', 5, 40, 75),
    ('primero_pub', 1, 1, 15),
    ('primero_pub', 2, 2, 25),
    ('primero_pub', 3, 4, 40),
    ('primero_pub', 4, 8, 65),
    ('primero_pub', 5, 15, 105),
    ('primero_pub', 6, 30, 175),
    ('lider_pub', 1, 1, 10),
    ('lider_pub', 2, 3, 20),
    ('lider_pub', 3, 6, 35),
    ('lider_pub', 4, 12, 70),
    ('presencia_pub', 1, 5, 5),
    ('presencia_pub', 2, 10, 10),
    ('presencia_pub', 3, 20, 15),
    ('presencia_pub', 4, 40, 40),
    ('presencia_pub', 5, 80, 85),
    ('valorplantilla_pub', 1, 600, 15),
    ('valorplantilla_pub', 2, 650, 25),
    ('valorplantilla_pub', 3, 700, 45),
    ('valorplantilla_pub', 4, 750, 80),
    ('valorplantilla_pub', 5, 800, 135),
    ('valorplantilla_pub', 6, 900, 230),
    ('caja_pub', 1, 300, 5),
    ('caja_pub', 2, 450, 10),
    ('caja_pub', 3, 600, 20),
    ('caja_pub', 4, 800, 35),
    ('caja_pub', 5, 1000, 60),
    ('caja_pub', 6, 1500, 120),
    ('estrella_pub', 1, 135, 20),
    ('estrella_pub', 2, 140, 60),
    ('estrella_pub', 3, 145, 165),
    ('lujo_pub', 1, 2, 5),
    ('lujo_pub', 2, 3, 15),
    ('lujo_pub', 3, 4, 40),
    ('lujo_pub', 4, 5, 85),
    ('lujo_pub', 5, 6, 185),
    ('alinea120_pub', 1, 3, 40),
    ('alinea120_pub', 2, 4, 100),
    ('alinea120_pub', 3, 5, 220),
    ('alinea120_pub', 4, 6, 470),
    ('sinelo_pub', 1, 4, 10),
    ('sinelo_pub', 2, 6, 25),
    ('sinelo_pub', 3, 8, 50),
    ('sinelo_pub', 4, 10, 100),
    ('caz100_pub', 1, 3, 10),
    ('caz100_pub', 2, 6, 25),
    ('caz100_pub', 3, 12, 40),
    ('caz100_pub', 4, 25, 75),
    ('caz100_pub', 5, 50, 135),
    ('caz100_pub', 6, 100, 240),
    ('caz200_pub', 1, 1, 40),
    ('caz200_pub', 2, 3, 65),
    ('caz200_pub', 3, 6, 115),
    ('caz200_pub', 4, 12, 180),
    ('caz200_pub', 5, 25, 300),
    ('caz200_pub', 6, 50, 530),
    ('caz300_pub', 1, 1, 150),
    ('caz300_pub', 2, 2, 240),
    ('caz300_pub', 3, 4, 390),
    ('caz300_pub', 4, 8, 630),
    ('caz300_pub', 5, 15, 1050),
    ('capitan_pub', 1, 40, 5),
    ('capitan_pub', 2, 80, 15),
    ('capitan_pub', 3, 150, 30),
    ('capitan_pub', 4, 300, 60),
    ('capitan_pub', 5, 600, 120),
    ('capitan_pub', 6, 1000, 230),
    ('capitan_pub', 7, 2000, 450),
    ('oro_pub', 1, 30, 25),
    ('oro_pub', 2, 34, 45),
    ('oro_pub', 3, 37, 75),
    ('oro_pub', 4, 40, 135),
    ('oro_pub', 5, 45, 230),
    ('oro_pub', 6, 50, 450),
    ('regular_pub', 1, 3, 15),
    ('regular_pub', 2, 6, 40),
    ('regular_pub', 3, 10, 75),
    ('regular_pub', 4, 20, 180),
    ('regular_pub', 5, 40, 450),
    ('victorias_pub', 1, 50, 5),
    ('victorias_pub', 2, 100, 15),
    ('victorias_pub', 3, 200, 35),
    ('victorias_pub', 4, 400, 75),
    ('victorias_pub', 5, 800, 160),
    ('victorias_pub', 6, 1600, 330),
    ('capgig_pub', 1, 3, 15),
    ('capgig_pub', 2, 6, 30),
    ('capgig_pub', 3, 12, 60),
    ('capgig_pub', 4, 25, 120),
    ('capgig_pub', 5, 50, 240),
    ('cuatro_pub', 1, 6, 15),
    ('cuatro_pub', 2, 12, 35),
    ('cuatro_pub', 3, 25, 100),
    ('cuatro_pub', 4, 50, 230),
    ('pleno_pub', 1, 1, 135),
    ('pleno_pub', 2, 2, 230),
    ('pleno_pub', 3, 4, 400),
    ('pleno_pub', 4, 8, 730),
    ('fiel_pub', 1, 5, 10),
    ('fiel_pub', 2, 10, 20),
    ('fiel_pub', 3, 20, 50),
    ('fiel_pub', 4, 40, 115),
    ('sinelov_pub', 1, 3, 15),
    ('sinelov_pub', 2, 6, 30),
    ('sinelov_pub', 3, 12, 65),
    ('sinelov_pub', 4, 25, 150),
    ('sinelov_pub', 5, 50, 330),
    ('fichajes_pub', 1, 25, 5),
    ('fichajes_pub', 2, 50, 10),
    ('fichajes_pub', 3, 100, 20),
    ('fichajes_pub', 4, 250, 45),
    ('fichajes_pub', 5, 500, 100),
    ('blindaje_pub', 1, 5, 5),
    ('blindaje_pub', 2, 10, 15),
    ('blindaje_pub', 3, 20, 35),
    ('blindaje_pub', 4, 40, 65),
    ('blindaje_pub', 5, 80, 125),
    ('subircl_pub', 1, 10, 5),
    ('subircl_pub', 2, 25, 10),
    ('subircl_pub', 3, 50, 20),
    ('subircl_pub', 4, 100, 40),
    ('subircl_pub', 5, 200, 80),
    ('clausulazo_pub', 1, 3, 10),
    ('clausulazo_pub', 2, 6, 25),
    ('clausulazo_pub', 3, 10, 45),
    ('clausulazo_pub', 4, 20, 90),
    ('clausulazo_pub', 5, 40, 180),
    ('clausulazo_pub', 6, 80, 350),
    ('plusvalia_pub', 1, 50, 5),
    ('plusvalia_pub', 2, 150, 15),
    ('plusvalia_pub', 3, 400, 40),
    ('plusvalia_pub', 4, 1000, 95),
    ('plusvalia_pub', 5, 2500, 200),
    ('plusvalia_pub', 6, 6000, 430),
    ('mejorop_pub', 1, 30, 20),
    ('mejorop_pub', 2, 50, 65),
    ('mejorop_pub', 3, 80, 200),
    ('caz100_pri', 1, 6, 5),
    ('caz100_pri', 2, 12, 15),
    ('caz100_pri', 3, 25, 25),
    ('caz100_pri', 4, 50, 45),
    ('caz100_pri', 5, 100, 80),
    ('caz100_pri', 6, 200, 145),
    ('caz200_pri', 1, 2, 25),
    ('caz200_pri', 2, 5, 40),
    ('caz200_pri', 3, 10, 70),
    ('caz200_pri', 4, 25, 110),
    ('caz200_pri', 5, 50, 180),
    ('caz200_pri', 6, 100, 320),
    ('caz300_pri', 1, 2, 90),
    ('caz300_pri', 2, 4, 145),
    ('caz300_pri', 3, 8, 230),
    ('caz300_pri', 4, 15, 380),
    ('caz300_pri', 5, 30, 630),
    ('capitan_pri', 1, 80, 5),
    ('capitan_pri', 2, 160, 10),
    ('capitan_pri', 3, 300, 20),
    ('capitan_pri', 4, 600, 35),
    ('capitan_pri', 5, 1200, 70),
    ('capitan_pri', 6, 2000, 135),
    ('capitan_pri', 7, 4000, 270),
    ('oro_pri', 1, 34, 15),
    ('oro_pri', 2, 37, 25),
    ('oro_pri', 3, 40, 45),
    ('oro_pri', 4, 45, 80),
    ('oro_pri', 5, 50, 135),
    ('oro_pri', 6, 55, 270),
    ('regular_pri', 1, 5, 10),
    ('regular_pri', 2, 10, 25),
    ('regular_pri', 3, 20, 45),
    ('regular_pri', 4, 40, 110),
    ('regular_pri', 5, 80, 270),
    ('victorias_pri', 1, 100, 5),
    ('victorias_pri', 2, 200, 10),
    ('victorias_pri', 3, 400, 20),
    ('victorias_pri', 4, 800, 45),
    ('victorias_pri', 5, 1600, 95),
    ('victorias_pri', 6, 3200, 200),
    ('capgig_pri', 1, 6, 10),
    ('capgig_pri', 2, 12, 20),
    ('capgig_pri', 3, 25, 35),
    ('capgig_pri', 4, 50, 70),
    ('capgig_pri', 5, 100, 145),
    ('cuatro_pri', 1, 12, 10),
    ('cuatro_pri', 2, 25, 20),
    ('cuatro_pri', 3, 50, 60),
    ('cuatro_pri', 4, 100, 140),
    ('pleno_pri', 1, 2, 80),
    ('pleno_pri', 2, 4, 140),
    ('pleno_pri', 3, 8, 240),
    ('pleno_pri', 4, 16, 440),
    ('fiel_pri', 1, 10, 5),
    ('fiel_pri', 2, 20, 10),
    ('fiel_pri', 3, 40, 30),
    ('fiel_pri', 4, 80, 70),
    ('sinelov_pri', 1, 6, 10),
    ('sinelov_pri', 2, 12, 20),
    ('sinelov_pri', 3, 25, 40),
    ('sinelov_pri', 4, 50, 90),
    ('sinelov_pri', 5, 100, 200),
    ('fichajes_pri', 1, 25, 5),
    ('fichajes_pri', 2, 50, 5),
    ('fichajes_pri', 3, 100, 10),
    ('fichajes_pri', 4, 250, 30),
    ('fichajes_pri', 5, 500, 60),
    ('blindaje_pri', 1, 5, 5),
    ('blindaje_pri', 2, 10, 10),
    ('blindaje_pri', 3, 20, 20),
    ('blindaje_pri', 4, 40, 40),
    ('blindaje_pri', 5, 80, 75),
    ('subircl_pri', 1, 10, 5),
    ('subircl_pri', 2, 25, 5),
    ('subircl_pri', 3, 50, 10),
    ('subircl_pri', 4, 100, 25),
    ('subircl_pri', 5, 200, 50),
    ('clausulazo_pri', 1, 3, 5),
    ('clausulazo_pri', 2, 6, 15),
    ('clausulazo_pri', 3, 10, 25),
    ('clausulazo_pri', 4, 20, 55),
    ('clausulazo_pri', 5, 40, 110),
    ('clausulazo_pri', 6, 80, 210),
    ('plusvalia_pri', 1, 50, 5),
    ('plusvalia_pri', 2, 150, 10),
    ('plusvalia_pri', 3, 400, 25),
    ('plusvalia_pri', 4, 1000, 55),
    ('plusvalia_pri', 5, 2500, 120),
    ('plusvalia_pri', 6, 6000, 260),
    ('mejorop_pri', 1, 30, 10),
    ('mejorop_pri', 2, 50, 40),
    ('mejorop_pri', 3, 80, 120),
    ('mercader_pri', 1, 100, 5),
    ('mercader_pri', 2, 300, 15),
    ('mercader_pri', 3, 600, 35),
    ('mercader_pri', 4, 1000, 80),
    ('mercader_pri', 5, 2000, 160),
    ('mercader_pri', 6, 4000, 300),
    ('mercader_pri', 7, 8000, 600),
    ('ganajor_pri', 1, 5, 5),
    ('ganajor_pri', 2, 10, 5),
    ('ganajor_pri', 3, 20, 5),
    ('ganajor_pri', 4, 40, 15),
    ('ganajor_pri', 5, 80, 25),
    ('sinelo_pri', 1, 4, 5),
    ('sinelo_pri', 2, 6, 15),
    ('sinelo_pri', 3, 8, 30),
    ('sinelo_pri', 4, 10, 60),
    ('pujas_pri', 1, 10, 5),
    ('pujas_pri', 2, 25, 10),
    ('pujas_pri', 3, 50, 25),
    ('pujas_pri', 4, 100, 50),
    ('pujas_pri', 5, 200, 90),
    ('pujas_pri', 6, 400, 180),
    ('rachadiaria', 1, 14, 10),
    ('rachadiaria', 2, 30, 25),
    ('rachadiaria', 3, 60, 50),
    ('rachadiaria', 4, 100, 90),
    ('rachadiaria', 5, 200, 180),
    ('rachadiaria', 6, 365, 350),
    ('rachadiaria', 7, 730, 700),
    ('nivel', 1, 10, 10),
    ('nivel', 2, 15, 25),
    ('nivel', 3, 20, 50),
    ('nivel', 4, 25, 90),
    ('nivel', 5, 30, 150),
    ('nivel', 6, 40, 300),
    ('nivel', 7, 50, 600),
    ('veterano', 1, 30, 10),
    ('veterano', 2, 100, 25),
    ('veterano', 3, 200, 50),
    ('veterano', 4, 365, 100),
    ('veterano', 5, 730, 250),
    ('cofres', 1, 5, 5),
    ('cofres', 2, 10, 15),
    ('cofres', 3, 25, 35),
    ('cofres', 4, 50, 85),
    ('cofres', 5, 100, 185),
    ('semana', 1, 1, 20),
    ('semana', 2, 4, 55),
    ('semana', 3, 12, 135),
    ('semana', 4, 26, 270),
    ('semana', 5, 52, 530),
    ('diacompleto', 1, 7, 15),
    ('diacompleto', 2, 30, 40),
    ('diacompleto', 3, 60, 80),
    ('diacompleto', 4, 100, 135),
    ('diacompleto', 5, 200, 270),
    ('diacompleto', 6, 365, 530),
    ('seguidos', 1, 7, 20),
    ('seguidos', 2, 14, 45),
    ('seguidos', 3, 30, 105),
    ('seguidos', 4, 60, 200),
    ('seguidos', 5, 100, 400),
    ('seguidos', 6, 200, 800),
    ('cadena', 1, 12, 10),
    ('cadena', 2, 15, 25),
    ('cadena', 3, 18, 65),
    ('cadena', 4, 20, 135),
    ('cadenaperf', 1, 1, 135),
    ('cadenaperf', 2, 3, 240),
    ('cadenaperf', 3, 6, 400),
    ('cadenaperf', 4, 12, 670),
    ('cadenaperf', 5, 25, 1200),
    ('m900v', 1, 1, 15),
    ('m900v', 2, 5, 35),
    ('m900v', 3, 15, 65),
    ('m900v', 4, 40, 135),
    ('m900v', 5, 100, 270),
    ('m900j', 1, 1, 15),
    ('m900j', 2, 2, 35),
    ('m900j', 3, 4, 80),
    ('m900j', 4, 6, 175),
    ('m900j', 5, 8, 400),
    ('perfn', 1, 3, 15),
    ('perfn', 2, 4, 35),
    ('perfn', 3, 5, 80),
    ('perfn', 4, 6, 175),
    ('perfn', 5, 7, 300),
    ('perfn', 6, 8, 570),
    ('perfleyj', 1, 1, 25),
    ('perfleyj', 2, 2, 65),
    ('perfleyj', 3, 4, 160),
    ('perfleyj', 4, 6, 350),
    ('perfleyj', 5, 8, 800),
    ('perfleyv', 1, 1, 25),
    ('perfleyv', 2, 5, 80),
    ('perfleyv', 3, 15, 185),
    ('perfleyv', 4, 40, 400),
    ('rankmj', 1, 10, 5),
    ('rankmj', 2, 5, 15),
    ('rankmj', 3, 3, 35),
    ('rankmj', 4, 2, 65),
    ('rankmj', 5, 1, 165),
    ('primerodia', 1, 1, 5),
    ('primerodia', 2, 5, 15),
    ('primerodia', 3, 15, 30),
    ('primerodia', 4, 40, 60),
    ('primerodia', 5, 100, 120),
    ('primerodia', 6, 250, 230),
    ('maraton', 1, 100, 5),
    ('maraton', 2, 250, 15),
    ('maraton', 3, 500, 35),
    ('maraton', 4, 1000, 65),
    ('maraton', 5, 2500, 135),
    ('cofresmj', 1, 10, 5),
    ('cofresmj', 2, 30, 20),
    ('cofresmj', 3, 60, 40),
    ('cofresmj', 4, 120, 80),
    ('cofresmj', 5, 250, 160),
    ('m500x8', 1, 1, 25),
    ('m500x8', 2, 5, 65),
    ('m500x8', 3, 15, 150),
    ('m500x8', 4, 40, 330),
    ('tt4', 1, 1, 80),
    ('tt4', 2, 5, 200),
    ('tt4', 3, 15, 530),
    ('tt8', 1, 1, 270),
    ('tt8', 2, 3, 530),
    ('tt8', 3, 10, 1070),
    ('puntosmj', 1, 100000, 5),
    ('puntosmj', 2, 250000, 15),
    ('puntosmj', 3, 500000, 35),
    ('puntosmj', 4, 1000000, 85),
    ('puntosmj', 5, 2000000, 200),
    ('puntosmj', 6, 4000000, 470),
    ('plenopron', 1, 1, 20),
    ('plenopron', 2, 3, 45),
    ('plenopron', 3, 6, 90),
    ('plenopron', 4, 10, 160),
    ('plenopron', 5, 20, 320)
  ) as v(serie, nivel, objetivo, xp);
$$;

revoke all on function public.misiones_series() from public, anon, authenticated;
revoke all on function public.misiones_catalogo() from public, anon, authenticated;

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

  -- Mercader: ventas a otros managers en ligas privadas (antiamaños). Cada venta cuenta como
  -- máximo el valor de la CLÁUSULA del jugador (valor x clausula_porcentaje de la liga, redondeado
  -- hacia arriba, más lo que el vendedor hubiera subido la cláusula), no el precio pactado.
  -- Sustituye al cálculo de 0103, que topaba en el valor de mercado.
  select coalesce(sum(m.valor), 0) into x1
  from (
    select distinct on (vu.vendedor_team_id, vu.comprador_team_id, vu.player_id)
           least(
             vu.importe,
             ceil(p.valor_mercado * public.config_num('clausula_porcentaje', vu.league_id, 1.5))
               + coalesce(ss.clausula_extra, 0)
           ) as valor
    from ventas_usuarios vu
    join fantasy_teams t on t.id = vu.vendedor_team_id and t.owner_id = p_user
    join leagues l on l.id = t.league_id and public.ambito_liga(l.tipo, l.estado) = 'pri'
    join players p on p.id = vu.player_id
    left join lateral (
      select s.clausula_extra
      from squad_slots s
      where s.fantasy_team_id = vu.vendedor_team_id and s.player_id = vu.player_id
        and s.fecha_salida is not null
        and s.fecha_salida <= vu.created_at + interval '5 seconds'
      order by s.fecha_salida desc
      limit 1
    ) ss on true
    where not exists (
      select 1 from operations_log ol
      where ol.fantasy_team_id = vu.vendedor_team_id and ol.player_id = vu.player_id
        and ol.tipo in ('fichaje', 'oferta_aceptada', 'clausulazo')
        and ol.created_at between vu.created_at - interval '7 days' and vu.created_at - interval '1 second'
    )
    order by vu.vendedor_team_id, vu.comprador_team_id, vu.player_id, vu.importe desc
  ) m;
  w := w || jsonb_build_object('mercader_pri', x1);

  -- Pleno de pronósticos (0118): rondas de torneo con 4 mesas o más en las que has pronosticado
  -- TODAS las mesas y has acertado todas. Solo cuentan rondas con todos los resultados cargados.
  -- Solo sube (como los demás contadores de v).
  select count(*) into x1
  from (
    select mp.matchday_id
    from matchday_pairings mp
    join matchdays m on m.id = mp.matchday_id and m.tournament_id is not null
    left join pronosticos pr on pr.pairing_id = mp.id and pr.user_id = p_user
    left join results rb on rb.matchday_id = mp.matchday_id and rb.player_id = mp.blanco_player_id
    where mp.blanco_player_id is not null
      and mp.negro_player_id is not null
      and not mp.descansa
      and mp.matchday_id in (
        select mp2.matchday_id
        from pronosticos p2
        join matchday_pairings mp2 on mp2.id = p2.pairing_id
        where p2.user_id = p_user
      )
    group by mp.matchday_id
    having count(*) >= 4
       and count(*) = count(*) filter (
         where pr.pronostico = case rb.resultado
           when 'victoria' then 'blancas'
           when 'tablas' then 'tablas'
           when 'derrota' then 'negras'
         end
       )
  ) q;
  v := v || jsonb_build_object('plenopron', x1);

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
