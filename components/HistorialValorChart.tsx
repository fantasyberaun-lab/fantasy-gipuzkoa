"use client";

import type { PuntoValor } from "@/lib/supabase/jugadoresQueries";
import { useIdioma, useT } from "@/components/IdiomaProvider";

const ANCHO = 600;
const ALTO = 160;
const MARGEN = { arriba: 12, derecha: 8, abajo: 20, izquierda: 8 };

function formatoFecha(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

// Línea con la evolución del valor de mercado. Los puntos se reparten por
// fecha real; los que vienen de una partida se marcan con un círculo.
export default function HistorialValorChart({
  historial,
  titulo: tituloProp,
  textoVacio: textoVacioProp,
}: {
  historial: PuntoValor[];
  titulo?: string;
  textoVacio?: string;
}) {
  const tg = useT().graficas;
  const { locale } = useIdioma();
  const titulo = tituloProp ?? tg.evolucionValor;
  const textoVacio = textoVacioProp ?? tg.valorVacio;
  // Motivo de cada cambio de valor, para el tooltip de cada punto.
  const ETIQUETA: Record<PuntoValor["motivo"], string> = tg.motivo;

  if (historial.length < 2) {
    return (
      <div>
        <p className="mb-2 text-xs font-medium text-neutral-500">{titulo}</p>
        <p className="text-xs text-neutral-500">{textoVacio}</p>
      </div>
    );
  }

  const hayPartidas = historial.some((h) => h.motivo === "resultado");

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
        <p className="text-xs font-medium text-neutral-500">{titulo}</p>
        <p
          className={`text-xs font-semibold ${
            totalPct > 0 ? "text-accent" : totalPct < 0 ? "text-red-500" : "text-neutral-500"
          }`}
        >
          {tg.desdeInicio(`${totalPct > 0 ? "+" : ""}${totalPct.toFixed(1)}`)}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full"
        role="img"
        aria-label={tg.ariaValor(titulo, primero, ultimo)}
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
          const detalle =
            h.cambioPct !== null
              ? ` (${h.cambioPct > 0 ? "+" : ""}${h.cambioPct.toFixed(2)} %, ${ETIQUETA[h.motivo]})`
              : h.motivo === "inicial"
                ? ` (${ETIQUETA[h.motivo]})`
                : "";
          // Los días normales no llevan punto visible, pero sí una zona
          // invisible para poder ver el valor de cada día al pasar el ratón.
          if (h.motivo === "diaria" && i !== historial.length - 1) {
            return (
              <circle key={i} cx={x(h.fecha)} cy={y(h.valor)} r={6} fill="transparent">
                <title>{`${formatoFecha(h.fecha, locale)} · ${h.valor} M${detalle}`}</title>
              </circle>
            );
          }
          return (
            <circle
              key={i}
              cx={x(h.fecha)}
              cy={y(h.valor)}
              r={h.motivo === "resultado" ? 3.5 : 3}
              className={h.motivo === "resultado" ? "fill-amber-400" : "fill-accent"}
            >
              <title>{`${formatoFecha(h.fecha, locale)} · ${h.valor} M${detalle}`}</title>
            </circle>
          );
        })}
        <text x={MARGEN.izquierda} y={ALTO - 4} className="fill-neutral-400" fontSize={11}>
          {formatoFecha(historial[0].fecha, locale)}
        </text>
        <text
          x={ANCHO - MARGEN.derecha}
          y={ALTO - 4}
          textAnchor="end"
          className="fill-neutral-400"
          fontSize={11}
        >
          {formatoFecha(historial[historial.length - 1].fecha, locale)}
        </text>
      </svg>

      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-400">
        <span>
          {tg.minMaxValor(vMin, vMax)}
        </span>
        {hayPartidas && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            {tg.cambioPorPartida}
          </span>
        )}
      </p>
    </div>
  );
}
