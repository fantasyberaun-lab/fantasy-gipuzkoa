"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/IdiomaProvider";
import type {
  EstadoMinijuegos,
  ModoJuego,
  PreguntaAcierta,
  PreguntaAdivina,
} from "@/lib/supabase/minijuegosQueries";
import FinPartida from "./FinPartida";
import InicioJuego from "./InicioJuego";
import { usePartida } from "./usePartida";

// Adivina el jugador y Acierta el jugador: una pista y cuatro opciones, con
// cronómetro. Puntúan el acierto y la rapidez. Si el tiempo se acaba la ronda
// vale 0 (se envía sin respuesta).
export default function JuegoOpciones({
  juego,
  estado,
  recargar,
}: {
  juego: "adivina" | "acierta";
  estado: EstadoMinijuegos;
  recargar: () => void;
}) {
  const t = useT().minijuegos;
  const p = usePartida(juego, { pausaTrasRespuesta: false, onCambio: recargar });
  const [modo, setModo] = useState<ModoJuego>("estandar");
  const [restante, setRestante] = useState(0);
  const enviadaRef = useRef(false);
  const q = p.pregunta as PreguntaAdivina | PreguntaAcierta | null;

  const enviar = useCallback(
    (opcion: number | null) => {
      if (enviadaRef.current) return;
      enviadaRef.current = true;
      p.responder(opcion == null ? {} : { opcion }).then((ok) => {
        if (!ok) enviadaRef.current = false;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.responder]
  );

  useEffect(() => {
    if (!q || p.fase !== "jugando") return;
    enviadaRef.current = false;
    const fin = p.recibidaEn + (q.restante ?? q.segundos) * 1000;
    const tick = () => {
      const left = Math.max(0, (fin - performance.now()) / 1000);
      setRestante(left);
      if (left <= 0) enviar(null);
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.indice, p.fase, p.recibidaEn]);

  if (p.fase === "inicio" || p.fase === "cargando") {
    return (
      <InicioJuego
        juego={juego}
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
        {p.ultima && <UltimaOpcion r={p.ultima} />}
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

  const proporcion = Math.min(1, restante / q.segundos);
  const poco = restante <= 5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>{t.ronda(q.indice, q.total)}</span>
        <span className="font-semibold text-accent">{t.puntos(p.puntos)}</span>
      </div>

      {p.ultima && <UltimaOpcion r={p.ultima} />}

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-center text-sm text-neutral-500">
          {q.tipo === "adivina" ? t.adivinaPregunta : t.aciertaPregunta}
        </p>
        {q.tipo === "adivina" ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-center">
            <Dato etiqueta={t.eloEtiqueta} valor={q.pista.elo > 0 ? String(q.pista.elo) : t.fichaSinElo} />
            <Dato etiqueta={t.valorEtiqueta} valor={q.pista.valor != null ? `${q.pista.valor} M` : "—"} />
            <Dato etiqueta={t.clubEtiqueta} valor={q.pista.club ?? t.fichaSinClub} />
            <Dato etiqueta={t.categoriaEtiqueta} valor={q.pista.categoria ?? "—"} />
          </dl>
        ) : (
          <p className="mt-3 text-center text-[17px] leading-snug">«{q.descripcion}»</p>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-xs text-neutral-500">{t.tiempo(Math.ceil(restante))}</div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden="true">
          <div
            className={`h-full transition-[width] duration-100 ease-linear ${poco ? "bg-negative" : "bg-gold"}`}
            style={{ width: `${proporcion * 100}%` }}
          />
        </div>
      </div>

      {p.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {p.error}
        </p>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {q.opciones.map((nombre, i) => (
          <li key={`${q.indice}-${i}`}>
            <button
              type="button"
              onClick={() => enviar(i)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-3.5 text-left text-[15px] font-medium transition-colors hover:border-accent hover:bg-accent/5 dark:border-neutral-700"
            >
              {nombre}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{etiqueta}</dt>
      <dd className="break-words font-display text-xl font-semibold">{valor}</dd>
    </div>
  );
}

// Resultado de la ronda anterior: quién era.
function UltimaOpcion({ r }: { r: NonNullable<ReturnType<typeof usePartida>["ultima"]> }) {
  const t = useT().minijuegos;
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-center text-sm ${
        r.correcta
          ? "bg-green-50 text-positive dark:bg-green-950/30"
          : "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      }`}
    >
      {t.opcionUltimo(r.correcta, r.revelado.nombre ?? "", r.puntosRonda)}
    </p>
  );
}
