"use client";

import { useState } from "react";
import PlayerCard from "@/components/PlayerCard";
import { useT } from "@/components/IdiomaProvider";
import { useGameState } from "@/components/GameStateProvider";
import { resumenPlantilla } from "@/lib/plantillaStats";
import { gameConfig } from "@/lib/gameConfig";
import { motivoBloqueoTitular, titularesPorTorneo } from "@/lib/titulares";
import type { OfertaRecibida } from "@/lib/types";

const MAX_POR_TORNEO = gameConfig.plantilla.maximoTitularesPorTorneo;
const MAX_TITULARES = gameConfig.plantilla.maximoTitulares;
const MAX_PLANTILLA = gameConfig.plantilla.tamanoPlantilla;

function ContadorSlots({
  label,
  actual,
  max,
  avisoTope,
  detalle,
}: {
  label: string;
  actual: number;
  max: number;
  avisoTope?: string;
  // Texto pequeño bajo el título (p. ej. el torneo al que se refiere).
  detalle?: string;
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

      {detalle && <p className="mt-0.5 truncate text-xs text-neutral-500">{detalle}</p>}

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

function Cifra({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{etiqueta}</p>
      <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{valor}</p>
      {detalle && <p className="text-[11px] text-neutral-400">{detalle}</p>}
    </div>
  );
}

function ResumenDePlantilla({
  squad,
  titulares,
}: {
  squad: Parameters<typeof resumenPlantilla>[0];
  titulares: Record<string, boolean>;
}) {
  const tp = useT().plantilla;
  const r = resumenPlantilla(squad, titulares);
  const sinTitulares = r.numTitulares === 0;

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Cifra
          etiqueta={tp.valorPlantilla}
          valor={`${r.valorPlantilla} M`}
          detalle={tp.jugadores(squad.length)}
        />
        <Cifra
          etiqueta={tp.valorTitulares}
          valor={sinTitulares ? "–" : `${r.valorTitulares} M`}
          detalle={sinTitulares ? tp.sinTitulares : tp.titulares(r.numTitulares)}
        />
        <Cifra
          etiqueta={tp.eloMedioPlantilla}
          valor={r.eloMedioPlantilla === null ? "–" : String(r.eloMedioPlantilla)}
        />
        <Cifra
          etiqueta={tp.eloMedioTitulares}
          valor={r.eloMedioTitulares === null ? "–" : String(r.eloMedioTitulares)}
        />
      </div>
      {r.sinElo > 0 && (
        <p className="mt-2 text-[11px] text-neutral-400">
          {tp.notaSinElo(r.sinElo)}
        </p>
      )}
    </div>
  );
}

function OfertasRecibidas({ ofertas }: { ofertas: OfertaRecibida[] }) {
  const { aceptarOferta, rechazarOferta } = useGameState();
  const tp = useT().plantilla;
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
          {tp.ofertasRecibidas}
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
            <p className="text-sm text-neutral-500">{tp.sinOfertas}</p>
          ) : (
            ofertas.map((oferta) => (
              <div
                key={oferta.id}
                className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-900/10 sm:flex-row sm:items-center sm:justify-between"
              >
                <p>
                  <span className="font-medium">{oferta.equipoOferenteNombre}</span>
                  {tp.ofertaTrasEquipo}
                  <span className="font-semibold">{oferta.importe} M</span>
                  {tp.ofertaTrasImporte}
                  <span className="font-medium">{oferta.jugadorNombre}</span>
                  {tp.ofertaFin}
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
                    {tp.rechazar}
                  </button>
                  <button
                    onClick={() => onAceptar(oferta.id)}
                    disabled={enviandoId === oferta.id}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                  >
                    {tp.aceptar}
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
    esLigaPublica,
    cargando,
    tieneEquipo,
  } = useGameState();
  const tp = useT().plantilla;

  const [avisoTitular, setAvisoTitular] = useState<string | null>(null);

  if (cargando) {
    return <p className="text-sm text-neutral-500">{tp.cargando}</p>;
  }

  if (!tieneEquipo) {
    return (
      <p className="text-sm text-neutral-500">
        {tp.sinEquipo}
      </p>
    );
  }

  const titularesSeleccionados = squad.filter(
    (slot) => titulares[slot.jugador.id]
  ).length;

  // Titulares que tienes en cada torneo (un jugador que juega varios torneos
  // cuenta en cada uno).
  const porTorneo = titularesPorTorneo(squad, titulares);
  const torneosDePlantilla = new Map<string, { id: string; nombre: string }>();
  for (const slot of squad) {
    for (const t of slot.torneos ?? []) torneosDePlantilla.set(t.id, t);
  }
  const resumenTorneos = [...torneosDePlantilla.values()]
    .map((t) => ({ ...t, titulares: porTorneo.get(t.id) ?? 0 }))
    .sort((a, b) => b.titulares - a.titulares || a.nombre.localeCompare(b.nombre));

  // Torneo en el que tienes más titulares: es el que se acerca al límite.
  const torneoMasLleno = resumenTorneos[0];
  const titularesEnTorneoMasLleno = torneoMasLleno?.titulares ?? 0;

  const onToggleTitular = async (id: string) => {
    setAvisoTitular(null);
    const resultado = await toggleTitular(id);
    if (!resultado.ok) setAvisoTitular(resultado.mensaje);
  };

  const totalPlantilla = squad.length;
  const hayBlindado = squad.some((slot) => slot.blindado);

  return (
    <div>
      {!esLigaPublica && <OfertasRecibidas ofertas={ofertasRecibidas} />}

      {squad.length > 0 && <ResumenDePlantilla squad={squad} titulares={titulares} />}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <ContadorSlots
          label={tp.titularesMismoTorneo}
          actual={titularesEnTorneoMasLleno}
          max={MAX_POR_TORNEO}
          detalle={
            torneoMasLleno && titularesEnTorneoMasLleno > 0
              ? torneoMasLleno.nombre
              : tp.sinTitularesTorneo
          }
          avisoTope={tp.topeTorneo}
        />
        <ContadorSlots
          label={tp.titularesSeleccionados}
          actual={titularesSeleccionados}
          max={MAX_TITULARES}
          avisoTope={tp.topeTitulares}
        />
        <ContadorSlots
          label={tp.jugadoresEnPlantilla}
          actual={totalPlantilla}
          max={MAX_PLANTILLA}
          avisoTope={tp.plantillaCompleta}
        />
      </div>

      {avisoTitular && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          {avisoTitular}
        </p>
      )}

      {squad.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {esLigaPublica
            ? tp.vacioPublica
            : tp.vacioPrivada}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {squad.map((slot) => {
            const esTitular = !!titulares[slot.jugador.id];
            const motivoBloqueo = motivoBloqueoTitular(squad, titulares, slot.jugador.id, tp) ?? undefined;
            const bloqueadoPorTope = motivoBloqueo !== undefined;

            return (
              <PlayerCard
                key={slot.jugador.id}
                {...slot}
                esTitular={esTitular}
                esCapitan={capitanId === slot.jugador.id}
                bloqueadoPorTope={bloqueadoPorTope}
                motivoBloqueo={motivoBloqueo}
                blindajeAgotado={hayBlindado && !slot.blindado}
                ligaPublica={esLigaPublica}
                onToggleTitular={() => onToggleTitular(slot.jugador.id)}
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