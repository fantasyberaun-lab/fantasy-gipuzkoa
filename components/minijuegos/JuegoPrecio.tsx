"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/IdiomaProvider";
import type { EstadoMinijuegos, ModoJuego, PreguntaPrecio } from "@/lib/supabase/minijuegosQueries";
import FichaJugador from "./FichaJugador";
import FinPartida from "./FinPartida";
import InicioJuego from "./InicioJuego";
import { usePartida } from "./usePartida";

const MINIMO = 30;
const MAXIMO = 500;
const INICIAL = 150;

// Adivina el precio: tres jugadores (sin su valor) y una barra de 30 a 500 M para
// estimar lo que suman sus valores de mercado. No hay cronómetro, pero cuanto antes
// se responde, más puntos (hasta el doble que tardando mucho).
export default function JuegoPrecio({
  estado,
  recargar,
}: {
  estado: EstadoMinijuegos;
  recargar: () => void;
}) {
  const t = useT().minijuegos;
  const p = usePartida("precio", { pausaTrasRespuesta: false, onCambio: recargar });
  const [modo, setModo] = useState<ModoJuego>("estandar");
  const [valor, setValor] = useState(INICIAL);
  const q = p.pregunta as PreguntaPrecio | null;

  useEffect(() => {
    setValor(INICIAL);
  }, [q?.indice]);

  if (p.fase === "inicio" || p.fase === "cargando") {
    return (
      <InicioJuego
        juego="precio"
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
        {p.ultima && <UltimoPrecio r={p.ultima} />}
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

  const mover = (d: number) => setValor((v) => Math.min(MAXIMO, Math.max(MINIMO, v + d)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>{t.ronda(q.indice, q.total)}</span>
        <span className="font-semibold text-accent">{t.puntos(p.puntos)}</span>
      </div>

      {p.ultima && <UltimoPrecio r={p.ultima} />}

      <p className="text-center text-sm text-neutral-500">{t.precioPregunta}</p>
      <ul className="grid gap-2 sm:grid-cols-3">
        {q.jugadores.map((j) => (
          <li key={j.nombre}>
            <FichaJugador j={j} />
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-center font-display text-5xl font-semibold text-accent" aria-live="off">
          {valor} M
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            aria-label={t.precioBajar}
            onClick={() => mover(-5)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-xl font-semibold transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
          >
            −
          </button>
          <input
            type="range"
            min={MINIMO}
            max={MAXIMO}
            step={1}
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            aria-label={t.precioPregunta}
            aria-valuetext={`${valor} M`}
            className="h-8 w-full cursor-pointer accent-[rgb(var(--accent))]"
          />
          <button
            type="button"
            aria-label={t.precioSubir}
            onClick={() => mover(5)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-xl font-semibold transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
          >
            +
          </button>
        </div>
        <div className="mt-1 flex justify-between text-xs text-neutral-500">
          <span>{MINIMO} M</span>
          <span>{MAXIMO} M</span>
        </div>
      </div>

      {p.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {p.error}
        </p>
      )}

      <p className="text-center text-xs text-neutral-500">{t.sinCronometro}</p>
      <button
        type="button"
        onClick={() => p.responder({ valor })}
        className="w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        {t.enviar}
      </button>
    </div>
  );
}

function UltimoPrecio({ r }: { r: NonNullable<ReturnType<typeof usePartida>["ultima"]> }) {
  const t = useT().minijuegos;
  const detalle = (r.revelado.jugadores ?? []).map((j) => `${j.nombre} ${j.valor} M`).join(" + ");
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-center text-sm ${
        r.correcta
          ? "bg-green-50 text-positive dark:bg-green-950/30"
          : "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      }`}
    >
      {t.precioUltimo(detalle, r.revelado.total ?? 0, r.revelado.respuesta ?? null, r.puntosRonda)}
    </p>
  );
}
