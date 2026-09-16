"use client";

import { useState } from "react";
import { useGameState, calcularClausula } from "@/components/GameStateProvider";

export default function JugadoresPage() {
  // TODO: sustituir jugadoresLiga (dentro de GameStateProvider) por la
  // consulta real a Supabase (todos los players + su squad_slot actual,
  // si lo tienen, + suma de puntos de la temporada). "Hacer oferta" y
  // "Pagar cláusula" deberían pasar a ser llamadas a Supabase que crean
  // una fila en market_offers o ejecutan la transacción de clausulazo
  // (tabla clause_releases), en vez de solo tocar el estado compartido
  // en memoria como ahora.

  const { jugadoresLiga, ofertas, pagarClausula, hacerOferta } = useGameState();

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [montoOferta, setMontoOferta] = useState("");
  const [mensajePorJugador, setMensajePorJugador] = useState<
    Record<string, { tipo: "ok" | "error"; texto: string }>
  >({});

  const jugadoresOrdenados = [...jugadoresLiga].sort(
    (a, b) => b.puntosTotales - a.puntosTotales
  );

  const toggleSeleccion = (id: string) => {
    setSeleccionadoId((prev) => (prev === id ? null : id));
    setMontoOferta("");
  };

  const mostrarMensaje = (
    jugadorId: string,
    tipo: "ok" | "error",
    texto: string
  ) => {
    setMensajePorJugador((prev) => ({ ...prev, [jugadorId]: { tipo, texto } }));
  };

  const onPagarClausula = (jugadorId: string) => {
    const resultado = pagarClausula(jugadorId);
    if (resultado.ok) {
      mostrarMensaje(jugadorId, "ok", "Cláusula pagada. El jugador ya está en tu plantilla.");
      setSeleccionadoId(null);
    } else {
      mostrarMensaje(jugadorId, "error", resultado.mensaje);
    }
  };

  const onHacerOferta = (jugadorId: string) => {
    const importe = Number(montoOferta);
    const resultado = hacerOferta(jugadorId, importe);
    if (resultado.ok) {
      mostrarMensaje(jugadorId, "ok", `Oferta de ${importe} M enviada al manager.`);
      setMontoOferta("");
    } else {
      mostrarMensaje(jugadorId, "error", resultado.mensaje);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {jugadoresOrdenados.map((jugador) => {
        const estaSeleccionado = seleccionadoId === jugador.id;
        const esFichable = jugador.propietario !== null && !jugador.esMiEquipo;
        const ofertaActual = ofertas.find((o) => o.jugadorId === jugador.id);
        const mensaje = mensajePorJugador[jugador.id];

        return (
          <div
            key={jugador.id}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800"
          >
            <button
              onClick={() => toggleSeleccion(jugador.id)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold dark:bg-neutral-800">
                {jugador.nombre
                  .split(" ")
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{jugador.nombre}</p>
                <p className="text-xs text-neutral-500">
                  {jugador.club} · {jugador.categoria}ª cat. · Elo {jugador.elo}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {jugador.esMiEquipo
                    ? "En tu plantilla"
                    : jugador.propietario
                      ? `Fichado por ${jugador.propietario}`
                      : "Libre"}
                  {ofertaActual && !jugador.esMiEquipo
                    ? ` · Oferta enviada: ${ofertaActual.importe} M`
                    : ""}
                </p>
              </div>
              <span className="text-sm font-semibold">{jugador.puntosTotales} pts</span>
            </button>

            {estaSeleccionado && (
              <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
                {jugador.esMiEquipo && (
                  <p className="text-sm text-neutral-500">
                    Ya lo tienes en tu plantilla.
                  </p>
                )}

                {!jugador.esMiEquipo && jugador.propietario === null && (
                  <p className="text-sm text-neutral-500">
                    Está libre — Espera a que salga en la pestaña de mercado.
                  </p>
                )}

                {esFichable && (
                  <div className="flex flex-col gap-3">
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
                        onClick={() => onHacerOferta(jugador.id)}
                        disabled={!montoOferta}
                        className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium disabled:opacity-40 dark:border-neutral-700"
                      >
                        Hacer oferta
                      </button>
                      <button
                        onClick={() => onPagarClausula(jugador.id)}
                        className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
                      >
                        Pagar cláusula ({calcularClausula(jugador.valorMercado)} M)
                      </button>
                    </div>

                    {mensaje && (
                      <p
                        className={`text-xs ${
                          mensaje.tipo === "ok"
                            ? "text-positive"
                            : "text-negative"
                        }`}
                      >
                        {mensaje.texto}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
