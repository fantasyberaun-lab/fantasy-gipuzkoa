"use client";

import PlayerCard from "@/components/PlayerCard";
import { useGameState } from "@/components/GameStateProvider";

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

export default function PlantillaPage() {
  const { squad, titulares, toggleTitular, venderJugador, cargando, tieneEquipo } =
    useGameState();

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

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <ContadorSlots
          label="Titulares de Tercera"
          actual={jugadoresTerceraTitulares}
          max={MAX_TERCERA}
          avisoTope="Límite alcanzado — no puedes poner más de Tercera como titular."
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
          {squad.map((slot) => (
            <PlayerCard
              key={slot.jugador.id}
              {...slot}
              esTitular={!!titulares[slot.jugador.id]}
              onToggleTitular={() => toggleTitular(slot.jugador.id)}
              onVender={() => venderJugador(slot.jugador.id, slot.jugador.valorMercado)}
            />
          ))}
        </div>
      )}
    </div>
  );
}