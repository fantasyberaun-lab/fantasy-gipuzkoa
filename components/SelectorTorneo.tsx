"use client";

import { useMemo } from "react";
import { useT } from "@/components/IdiomaProvider";

// Lo único que hace falta de cada jugador: los torneos en los que está inscrito.
type ConTorneos = { torneos?: { id: string; nombre: string }[] };

// Desplegable para filtrar el mercado por torneo. Ofrece los torneos en los
// que está inscrito alguno de los jugadores que recibe; "" = todos.
export default function SelectorTorneo({
  jugadores,
  value,
  onChange,
  className = "",
}: {
  jugadores: ConTorneos[];
  value: string;
  onChange: (torneoId: string) => void;
  className?: string;
}) {
  const t = useT();

  const torneos = useMemo(() => {
    const porId = new Map<string, string>();
    for (const j of jugadores) for (const tor of j.torneos ?? []) porId.set(tor.id, tor.nombre);
    return [...porId.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [jugadores]);

  if (torneos.length === 0) return null;

  return (
    <select
      aria-label={t.mercado.torneoAria}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`min-w-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 ${className}`}
    >
      <option value="">{t.mercado.todosTorneos}</option>
      {torneos.map((tor) => (
        <option key={tor.id} value={tor.id}>
          {tor.nombre}
        </option>
      ))}
    </select>
  );
}

// ¿Juega el jugador el torneo elegido? Con "" (todos) siempre sí.
export function juegaTorneo(jugador: ConTorneos, torneoId: string): boolean {
  return torneoId === "" || (jugador.torneos ?? []).some((tor) => tor.id === torneoId);
}
