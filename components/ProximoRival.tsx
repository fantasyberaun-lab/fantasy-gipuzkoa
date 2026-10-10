"use client";

import Link from "next/link";
import { useT } from "@/components/IdiomaProvider";
import type { ProximoRival } from "@/lib/types";

// Línea "Próx. rival" para la tarjeta de un jugador (plantilla y mercado).
// No pinta nada si no hay emparejamientos publicados pendientes.
// Si el jugador queda sin emparejar, muestra "Próx. rival: Sin emparejar".
export default function ProximoRivalLinea({
  rivales,
  className = "",
}: {
  rivales?: ProximoRival[];
  className?: string;
}) {
  const tg = useT().graficas;
  if (!rivales || rivales.length === 0) return null;

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      {rivales.map((r, i) => {
        const detalle = [
          r.torneo,
          tg.ronda(r.jornada),
          r.tablero != null ? tg.mesa(r.tablero) : null,
        ]
          .filter(Boolean)
          .join(" · ");

        if (r.descansa) {
          return (
            <p key={i} className="text-xs text-neutral-500">
              <span className="font-medium text-neutral-600 dark:text-neutral-400">{tg.proxRival}</span>{" "}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{tg.sinEmparejar}</span>{" "}
              <span className="text-neutral-400">· {detalle}</span>
            </p>
          );
        }

        return (
          <p key={i} className="text-xs text-neutral-500">
            <span className="font-medium text-neutral-600 dark:text-neutral-400">{tg.proxRival}</span>{" "}
            {r.color && (
              <span
                title={r.color === "blancas" ? tg.juegaBlancas : tg.juegaNegras}
                className={`mr-1 inline-block h-2.5 w-2.5 rounded-sm border align-middle ${
                  r.color === "blancas"
                    ? "border-neutral-400 bg-white"
                    : "border-neutral-700 bg-neutral-800"
                }`}
              />
            )}
            {r.rivalId ? (
              <Link
                href={`/jugadores/${r.rivalId}`}
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-neutral-700 hover:underline dark:text-neutral-300"
              >
                {r.rivalNombre}
              </Link>
            ) : (
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {r.rivalNombre}
              </span>
            )}
            {r.rivalElo != null && <span> ({r.rivalElo})</span>}{" "}
            <span className="text-neutral-400">· {detalle}</span>
          </p>
        );
      })}
    </div>
  );
}
