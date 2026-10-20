"use client";

import { useState } from "react";
import { useT } from "@/components/IdiomaProvider";
import type { EstadoMinijuegos, ModoJuego, PreguntaHol } from "@/lib/supabase/minijuegosQueries";
import FinPartida from "./FinPartida";
import InicioJuego from "./InicioJuego";
import { usePartida } from "./usePartida";

// Higher or lower: se ve el Elo del jugador actual y solo el nombre del
// siguiente. ¿Tiene más o menos Elo? Se juega hasta fallar (o hasta acertar todos).
export default function JuegoHigherLower({
  estado,
  recargar,
}: {
  estado: EstadoMinijuegos;
  recargar: () => void;
}) {
  const t = useT().minijuegos;
  const p = usePartida("hol", { pausaTrasRespuesta: true, onCambio: recargar });
  const [modo, setModo] = useState<ModoJuego>("estandar");
  const [elegida, setElegida] = useState<"mas" | "menos" | null>(null);

  if (p.fase === "inicio" || p.fase === "cargando") {
    return (
      <InicioJuego
        juego="hol"
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

  if (p.fase === "fin") {
    return (
      <FinPartida
        puntos={p.puntos}
        final={p.final}
        perfecta={!!p.ultima && p.ultima.correcta && p.ultima.terminada}
        repaso={p.historial}
        onOtra={() => p.iniciar("libre", p.ranked ? "estandar" : modo)}
        onVolver={p.volver}
      />
    );
  }

  const q = p.pregunta as PreguntaHol;
  const r = p.ultima;
  const revelado = p.fase === "revelado" && r;
  const acierto = revelado ? r.correcta : null;

  // Se toca la ficha del jugador que se cree con más Elo: la del actual significa
  // que el siguiente tiene menos; la del siguiente, que tiene más.
  function elegir(dir: "mas" | "menos") {
    setElegida(dir);
    p.responder({ dir }).then((ok) => {
      if (!ok) setElegida(null);
    });
  }
  const borde = (esSiguiente: boolean) => {
    if (!revelado) return "border-neutral-300 hover:border-accent hover:bg-accent/5 dark:border-neutral-700";
    const mia = elegida === (esSiguiente ? "mas" : "menos");
    if (mia) return acierto ? "border-positive bg-green-50 dark:bg-green-950/30" : "border-negative bg-red-50 dark:bg-red-950/30";
    return "border-neutral-200 dark:border-neutral-800";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>{t.holAciertos(revelado && r.correcta ? r.aciertos : q.aciertos, q.total)}</span>
        <span className="font-semibold text-accent">{t.puntos(p.puntos)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden="true">
        <div className="h-full bg-gold transition-all" style={{ width: `${(q.aciertos / q.total) * 100}%` }} />
      </div>

      <p className="text-center text-base font-semibold">{t.holToca}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!!revelado || p.fase !== "jugando"}
          onClick={() => elegir("menos")}
          className={`flex min-h-[9.5rem] flex-col items-center justify-center rounded-2xl border-2 p-5 text-center transition-colors disabled:cursor-default ${borde(false)}`}
        >
          <span className="break-words font-display text-2xl font-semibold leading-tight">{q.actual.nombre}</span>
          <span className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t.holActual}</span>
          <span className="font-display text-5xl font-semibold text-accent">{q.actual.elo}</span>
        </button>
        <button
          type="button"
          disabled={!!revelado || p.fase !== "jugando"}
          onClick={() => elegir("mas")}
          className={`flex min-h-[9.5rem] flex-col items-center justify-center rounded-2xl border-2 p-5 text-center transition-colors disabled:cursor-default ${borde(true)}`}
        >
          <span className="break-words font-display text-2xl font-semibold leading-tight">{q.siguiente.nombre}</span>
          <span className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t.holActual}</span>
          <span className="font-display text-5xl font-semibold">
            {revelado ? <span className={acierto ? "text-positive" : "text-negative"}>{r.revelado.elo}</span> : "?"}
          </span>
        </button>
      </div>

      {p.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {p.error}
        </p>
      )}

      {revelado && (
        <div className="space-y-3 text-center">
          <p className={`font-display text-xl font-semibold ${acierto ? "text-positive" : "text-negative"}`}>
            {acierto ? t.holAcierto : t.holFallo}
          </p>
          <button
            type="button"
            onClick={() => {
              setElegida(null);
              p.continuar();
            }}
            className="w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {r.terminada ? t.verResultado : t.siguiente}
          </button>
        </div>
      )}
    </div>
  );
}
