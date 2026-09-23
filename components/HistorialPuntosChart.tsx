import type { PuntosJornada } from "@/lib/types";

export default function HistorialPuntosChart({
  historial,
}: {
  historial: PuntosJornada[];
}) {
  if (historial.length === 0) {
    return (
      <p className="text-xs text-neutral-500">
        Todavía no hay puntos registrados esta temporada.
      </p>
    );
  }

  const max = Math.max(...historial.map((h) => Math.abs(h.puntos)), 1);

  // El número de jornada se repite entre torneos: si el historial mezcla
  // varios, cada barra enseña también el nombre de su torneo.
  const variosTorneos = new Set(historial.map((h) => h.torneo ?? "")).size > 1;

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-neutral-500">
        Puntos por jornada
      </p>
      <div className="flex items-end gap-2" style={{ height: 140 }}>
        {historial.map((h, i) => {
          const alturaPct = Math.max((Math.abs(h.puntos) / max) * 100, 10);
          const esNegativo = h.puntos < 0;

          return (
            <div
              key={h.id ?? `${h.jornada}-${i}`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              title={`${h.torneo ? `${h.torneo} · ` : ""}Jornada ${h.jornada}: ${h.puntos} pts`}
            >
              <div
                className={`flex w-full items-start justify-center rounded-sm pt-1 ${
                  esNegativo ? "bg-red-400" : "bg-accent"
                }`}
                style={{ height: `${alturaPct}%` }}
              >
                <span className="text-xs font-semibold text-white">
                  {h.puntos}
                </span>
              </div>
              <span className="text-xs font-medium text-neutral-500">
                J{h.jornada}
              </span>
              {variosTorneos && (
                <span className="w-full truncate text-center text-[10px] text-neutral-400">
                  {h.torneo ?? "—"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}