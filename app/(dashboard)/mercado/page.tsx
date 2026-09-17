"use client";

import { useState } from "react";
import { mockMercado } from "@/lib/mockData";
import HistorialPuntosChart from "@/components/HistorialPuntosChart";

export default function MercadoPage() {
  // TODO: sustituir mockMercado por la consulta real (tabla market_listings
  // + bids + historial de puntos por ronda), y conectar el botón "Fichar"
  // con la mutación correspondiente.

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  const toggleSeleccion = (id: string) => {
    setSeleccionadoId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mercado</h2>
        <span className="text-sm text-neutral-500">
          nueva tanda en 4h 20m {/* TODO: countdown real a partir de matchdays.mercado_cierra */}
        </span>
      </div>

      {mockMercado.map(({ jugador, rival, numeroPujas, historialPuntos }) => {
        const estaSeleccionado = seleccionadoId === jugador.id;

        return (
          <div
            key={jugador.id}
            className="rounded-2xl border border-neutral-200 dark:border-neutral-800"
          >
            <button
              onClick={() => toggleSeleccion(jugador.id)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div>
                <p className="font-medium">{jugador.nombre}</p>
                <p className="text-sm text-neutral-500">
                  {jugador.categoria}ª cat. · Elo {jugador.elo}
                  {rival ? ` · Rival: ${rival.nombre} (${rival.elo})` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm">
                  <p className="font-semibold">{jugador.valorMercado} M</p>
                  <p className="text-neutral-500">{numeroPujas} pujas</p>
                </div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
                >
                  Fichar
                </span>
              </div>
            </button>

            {estaSeleccionado && (
              <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
                <HistorialPuntosChart historial={historialPuntos} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}