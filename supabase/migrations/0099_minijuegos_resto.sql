-- 0099: Minijuegos, el resto de juegos y dificultad por Elo parecido.
--
-- Requiere 0098. Es seguro lanzarla tanto si la 0098 ya está aplicada como si no
-- (se lanzan una detrás de otra): solo sustituye funciones y añade lo nuevo.
--
-- Juegos nuevos (los 5 que faltaban; con los 3 de 0098 son 8):
--   adivina   Adivina el jugador  Elo, club, categoría y valor -> elegir entre 4 nombres. Cronómetro.
--   acierta   Acierta el jugador  Descripción de un icono de perfil (sin las piezas, ni el nombre) ->
--                                 elegir entre 4 nombres. Cronómetro.
--   precio    Adivina el precio   3 jugadores -> suma de sus valores de mercado (30-500 M). Sin cronómetro.
--   impostor  Adivina el impostor 4 jugadores, 3 comparten club, categoría o Elo y 1 no. Sin cronómetro.
--   parejas   Encontrar las parejas  6-8 jugadores, unir por club, categoría, rango de Elo o año de nacimiento.
--                                 Sin cronómetro.
-- Los juegos sin cronómetro puntúan igualmente por velocidad (cuanto antes, más;
-- nunca baja de la mitad) pero no hay límite de tiempo.
--
-- Dificultad (nuevo): en "Ordena por Elo", "Adivina el jugador" y "Higher or
-- lower" ya no se eligen jugadores al azar, sino con Elos parecidos entre sí.
-- La diferencia máxima es una variable (mj_ventana_estandar 300 / mj_ventana_leyenda
-- 150) y en Higher or lower se va estrechando a lo largo de la partida.
--
-- Privacidad (0031): para las parejas por año solo se usa el año de los mayores de 20
-- (el que ya muestra la ficha a usuarios registrados). A los menores nunca se les
-- asocia año ni edad: simplemente no entran en esa relación.
--
-- Cambios de esquema: mj_partidas.idioma (para dar la descripción del icono en el
-- idioma del usuario) y mj_iconos (nombre y descripción en es/eu/en de los 20 iconos
-- con persona; los textos son los de lib/i18n/textos/avatares.ts: si cambian allí,
-- cambiarlos aquí). mj_iniciar gana el parámetro p_idioma (se borra la versión de
-- 4 parámetros). Impacto en datos existentes: ninguno.

-- 1) Variables --------------------------------------------------------------------------------
insert into public.game_config (clave, valor) values
  ('mj_ventana_estandar', '300'::jsonb),
  ('mj_ventana_leyenda', '150'::jsonb),
  ('mj_adivina_rondas', '8'::jsonb),
  ('mj_adivina_segundos', '20'::jsonb),
  ('mj_acierta_rondas', '8'::jsonb),
  ('mj_acierta_segundos', '20'::jsonb),
  ('mj_precio_rondas', '5'::jsonb),
  ('mj_precio_segundos', '90'::jsonb),
  ('mj_impostor_rondas', '5'::jsonb),
  ('mj_impostor_segundos', '60'::jsonb),
  ('mj_parejas_rondas', '3'::jsonb),
  ('mj_parejas_segundos', '120'::jsonb)
on conflict (clave) do nothing;

insert into public.config_definiciones
  (clave, grupo, etiqueta, descripcion, tipo, minimo, maximo, unidad, valor_defecto, permite_liga, estado, funcion_sql, orden)
values
  ('mj_ventana_estandar', 'Minijuegos', 'Dificultad estándar: diferencia máxima de Elo',
   'En Ordena por Elo, Adivina el jugador y Higher or lower se eligen jugadores con Elos así de parecidos. Menos = más difícil.',
   'entero', 20, 1000, 'Elo', '300'::jsonb, false, 'activa', null, 97),
  ('mj_ventana_leyenda', 'Minijuegos', 'Dificultad leyenda: diferencia máxima de Elo',
   'Igual que la estándar, para las partidas libres en modo leyenda.',
   'entero', 20, 1000, 'Elo', '150'::jsonb, false, 'activa', null, 98),
  ('mj_adivina_rondas', 'Minijuegos', 'Adivina el jugador: rondas', null, 'entero', 3, 20, 'rondas', '8'::jsonb, false, 'activa', null, 100),
  ('mj_adivina_segundos', 'Minijuegos', 'Adivina el jugador: segundos por ronda', null, 'entero', 5, 120, 's', '20'::jsonb, false, 'activa', null, 101),
  ('mj_acierta_rondas', 'Minijuegos', 'Acierta el jugador: rondas', 'Máximo 20 (hay 20 iconos con persona).', 'entero', 3, 20, 'rondas', '8'::jsonb, false, 'activa', null, 102),
  ('mj_acierta_segundos', 'Minijuegos', 'Acierta el jugador: segundos por ronda', null, 'entero', 5, 120, 's', '20'::jsonb, false, 'activa', null, 103),
  ('mj_precio_rondas', 'Minijuegos', 'Adivina el precio: rondas', null, 'entero', 2, 15, 'rondas', '5'::jsonb, false, 'activa', null, 104),
  ('mj_precio_segundos', 'Minijuegos', 'Adivina el precio: segundos de referencia',
   'No hay límite: a partir de este tiempo se puntúa la mitad.', 'entero', 10, 600, 's', '90'::jsonb, false, 'activa', null, 105),
  ('mj_impostor_rondas', 'Minijuegos', 'Adivina el impostor: rondas', null, 'entero', 2, 15, 'rondas', '5'::jsonb, false, 'activa', null, 106),
  ('mj_impostor_segundos', 'Minijuegos', 'Adivina el impostor: segundos de referencia',
   'No hay límite: a partir de este tiempo se puntúa la mitad.', 'entero', 10, 600, 's', '60'::jsonb, false, 'activa', null, 107),
  ('mj_parejas_rondas', 'Minijuegos', 'Encontrar las parejas: tableros', null, 'entero', 1, 8, 'tableros', '3'::jsonb, false, 'activa', null, 108),
  ('mj_parejas_segundos', 'Minijuegos', 'Encontrar las parejas: segundos de referencia',
   'No hay límite: a partir de este tiempo se puntúa la mitad.', 'entero', 10, 900, 's', '120'::jsonb, false, 'activa', null, 109)
on conflict (clave) do nothing;

-- 2) Esquema ----------------------------------------------------------------------------------------
alter table public.mj_partidas add column if not exists idioma text not null default 'es';

create table if not exists public.mj_iconos (
  id text primary key,
  nombre text not null,
  desc_es text not null,
  desc_eu text not null,
  desc_en text not null
);
alter table public.mj_iconos enable row level security;
revoke all on public.mj_iconos from anon, authenticated;

