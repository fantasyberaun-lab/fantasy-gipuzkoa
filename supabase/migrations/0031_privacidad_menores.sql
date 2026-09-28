-- Privacidad de los menores de 20 años.
--
-- Requisito legal: no se puede asociar el nombre de un jugador con su edad
-- o su año de nacimiento. Los datos siguen guardados en `players`
-- (anio_nacimiento y edad) y la fórmula de valor de mercado (0010) los
-- sigue usando, pero:
--
--   - Con la lectura pública que tenía `players`, cualquiera con la clave
--     pública de Supabase podía pedir esas dos columnas directamente a la
--     API, aunque la pantalla las ocultara. Por eso se quita el permiso de
--     lectura sobre esas dos columnas a anon y authenticated.
--   - Lo que se enseña en la app sale de la vista `jugadores_ficha`:
--       menor de 20 años -> "sub20"
--       resto            -> "2004 (22 años)"
--     La edad se calcula con el año actual, como hace la fórmula de 0010,
--     así que un jugador pasa de "sub20" a mostrar su año al cumplir 20 sin
--     tocar nada.
--   - Solo el rol root recibe el año y la edad reales (los necesita para
--     editar jugadores en el panel de admin).
--
-- Nota: las funciones del juego que leen `players` solo usan id, categoria,
-- elo y valor_mercado, y las de 0010 son security definer, así que no se
-- ven afectadas.

revoke select on public.players from anon, authenticated;

grant select (id, nombre, club, categoria, elo, fide_id, valor_mercado, activo, sexo, created_at)
  on public.players to anon, authenticated;

create or replace view public.jugadores_ficha as
with base as (
  select
    p.id,
    p.sexo,
    p.anio_nacimiento,
    coalesce(extract(year from current_date)::integer - p.anio_nacimiento, p.edad) as edad_actual
  from public.players p
)
select
  b.id,
  b.sexo,
  case
    when b.edad_actual is null then null
    when b.edad_actual < 20 then 'sub20'
    when b.anio_nacimiento is null then b.edad_actual || ' años'
    else b.anio_nacimiento || ' (' || b.edad_actual || ' años)'
  end as nacimiento_texto,
  coalesce(b.edad_actual < 20, false) as es_sub20,
  case when public.es_root() then b.anio_nacimiento end as anio_nacimiento,
  case when public.es_root() then b.edad_actual end as edad
from base b;

revoke all on public.jugadores_ficha from public, anon;
grant select on public.jugadores_ficha to authenticated;
