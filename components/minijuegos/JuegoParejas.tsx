"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/IdiomaProvider";
import type { EstadoMinijuegos, ModoJuego, PreguntaParejas } from "@/lib/supabase/minijuegosQueries";
import FichaJugador from "./FichaJugador";
import FinPartida from "./FinPartida";
import InicioJuego from "./InicioJuego";
import { usePartida } from "./usePartida";

// Encontrar las parejas: ocho jugadores que forman cuatro parejas (comparten club,
// categoría, Elo parecido, valor parecido o año de nacimiento). Se tocan de dos en
// dos; una pareja ya hecha se deshace tocándola. No hay cronómetro; puntúan las
// parejas correctas y la rapidez.
export default function JuegoParejas({
  estado,
  recargar,
}: {
  estado: EstadoMinijuegos;
  recargar: () => void;
}) {
  const t = useT().minijuegos;
  const p = usePartida("parejas", { pausaTrasRespuesta: false, onCambio: recargar });
  const [modo, setModo] = useState<ModoJuego>("estandar");
  const [pares, setPares] = useState<[number, number][]>([]);
  const [primera, setPrimera] = useState<number | null>(null);
  const q = p.pregunta as PreguntaParejas | null;

  useEffect(() => {
    setPares([]);
    setPrimera(null);
  }, [q?.indice]);

  if (p.fase === "inicio" || p.fase === "cargando") {
    return (
      <InicioJuego
        juego="parejas"
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
        {p.ultima && <UltimoParejas r={p.ultima} />}
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

  const numeroDePareja = (i: number) => pares.findIndex(([a, b]) => a === i || b === i);

  function tocar(i: number) {
    const n = numeroDePareja(i);
    if (n >= 0) {
      setPares((ps) => ps.filter((_, k) => k !== n));
      setPrimera(null);
      return;
    }
    if (primera == null) {
      setPrimera(i);
    } else if (primera === i) {
      setPrimera(null);
    } else {
      setPares((ps) => [...ps, [primera, i]]);
      setPrimera(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>{t.tablero(q.indice, q.total)}</span>
        <span className="font-semibold text-accent">{t.puntos(p.puntos)}</span>
      </div>

      {p.ultima && <UltimoParejas r={p.ultima} />}

      <p className="text-center text-sm text-neutral-500">{t.parejasPregunta}</p>
      <ul className="grid grid-cols-2 gap-2">
        {q.cartas.map((j, i) => {
          const n = numeroDePareja(i);
          return (
            <li key={`${q.indice}-${j.nombre}`}>
              <FichaJugador
                j={j}
                seleccionada={n >= 0 || primera === i}
                marca={n >= 0 ? String(n + 1) : undefined}
                onClick={() => tocar(i)}
              />
            </li>
          );
        })}
      </ul>

      {p.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {p.error}
        </p>
      )}

      <p className="text-center text-xs text-neutral-500">{t.parejasAyuda}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pares.length === 0 && primera == null}
          onClick={() => {
            setPares([]);
            setPrimera(null);
          }}
          className="rounded-xl border border-neutral-300 px-4 py-3 text-[15px] font-semibold transition-colors hover:border-accent hover:text-accent disabled:opacity-40 dark:border-neutral-700"
        >
          {t.ordenReiniciar}
        </button>
        <button
          type="button"
          disabled={pares.length === 0}
          onClick={() => p.responder({ pares })}
          className="flex-1 rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {t.enviar} ({pares.length}/4)
        </button>
      </div>
    </div>
  );
}

function UltimoParejas({ r }: { r: NonNullable<ReturnType<typeof usePartida>["ultima"]> }) {
  const t = useT().minijuegos;
  const v = r.revelado;
  const nombres = (v.cartas ?? []).map((c) => c.nombre);
  const sol = (v.soluciones ?? [])
    .map((s) => `${nombres[s.a]} + ${nombres[s.b]} (${t.parejasRelacion[s.regla]})`)
    .join(" · ");
  return (
    <div
      role="status"
      className={`rounded-lg px-3 py-2 text-center text-sm ${
        r.correcta
          ? "bg-green-50 text-positive dark:bg-green-950/30"
          : "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      }`}
    >
      <p className="font-semibold">{t.parejasUltimo(v.validas ?? 0, r.puntosRonda)}</p>
      {!r.correcta && <p className="mt-1 text-xs">{t.parejasSolucion(sol)}</p>}
    </div>
  );
}