insert into public.mj_iconos (id, nombre, desc_es, desc_eu, desc_en) values
('gukesh', 'Gukesh Dommaraju', '18º campeón del mundo (2024). Con 18 años es el más joven de la historia en conseguir el título.', '18. munduko txapelduna (2024). 18 urterekin, titulua lortu duen gazteena da historian.', '18th World Champion (2024). At 18 he is the youngest player in history to win the title.'),
  ('smyslov', 'Vasily Smyslov', '7º campeón del mundo (1957-58). Aficionado a la ópera, jugaba con una armonía y una claridad muy suyas.', '7. munduko txapelduna (1957-58). Opera zalea zen, eta bere harmonia eta argitasun berezia zuen jokatzeko.', '7th World Champion (1957-58). An opera enthusiast, he played with a harmony and clarity all his own.'),
  ('ding', 'Ding Liren', '17º campeón del mundo (2023-24). Primer chino en conseguir el título, tras una final decidida en el desempate.', '17. munduko txapelduna (2023-24). Titulua lortu duen lehen txinatarra, desberdinketan erabakitako finalaren ondoren.', '17th World Champion (2023-24). The first Chinese player to win the title, after a final decided in the tiebreak.'),
  ('euwe', 'Max Euwe', '5º campeón del mundo (1935-37). Matemático neerlandés, derrotó a Alekhine y más tarde presidió la FIDE.', '5. munduko txapelduna (1935-37). Matematikari herbehereestarrak Alekhine garaitu zuen eta geroago FIDEko presidente izan zen.', '5th World Champion (1935-37). A Dutch mathematician who beat Alekhine and later became FIDE president.'),
  ('ruy-lopez', 'Ruy López', 'Sacerdote español del siglo XVI y autor de uno de los primeros grandes libros de ajedrez (1561). Da nombre a la apertura Ruy López.', 'XVI. mendeko apaiz espainiarra eta xake-liburu handi lehenetako baten egilea (1561). Ruy López irekierak haren izena darama.', 'A 16th-century Spanish priest and author of one of the first great chess books (1561). The Ruy Lopez opening is named after him.'),
  ('petrosian', 'Tigran Petrosian', '9º campeón del mundo (1963-69). Apodado «el Tigre de Hierro», hizo de la defensa un arte.', '9. munduko txapelduna (1963-69). «Tigran Burdinazkoa» goitizenez, defentsa artea bihurtu zuen.', '9th World Champion (1963-69). Nicknamed "Iron Tigran", he turned defence into an art.'),
  ('kramnik', 'Vladimir Kramnik', '14º campeón del mundo (2000-07). Destronó a Kasparov en 2000 con un uso magistral de la defensa Berlinesa.', '14. munduko txapelduna (2000-07). Kasparov tronutik kendu zuen 2000an, Berlingo defentsa maisutasunez erabiliz.', '14th World Champion (2000-07). He dethroned Kasparov in 2000 with a masterful use of the Berlin Defence.'),
  ('steinitz', 'Wilhelm Steinitz', '1er campeón del mundo oficial (1886-94). Padre del juego posicional: demostró que se gana acumulando pequeñas ventajas.', 'Munduko lehen txapeldun ofiziala (1886-94). Jokaldi posizionalaren aita: abantaila txikiak pilatuz irabazten dela frogatu zuen.', '1st official World Champion (1886-94). Father of positional play: he showed that games are won by accumulating small advantages.'),
  ('anand', 'Viswanathan Anand', '15º campeón del mundo (2007-13). Llamado «el Tigre de Madrás», es famoso por su velocidad de cálculo.', '15. munduko txapelduna (2007-13). «Madrasko Tigrea» esaten zioten, eta kalkulatzeko abiadura ezaguna zuen.', '15th World Champion (2007-13). Known as "the Tiger of Madras", famous for his calculating speed.'),
  ('tal', 'Mikhail Tal', '8º campeón del mundo (1960-61), conocido como el Mago de Riga. Sus sacrificios imposibles desconcertaban a los rivales.', '8. munduko txapelduna (1960-61), Rigako Magoa izenez ezaguna. Bere sakrifizio ezinezkoek aurkariak txunditzen zituzten.', '8th World Champion (1960-61), known as the Magician from Riga. His impossible sacrifices bewildered opponents.'),
  ('morphy', 'Paul Morphy', 'Genio de Nueva Orleans y campeón no oficial del mundo. Con 21 años derrotó a los mejores de Europa (1858).', 'New Orleanseko genioa eta munduko txapeldun ez-ofiziala. 21 urterekin Europako onenak garaitu zituen (1858).', 'New Orleans genius and unofficial world champion. At 21 he beat Europe''s best (1858).'),
  ('spassky', 'Boris Spassky', '10º campeón del mundo (1969-72). Jugador universal que perdió el título contra Fischer en Reikiavik.', '10. munduko txapelduna (1969-72). Jokalari unibertsala, Reykjavíkeko Fischerren aurkako partidan galdu zuen titulua.', '10th World Champion (1969-72). A universal player who lost the title to Fischer in Reykjavik.'),
  ('alekhine', 'Alexander Alekhine', '4º campeón del mundo (1927-35 y 1937-46). Maestro del ataque y la combinación, murió siendo campeón.', '4. munduko txapelduna (1927-35 eta 1937-46). Eraso eta konbinazioen maisua, txapeldun zela hil zen.', '4th World Champion (1927-35 and 1937-46). A master of attack and combination, he died as champion.'),
  ('karpov', 'Anatoly Karpov', '12º campeón del mundo (1975-85). Estrangulador posicional: sus victorias parecían inevitables.', '12. munduko txapelduna (1975-85). Estutzaile posizionala: haren garaipenak saihestezinak zirudien.', '12th World Champion (1975-85). A positional boa constrictor: his wins seemed inevitable.'),
  ('lasker', 'Emanuel Lasker', '2º campeón del mundo (1894-1921). Reinó 27 años, el mandato más largo, y fue también matemático y filósofo.', '2. munduko txapelduna (1894-1921). 27 urtez erreinatu zuen, inoiz izandako agintaldirik luzeena, eta matematikaria eta filosofoa ere izan zen.', '2nd World Champion (1894-1921). He reigned for 27 years, the longest ever, and was also a mathematician and philosopher.'),
  ('botvinnik', 'Mikhail Botvinnik', '6º campeón del mundo y patriarca de la escuela soviética. Preparaba cada partida con método científico.', '6. munduko txapelduna eta eskola sovietarraren patriarka. Partida bakoitza metodo zientifikoz prestatzen zuen.', '6th World Champion and patriarch of the Soviet school. He prepared every game with a scientific method.'),
  ('capablanca', 'José Raúl Capablanca', '3er campeón del mundo (1921-27). El genio cubano, apodado «la máquina del ajedrez» por su juego casi sin errores.', '3. munduko txapelduna (1921-27). Genio kubatarra, «xake-makina» goitizenez, ia akatsik gabe jokatzen zuelako.', '3rd World Champion (1921-27). The Cuban genius nicknamed "the human chess machine" for his almost flawless play.'),
  ('fischer', 'Bobby Fischer', '11º campeón del mundo (1972-75). Su duelo contra Spassky en Reikiavik paralizó al mundo durante un verano.', '11. munduko txapelduna (1972-75). Spasskyren aurkako Reykjavíkeko norgehiagokak mundua geldiarazi zuen uda oso batez.', '11th World Champion (1972-75). His match against Spassky in Reykjavik held the world''s attention for a whole summer.'),
  ('kasparov', 'Garry Kasparov', '13º campeón del mundo (1985-2000). Dominó el ajedrez durante dos décadas con un juego dinámico y feroz.', '13. munduko txapelduna (1985-2000). Bi hamarkadatan xakea menderatu zuen joko dinamiko eta gogorrarekin.', '13th World Champion (1985-2000). He dominated chess for two decades with fierce, dynamic play.'),
  ('carlsen', 'Magnus Carlsen', '16º campeón del mundo (2013-23). El noruego alcanzó el mayor Elo de la historia y dominó una década.', '16. munduko txapelduna (2013-23). Norvegiarrak historiako Elorik altuena lortu zuen eta hamarkada bat menderatu zuen.', '16th World Champion (2013-23). The Norwegian reached the highest rating in history and dominated a decade.')
on conflict (id) do update
  set nombre = excluded.nombre, desc_es = excluded.desc_es, desc_eu = excluded.desc_eu, desc_en = excluded.desc_en;

-- 3) Jugadores y utilidades -------------------------------------------------------------------
do $$
begin
  create type public.mj_jug as (
    id uuid, nombre text, elo integer, club text, categoria text, valor numeric, anio integer
  );
exception when duplicate_object then null;
end;
$$;

drop function if exists public.mj_pool(text);

-- Jugadores con los que se juega. Estándar: activos en torneos que no han acabado
-- (si son menos de 30, todos los activos). Leyenda: toda la tabla. 'anio' solo
-- para los mayores de 20 (privacidad, 0031).
create or replace function public.mj_pool(p_modo text)
returns setof public.mj_jug
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_n integer;
begin
  if p_modo = 'leyenda' then
    return query
      select p.id, p.nombre, p.elo, nullif(trim(p.club), ''), p.categoria::text, p.valor_mercado,
             case when p.anio_nacimiento is not null
                       and extract(year from current_date)::integer - p.anio_nacimiento >= 20
                  then p.anio_nacimiento end
      from players p;
    return;
  end if;

  select count(*) into v_n
  from players p
  where p.activo and exists (
    select 1 from tournament_players tp join tournaments t on t.id = tp.tournament_id
    where tp.player_id = p.id and (t.fecha_fin is null or t.fecha_fin >= public.mj_dia())
  );

  return query
    select p.id, p.nombre, p.elo, nullif(trim(p.club), ''), p.categoria::text, p.valor_mercado,
           case when p.anio_nacimiento is not null
                     and extract(year from current_date)::integer - p.anio_nacimiento >= 20
                then p.anio_nacimiento end
    from players p
    where p.activo
      and (v_n < 30 or exists (
        select 1 from tournament_players tp join tournaments t on t.id = tp.tournament_id
        where tp.player_id = p.id and (t.fecha_fin is null or t.fecha_fin >= public.mj_dia())
      ));
end;
$$;

-- Jugadores en un orden barajado que solo depende de la semilla.
create or replace function public.mj_cargar(p_modo text, p_semilla text)
returns public.mj_jug[]
language sql
stable
security definer set search_path = public
as $$
  select coalesce(array_agg(pp order by md5(p_semilla || pp.id::text)), '{}'::public.mj_jug[])
  from public.mj_pool(p_modo) pp;
$$;

-- Diferencia máxima de Elo entre jugadores "parecidos" según el modo.
create or replace function public.mj_ventana(p_modo text)
returns integer
language sql
stable
security definer set search_path = public
as $$
  select case when p_modo = 'leyenda'
              then public.config_num('mj_ventana_leyenda', null, 150)::integer
              else public.config_num('mj_ventana_estandar', null, 300)::integer end;
$$;

-- Multiplicador de velocidad: 1 al instante, 0,5 al llegar al tiempo de referencia.
create or replace function public.mj_mult(p_seg numeric, p_lim numeric)
returns numeric
language sql
immutable
as $$ select 0.5 + 0.5 * greatest(0, 1 - p_seg / p_lim) $$;

-- Datos de un jugador sin el nombre, para las cartas.
create or replace function public.mj_carta(p public.mj_jug)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object('nombre', p.nombre, 'elo', p.elo, 'club', p.club,
                            'categoria', p.categoria, 'valor', p.valor);
$$;

