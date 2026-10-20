"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/IdiomaProvider";
import type { EstadoMinijuegos, ModoJuego, PreguntaImpostor } from "@/lib/supabase/minijuegosQueries";
import FichaJugador from "./FichaJugador";
import FinPartida from "./FinPartida";
import InicioJuego from "./InicioJuego";
import { usePartida } from "./usePartida";

// Adivina el impostor: cuatro jugadores, tres comparten club, categoría o un Elo
// parecido y uno no. No hay cronómetro; se puntúa el acierto y la rapidez.
export default function JuegoImpostor({
  estado,
  recargar,
}: {
  estado: EstadoMinijuegos;
  recargar: () => void;
}) {
  const t = useT().minijuegos;
  const p = usePartida("impostor", { pausaTrasRespuesta: false, onCambio: recargar });
  const [modo, setModo] = useState<ModoJuego>("estandar");
  const [elegida, setElegida] = useState<number | null>(null);
  const q = p.pregunta as PreguntaImpostor | null;

  useEffect(() => {
    setElegida(null);
  }, [q?.indice]);

  if (p.fase === "inicio" || p.fase === "cargando") {
    return (
      <InicioJuego
        juego="impostor"
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
        {p.ultima && <UltimoImpostor r={p.ultima} />}
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>{t.ronda(q.indice, q.total)}</span>
        <span className="font-semibold text-accent">{t.puntos(p.puntos)}</span>
      </div>

      {p.ultima && <UltimoImpostor r={p.ultima} />}

      <p className="text-center text-sm text-neutral-500">{t.impostorPregunta}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {q.jugadores.map((j, i) => (
          <li key={`${q.indice}-${j.nombre}`}>
            <FichaJugador j={j} seleccionada={elegida === i} onClick={() => setElegida(i)} />
          </li>
        ))}
      </ul>

      {p.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {p.error}
        </p>
      )}

      <p className="text-center text-xs text-neutral-500">{t.sinCronometro}</p>
      <button
        type="button"
        disabled={elegida == null}
        onClick={() => p.responder({ opcion: elegida })}
        className="w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {t.impostorSenalar}
      </button>
    </div>
  );
}

function UltimoImpostor({ r }: { r: NonNullable<ReturnType<typeof usePartida>["ultima"]> }) {
  const t = useT().minijuegos;
  const v = r.revelado;
  const regla =
    v.regla === "club"
      ? t.impostorReglaClub(v.clave ?? "")
      : v.regla === "categoria"
        ? t.impostorReglaCategoria(v.clave ?? "")
        : t.impostorReglaElo;
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-center text-sm ${
        r.correcta
          ? "bg-green-50 text-positive dark:bg-green-950/30"
          : "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      }`}
    >
      {t.impostorUltimo(v.nombre ?? "", regla, r.puntosRonda)}
    </p>
  );
}
