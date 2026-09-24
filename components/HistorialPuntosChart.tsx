import type { PuntosJornada } from "@/lib/types";
import { gameConfig } from "@/lib/gameConfig";

interface Casilla {
  jornada: number;
  entrada?: PuntosJornada; // sin entrada = jornada todavía sin jugar
}

// Una fila por torneo, con TODAS sus rondas: las que tienen puntos, las que
// el jugador descansó (puntúan 1) y las que aún no se han jugado ("_").
// El número de jornada se repite entre torneos, por eso se agrupa por torneo.
function agruparPorTorneo(historial: PuntosJornada[], rondas: number) {
  const grupos = new Map<string, PuntosJornada[]>();
  for (const h of historial) {
    const clave = h.torneo ?? "";
    grupos.set(clave, [...(grupos.get(clave) ?? []), h]);
  }
  // Sin ningún dato: una sola fila con todas las rondas vacías.
  if (grupos.size === 0) grupos.set("", []);

  return [...grupos.entries()].map(([torneo, entradas]) => {
    const total = Math.max(rondas, ...entradas.map((e) => e.jornada));
    const usadas = new Set<PuntosJornada>();
    const casillas: Casilla[] = Array.from({ length: total }, (_, i) => {
      const entrada = entradas.find((e) => e.jornada === i + 1);
      if (entrada) usadas.add(entrada);
      return { jornada: i + 1, entrada };
    });
    // Jornadas antiguas sin torneo pueden repetir número: se añaden al final
    // en vez de esconderlas.
    for (const e of entradas) {
      if (!usadas.has(e)) casillas.push({ jornada: e.jornada, entrada: e });
    }
    return { torneo, casillas };
  });
}

export default function HistorialPuntosChart({
  historial,
  rondas = gameConfig.rondasPorTorneo,
}: {
  historial: PuntosJornada[];
  rondas?: number;
}) {
  const grupos = agruparPorTorneo(historial, rondas);
  const max = Math.max(...historial.map((h) => Math.abs(h.puntos)), 1);
  const hayDescansos = historial.some((h) => h.descanso);

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-neutral-500">
        Puntos por jornada
      </p>

      <div className="flex flex-col gap-4">
        {grupos.map(({ torneo, casillas }) => (
          <div key={torneo}>
            {grupos.length > 1 && (
              <p className="mb-1 truncate text-[11px] text-neutral-400">
                {torneo || "Sin torneo"}
              </p>
            )}
            <div className="flex items-end gap-2" style={{ height: 140 }}>
              {casillas.map(({ jornada, entrada }, i) => {
                const sinJugar = !entrada;
                const esNegativo = !!entrada && entrada.puntos < 0;
                const alturaPct = entrada
                  ? Math.max((Math.abs(entrada.puntos) / max) * 100, 10)
                  : 10;
                const color = sinJugar
                  ? "bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
                  : entrada.descanso
                    ? "bg-amber-400 text-white"
                    : esNegativo
                      ? "bg-red-400 text-white"
                      : "bg-accent text-white";
                const titulo = sinJugar
                  ? `Jornada ${jornada}: sin jugar`
                  : entrada.descanso
                    ? `Jornada ${jornada}: sin emparejar, ${entrada.puntos} pt`
                    : `Jornada ${jornada}: ${entrada.puntos} pts`;

                return (
                  <div
                    key={entrada?.id ?? `${jornada}-${i}`}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                    title={`${torneo ? `${torneo} · ` : ""}${titulo}`}
                  >
                    <div
                      className={`flex w-full items-start justify-center rounded-sm pt-0.5 ${color}`}
                      style={{ height: `${alturaPct}%` }}
                    >
                      <span className="text-xs font-semibold leading-none">
                        {sinJugar ? "_" : entrada.puntos}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-neutral-500">
                      J{jornada}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {hayDescansos && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-400">
          <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" />
          Sin emparejar: suma 1 punto
        </p>
      )}
    </div>
  );
}