-- 4) Generadores -----------------------------------------------------------------------------------------
-- Higher or lower: cadena de jugadores con Elo parecido al anterior; la diferencia
-- máxima se va estrechando (de ventana x 1,33 a ventana x 0,2).
create or replace function public.mj_gen_hol(p_modo text, p_semilla text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_p public.mj_jug[] := public.mj_cargar(p_modo, p_semilla);
  n integer := coalesce(array_length(v_p, 1), 0);
  v_cadena integer := public.config_num('mj_hol_cadena', null, 20)::integer;
  v_vent numeric := public.mj_ventana(p_modo);
  v_usado boolean[];
  v_out jsonb := '[]'::jsonb;
  v_prev integer;
  v_w numeric;
  k integer;
  i integer;
  v_sel integer;
begin
  if n = 0 then
    return v_out;
  end if;
  v_usado := array_fill(false, array[n]);

  for i in 1..n loop
    if (v_p[i]).elo > 0 then
      v_sel := i;
      exit;
    end if;
  end loop;
  if v_sel is null then
    return v_out;
  end if;
  v_usado[v_sel] := true;
  v_out := jsonb_build_array(jsonb_build_object('nombre', (v_p[v_sel]).nombre, 'elo', (v_p[v_sel]).elo));
  v_prev := (v_p[v_sel]).elo;

  for k in 1..v_cadena loop
    v_w := v_vent * 1.33 - (v_vent * 1.33 - v_vent * 0.2) * (k - 1) / greatest(1, v_cadena - 1);
    v_sel := null;
    for i in 1..n loop
      if not v_usado[i] and (v_p[i]).elo > 0
         and abs((v_p[i]).elo - v_prev) between 1 and v_w then
        v_sel := i;
        exit;
      end if;
    end loop;
    if v_sel is null then
      for i in 1..n loop
        if not v_usado[i] and (v_p[i]).elo > 0 and (v_p[i]).elo <> v_prev then
          v_sel := i;
          exit;
        end if;
      end loop;
    end if;
    exit when v_sel is null;
    v_usado[v_sel] := true;
    v_out := v_out || jsonb_build_object('nombre', (v_p[v_sel]).nombre, 'elo', (v_p[v_sel]).elo);
    v_prev := (v_p[v_sel]).elo;
  end loop;
  return v_out;
end;
$$;

create or replace function public.mj_gen_elo(p_modo text, p_semilla text)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('nombre', s.nombre, 'elo', s.elo) order by s.ord), '[]'::jsonb)
  from (
    select pp.nombre, pp.elo, row_number() over (order by md5(p_semilla || pp.id::text)) as ord
    from public.mj_pool(p_modo) pp
  ) s
  where s.ord <= public.config_num('mj_elo_rondas', null, 8)::integer;
$$;

-- Ordena por Elo: grupos de 5 con Elo distinto y parecido al del primero.
create or replace function public.mj_gen_orden(p_modo text, p_semilla text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_p public.mj_jug[] := public.mj_cargar(p_modo, p_semilla);
  n integer := coalesce(array_length(v_p, 1), 0);
  v_rondas integer := public.config_num('mj_orden_rondas', null, 4)::integer;
  v_vent integer := public.mj_ventana(p_modo);
  v_usado boolean[];
  v_out jsonb := '[]'::jsonb;
  v_g jsonb;
  v_elos integer[];
  v_a integer;
  r integer;
  pasada integer;
  i integer;
  v_w integer;
begin
  if n = 0 then
    return v_out;
  end if;
  v_usado := array_fill(false, array[n]);
  for r in 1..v_rondas loop
    v_a := null;
    for i in 1..n loop
      if not v_usado[i] and (v_p[i]).elo > 0 then
        v_a := i;
        exit;
      end if;
    end loop;
    exit when v_a is null;
    v_usado[v_a] := true;
    v_g := jsonb_build_array(jsonb_build_object('nombre', (v_p[v_a]).nombre, 'elo', (v_p[v_a]).elo));
    v_elos := array[(v_p[v_a]).elo];
    for pasada in 1..3 loop
      v_w := case when pasada = 3 then 100000 else v_vent * pasada end;
      for i in 1..n loop
        exit when array_length(v_elos, 1) >= 5;
        if not v_usado[i] and (v_p[i]).elo > 0 and not ((v_p[i]).elo = any (v_elos))
           and abs((v_p[i]).elo - (v_p[v_a]).elo) <= v_w then
          v_usado[i] := true;
          v_g := v_g || jsonb_build_object('nombre', (v_p[i]).nombre, 'elo', (v_p[i]).elo);
          v_elos := v_elos || (v_p[i]).elo;
        end if;
      end loop;
      exit when array_length(v_elos, 1) >= 5;
    end loop;
    if array_length(v_elos, 1) = 5 then
      -- El orden en que se enseñan es al azar (no el de Elo).
      select jsonb_agg(j order by md5(p_semilla || r::text || (j ->> 'nombre')))
      into v_g from jsonb_array_elements(v_g) j;
      v_out := v_out || jsonb_build_array(jsonb_build_object('jugadores', v_g));
    end if;
  end loop;
  return v_out;
end;
$$;

-- Adivina el jugador: el objetivo y 3 jugadores con Elo parecido como opciones.
create or replace function public.mj_gen_adivina(p_modo text, p_semilla text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_p public.mj_jug[] := public.mj_cargar(p_modo, p_semilla);
  n integer := coalesce(array_length(v_p, 1), 0);
  v_rondas integer := public.config_num('mj_adivina_rondas', null, 8)::integer;
  v_vent integer := public.mj_ventana(p_modo) * 5 / 6;
  v_usado boolean[];
  v_out jsonb := '[]'::jsonb;
  v_ops integer[];
  v_t integer;
  r integer;
  pasada integer;
  i integer;
  v_w integer;
  v_nombres jsonb;
begin
  if n = 0 then
    return v_out;
  end if;
  v_usado := array_fill(false, array[n]);
  for r in 1..v_rondas loop
    v_t := null;
    for i in 1..n loop
      if not v_usado[i] and (v_p[i]).elo > 0 and (v_p[i]).club is not null then
        v_t := i;
        exit;
      end if;
    end loop;
    exit when v_t is null;
    v_usado[v_t] := true;
    v_ops := array[v_t];
    for pasada in 1..3 loop
      v_w := case when pasada = 3 then 100000 else v_vent * pasada end;
      for i in 1..n loop
        exit when array_length(v_ops, 1) >= 4;
        if i <> v_t and not (i = any (v_ops)) and (v_p[i]).elo > 0
           and (v_p[i]).nombre <> (v_p[v_t]).nombre
           and abs((v_p[i]).elo - (v_p[v_t]).elo) <= v_w then
          v_ops := v_ops || i;
        end if;
      end loop;
      exit when array_length(v_ops, 1) >= 4;
    end loop;
    continue when array_length(v_ops, 1) < 4;
    -- Opciones en orden aleatorio.
    select jsonb_agg(o.nombre order by md5(p_semilla || 'o' || r::text || o.nombre))
    into v_nombres
    from (select (v_p[x]).nombre as nombre from unnest(v_ops) x) o;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'pista', jsonb_build_object('elo', (v_p[v_t]).elo, 'club', (v_p[v_t]).club,
                                  'categoria', (v_p[v_t]).categoria, 'valor', (v_p[v_t]).valor),
      'opciones', v_nombres,
      'correcta', (select idx - 1 from jsonb_array_elements_text(v_nombres) with ordinality t(x, idx)
                   where x = (v_p[v_t]).nombre limit 1)
    ));
  end loop;
  return v_out;
end;
$$;


