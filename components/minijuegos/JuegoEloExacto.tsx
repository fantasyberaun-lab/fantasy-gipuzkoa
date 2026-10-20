"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/IdiomaProvider";
import type { EstadoMinijuegos, ModoJuego, PreguntaElo } from "@/lib/supabase/minijuegosQueries";
import FinPartida from "./FinPartida";
import InicioJuego from "./InicioJuego";
import { usePartida } from "./usePartida";

// La barra va de 1395 a 2500 de 5 en 5. El valor mínimo (1395) significa "sin
// Elo" y se envía como 0; el resto se envía tal cual.
const MINIMO = 1395;
const MAXIMO = 2500;
const INICIAL = 1950;

const aElo = (v: number) => (v <= MINIMO ? 0 : v);

// Elo exacto: con el nombre de un jugador, acierta su Elo con la barra. Hay
// cronómetro; puntúa la cercanía y la rapidez. Si el tiempo se acaba se envía
// lo que haya en la barra.
export default function JuegoEloExacto({
  estado,
  recargar,
}: {
  estado: EstadoMinijuegos;
  recargar: () => void;
}) {
  const t = useT().minijuegos;
  const p = usePartida("elo", { pausaTrasRespuesta: false, onCambio: recargar });
  const [modo, setModo] = useState<ModoJuego>("estandar");
  const [valor, setValor] = useState(INICIAL);
  const [restante, setRestante] = useState(0);
  const valorRef = useRef(valor);
  valorRef.current = valor;
  const enviadaRef = useRef(false);
  const q = p.pregunta as PreguntaElo | null;

  const enviar = useCallback(() => {
    if (enviadaRef.current) return;
    enviadaRef.current = true;
    p.responder({ valor: aElo(valorRef.current) }).then((ok) => {
      if (!ok) enviadaRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.responder]);

  // Nueva pregunta: barra en el centro y cronómetro con el tiempo que dice el servidor.
  useEffect(() => {
    if (!q || p.fase !== "jugando") return;
    enviadaRef.current = false;
    setValor(INICIAL);
    const fin = p.recibidaEn + q.restante * 1000;
    const tick = () => {
      const left = Math.max(0, (fin - performance.now()) / 1000);
      setRestante(left);
      if (left <= 0) enviar();
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.indice, p.fase, p.recibidaEn]);

  if (p.fase === "inicio" || p.fase === "cargando") {
    return (
      <InicioJuego
        juego="elo"
        estado={estado}
        error={p.error}
        cargando={p.fase === "cargando"}
        onIniciar={(tipo, m, reintento) => {
          setModo(m);
          p.iniciar(tipo, m, reintento);
        }}
      />
    );
  }

  if (p.fase === "fin" || !q) {
    return (
      <div className="space-y-4">
        {p.ultima && <UltimoResultado r={p.ultima} />}
        <FinPartida
          puntos={p.puntos}
          final={p.final}
          repaso={p.historial}
          onOtra={() => p.iniciar("libre", p.ranked ? "estandar" : modo)}
          onVolver={p.volver}
        />
      </div>
    );
  }

  const etiqueta = valor <= MINIMO ? t.eloSinElo : String(valor);
  const proporcion = Math.min(1, restante / q.segundos);
  const poco = restante <= 5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>{t.ronda(q.indice, q.total)}</span>
        <span className="font-semibold text-accent">{t.puntos(p.puntos)}</span>
      </div>

      {p.ultima && <UltimoResultado r={p.ultima} />}

      <div className="rounded-xl border border-neutral-200 p-4 text-center dark:border-neutral-800">
        <p className="text-sm text-neutral-500">{t.eloPregunta}</p>
        <p className="mt-1 break-words font-display text-3xl font-semibold leading-tight">{q.nombre}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{t.tiempo(Math.ceil(restante))}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden="true">
          <div
            className={`h-full transition-[width] duration-100 ease-linear ${poco ? "bg-negative" : "bg-gold"}`}
            style={{ width: `${proporcion * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-center font-display text-5xl font-semibold text-accent" aria-live="off">
          {etiqueta}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            aria-label={t.eloMenos}
            onClick={() => setValor((v) => Math.max(MINIMO, v - 5))}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-xl font-semibold transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
          >
            −
          </button>
          <input
            type="range"
            min={MINIMO}
            max={MAXIMO}
            step={5}
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            aria-label={t.eloPregunta}
            aria-valuetext={etiqueta}
            className="h-8 w-full cursor-pointer accent-[rgb(var(--accent))]"
          />
          <button
            type="button"
            aria-label={t.eloMas}
            onClick={() => setValor((v) => Math.min(MAXIMO, v + 5))}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-xl font-semibold transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
          >
            +
          </button>
        </div>
        <div className="mt-1 flex justify-between text-xs text-neutral-500">
          <span>{t.eloSinElo}</span>
          <span>1400</span>
          <span>2500</span>
        </div>
      </div>

      {p.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {p.error}
        </p>
      )}

      <p className="text-center text-xs text-neutral-500">{t.eloAyudaBarra}</p>
      <button
        type="button"
        onClick={enviar}
        className="w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        {t.enviar}
      </button>
    </div>
  );
}

// Resultado de la ronda anterior, sin parar el reloj de la siguiente.
function UltimoResultado({ r }: { r: NonNullable<ReturnType<typeof usePartida>["ultima"]> }) {
  const t = useT().minijuegos;
  const real = r.revelado.elo === 0 ? t.eloSinElo : String(r.revelado.elo ?? "");
  const tu =
    r.revelado.respuesta == null ? t.eloSinRespuesta : r.revelado.respuesta === 0 ? t.eloSinElo : String(r.revelado.respuesta);
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-center text-sm ${
        r.correcta
          ? "bg-green-50 text-positive dark:bg-green-950/30"
          : "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      }`}
    >
      {t.eloUltimo(r.revelado.nombre ?? "", real, tu, r.puntosRonda)}
    </p>
  );
}
