"use client";

import { useMemo, useState } from "react";
import { useGameState, calcularClausula } from "@/components/GameStateProvider";

// "total", o el id de una jornada concreta (la numeración de jornadas
// empieza en 1 en cada torneo, así que el número solo no la identifica).
type Orden = "total" | string;

interface JornadaOpcion {
  clave: string;
  etiqueta: string;
  creada: string;
}

export default function ClasificacionPage() {
  const { clasificacion, jugadoresLiga, equipo, hacerOferta, pagarClausula, cargando } =
    useGameState();

  const [orden, setOrden] = useState<Orden>("total");
  const [equipoAbierto, setEquipoAbierto] = useState<string | null>(null);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [montoOferta, setMontoOferta] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Jornadas que aparecen en el historial de algún equipo, por orden de
  // creación (sin repetir).
  const jornadasDisponibles = useMemo(() => {
    const porClave = new Map<string, JornadaOpcion>();
    for (const entry of clasificacion) {
      for (const h of entry.historialPuntos) {
        const clave = h.id ?? String(h.jornada);
        if (porClave.has(clave)) continue;
        porClave.set(clave, {
          clave,
          etiqueta: h.torneo ? `${h.torneo} · Jornada ${h.jornada}` : `Jornada ${h.jornada}`,
          creada: h.creada ?? "",
        });
      }
    }
    return [...porClave.values()].sort((a, b) => a.creada.localeCompare(b.creada));
  }, [clasificacion]);

  const etiquetaOrden =
    jornadasDisponibles.find((j) => j.clave === orden)?.etiqueta ?? "";

  const puntosParaOrden = (entry: (typeof clasificacion)[number]) => {
    if (orden === "total") return entry.puntos;
    return (
      entry.historialPuntos.find((h) => (h.id ?? String(h.jornada)) === orden)?.puntos ?? 0
    );
  };

  const clasificacionOrdenada = useMemo(() => {
    return [...clasificacion].sort((a, b) => puntosParaOrden(b) - puntosParaOrden(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orden, clasificacion]);

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando clasificación…</p>;
  }

  const cerrarPanel = () => {
    setEquipoAbierto(null);
    setSeleccionadoId(null);
    setMontoOferta("");
    setMensaje(null);
  };

  const toggleJugador = (id: string) => {
    setSeleccionadoId((prev) => (prev === id ? null : id));
    setMontoOferta("");
    setMensaje(null);
  };

  const plantillaAbierta = equipoAbierto
    ? jugadoresLiga.filter((j) => j.propietario === equipoAbierto)
    : [];

  const enviarOferta = async (jugadorId: string) => {
    const importe = Number(montoOferta);
    setEnviando(true);
    const resultado = await hacerOferta(jugadorId, importe);
    setEnviando(false);
    setMensaje(resultado.ok ? "Oferta enviada." : resultado.mensaje);
  };

  const ejecutarClausula = async (jugadorId: string) => {
    setEnviando(true);
    const resultado = await pagarClausula(jugadorId);
    setEnviando(false);
    setMensaje(resultado.ok ? "Cláusula pagada — el jugador ya es tuyo." : resultado.mensaje);
  };

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Clasificación general</h2>
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="total">Puntos totales</option>
          {jornadasDisponibles.map((j) => (
            <option key={j.clave} value={j.clave}>
              {j.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <ol className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {clasificacionOrdenada.length === 0 && (
          <li className="py-6 text-center text-sm text-neutral-500">
            Todavía no hay equipos en la clasificación.
          </li>
        )}
        {clasificacionOrdenada.map((entry, i) => (
          <li
            key={entry.nombreEquipo}
            className={`flex items-center justify-between py-3 ${
              entry.esMiEquipo ? "rounded-lg bg-accent/10 px-3" : "px-3"
            }`}
          >
            <span>
              {i + 1}. {entry.nombreEquipo}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-medium">
                {puntosParaOrden(entry)} pts{" "}
                <span className="text-neutral-500">
                  {orden === "total" ? "este año" : etiquetaOrden}
                </span>
              </span>
              {!entry.esMiEquipo && (
                <button
                  onClick={() => setEquipoAbierto(entry.nombreEquipo)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium dark:border-neutral-700"
                >
                  Plantilla
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      {equipoAbierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={cerrarPanel} />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900 sm:rounded-2xl sm:pb-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold">{equipoAbierto}</p>
              <button
                onClick={cerrarPanel}
                className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
              >
                Cerrar
              </button>
            </div>

            <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto">
              {plantillaAbierta.map((jugador) => {
                const estaSeleccionado = seleccionadoId === jugador.id;

                return (
                  <div
                    key={jugador.id}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-800"
                  >
                    <button
                      onClick={() => toggleJugador(jugador.id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left"
                    >
                      <div>
                        <p className="text-sm font-medium">{jugador.nombre}</p>
                        <p className="text-xs text-neutral-500">
                          {jugador.club} · {jugador.categoria}ª cat. · Elo {jugador.elo}
                        </p>
                      </div>
                      <span className="text-sm font-medium">{jugador.valorMercado} M</span>
                    </button>

                    {estaSeleccionado && (
                      <div className="flex flex-col gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
                        <div>
                          <label className="text-xs font-medium text-neutral-500">
                            Importe de la oferta (M)
                          </label>
                          <input
                            type="number"
                            value={montoOferta}
                            onChange={(e) => setMontoOferta(e.target.value)}
                            placeholder={`${jugador.valorMercado}`}
                            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            disabled={!montoOferta || enviando}
                            onClick={() => enviarOferta(jugador.id)}
                            className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
                          >
                            Hacer oferta
                          </button>
                          <button
                            disabled={enviando}
                            onClick={() => ejecutarClausula(jugador.id)}
                            className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                          >
                            Pagar cláusula ({calcularClausula(jugador.valorMercado)} M)
                          </button>
                        </div>

                        {mensaje && (
                          <p className="text-xs text-neutral-500">{mensaje}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-neutral-400">
              Tu saldo: {equipo.saldo} M
            </p>
          </div>
        </div>
      )}
    </div>
  );
}