-- Adivina el precio: 3 jugadores cuya suma de valores de mercado cae entre 30 y 500 M.
create or replace function public.mj_gen_precio(p_modo text, p_semilla text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_p public.mj_jug[] := public.mj_cargar(p_modo, p_semilla);
  n integer := coalesce(array_length(v_p, 1), 0);
  v_rondas integer := public.config_num('mj_precio_rondas', null, 5)::integer;
  v_el integer[] := '{}';
  v_usado boolean[];
  v_out jsonb := '[]'::jsonb;
  v_ix integer[];
  pasada integer;
  pos integer;
  j integer;
  i integer;
  v_suma numeric;
  v_cartas jsonb;
begin
  if n = 0 then
    return v_out;
  end if;
  v_usado := array_fill(false, array[n]);
  for i in 1..n loop
    if coalesce((v_p[i]).valor, 0) > 0 then
      v_el := v_el || i;
    end if;
  end loop;

  for pasada in 1..2 loop
    pos := 1;
    while jsonb_array_length(v_out) < v_rondas loop
      v_ix := '{}';
      j := pos;
      while j <= coalesce(array_length(v_el, 1), 0) and coalesce(array_length(v_ix, 1), 0) < 3 loop
        if not v_usado[v_el[j]] then
          v_ix := v_ix || j;
        end if;
        j := j + 1;
      end loop;
      exit when coalesce(array_length(v_ix, 1), 0) < 3;
      v_suma := (v_p[v_el[v_ix[1]]]).valor + (v_p[v_el[v_ix[2]]]).valor + (v_p[v_el[v_ix[3]]]).valor;
      if pasada = 2 or v_suma between 30 and 500 then
        v_cartas := '[]'::jsonb;
        for i in 1..3 loop
          v_usado[v_el[v_ix[i]]] := true;
          v_cartas := v_cartas || public.mj_carta(v_p[v_el[v_ix[i]]]);
        end loop;
        v_out := v_out || jsonb_build_array(jsonb_build_object('jugadores', v_cartas, 'total', v_suma));
        pos := v_ix[3] + 1;
      else
        pos := v_ix[1] + 1;
      end if;
    end loop;
  end loop;
  return v_out;
end;
$$;

-- ¿Hay otra forma de ver "el que no encaja" en estas 4 cartas (por club o categoría)?
-- Se usa para que la regla de cada ronda tenga una única solución.
create or replace function public.mj_impostor_ambiguo(p_cartas jsonb, p_impostor integer)
returns boolean
language plpgsql
immutable
as $$
declare
  v_attr text;
  v_otro integer;
begin
  foreach v_attr in array array['club', 'categoria'] loop
    select (c.o - 1)::integer into v_otro
    from jsonb_array_elements(p_cartas) with ordinality c(j, o)
    where (select count(*) from jsonb_array_elements(p_cartas) d(j2)
           where d.j2 ->> v_attr is not distinct from c.j ->> v_attr) = 1
      and (select count(distinct d.j2 ->> v_attr) from jsonb_array_elements(p_cartas) d(j2)) = 2
    limit 1;
    if v_otro is not null and v_otro <> p_impostor then
      return true;
    end if;
    v_otro := null;
  end loop;
  return false;
end;
$$;

-- Adivina el impostor: 3 comparten club, categoría o Elo (±60) y 1 no. La regla de cada
-- ronda rota entre club, categoría y Elo; se exige una única solución.
create or replace function public.mj_gen_impostor(p_modo text, p_semilla text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_p public.mj_jug[] := public.mj_cargar(p_modo, p_semilla);
  n integer := coalesce(array_length(v_p, 1), 0);
  v_rondas integer := public.config_num('mj_impostor_rondas', null, 5)::integer;
  v_usado boolean[];
  v_out jsonb := '[]'::jsonb;
  r integer;
  v_regla integer;
  intento integer;
  v_tipo text;
  v_key text;
  v_tres integer[];
  v_imp integer;
  v_cartas jsonb;
  v_pos integer;
  v_hecho boolean;
  vx integer;
  vc integer;
begin
  if n = 0 then
    return v_out;
  end if;
  v_usado := array_fill(false, array[n]);

  for r in 1..v_rondas loop
    v_regla := abs(('x' || substr(md5(p_semilla || 'r' || r::text), 1, 6))::bit(24)::integer) % 3;
    v_hecho := false;
    for intento in 0..2 loop
      exit when v_hecho;
      v_tipo := (array['club', 'categoria', 'elo'])[1 + (v_regla + intento) % 3];
      v_tres := null;
      v_key := null;

      if v_tipo in ('club', 'categoria') then
        select q_k, array_agg(q_i order by q_i)
        into v_key, v_tres
        from (
          select (case when v_tipo = 'club' then (v_p[q_i]).club else (v_p[q_i]).categoria end) as q_k, q_i
          from generate_series(1, n) q_i
          where not v_usado[q_i]
        ) q
        where q_k is not null
        group by q_k
        having count(*) >= 3
        order by min(q_i)
        limit 1;
        if v_tres is not null then
          v_tres := v_tres[1:3];
        end if;
      else
        -- Tres jugadores sin usar con Elo dentro de ±60 del primero.
        for vx in 1..n loop
          continue when v_usado[vx] or (v_p[vx]).elo <= 0;
          v_tres := array[vx];
          for vc in vx + 1..n loop
            continue when v_usado[vc] or (v_p[vc]).elo <= 0;
            if abs((v_p[vc]).elo - (v_p[vx]).elo) <= 60 then
              v_tres := v_tres || vc;
            end if;
            exit when array_length(v_tres, 1) >= 3;
          end loop;
          exit when array_length(v_tres, 1) >= 3;
          v_tres := null;
        end loop;
        v_key := case when v_tres is null then null else ((v_p[v_tres[1]]).elo / 100 * 100)::text end;
      end if;
      continue when v_tres is null or array_length(v_tres, 1) < 3;

      -- El impostor: el primero sin usar que no encaja y no deja otra solución.
      v_imp := null;
      for vx in 1..n loop
        continue when v_usado[vx] or vx = any (v_tres);
        if v_tipo = 'club' and ((v_p[vx]).club is null or (v_p[vx]).club = v_key) then continue; end if;
        if v_tipo = 'categoria' and ((v_p[vx]).categoria is null or (v_p[vx]).categoria = v_key) then continue; end if;
        if v_tipo = 'elo' and ((v_p[vx]).elo <= 0 or abs((v_p[vx]).elo - (v_p[v_tres[1]]).elo) < 300) then continue; end if;
        v_cartas := jsonb_build_array(public.mj_carta(v_p[v_tres[1]]), public.mj_carta(v_p[v_tres[2]]),
                                      public.mj_carta(v_p[v_tres[3]]), public.mj_carta(v_p[vx]));
        if not public.mj_impostor_ambiguo(v_cartas, 3) then
          v_imp := vx;
          exit;
        end if;
      end loop;
      continue when v_imp is null;

      -- Orden aleatorio de las 4 cartas; se anota dónde queda el impostor.
      select jsonb_agg(j order by md5(p_semilla || 'c' || r::text || (j ->> 'nombre')))
      into v_cartas from jsonb_array_elements(v_cartas) j;
      select (idx - 1)::integer into v_pos
      from jsonb_array_elements(v_cartas) with ordinality t(j, idx)
      where j ->> 'nombre' = (v_p[v_imp]).nombre limit 1;

      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'jugadores', v_cartas, 'impostor', v_pos, 'regla', v_tipo, 'clave', v_key));
      v_usado[v_tres[1]] := true;
      v_usado[v_tres[2]] := true;
      v_usado[v_tres[3]] := true;
      v_usado[v_imp] := true;
      v_hecho := true;
    end loop;
  end loop;
  return v_out;
end;
$$;


-- Clave de agrupación de un jugador según la relación (para las parejas).
create or replace function public.mj_clave(p public.mj_jug, p_rel text)
returns text
language sql
immutable
as $$
  select case p_rel
    when 'club' then p.club
    when 'categoria' then p.categoria
    when 'elo' then case when p.elo > 0 then (p.elo / 100)::text end
    when 'valor' then case when p.valor > 0 then floor(p.valor / 10)::text end
    when 'anio' then p.anio::text
  end
$$;

