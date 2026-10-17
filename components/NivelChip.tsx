"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useT } from "@/components/IdiomaProvider";
import { EVENTO_XP } from "@/components/RachaDiaria";
import { fetchEstadoNivel, type EstadoNivel } from "@/lib/supabase/nivelesQueries";

// Nivel siempre visible en la cabecera: "Nv 12" con una barra fina hasta el
// siguiente nivel. Al tocarlo lleva a la pestaña Niveles del perfil.
export default function NivelChip() {
  const supabase = createClient();
  const tn = useT().niveles;
  const { cargando, equipo } = useGameState();
  const [estado, setEstado] = useState<EstadoNivel | null>(null);

  async function cargar() {
    setEstado(await fetchEstadoNivel(supabase));
  }

  useEffect(() => {
    cargar();
    // La XP cambia al registrar la entrada del día o al abrir el cofre (RachaDiaria).
    window.addEventListener(EVENTO_XP, cargar);
    return () => window.removeEventListener(EVENTO_XP, cargar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargando || !equipo.id || !estado) return null;

  const rango = Math.max(1, estado.xpNivelSiguiente - estado.xpNivelActual);
  const progreso = Math.min(1, Math.max(0, (estado.xp - estado.xpNivelActual) / rango));

  return (
    <Link
      href={`/managers/${equipo.id}?tab=niveles`}
      aria-label={`${tn.nivel(estado.nivel)} · ${tn.faltan(
        (estado.xpNivelSiguiente - estado.xp).toLocaleString(),
        estado.nivel + 1
      )}`}
      className="mt-1.5 inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-2.5 pr-3 ring-1 ring-white/15 transition-colors hover:bg-white/20"
    >
      <span className="text-xs font-bold uppercase tracking-wide text-gold">
        {tn.nivelCorto(estado.nivel)}
      </span>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-black/40" aria-hidden="true">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-brand-300 to-gold"
          style={{ width: `${progreso * 100}%` }}
        />
      </span>
    </Link>
  );
}
