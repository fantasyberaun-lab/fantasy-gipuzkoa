-- 0062: Tercera pasa a dar +1 punto por victoria (antes 0).
--
-- El trigger de 0046 (recalcular_resultados_torneo) recalcula solo los
-- resultados ya guardados de cada torneo cuyo bonus_victoria cambie.
--
-- Se excluye Cadete/Kadete por si tiene categoría '3': su bonus no cambia.
-- Revisa en Admin > Torneos que el bonus de cada torneo es el esperado.
update tournaments
set bonus_victoria = 1
where (categoria = '3' or nombre ilike '%tercera%' or nombre ilike '%hirugarren%')
  and nombre not ilike '%cadete%'
  and nombre not ilike '%kadete%';