-- Encontrar las parejas: tableros de 8 jugadores que forman 4 parejas, cada una por
-- una relación distinta (club, categoría, banda de 100 puntos de Elo, banda de 10 M de
-- valor, año de nacimiento). Entre varias distribuciones se queda con la que tiene menos
-- parejas "de casualidad". Al puntuar vale cualquier pareja que comparta alguna relación.
create or replace function public.mj_gen_parejas(p_modo text, p_semilla text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_tableros integer := public.config_num('mj_parejas_rondas', null, 3)::integer;
  v_rels text[] := array['club', 'categoria', 'elo', 'valor', 'anio'];
  v_out jsonb := '[]'::jsonb;
  v_nombres text[] := '{}';
  v_p public.mj_jug[];
  n integer;
  v_usado boolean[];
  v_orden text[];
  v_sel integer[];
  v_regs text[];
  v_g integer[];
  v_rel text;
  v_k text;
  v_mejor integer[];
  v_mejor_regs text[];
  v_mejor_p public.mj_jug[];
  v_mejor_extra integer;
  v_extra integer;
  v_cartas jsonb;
  v_sol jsonb;
  t integer;
  intento integer;
  a integer;
  b integer;
  z integer;
  rel2 text;
begin
  for t in 1..v_tableros loop
    v_mejor := null;
    v_mejor_extra := 1000;
    for intento in 1..6 loop
      v_p := public.mj_cargar(p_modo, p_semilla || 't' || t::text || 'i' || intento::text);
      n := coalesce(array_length(v_p, 1), 0);
      continue when n < 8;
      v_usado := array_fill(false, array[n]);
      for z in 1..n loop
        if (v_p[z]).nombre = any (v_nombres) then
          v_usado[z] := true;
        end if;
      end loop;
      select array_agg(q_r order by md5(p_semilla || t::text || intento::text || q_r))
      into v_orden from unnest(v_rels) q_r;
      v_sel := '{}';
      v_regs := '{}';
      foreach v_rel in array v_orden loop
        exit when cardinality(v_regs) >= 4;
        v_g := null;
        select array_agg(q_i order by q_i) into v_g
        from (
          select q_i, public.mj_clave(v_p[q_i], v_rel) as q_k
          from generate_series(1, n) q_i
          where not v_usado[q_i]
        ) q
        where q_k is not null
        group by q_k
        having count(*) >= 2
        order by min(q_i)
        limit 1;
        if v_g is not null then
          v_usado[v_g[1]] := true;
          v_usado[v_g[2]] := true;
          v_sel := v_sel || v_g[1] || v_g[2];
          v_regs := v_regs || v_rel;
        end if;
      end loop;
      continue when cardinality(v_regs) < 4;

      -- Parejas de casualidad: pares entre los 8 que comparten algo sin ser pareja prevista.
      v_extra := 0;
      for a in 1..7 loop
        for b in a + 1..8 loop
          continue when (b = a + 1 and a % 2 = 1);
          foreach rel2 in array v_rels loop
            if public.mj_clave(v_p[v_sel[a]], rel2) is not null
               and public.mj_clave(v_p[v_sel[a]], rel2) = public.mj_clave(v_p[v_sel[b]], rel2) then
              v_extra := v_extra + 1;
              exit;
            end if;
          end loop;
        end loop;
      end loop;
      if v_extra < v_mejor_extra then
        v_mejor_extra := v_extra;
        v_mejor := v_sel;
        v_mejor_regs := v_regs;
        v_mejor_p := v_p;
      end if;
    end loop;

    exit when v_mejor is null;

    v_cartas := '[]'::jsonb;
    for a in 1..8 loop
      v_p := v_mejor_p;
      v_cartas := v_cartas || jsonb_build_object(
        'nombre', (v_p[v_mejor[a]]).nombre,
        'elo', (v_p[v_mejor[a]]).elo,
        'club', (v_p[v_mejor[a]]).club,
        'categoria', (v_p[v_mejor[a]]).categoria,
        'valor', (v_p[v_mejor[a]]).valor,
        'anio', (v_p[v_mejor[a]]).anio,
        'par', (a + 1) / 2,
        'regla', v_mejor_regs[(a + 1) / 2],
        'claves', jsonb_strip_nulls(jsonb_build_object(
          'club', public.mj_clave(v_p[v_mejor[a]], 'club'),
          'categoria', public.mj_clave(v_p[v_mejor[a]], 'categoria'),
          'elo', public.mj_clave(v_p[v_mejor[a]], 'elo'),
          'valor', public.mj_clave(v_p[v_mejor[a]], 'valor'),
          'anio', public.mj_clave(v_p[v_mejor[a]], 'anio'))));
      v_nombres := v_nombres || (v_p[v_mejor[a]]).nombre;
    end loop;

    -- Orden en que se enseñan: al azar.
    select jsonb_agg(c order by md5(p_semilla || 'c' || t::text || (c ->> 'nombre')))
    into v_cartas from jsonb_array_elements(v_cartas) c;

    select jsonb_agg(jsonb_build_object('a', q_a, 'b', q_b, 'regla', q_r) order by q_par)
    into v_sol
    from (
      select (c ->> 'par')::integer as q_par, min(o) - 1 as q_a, max(o) - 1 as q_b, min(c ->> 'regla') as q_r
      from jsonb_array_elements(v_cartas) with ordinality t2(c, o)
      group by (c ->> 'par')::integer
    ) s;

    v_out := v_out || jsonb_build_array(jsonb_build_object('cartas', v_cartas, 'soluciones', v_sol));
  end loop;
  return v_out;
end;
$$;

-- Acierta el jugador: se guardan solo los ids de los iconos; la descripción sale en el
-- idioma del usuario al formar la pregunta.
create or replace function public.mj_gen_acierta(p_modo text, p_semilla text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_ids text[];
  v_rondas integer;
  v_out jsonb := '[]'::jsonb;
  v_ops text[];
  v_opciones jsonb;
  r integer;
begin
  select array_agg(i.id order by md5(p_semilla || i.id)) into v_ids from mj_iconos i;
  if coalesce(cardinality(v_ids), 0) < 4 then
    return v_out;
  end if;
  v_rondas := least(public.config_num('mj_acierta_rondas', null, 8)::integer, cardinality(v_ids));
  for r in 1..v_rondas loop
    select array_agg(q.id) into v_ops
    from (select i.id from mj_iconos i where i.id <> v_ids[r]
          order by md5(p_semilla || 'd' || r::text || i.id) limit 3) q;
    v_ops := v_ops || v_ids[r];
    select jsonb_agg(q_x order by md5(p_semilla || 'o' || r::text || q_x)) into v_opciones from unnest(v_ops) q_x;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'icono', v_ids[r],
      'opciones', v_opciones,
      'correcta', (select idx - 1 from jsonb_array_elements_text(v_opciones) with ordinality t(x, idx)
                   where x = v_ids[r] limit 1)
    ));
  end loop;
  return v_out;
end;
$$;

-- Despachador de generadores.
create or replace function public.mj_generar(p_juego text, p_modo text, p_semilla text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if p_juego = 'hol' then return public.mj_gen_hol(p_modo, p_semilla);
  elsif p_juego = 'elo' then return public.mj_gen_elo(p_modo, p_semilla);
  elsif p_juego = 'orden' then return public.mj_gen_orden(p_modo, p_semilla);
  elsif p_juego = 'adivina' then return public.mj_gen_adivina(p_modo, p_semilla);
  elsif p_juego = 'acierta' then return public.mj_gen_acierta(p_modo, p_semilla);
  elsif p_juego = 'precio' then return public.mj_gen_precio(p_modo, p_semilla);
  elsif p_juego = 'impostor' then return public.mj_gen_impostor(p_modo, p_semilla);
  elsif p_juego = 'parejas' then return public.mj_gen_parejas(p_modo, p_semilla);
  end if;
  raise exception 'Minijuego desconocido: %', p_juego;
end;
$$;

create or replace function public.mj_juegos_activos()
returns text[]
language sql
immutable
as $$ select array['hol', 'elo', 'orden', 'adivina', 'acierta', 'precio', 'impostor', 'parejas'] $$;

-- 5) Iniciar, responder y formar la pregunta (con los 8 juegos) ---------------------------------
drop function if exists public.mj_iniciar(text, text, text, boolean);

create or replace function public.mj_formar_pregunta(p public.mj_partidas)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_seg integer;
  v_resta numeric;
  v_q jsonb;
  v_base jsonb;
  v_desc text;
  v_tok text;
  v_nom text;
begin
  if p.juego = 'elo' then
    v_seg := public.config_num('mj_elo_segundos', null, 20)::integer;
    v_resta := greatest(0, v_seg - extract(epoch from (now() - p.inicio_pregunta)));
    return jsonb_build_object(
      'tipo', 'elo',
      'indice', p.indice + 1,
      'total', jsonb_array_length(p.preguntas),
      'nombre', p.preguntas -> p.indice ->> 'nombre',
      'segundos', v_seg,
      'restante', round(v_resta, 1)
    );
  elsif p.juego = 'orden' then
    v_seg := public.config_num('mj_orden_segundos', null, 45)::integer;
    v_resta := greatest(0, v_seg - extract(epoch from (now() - p.inicio_pregunta)));
    return jsonb_build_object(
      'tipo', 'orden',
      'indice', p.indice + 1,
      'total', jsonb_array_length(p.preguntas),
      'jugadores', (select jsonb_agg(j ->> 'nombre' order by o)
                    from jsonb_array_elements(p.preguntas -> p.indice -> 'jugadores') with ordinality as t(j, o)),
      'segundos', v_seg,
      'restante', round(v_resta, 1)
    );
  elsif p.juego in ('adivina', 'acierta', 'precio', 'impostor', 'parejas') then
    v_seg := public.config_num('mj_' || p.juego || '_segundos', null, 20)::integer;
    v_resta := greatest(0, v_seg - extract(epoch from (now() - p.inicio_pregunta)));
    v_q := p.preguntas -> p.indice;
    v_base := jsonb_build_object(
      'tipo', p.juego,
      'indice', p.indice + 1,
      'total', jsonb_array_length(p.preguntas),
      'segundos', v_seg,
      'sin_limite', p.juego not in ('adivina', 'acierta'),
      'restante', case when p.juego in ('adivina', 'acierta') then round(v_resta, 1) end
    );
    if p.juego = 'adivina' then
      return v_base || jsonb_build_object('pista', v_q -> 'pista', 'opciones', v_q -> 'opciones');
    elsif p.juego = 'acierta' then
      select case p.idioma when 'eu' then i.desc_eu when 'en' then i.desc_en else i.desc_es end, i.nombre
      into v_desc, v_nom from mj_iconos i where i.id = v_q ->> 'icono';
      -- Se tapa el nombre del icono (y sus palabras sueltas) en la descripción.
      for v_tok in select unnest(regexp_split_to_array(v_nom, '\s+')) loop
        if length(v_tok) >= 3 then
          v_desc := regexp_replace(v_desc, '\m' || regexp_replace(v_tok, '([^[:alnum:]])', '\\\1', 'g') || '\M', '…', 'gi');
        end if;
      end loop;
      return v_base || jsonb_build_object(
        'descripcion', v_desc,
        'opciones', (select jsonb_agg(i.nombre order by t.o)
                     from jsonb_array_elements_text(v_q -> 'opciones') with ordinality t(x, o)
                     join mj_iconos i on i.id = t.x));
    elsif p.juego = 'precio' then
      return v_base || jsonb_build_object(
        'jugadores', (select jsonb_agg(j - 'valor' order by o)
                      from jsonb_array_elements(v_q -> 'jugadores') with ordinality t(j, o)));
    elsif p.juego = 'impostor' then
      return v_base || jsonb_build_object(
        'jugadores', (select jsonb_agg(j - 'valor' order by o)
                      from jsonb_array_elements(v_q -> 'jugadores') with ordinality t(j, o)));
    else
      return v_base || jsonb_build_object(
        'cartas', (select jsonb_agg(j - 'claves' - 'par' - 'regla' order by o)
                   from jsonb_array_elements(v_q -> 'cartas') with ordinality t(j, o)));
    end if;
  elsif p.juego = 'hol' then
    return jsonb_build_object(
      'tipo', 'hol',
      'indice', p.indice,
      'total', jsonb_array_length(p.preguntas) - 1,
      'aciertos', p.aciertos,
      'actual', jsonb_build_object(
        'nombre', p.preguntas -> (p.indice - 1) ->> 'nombre',
        'elo', (p.preguntas -> (p.indice - 1) ->> 'elo')::integer
      ),
      'siguiente', jsonb_build_object('nombre', p.preguntas -> p.indice ->> 'nombre')
    );
  end if;
  return null;
