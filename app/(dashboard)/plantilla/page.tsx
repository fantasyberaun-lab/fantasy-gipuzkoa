"use client";

import { useState } from "react";
import PlayerCard from "@/components/PlayerCard";
import { useGameState } from "@/components/GameStateProvider";
import type { OfertaRecibida } from "@/lib/types";

const MAX_TERCERA = 2;
const MAX_TITULARES = 6;
const MAX_PLANTILLA = 10;

function ContadorSlots({
  label,
  actual,
  max,
  avisoTope,
}: {
  label: string;
  actual: number;
  max: number;
  avisoTope?: string;
}) {
  const alTope = actual >= max;
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {label}
        </span>
        <span
          className={`text-sm font-semibold ${
            alTope ? "text-amber-600 dark:text-amber-400" : "text-neutral-900 dark:text-neutral-100"
          }`}
        >
          {actual} / {max}
        </span>
      </div>

      <div className="mt-2 flex gap-1.5">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full ${
              i < actual
                ? alTope
                  ? "bg-amber-500"
                  : "bg-green-500"
                : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          />
        ))}
      </div>

      {alTope && avisoTope && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{avisoTope}</p>
      )}
    </div>
  );
}

function OfertasRecibidas({ ofertas }: { ofertas: OfertaRecibida[] }) {
  const { aceptarOferta, rechazarOferta } = useGameState();
  const [abierto, setAbierto] = useState(false);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [errorPorOferta, setErrorPorOferta] = useState<Record<string, string>>({});

  const onAceptar = async (id: string) => {
    setEnviandoId(id);
    setErrorPorOferta((prev) => ({ ...prev, [id]: "" }));
    const resultado = await aceptarOferta(id);
    setEnviandoId(null);
    if (!resultado.ok) {
      setErrorPorOferta((prev) => ({ ...prev, [id]: resultado.mensaje }));
    }
  };

  const onRechazar = async (id: string) => {
    setEnviandoId(id);
    setErrorPorOferta((prev) => ({ ...prev, [id]: "" }));
    const resultado = await rechazarOferta(id);
    setEnviandoId(null);
    if (!resultado.ok) {
      setErrorPorOferta((prev) => ({ ...prev, [id]: resultado.mensaje }));
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          Ofertas recibidas
          {ofertas.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {ofertas.length}
            </span>
          )}
        </span>
        <span className="text-neutral-400">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div className="flex flex-col gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
          {ofertas.length === 0 ? (
            <p className="text-sm text-neutral-500">No hay ofertas recibidas.</p>
          ) : (
            ofertas.map((oferta) => (
              <div
                key={oferta.id}
                className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-900/10 sm:flex-row sm:items-center sm:justify-between"
              >
                <p>
                  <span className="font-medium">{oferta.equipoOferenteNombre}</span> te ofrece{" "}
                  <span className="font-semibold">{oferta.importe} M</span> por{" "}
                  <span className="font-medium">{oferta.jugadorNombre}</span>.
                </p>
                <div className="flex items-center gap-2">
                  {errorPorOferta[oferta.id] && (
                    <p className="text-xs text-negative">{errorPorOferta[oferta.id]}</p>
                  )}
                  <button
                    onClick={() => onRechazar(oferta.id)}
                    disabled={enviandoId === oferta.id}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-neutral-700"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => onAceptar(oferta.id)}
                    disabled={enviandoId === oferta.id}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function PlantillaPage() {
  const {
    squad,
    titulares,
    capitanId,
    toggleTitular,
    toggleCapitan,
    blindarJugador,
    venderJugador,
    subirClausula,
    ofertasRecibidas,
    cargando,
    tieneEquipo,
  } = useGameState();

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando tu plantilla…</p>;
  }

  if (!tieneEquipo) {
    return (
      <p className="text-sm text-neutral-500">
        No se ha encontrado un equipo Fantasy asociado a tu cuenta. Si acabas
        de registrarte, prueba a recargar la página en unos segundos.
      </p>
    );
  }

  const jugadoresTerceraTitulares = squad.filter(
    (slot) => slot.jugador.categoria === 3 && titulares[slot.jugador.id]
  ).length;

  const titularesSeleccionados = squad.filter(
    (slot) => titulares[slot.jugador.id]
  ).length;

  const totalPlantilla = squad.length;
  const hayBlindado = squad.some((slot) => slot.blindado);

  return (
    <div>
      <OfertasRecibidas ofertas={ofertasRecibidas} />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <ContadorSlots
          label="Titulares de Tercera"
          actual={jugadoresTerceraTitulares}
          max={MAX_TERCERA}
          avisoTope="Límite alcanzado — no puedes poner más jugadores de Tercera como titulares."
        />
        <ContadorSlots
          label="Titulares seleccionados"
          actual={titularesSeleccionados}
          max={MAX_TITULARES}
          avisoTope="Once completo."
        />
        <ContadorSlots
          label="Jugadores en plantilla"
          actual={totalPlantilla}
          max={MAX_PLANTILLA}
          avisoTope="Plantilla completa."
        />
      </div>

      {squad.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no tienes jugadores en tu plantilla. Ve a la pestaña
          Jugadores para pagar una cláusula, o espera a que haya jugadores
          libres en el Mercado.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {squad.map((slot) => {
            const esTitular = !!titulares[slot.jugador.id];
            const bloqueadoPorTope =
              !esTitular &&
              slot.jugador.categoria === 3 &&
              jugadoresTerceraTitulares >= MAX_TERCERA;

            return (
              <PlayerCard
                key={slot.jugador.id}
                {...slot}
                esTitular={esTitular}
                esCapitan={capitanId === slot.jugador.id}
                bloqueadoPorTope={bloqueadoPorTope}
                blindajeAgotado={hayBlindado && !slot.blindado}
                onToggleTitular={() => toggleTitular(slot.jugador.id)}
                onToggleCapitan={() => toggleCapitan(slot.jugador.id)}
                onBlindar={() => blindarJugador(slot.jugador.id)}
                onVender={() => venderJugador(slot.jugador.id, slot.jugador.valorMercado)}
                onSubirClausula={(importe) => subirClausula(slot.jugador.id, importe)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}