"use client";

import { useState } from "react";
import PlayerCard from "@/components/PlayerCard";
import { useGameState } from "@/components/GameStateProvider";
import { resumenPlantilla } from "@/lib/plantillaStats";
import { gameConfig } from "@/lib/gameConfig";
import type { OfertaRecibida, PlantillaSlot } from "@/lib/types";

const MAX_TERCERA = 2;
const MAX_POR_TORNEO = gameConfig.plantilla.maximoTitularesPorTorneo;
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

// Titulares de tu equipo en cada torneo (máximo MAX_POR_TORNEO por torneo).
function TitularesPorTorneo({
  porTorneo,
}: {
  porTorneo: { id: string; nombre: string; titulares: number }[];
}) {
  if (porTorneo.length === 0) return null;
  return (
    <div className="mb-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        Titulares por torneo (máximo {MAX_POR_TORNEO} en cada uno)
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {porTorneo.map((t) => {
          const alTope = t.titulares >= MAX_POR_TORNEO;
          return (
            <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{t.nombre}</span>
              <span
                className={`font-semibold ${
                  alTope ? "text-amber-600 dark:text-amber-400" : "text-neutral-900 dark:text-neutral-100"
                }`}
              >
                {t.titulares} / {MAX_POR_TORNEO}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Torneos (con su nombre) que bloquean poner de titular a un jugador: aquellos
// donde ya tienes MAX_POR_TORNEO titulares. Misma regla que
// validar_titulares_por_torneo() en 0048_limite_titulares_por_torneo.sql.
function torneosLlenos(
  slot: PlantillaSlot,
  titularesPorTorneo: Map<string, number>
): string[] {
  return (slot.torneos ?? [])
    .filter((t) => (titularesPorTorneo.get(t.id) ?? 0) >= MAX_POR_TORNEO)
    .map((t) => t.nombre);
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
  const r = resumenPlantilla(squad, titulares);
  const sinTitulares = r.numTitulares === 0;

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Cifra
          etiqueta="Valor de la plantilla"
          valor={`${r.valorPlantilla} M`}
          detalle={`${squad.length} jugador${squad.length === 1 ? "" : "es"}`}
        />
        <Cifra
          etiqueta="Valor de titulares"
          valor={sinTitulares ? "–" : `${r.valorTitulares} M`}
          detalle={sinTitulares ? "Sin titulares" : `${r.numTitulares} titular${r.numTitulares === 1 ? "" : "es"}`}
        />
        <Cifra
          etiqueta="Elo medio plantilla"
          valor={r.eloMedioPlantilla === null ? "–" : String(r.eloMedioPlantilla)}
        />
        <Cifra
          etiqueta="Elo medio titulares"
          valor={r.eloMedioTitulares === null ? "–" : String(r.eloMedioTitulares)}
        />
      </div>
      {r.sinElo > 0 && (
        <p className="mt-2 text-[11px] text-neutral-400">
          Las medias de Elo no cuentan a {r.sinElo} jugador{r.sinElo === 1 ? "" : "es"} sin Elo.
        </p>
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
    esLigaPublica,
    cargando,
    tieneEquipo,
  } = useGameState();

  const [avisoTitular, setAvisoTitular] = useState<string | null>(null);

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

  // Titulares que tienes en cada torneo (un jugador que juega varios torneos
  // cuenta en cada uno).
  const titularesPorTorneo = new Map<string, number>();
  const torneosDePlantilla = new Map<string, { id: string; nombre: string }>();
  for (const slot of squad) {
    for (const t of slot.torneos ?? []) {
      torneosDePlantilla.set(t.id, t);
      if (titulares[slot.jugador.id]) {
        titularesPorTorneo.set(t.id, (titularesPorTorneo.get(t.id) ?? 0) + 1);
      }
    }
  }
  const resumenTorneos = [...torneosDePlantilla.values()]
    .map((t) => ({ ...t, titulares: titularesPorTorneo.get(t.id) ?? 0 }))
    .sort((a, b) => b.titulares - a.titulares || a.nombre.localeCompare(b.nombre));

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

      <TitularesPorTorneo porTorneo={resumenTorneos} />

      {avisoTitular && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          {avisoTitular}
        </p>
      )}

      {squad.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {esLigaPublica
            ? "Todavía no tienes jugadores. Ve a la pestaña Mercado y ficha a los que quieras: todos están disponibles y el fichaje es inmediato."
            : "Todavía no tienes jugadores en tu plantilla. Ve a la pestaña Jugadores para pagar una cláusula, o espera a que haya jugadores libres en el Mercado."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {squad.map((slot) => {
            const esTitular = !!titulares[slot.jugador.id];
            const topeTercera =
              !esTitular &&
              slot.jugador.categoria === 3 &&
              jugadoresTerceraTitulares >= MAX_TERCERA;
            const llenos = esTitular ? [] : torneosLlenos(slot, titularesPorTorneo);
            const bloqueadoPorTope = topeTercera || llenos.length > 0;
            const motivoBloqueo = topeTercera
              ? `Ya tienes ${MAX_TERCERA} titulares de Tercera — pasa a suplente a otro primero.`
              : llenos.length > 0
                ? `Ya tienes ${MAX_POR_TORNEO} titulares en ${llenos.join(", ")} — pasa a suplente a otro primero.`
                : undefined;

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