end;
$$;

create or replace function public.mj_iniciar(
  p_juego text,
  p_tipo text default 'diaria',
  p_modo text default 'estandar',
  p_reintento boolean default false,
  p_idioma text default 'es'
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := public.mj_dia();
  v_p mj_partidas%rowtype;
  v_ult mj_partidas%rowtype;
  v_pregs jsonb;
  v_intento integer := 1;
  v_reanudada boolean := false;
  v_idioma text := case when p_idioma in ('es', 'eu', 'en') then p_idioma else 'es' end;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para jugar.');
  end if;
  if not public.mj_activo() then
    return jsonb_build_object('ok', false, 'mensaje', 'Los minijuegos están desactivados ahora mismo.');
  end if;
  if p_juego <> all (public.mj_juegos_activos()) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese minijuego no existe.');
  end if;
  if p_tipo not in ('diaria', 'libre') or p_modo not in ('estandar', 'leyenda') then
    return jsonb_build_object('ok', false, 'mensaje', 'Modo de juego no válido.');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('mj_iniciar|' || v_uid::text || '|' || p_juego, 0));

  if p_tipo = 'diaria' then
    select * into v_ult from mj_partidas
    where user_id = v_uid and juego = p_juego and ranked and dia = v_hoy
    order by intento desc limit 1;

    if found and v_ult.estado = 'en_curso' then
      update mj_partidas set idioma = v_idioma where id = v_ult.id returning * into v_p;
      v_reanudada := true;
    elsif found then
      if not p_reintento then
        return jsonb_build_object('ok', false, 'mensaje', 'Ya has jugado la partida del día. ¡Vuelve mañana!');
      end if;
      if v_ult.intento >= 2 then
        return jsonb_build_object('ok', false, 'mensaje', 'Ya has usado el reintento de este minijuego hoy.');
      end if;
      update mj_objetos set cantidad = cantidad - 1
      where user_id = v_uid and tipo = 'reintento' and cantidad > 0;
      if not found then
        return jsonb_build_object('ok', false, 'mensaje', 'No tienes ningún reintento.');
      end if;
      v_intento := v_ult.intento + 1;
      v_pregs := public.mj_generar(p_juego, 'estandar', gen_random_uuid()::text);
    else
      v_pregs := public.mj_preguntas_diarias(p_juego);
    end if;

    if not v_reanudada then
      if jsonb_array_length(v_pregs) < 2 then
        return jsonb_build_object('ok', false, 'mensaje', 'Todavía no hay jugadores suficientes para este minijuego.');
      end if;
      insert into mj_partidas (user_id, juego, modo, dia, ranked, intento, preguntas, indice, idioma)
      values (v_uid, p_juego, 'estandar', v_hoy, true, v_intento, v_pregs,
              case when p_juego = 'hol' then 1 else 0 end, v_idioma)
      returning * into v_p;
    end if;
  else
    update mj_partidas set estado = 'abandonada'
    where user_id = v_uid and juego = p_juego and not ranked and estado = 'en_curso';
    v_pregs := public.mj_generar(p_juego, p_modo, gen_random_uuid()::text);
    if jsonb_array_length(v_pregs) < 2 then
      return jsonb_build_object('ok', false, 'mensaje', 'Todavía no hay jugadores suficientes para este minijuego.');
    end if;
    insert into mj_partidas (user_id, juego, modo, dia, ranked, intento, preguntas, indice, idioma)
    values (v_uid, p_juego, p_modo, v_hoy, false, 1, v_pregs, case when p_juego = 'hol' then 1 else 0 end, v_idioma)
    returning * into v_p;
  end if;

  return jsonb_build_object(
    'ok', true,
    'partida', v_p.id,
    'juego', v_p.juego,
    'modo', v_p.modo,
    'ranked', v_p.ranked,
    'intento', v_p.intento,
    'reanudada', v_reanudada,
    'puntos', v_p.puntos,
    'pregunta', public.mj_formar_pregunta(v_p)
  );
end;
$$;

