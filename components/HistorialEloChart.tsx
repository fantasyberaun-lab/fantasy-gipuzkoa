import type { PuntoElo } from "@/lib/supabase/jugadoresQueries";

const ANCHO = 600;
const ALTO = 160;
const MARGEN = { arriba: 12, derecha: 8, abajo: 20, izquierda: 8 };

function etiquetaMes(periodo: string) {
  // periodo = YYYY-MM-DD; se fuerza mediodía para evitar saltos por huso horario.
  return new Date(`${periodo}T12:00:00`).toLocaleDateString("es-ES", {
    month: "short",
    year: "2-digit",
  });
}

// Línea con el Elo mes a mes (un punto por lista FIDE).
export default function HistorialEloChart({
  historial,
  titulo = "Evolución del Elo",
}: {
  historial: PuntoElo[];
  titulo?: string;
}) {
  if (historial.length < 2) {
    return (
      <div>
        <p className="mb-2 text-xs font-medium text-neutral-500">{titulo}</p>
        <p className="text-xs text-neutral-500">
          Todavía no hay cambios de Elo. Aparecerán con la próxima lista mensual de la FIDE.
        </p>
      </div>
    );
  }

  const elos = historial.map((h) => h.elo);
  const eMin = Math.min(...elos);
  const eMax = Math.max(...elos);
  const rango = Math.max(eMax - eMin, 10);

  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const x = (i: number) => MARGEN.izquierda + (i / (historial.length - 1)) * anchoUtil;
  const y = (v: number) => MARGEN.arriba + (1 - (v - eMin) / rango) * altoUtil;

  const linea = historial.map((h, i) => `${x(i).toFixed(1)},${y(h.elo).toFixed(1)}`).join(" ");

  const primero = historial[0].elo;
  const ultimo = historial[historial.length - 1].elo;
  const total = ultimo - primero;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-neutral-500">{titulo}</p>
        <p
          className={`text-xs font-semibold ${
            total > 0 ? "text-accent" : total < 0 ? "text-red-500" : "text-neutral-500"
          }`}
        >
          {total > 0 ? "+" : ""}
          {total} desde {etiquetaMes(historial[0].periodo)}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full"
        role="img"
        aria-label={`${titulo}: de ${primero} a ${ultimo}`}
      >
        <polyline
          points={linea}
          fill="none"
          className="stroke-accent"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {historial.map((h, i) => {
          const d = h.eloAnterior && h.eloAnterior > 0 ? h.elo - h.eloAnterior : null;
          const detalle = d === null || d === 0 ? "" : ` (${d > 0 ? "+" : ""}${d})`;
          return (
            <circle key={h.periodo} cx={x(i)} cy={y(h.elo)} r={3.5} className="fill-accent">
              <title>{`${etiquetaMes(h.periodo)} · ${h.elo}${detalle}`}</title>
            </circle>
          );
        })}
        <text x={MARGEN.izquierda} y={ALTO - 4} className="fill-neutral-400" fontSize={11}>
          {etiquetaMes(historial[0].periodo)}
        </text>
        <text
          x={ANCHO - MARGEN.derecha}
          y={ALTO - 4}
          textAnchor="end"
          className="fill-neutral-400"
          fontSize={11}
        >
          {etiquetaMes(historial[historial.length - 1].periodo)}
        </text>
      </svg>

      <p className="mt-1 text-[11px] text-neutral-400">
        Mín. {eMin} · Máx. {eMax}
      </p>
    </div>
  );
}
