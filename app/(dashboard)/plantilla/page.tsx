"use client";

import { useState } from "react";
import PlayerCard from "@/components/PlayerCard";
import { useT } from "@/components/IdiomaProvider";
import { useGameState } from "@/components/GameStateProvider";
import { resumenPlantilla } from "@/lib/plantillaStats";
import { gameConfig } from "@/lib/gameConfig";
import { motivoBloqueoTitular, titularesPorTorneo } from "@/lib/titulares";
import type { OfertaRecibida } from "@/lib/types";


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
  torneoMasLleno,
  titularesEnTorneoMasLleno,
}: {
  squad: Parameters<typeof resumenPlantilla>[0];
  titulares: Record<string, boolean>;
  torneoMasLleno?: { nombre: string };
  titularesEnTorneoMasLleno: number;
}) {
  const tp = useT().plantilla;
  const { reglas } = useGameState();
  const MAX_PLANTILLA = reglas.maxPlantilla;
  const MAX_POR_TORNEO = reglas.maxTitularesPorTorneo;
  const MAX_TITULARES = reglas.maxTitulares;
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const r = resumenPlantilla(squad, titulares);
  const sinTitulares = r.numTitulares === 0;
  const topeTorneo = titularesEnTorneoMasLleno >= MAX_POR_TORNEO;

  const compacta = (etiqueta: string, valor: string, alTope = false) => (
    <div className="flex-1 text-center">
      <p
        className={`text-base font-semibold ${
          alTope ? "text-amber-600 dark:text-amber-400" : "text-neutral-900 dark:text-neutral-100"
        }`}
      >
        {valor}
      </p>
      <p className="text-[11px] text-neutral-500">{etiqueta}</p>
    </div>
  );

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex divide-x divide-neutral-200 px-1 py-2 dark:divide-neutral-800">
        {compacta(tp.resumenTitulares, `${r.numTitulares}/${MAX_TITULARES}`, r.numTitulares >= MAX_TITULARES)}
        {compacta(tp.resumenPlantilla, `${squad.length}/${MAX_PLANTILLA}`, squad.length >= MAX_PLANTILLA)}
        {compacta(tp.resumenValor, `${r.valorPlantilla} M`)}
      </div>

      {topeTorneo && torneoMasLleno && (
        <p className="border-t border-neutral-200 px-3 py-2 text-xs text-amber-600 dark:border-neutral-800 dark:text-amber-400">
          {torneoMasLleno.nombre}: {titularesEnTorneoMasLleno}/{MAX_POR_TORNEO}. {tp.topeTorneo}
        </p>
      )}

      <button
        onClick={() => setDetalleAbierto((v) => !v)}
        className="flex w-full items-center justify-center gap-1 border-t border-neutral-200 py-1.5 text-xs font-medium text-neutral-500 dark:border-neutral-800"
      >
        {detalleAbierto ? tp.menosDetalle : tp.masDetalle}
        <svg
          className={`h-3 w-3 transition-transform ${detalleAbierto ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {detalleAbierto && (
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
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
          <p className="mt-2 text-xs text-neutral-500">
            {tp.titularesMismoTorneo}:{" "}
            <span className="font-medium">
              {titularesEnTorneoMasLleno > 0 && torneoMasLleno
                ? `${torneoMasLleno.nombre} (${titularesEnTorneoMasLleno}/${MAX_POR_TORNEO})`
                : tp.sinTitularesTorneo}
            </span>
          </p>
          {r.sinElo > 0 && (
            <p className="mt-1 text-[11px] text-neutral-400">{tp.notaSinElo(r.sinElo)}</p>
          )}
        </div>
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
    reglas,
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

  const hayBlindado = squad.some((slot) => slot.blindado);

  const renderJugador = (slot: (typeof squad)[number]) => {
    const esTitular = !!titulares[slot.jugador.id];
    const motivoBloqueo = motivoBloqueoTitular(squad, titulares, slot.jugador.id, tp, reglas) ?? undefined;

    return (
      <PlayerCard
        key={slot.jugador.id}
        {...slot}
        esTitular={esTitular}
        esCapitan={capitanId === slot.jugador.id}
        bloqueadoPorTope={motivoBloqueo !== undefined}
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
  };

  const slotsTitulares = squad.filter((slot) => titulares[slot.jugador.id]);
  const slotsSuplentes = squad.filter((slot) => !titulares[slot.jugador.id]);

  const seccion = (titulo: string, max: number | null, slots: typeof squad, vacio?: string) => (
    <section className="mb-5">
      <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        {titulo}
        <span className="text-xs font-normal text-neutral-500">
          {slots.length}
          {max !== null ? ` / ${max}` : ""}
        </span>
      </h2>
      {slots.length === 0 ? (
        vacio && <p className="text-sm text-neutral-500">{vacio}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">{slots.map(renderJugador)}</div>
      )}
    </section>
  );

  return (
    <div>
      {!esLigaPublica && <OfertasRecibidas ofertas={ofertasRecibidas} />}

      {squad.length > 0 && (
        <ResumenDePlantilla
          squad={squad}
          titulares={titulares}
          torneoMasLleno={torneoMasLleno}
          titularesEnTorneoMasLleno={titularesEnTorneoMasLleno}
        />
      )}

      {slotsTitulares.length > 0 && capitanId === null && (
        <p className="mb-4 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          {tp.sinCapitan}
        </p>
      )}

      {avisoTitular && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          {avisoTitular}
        </p>
      )}

      {squad.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {esLigaPublica ? tp.vacioPublica : tp.vacioPrivada}
        </p>
      ) : (
        <>
          {seccion(tp.seccionTitulares, reglas.maxTitulares, slotsTitulares, tp.sinTitulares)}
          {seccion(tp.seccionSuplentes, null, slotsSuplentes, tp.sinSuplentes)}
        </>
      )}
    </div>
  );
}