create or replace function public.mj_responder(p_partida uuid, p_respuesta jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_p mj_partidas%rowtype;
  v_seg numeric;
  v_lim integer;
  v_q jsonb;
  v_real integer;
  v_real_c integer;
  v_guess integer;
  v_acc numeric;
  v_mult numeric;
  v_pts integer := 0;
  v_total integer;
  v_fin boolean := false;
  v_correcta boolean := false;
  v_dir text;
  v_ant jsonb;
  v_rev jsonb;
  v_final jsonb;
  v_orden integer[];
  v_pares integer := 0;
  v_opc integer;
  v_num numeric;
  v_tot numeric;
  v_nom text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'mensaje', 'Inicia sesión para jugar.');
  end if;

  select * into v_p from mj_partidas where id = p_partida and user_id = v_uid for update;
  if not found then
    return jsonb_build_object('ok', false, 'mensaje', 'Partida no encontrada.');
  end if;
  if v_p.estado <> 'en_curso' then
    return jsonb_build_object('ok', false, 'mensaje', 'Esta partida ya ha terminado.');
  end if;

  v_seg := extract(epoch from (now() - v_p.inicio_pregunta));
  v_total := jsonb_array_length(v_p.preguntas);

  if v_p.juego = 'elo' then
    v_lim := public.config_num('mj_elo_segundos', null, 20)::integer;
    v_q := v_p.preguntas -> v_p.indice;
    v_real := (v_q ->> 'elo')::integer;

    if p_respuesta is not null and jsonb_typeof(p_respuesta -> 'valor') = 'number' then
      v_guess := round((p_respuesta ->> 'valor')::numeric)::integer;
      if not (v_guess = 0 or v_guess between 1400 and 2500) then
        return jsonb_build_object('ok', false, 'mensaje', 'Elo fuera de rango.');
      end if;
    end if;

    -- Se da un margen de 3 s por la red; pasado, la ronda vale 0.
    if v_guess is null or v_seg > v_lim + 3 then
      v_acc := 0;
    elsif v_real = 0 then
      v_acc := case when v_guess = 0 then 1 else 0 end;
    elsif v_guess = 0 then
      v_acc := 0;
    else
      v_real_c := least(2500, greatest(1400, v_real));
      v_acc := greatest(0, 1 - greatest(0, abs(v_guess - v_real_c) - 5) / 245.0);
    end if;
    v_mult := 0.5 + 0.5 * greatest(0, 1 - v_seg / v_lim);
    v_pts := round(1000.0 / v_total * v_acc * v_mult)::integer;
    v_correcta := v_acc >= 0.9;
    v_rev := jsonb_build_object('nombre', v_q ->> 'nombre', 'elo', v_real, 'respuesta', v_guess);

    update mj_partidas
    set puntos = puntos + v_pts,
        aciertos = aciertos + case when v_correcta then 1 else 0 end,
        detalle = detalle || jsonb_build_object(
          'nombre', v_q ->> 'nombre', 'real', v_real, 'respuesta', v_guess,
          'segundos', round(v_seg, 1), 'puntos', v_pts),
        indice = indice + 1,
        inicio_pregunta = now()
    where id = v_p.id
    returning * into v_p;

    v_fin := v_p.indice >= v_total;

  elsif v_p.juego = 'orden' then
    v_lim := public.config_num('mj_orden_segundos', null, 45)::integer;
    v_q := v_p.preguntas -> v_p.indice -> 'jugadores';

    -- La respuesta es la lista de posiciones (0-4) de menor a mayor Elo. Se admite
    -- incompleta (si se acaba el tiempo); las que falten cuentan como falladas.
    if p_respuesta is not null and jsonb_typeof(p_respuesta -> 'orden') = 'array' then
      select coalesce(array_agg(x::integer order by o), '{}') into v_orden
      from jsonb_array_elements_text(p_respuesta -> 'orden') with ordinality as t(x, o);
      if cardinality(v_orden) > 5
         or exists (select 1 from unnest(v_orden) u where u not between 0 and 4)
         or (select count(distinct u) from unnest(v_orden) u) <> cardinality(v_orden) then
        return jsonb_build_object('ok', false, 'mensaje', 'Orden no válido.');
      end if;
    else
      v_orden := '{}';
    end if;

    v_acc := 0;
    if v_seg <= v_lim + 3 then
      -- Pares bien ordenados entre los 10 posibles.
      select count(*) into v_pares
      from generate_series(1, cardinality(v_orden)) a
      join generate_series(1, cardinality(v_orden)) b on b > a
      where (v_q -> v_orden[a] ->> 'elo')::integer < (v_q -> v_orden[b] ->> 'elo')::integer;
      v_acc := v_pares / 10.0;
    end if;
    v_mult := 0.5 + 0.5 * greatest(0, 1 - v_seg / v_lim);
    v_pts := round(1000.0 / v_total * v_acc * v_mult)::integer;
    v_correcta := v_acc = 1;
    select jsonb_agg(jsonb_build_object('nombre', j ->> 'nombre', 'elo', (j ->> 'elo')::integer)
                     order by (j ->> 'elo')::integer)
    into v_rev from jsonb_array_elements(v_q) j;
    v_rev := jsonb_build_object('jugadores', v_rev, 'orden', to_jsonb(v_orden));

    update mj_partidas
    set puntos = puntos + v_pts,
        aciertos = aciertos + case when v_correcta then 1 else 0 end,
        detalle = detalle || jsonb_build_object('puntos', v_pts, 'segundos', round(v_seg, 1), 'pares', v_pares),
        indice = indice + 1,
        inicio_pregunta = now()
    where id = v_p.id
    returning * into v_p;

    v_fin := v_p.indice >= v_total;

  elsif v_p.juego in ('adivina', 'acierta') then
    v_lim := public.config_num('mj_' || v_p.juego || '_segundos', null, 20)::integer;
    v_q := v_p.preguntas -> v_p.indice;
    if p_respuesta is not null and jsonb_typeof(p_respuesta -> 'opcion') = 'number' then
      v_opc := (p_respuesta ->> 'opcion')::numeric::integer;
      if v_opc not between 0 and 3 then
        return jsonb_build_object('ok', false, 'mensaje', 'Respuesta no válida.');
      end if;
    end if;
    v_real := (v_q ->> 'correcta')::integer;
    v_correcta := v_opc is not null and v_opc = v_real and v_seg <= v_lim + 3;
    v_acc := case when v_correcta then 1 else 0 end;
    v_mult := public.mj_mult(v_seg, v_lim);
    v_pts := round(1000.0 / v_total * v_acc * v_mult)::integer;
    if v_p.juego = 'adivina' then
      v_nom := v_q -> 'opciones' ->> v_real;
    else
      select i.nombre into v_nom from mj_iconos i where i.id = v_q -> 'opciones' ->> v_real;
    end if;
    v_rev := jsonb_build_object('correcta', v_real, 'nombre', v_nom, 'elegida', v_opc);

    update mj_partidas
    set puntos = puntos + v_pts,
        aciertos = aciertos + case when v_correcta then 1 else 0 end,
        detalle = detalle || jsonb_build_object('ok', v_correcta, 'segundos', round(v_seg, 1), 'puntos', v_pts),
        indice = indice + 1,
        inicio_pregunta = now()
    where id = v_p.id
    returning * into v_p;
    v_fin := v_p.indice >= v_total;

  elsif v_p.juego = 'precio' then
    v_lim := public.config_num('mj_precio_segundos', null, 90)::integer;
    v_q := v_p.preguntas -> v_p.indice;
    v_tot := (v_q ->> 'total')::numeric;
    if p_respuesta is not null and jsonb_typeof(p_respuesta -> 'valor') = 'number' then
      v_num := round((p_respuesta ->> 'valor')::numeric);
      if v_num < 0 or v_num > 1000 then
        return jsonb_build_object('ok', false, 'mensaje', 'Valor fuera de rango.');
      end if;
    end if;
    -- Hasta un 3 % de error es pleno; a partir de ahí baja hasta 0 al fallar un 50 %.
    v_acc := case when v_num is null or v_tot <= 0 then 0
                  else greatest(0, 1 - greatest(0, abs(v_num - v_tot) / v_tot - 0.03) / 0.47) end;
    v_mult := public.mj_mult(v_seg, v_lim);
    v_pts := round(1000.0 / v_total * v_acc * v_mult)::integer;
    v_correcta := v_acc >= 0.9;
    v_rev := jsonb_build_object(
      'total', v_tot, 'respuesta', v_num,
      'jugadores', (select jsonb_agg(jsonb_build_object('nombre', j ->> 'nombre', 'valor', (j ->> 'valor')::numeric) order by o)
                    from jsonb_array_elements(v_q -> 'jugadores') with ordinality t(j, o)));

    update mj_partidas
    set puntos = puntos + v_pts,
        aciertos = aciertos + case when v_correcta then 1 else 0 end,
        detalle = detalle || jsonb_build_object('total', v_tot, 'respuesta', v_num, 'segundos', round(v_seg, 1), 'puntos', v_pts),
        indice = indice + 1,
        inicio_pregunta = now()
    where id = v_p.id
    returning * into v_p;
    v_fin := v_p.indice >= v_total;

  elsif v_p.juego = 'impostor' then
    v_lim := public.config_num('mj_impostor_segundos', null, 60)::integer;
    v_q := v_p.preguntas -> v_p.indice;
    if p_respuesta is not null and jsonb_typeof(p_respuesta -> 'opcion') = 'number' then
      v_opc := (p_respuesta ->> 'opcion')::numeric::integer;
      if v_opc not between 0 and 3 then
        return jsonb_build_object('ok', false, 'mensaje', 'Respuesta no válida.');
      end if;
    end if;
    v_real := (v_q ->> 'impostor')::integer;
    v_correcta := v_opc is not null and v_opc = v_real;
    v_acc := case when v_correcta then 1 else 0 end;
    v_mult := public.mj_mult(v_seg, v_lim);
    v_pts := round(1000.0 / v_total * v_acc * v_mult)::integer;
    v_rev := jsonb_build_object(
      'impostor', v_real, 'regla', v_q ->> 'regla', 'clave', v_q ->> 'clave', 'elegida', v_opc,
      'nombre', v_q -> 'jugadores' -> v_real ->> 'nombre');

    update mj_partidas
    set puntos = puntos + v_pts,
        aciertos = aciertos + case when v_correcta then 1 else 0 end,
        detalle = detalle || jsonb_build_object('ok', v_correcta, 'segundos', round(v_seg, 1), 'puntos', v_pts),
        indice = indice + 1,
        inicio_pregunta = now()
    where id = v_p.id
    returning * into v_p;
    v_fin := v_p.indice >= v_total;

  elsif v_p.juego = 'parejas' then
    v_lim := public.config_num('mj_parejas_segundos', null, 120)::integer;
    v_q := v_p.preguntas -> v_p.indice;
    v_ant := '[]'::jsonb;
    if p_respuesta is not null and jsonb_typeof(p_respuesta -> 'pares') = 'array' then
      v_ant := p_respuesta -> 'pares';
      -- Hasta 4 parejas de dos números distintos del 0 al 7, sin repetir ninguno.
      if jsonb_array_length(v_ant) > 4
         or exists (
           select 1 from jsonb_array_elements(v_ant) pr
           where jsonb_typeof(pr) <> 'array' or jsonb_array_length(pr) <> 2
              or exists (select 1 from jsonb_array_elements(pr) e
                         where jsonb_typeof(e) <> 'number' or (e #>> '{}') !~ '^[0-7]$'))
         or (select count(distinct e #>> '{}') from jsonb_array_elements(v_ant) pr, jsonb_array_elements(pr) e)
            <> (select count(*) from jsonb_array_elements(v_ant) pr, jsonb_array_elements(pr) e) then
        return jsonb_build_object('ok', false, 'mensaje', 'Parejas no válidas.');
      end if;
    end if;
    select count(*) into v_pares
    from jsonb_array_elements(v_ant) pr
    where exists (
      select 1 from jsonb_each_text(v_q -> 'cartas' -> ((pr ->> 0)::integer) -> 'claves') k
      where k.value is not null
        and k.value = (v_q -> 'cartas' -> ((pr ->> 1)::integer) -> 'claves' ->> k.key));
    v_acc := v_pares / 4.0;
    v_mult := public.mj_mult(v_seg, v_lim);
    v_pts := round(1000.0 / v_total * v_acc * v_mult)::integer;
    v_correcta := v_pares = 4;
    v_rev := jsonb_build_object(
      'validas', v_pares,
      'soluciones', v_q -> 'soluciones',
      'enviadas', v_ant,
      'cartas', (select jsonb_agg(jsonb_build_object('nombre', j ->> 'nombre') order by o)
                 from jsonb_array_elements(v_q -> 'cartas') with ordinality t(j, o)));

    update mj_partidas
    set puntos = puntos + v_pts,
        aciertos = aciertos + case when v_correcta then 1 else 0 end,
        detalle = detalle || jsonb_build_object('pares', v_pares, 'segundos', round(v_seg, 1), 'puntos', v_pts),
        indice = indice + 1,
        inicio_pregunta = now()
    where id = v_p.id
    returning * into v_p;
    v_fin := v_p.indice >= v_total;

  elsif v_p.juego = 'hol' then
    v_dir := p_respuesta ->> 'dir';
    if v_dir is null or v_dir not in ('mas', 'menos') then
      return jsonb_build_object('ok', false, 'mensaje', 'Respuesta no válida.');
    end if;
    v_ant := v_p.preguntas -> (v_p.indice - 1);
    v_q := v_p.preguntas -> v_p.indice;
    v_correcta := ((v_q ->> 'elo')::integer > (v_ant ->> 'elo')::integer) = (v_dir = 'mas');
    v_rev := jsonb_build_object('nombre', v_q ->> 'nombre', 'elo', (v_q ->> 'elo')::integer);

    if v_correcta then
      v_pts := round(1000.0 / (v_total - 1))::integer;
      update mj_partidas
      set puntos = puntos + v_pts, aciertos = aciertos + 1, indice = indice + 1, inicio_pregunta = now(),
          detalle = detalle || jsonb_build_object('nombre', v_q ->> 'nombre', 'real', (v_q ->> 'elo')::integer, 'ok', true)
      where id = v_p.id
      returning * into v_p;
      v_fin := v_p.indice >= v_total;
    else
      update mj_partidas
      set detalle = detalle || jsonb_build_object('nombre', v_q ->> 'nombre', 'real', (v_q ->> 'elo')::integer, 'ok', false)
      where id = v_p.id
      returning * into v_p;
      v_fin := true;
    end if;
  else
    return jsonb_build_object('ok', false, 'mensaje', 'Minijuego desconocido.');
  end if;

  if v_fin then
    v_final := public.mj_cerrar(v_p.id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'correcta', v_correcta,
    'puntos_ronda', v_pts,
    'puntos', v_p.puntos,
    'aciertos', v_p.aciertos,
    'revelado', v_rev,
    'terminada', v_fin,
    'final', v_final,
    'pregunta', case when v_fin then null else public.mj_formar_pregunta(v_p) end
  );
end;
$$;

-- 6) Estado y ranking ------------------------------------------------------------------------
create or replace function public.mj_estado()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := public.mj_dia();
  v_du mj_dia_usuario%rowtype;
  v_juegos jsonb := '[]'::jsonb;
  v_j text;
  v_p mj_partidas%rowtype;
  v_rew mj_recompensas%rowtype;
  v_completados integer := 0;
  v_obj jsonb;
  v_pos bigint;
  v_mis bigint;
  v_part bigint;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver los minijuegos.';
  end if;

  select * into v_du from mj_dia_usuario where user_id = v_uid and dia = v_hoy;

  foreach v_j in array public.mj_juegos_activos() loop
    select * into v_p from mj_partidas
    where user_id = v_uid and juego = v_j and ranked and dia = v_hoy
    order by intento desc limit 1;
    select * into v_rew from mj_recompensas where user_id = v_uid and dia = v_hoy and juego = v_j;
    if found then
      v_completados := v_completados + 1;
    end if;
    v_juegos := v_juegos || jsonb_build_object(
      'id', v_j,
      'jugada', v_p.id is not null and v_p.estado = 'terminada',
      'en_curso', v_p.id is not null and v_p.estado = 'en_curso',
      'intento', coalesce(v_p.intento, 0),
      'puntos', coalesce((select puntos from mj_puntuaciones where user_id = v_uid and juego = v_j and dia = v_hoy), 0),
      'recompensa', case when v_rew.user_id is null then null
                         else jsonb_build_object('monedas', v_rew.monedas, 'xp', v_rew.xp) end
    );
  end loop;

  select coalesce(jsonb_object_agg(tipo, cantidad), '{}'::jsonb) into v_obj
  from mj_objetos where user_id = v_uid;

  select puntos_total into v_mis from mj_acumulado where user_id = v_uid and juego = 'total';
  select count(*) into v_part from mj_acumulado where juego = 'total' and puntos_total > 0;
  if coalesce(v_mis, 0) > 0 then
    select count(*) + 1 into v_pos from mj_acumulado where juego = 'total' and puntos_total > v_mis;
  end if;

  return jsonb_build_object(
    'activo', public.mj_activo(),
    'juegos', v_juegos,
    'completados', v_completados,
    'total_juegos', array_length(public.mj_juegos_activos(), 1),
    'monedas_hoy', coalesce(v_du.monedas, 0),
    'tope_monedas', public.config_num('mj_tope_monedas_dia', null, 4),
    'xp_hoy', coalesce(v_du.xp, 0),
    'tope_xp', public.config_num('mj_tope_xp_dia', null, 24),
    'monedas_por_juego', public.config_num('mj_monedas_por_juego', null, 0.5),
    'monedas_por_juego_publica', public.config_num('mj_monedas_por_juego_publica', null, 0.25),
    'xp_por_juego', public.config_num('mj_xp_por_juego', null, 3),
    'cofre_disponible', v_completados >= array_length(public.mj_juegos_activos(), 1)
                        and not coalesce(v_du.cofre_abierto, false),
    'cofre_abierto', coalesce(v_du.cofre_abierto, false),
    'cofre_premio', v_du.cofre_premio,
    'objetos', v_obj,
    'racha_reparable', public.mj_racha_reparable(v_uid),
    'elo_rondas', public.config_num('mj_elo_rondas', null, 8),
    'elo_segundos', public.config_num('mj_elo_segundos', null, 20),
    'orden_rondas', public.config_num('mj_orden_rondas', null, 4),
    'orden_segundos', public.config_num('mj_orden_segundos', null, 45),
    'hol_cadena', public.config_num('mj_hol_cadena', null, 20),
    'adivina_rondas', public.config_num('mj_adivina_rondas', null, 8),
    'adivina_segundos', public.config_num('mj_adivina_segundos', null, 20),
    'acierta_rondas', public.config_num('mj_acierta_rondas', null, 8),
    'acierta_segundos', public.config_num('mj_acierta_segundos', null, 20),
    'precio_rondas', public.config_num('mj_precio_rondas', null, 5),
    'precio_segundos', public.config_num('mj_precio_segundos', null, 90),
    'impostor_rondas', public.config_num('mj_impostor_rondas', null, 5),
    'impostor_segundos', public.config_num('mj_impostor_segundos', null, 60),
    'parejas_rondas', public.config_num('mj_parejas_rondas', null, 3),
    'parejas_segundos', public.config_num('mj_parejas_segundos', null, 120),
    'general', jsonb_build_object('pos', v_pos, 'puntos', coalesce(v_mis, 0), 'participantes', v_part)
  );
end;
$$;

create or replace function public.mj_ranking(p_juego text, p_periodo text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date := public.mj_dia();
  v_res jsonb;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para ver el ranking.';
  end if;
  if p_periodo not in ('dia', 'general') or (p_juego <> 'total' and p_juego <> all (public.mj_juegos_activos())) then
    raise exception 'Ranking no válido.';
  end if;

  with base as materialized (
    select user_id, puntos::bigint as puntos from mj_puntuaciones
      where p_periodo = 'dia' and p_juego <> 'total' and dia = v_hoy and juego = p_juego and puntos > 0
    union all
    select user_id, puntos::bigint from mj_dia_usuario
      where p_periodo = 'dia' and p_juego = 'total' and dia = v_hoy and puntos > 0
    union all
    select user_id, puntos_total from mj_acumulado
      where p_periodo = 'general' and juego = p_juego and puntos_total > 0
  ),
  mio as (select puntos from base where user_id = v_uid),
  top as (
    select user_id, puntos, rank() over (order by puntos desc) as pos
    from base order by puntos desc, user_id limit 50
  )
  select jsonb_build_object(
    'filas', coalesce((
      select jsonb_agg(jsonb_build_object(
          'pos', t.pos,
          'nombre', pr.nombre,
          'avatar', pr.avatar,
          'nivel', public.nivel_de_xp(coalesce(x.xp, 0)),
          'puntos', t.puntos,
          'yo', t.user_id = v_uid
        ) order by t.pos, pr.nombre)
      from top t
      join profiles pr on pr.id = t.user_id
      left join xp_usuarios x on x.user_id = t.user_id
    ), '[]'::jsonb),
    'mi', (select jsonb_build_object(
             'pos', (select count(*) + 1 from base b where b.puntos > m.puntos),
             'puntos', m.puntos) from mio m),
    'participantes', (select count(*) from base)
  ) into v_res;

  return v_res;
end;
$$;


-- 9) Permisos ----------------------------------------------------------------------------------
-- Las funciones nuevas o recreadas no deben poder llamarse desde la web: solo las
-- de la lista de abajo (mj_iniciar y mj_ranking, ya existentes en 0098, se vuelven a conceder).
revoke all on function public.mj_pool(text) from public, anon, authenticated;
revoke all on function public.mj_cargar(text, text) from public, anon, authenticated;
revoke all on function public.mj_ventana(text) from public, anon, authenticated;
revoke all on function public.mj_mult(numeric, numeric) from public, anon, authenticated;
revoke all on function public.mj_carta(public.mj_jug) from public, anon, authenticated;
revoke all on function public.mj_clave(public.mj_jug, text) from public, anon, authenticated;
revoke all on function public.mj_impostor_ambiguo(jsonb, integer) from public, anon, authenticated;
revoke all on function public.mj_gen_hol(text, text) from public, anon, authenticated;
revoke all on function public.mj_gen_elo(text, text) from public, anon, authenticated;
revoke all on function public.mj_gen_orden(text, text) from public, anon, authenticated;
revoke all on function public.mj_gen_adivina(text, text) from public, anon, authenticated;
revoke all on function public.mj_gen_acierta(text, text) from public, anon, authenticated;
revoke all on function public.mj_gen_precio(text, text) from public, anon, authenticated;
revoke all on function public.mj_gen_impostor(text, text) from public, anon, authenticated;
revoke all on function public.mj_gen_parejas(text, text) from public, anon, authenticated;
revoke all on function public.mj_generar(text, text, text) from public, anon, authenticated;
revoke all on function public.mj_formar_pregunta(public.mj_partidas) from public, anon, authenticated;
revoke all on function public.mj_iniciar(text, text, text, boolean, text) from public, anon;
revoke all on function public.mj_responder(uuid, jsonb) from public, anon;
revoke all on function public.mj_estado() from public, anon;
revoke all on function public.mj_ranking(text, text) from public, anon;
grant execute on function public.mj_iniciar(text, text, text, boolean, text) to authenticated;
grant execute on function public.mj_responder(uuid, jsonb) to authenticated;
grant execute on function public.mj_estado() to authenticated;
grant execute on function public.mj_ranking(text, text) to authenticated;
