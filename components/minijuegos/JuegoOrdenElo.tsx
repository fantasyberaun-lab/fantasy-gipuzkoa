"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/IdiomaProvider";
import type { EstadoMinijuegos, ModoJuego, PreguntaOrden } from "@/lib/supabase/minijuegosQueries";
import FinPartida from "./FinPartida";
import InicioJuego from "./InicioJuego";
import { usePartida } from "./usePartida";

// Altura de cada ficha y hueco entre fichas (px): la lista se coloca con posiciones
// fijas para poder arrastrar sin librerías.
const ALTO = 64;
const HUECO = 8;
const PASO = ALTO + HUECO;

// Ordena por Elo: cinco jugadores que se colocan arrastrándolos, el de más Elo
// arriba y el de menos abajo. Se puede rehacer cuantas veces se quiera hasta que
// se pulse Enviar o se acabe el tiempo (entonces se envía el orden que haya).
export default function JuegoOrdenElo({
  estado,
  recargar,
}: {
  estado: EstadoMinijuegos;
  recargar: () => void;
}) {
  const t = useT().minijuegos;
  const p = usePartida("orden", { pausaTrasRespuesta: false, onCambio: recargar });
  const [modo, setModo] = useState<ModoJuego>("estandar");
  // orden[pos] = índice del jugador (en q.jugadores) que está en la posición pos, de arriba a abajo.
  const [orden, setOrden] = useState<number[]>([]);
  const [arrastre, setArrastre] = useState<{ idx: number; inicioPos: number; inicioY: number; dy: number } | null>(null);
  const [restante, setRestante] = useState(0);
  const ordenRef = useRef(orden);
  ordenRef.current = orden;
  const enviadaRef = useRef(false);
  const q = p.pregunta as PreguntaOrden | null;

  // El servidor espera las posiciones de menor a mayor Elo: es la lista al revés.
  const enviar = useCallback(() => {
    if (enviadaRef.current) return;
    enviadaRef.current = true;
    p.responder({ orden: [...ordenRef.current].reverse() }).then((ok) => {
      if (!ok) enviadaRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.responder]);

  useEffect(() => {
    if (!q || p.fase !== "jugando") return;
    enviadaRef.current = false;
    setOrden(q.jugadores.map((_, i) => i));
    setArrastre(null);
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

  const mover = useCallback((idx: number, destino: number) => {
    setOrden((o) => {
      const desde = o.indexOf(idx);
      const hasta = Math.max(0, Math.min(o.length - 1, destino));
      if (desde === hasta) return o;
      const n = o.filter((x) => x !== idx);
      n.splice(hasta, 0, idx);
      return n;
    });
  }, []);

  if (p.fase === "inicio" || p.fase === "cargando") {
    return (
      <InicioJuego
        juego="orden"
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
        {p.ultima && <UltimoOrden r={p.ultima} />}
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

  const n = q.jugadores.length;
  const proporcion = Math.min(1, restante / q.segundos);
  const lista = orden.length === n ? orden : q.jugadores.map((_, i) => i);

  function empezar(e: React.PointerEvent<HTMLLIElement>, idx: number) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastre({ idx, inicioPos: lista.indexOf(idx), inicioY: e.clientY, dy: 0 });
  }
  function arrastrar(e: React.PointerEvent<HTMLLIElement>) {
    if (!arrastre) return;
    const dy = e.clientY - arrastre.inicioY;
    setArrastre({ ...arrastre, dy });
    const arriba = Math.max(0, Math.min((n - 1) * PASO, arrastre.inicioPos * PASO + dy));
    mover(arrastre.idx, Math.round(arriba / PASO));
  }
  function soltar(e: React.PointerEvent<HTMLLIElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setArrastre(null);
  }
  function teclado(e: React.KeyboardEvent<HTMLLIElement>, idx: number) {
    const pos = lista.indexOf(idx);
    if (e.key === "ArrowUp") {
      e.preventDefault();
      mover(idx, pos - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      mover(idx, pos + 1);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>{t.ronda(q.indice, q.total)}</span>
        <span className="font-semibold text-accent">{t.puntos(p.puntos)}</span>
      </div>

      {p.ultima && <UltimoOrden r={p.ultima} />}

      <div className="space-y-1">
        <div className="text-xs text-neutral-500">{t.tiempo(Math.ceil(restante))}</div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden="true">
          <div
            className={`h-full transition-[width] duration-100 ease-linear ${restante <= 8 ? "bg-negative" : "bg-gold"}`}
            style={{ width: `${proporcion * 100}%` }}
          />
        </div>
      </div>

      <p className="text-center text-sm text-neutral-500">{t.ordenPregunta}</p>

      <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <span>▲ {t.ordenMayor}</span>
      </div>

      {/* Lista arrastrable: cada ficha se coloca en su posición. */}
      <ol
        className="relative select-none"
        style={{ height: n * PASO - HUECO }}
        aria-label={t.ordenPregunta}
      >
        {q.jugadores.map((nombre, idx) => {
          const pos = lista.indexOf(idx);
          const moviendo = arrastre?.idx === idx;
          const top = moviendo
            ? Math.max(0, Math.min((n - 1) * PASO, arrastre.inicioPos * PASO + arrastre.dy))
            : pos * PASO;
          return (
            <li
              key={`${q.indice}-${idx}`}
              tabIndex={0}
              aria-label={t.ordenFicha(nombre, pos + 1, n)}
              onPointerDown={(e) => empezar(e, idx)}
              onPointerMove={arrastrar}
              onPointerUp={soltar}
              onPointerCancel={soltar}
              onKeyDown={(e) => teclado(e, idx)}
              className={`absolute inset-x-0 flex cursor-grab touch-none items-center gap-3 rounded-xl border bg-white px-3 dark:bg-neutral-950 ${
                moviendo
                  ? "z-10 scale-[1.02] cursor-grabbing border-accent shadow-lg"
                  : "border-neutral-300 transition-[top] duration-150 dark:border-neutral-700"
              }`}
              style={{ top, height: ALTO }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white"
                aria-hidden="true"
              >
                {pos + 1}
              </span>
              <span className="min-w-0 flex-1 break-words text-[15px] font-medium leading-tight">{nombre}</span>
              <span className="shrink-0 text-xl text-neutral-400" aria-hidden="true">
                ⠿
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <span>▼ {t.ordenMenor}</span>
      </div>

      {p.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {p.error}
        </p>
      )}

      <p className="text-center text-xs text-neutral-500">{t.ordenAyuda}</p>
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

// Resultado de la ronda anterior: orden real con los Elo.
function UltimoOrden({ r }: { r: NonNullable<ReturnType<typeof usePartida>["ultima"]> }) {
  const t = useT().minijuegos;
  const real = (r.revelado.jugadores ?? []).map((j) => `${j.nombre} (${j.elo})`).join(" < ");
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-center text-sm ${
        r.correcta
          ? "bg-green-50 text-positive dark:bg-green-950/30"
          : "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      }`}
    >
      {t.ordenUltimo(real, r.puntosRonda)}
    </p>
  );
}
