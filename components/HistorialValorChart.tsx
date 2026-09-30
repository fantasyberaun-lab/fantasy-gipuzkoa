import type { PuntoValor } from "@/lib/supabase/jugadoresQueries";

const ETIQUETA: Record<PuntoValor["motivo"], string> = {
  inicial: "valor inicial",
  diaria: "variación diaria",
  resultado: "partida",
  correccion: "corrección de resultado",
  ajuste: "ajuste manual",
};

const ANCHO = 600;
const ALTO = 160;
const MARGEN = { arriba: 12, derecha: 8, abajo: 20, izquierda: 8 };

function formatoFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// Línea con la evolución del valor de mercado. Los puntos se reparten por
// fecha real; los que vienen de una partida se marcan con un círculo.
export default function HistorialValorChart({ historial }: { historial: PuntoValor[] }) {
  if (historial.length < 2) {
    return (
      <div>
        <p className="mb-2 text-xs font-medium text-neutral-500">Evolución del valor</p>
        <p className="text-xs text-neutral-500">
          Todavía no hay cambios de valor. Aparecerán con la primera variación diaria o partida.
        </p>
      </div>
    );
  }

  const t0 = new Date(historial[0].fecha).getTime();
  const t1 = new Date(historial[historial.length - 1].fecha).getTime();
  const span = Math.max(t1 - t0, 1);

  const valores = historial.map((h) => h.valor);
  const vMin = Math.min(...valores);
  const vMax = Math.max(...valores);
  const rango = Math.max(vMax - vMin, 0.5); // evita una línea plana pegada al borde

  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const x = (iso: string) =>
    MARGEN.izquierda + ((new Date(iso).getTime() - t0) / span) * anchoUtil;
  const y = (v: number) => MARGEN.arriba + (1 - (v - vMin) / rango) * altoUtil;

  const linea = historial.map((h) => `${x(h.fecha).toFixed(1)},${y(h.valor).toFixed(1)}`).join(" ");

  const primero = historial[0].valor;
  const ultimo = historial[historial.length - 1].valor;
  const totalPct = primero > 0 ? ((ultimo - primero) / primero) * 100 : 0;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-neutral-500">Evolución del valor</p>
        <p
          className={`text-xs font-semibold ${
            totalPct > 0 ? "text-accent" : totalPct < 0 ? "text-red-500" : "text-neutral-500"
          }`}
        >
          {totalPct > 0 ? "+" : ""}
          {totalPct.toFixed(1)} % desde el inicio
        </p>
      </div>

      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full"
        role="img"
        aria-label={`Valor de mercado: de ${primero} M a ${ultimo} M`}
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
          if (h.motivo === "diaria" && i !== historial.length - 1) return null;
          return (
            <circle
              key={i}
              cx={x(h.fecha)}
              cy={y(h.valor)}
              r={h.motivo === "resultado" ? 3.5 : 3}
              className={h.motivo === "resultado" ? "fill-amber-400" : "fill-accent"}
            >
              <title>
                {`${formatoFecha(h.fecha)} · ${h.valor} M`}
                {h.cambioPct !== null
                  ? ` (${h.cambioPct > 0 ? "+" : ""}${h.cambioPct.toFixed(2)} %, ${ETIQUETA[h.motivo]})`
                  : ` (${ETIQUETA[h.motivo]})`}
              </title>
            </circle>
          );
        })}
        <text x={MARGEN.izquierda} y={ALTO - 4} className="fill-neutral-400" fontSize={11}>
          {formatoFecha(historial[0].fecha)}
        </text>
        <text
          x={ANCHO - MARGEN.derecha}
          y={ALTO - 4}
          textAnchor="end"
          className="fill-neutral-400"
          fontSize={11}
        >
          {formatoFecha(historial[historial.length - 1].fecha)}
        </text>
      </svg>

      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-400">
        <span>
          Mín. {vMin} M · Máx. {vMax} M
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          Cambio por partida
        </span>
      </p>
    </div>
  );
}
