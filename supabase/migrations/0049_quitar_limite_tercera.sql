-- 0049: se quita el límite de titulares de Tercera (0029/0035).
--
-- Ya no hay máximo de titulares de Tercera por equipo: el único tope de
-- titulares por categoría/torneo es el de 4 por torneo (0048).
drop trigger if exists validar_titular_tercera_trg on public.squad_slots;
drop function if exists public.validar_titular_tercera();
