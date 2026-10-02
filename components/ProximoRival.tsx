import Link from "next/link";
import type { ProximoRival } from "@/lib/types";

// Línea "Próx. rival" para la tarjeta de un jugador (plantilla y mercado).
// No pinta nada si no hay emparejamientos publicados pendientes.
export default function ProximoRivalLinea({
  rivales,
  className = "",
}: {
  rivales?: ProximoRival[];
  className?: string;
}) {
  if (!rivales || rivales.length === 0) return null;

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      {rivales.map((r, i) => {
        const detalle = [
          r.torneo,
          `Ronda ${r.jornada}`,
          r.tablero != null ? `Mesa ${r.tablero}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

        if (r.descansa) {
          return (
            <p key={i} className="text-xs text-neutral-500">
              <span className="font-medium text-neutral-600 dark:text-neutral-400">Próx.:</span>{" "}
              descansa <span className="text-neutral-400">({detalle})</span>
            </p>
          );
        }

        return (
          <p key={i} className="text-xs text-neutral-500">
            <span className="font-medium text-neutral-600 dark:text-neutral-400">Próx. rival:</span>{" "}
            {r.color && (
              <span
                title={r.color === "blancas" ? "Juega con blancas" : "Juega con negras"}
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
