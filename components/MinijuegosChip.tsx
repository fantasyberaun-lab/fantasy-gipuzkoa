"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useT } from "@/components/IdiomaProvider";
import { EVENTO_MINIJUEGOS, fetchEstadoMinijuegos, type EstadoMinijuegos } from "@/lib/supabase/minijuegosQueries";

// Puesto en el ranking general de minijuegos, siempre visible en la cabecera
// (estilo racha). Al tocarlo lleva a ese ranking. Punto amarillo si quedan
// partidas del día por jugar.
export default function MinijuegosChip() {
  const supabase = createClient();
  const t = useT().minijuegos;
  const { cargando, equipo } = useGameState();
  const [estado, setEstado] = useState<EstadoMinijuegos | null>(null);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      const e = await fetchEstadoMinijuegos(supabase);
      if (vivo) setEstado(e);
    }
    cargar();
    window.addEventListener(EVENTO_MINIJUEGOS, cargar);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_MINIJUEGOS, cargar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargando || !equipo.id || !estado || !estado.activo) return null;

  const pendientes = estado.completados < estado.totalJuegos;

  return (
    <Link
      href="/minijuegos?tab=ranking"
      aria-label={t.chipAria(estado.posGeneral)}
      className="relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/10 py-1 pl-2.5 pr-3 text-xs font-bold ring-1 ring-white/15 transition-colors hover:bg-white/20"
    >
      <span aria-hidden="true">🎮</span>
      <span className="text-gold">{estado.posGeneral ? `#${estado.posGeneral}` : t.chipJugar}</span>
      {pendientes && (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-brand-950" aria-hidden="true" />
      )}
    </Link>
  );
}
