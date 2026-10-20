"use client";

import { useState } from "react";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import { formatoMillones } from "@/lib/minijuegos";
import type { EstadoMinijuegos, JuegoId, ModoJuego, TipoPartida } from "@/lib/supabase/minijuegosQueries";

// Pantalla de inicio de un minijuego: la partida del día (ranking y recompensa)
// y las partidas libres (modo estándar o leyenda).
export default function InicioJuego({
  juego,
  estado,
  error,
  cargando,
  onIniciar,
}: {
  juego: JuegoId;
  estado: EstadoMinijuegos;
  error: string | null;
  cargando: boolean;
  onIniciar: (tipo: TipoPartida, modo: ModoJuego, reintento?: boolean) => void;
}) {
  const t = useT().minijuegos;
  const { locale } = useIdioma();
  const [modo, setModo] = useState<ModoJuego>("estandar");
  const j = estado.juegos.find((x) => x.id === juego);
  const textos = t.juegos[juego];
  const puedeReintentar = !!j && j.jugada && j.intento === 1 && estado.reintentos > 0;

  const boton =
    "w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50";

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{textos.descripcion}</p>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-gold/60 p-4 dark:border-gold/40">
        <h3 className="font-display text-lg font-semibold">{t.partidaDelDia}</h3>
        <p className="mt-0.5 text-sm text-neutral-500">{t.partidaDelDiaAyuda}</p>

        {j?.jugada ? (
          <div className="mt-3 space-y-2">
            <p className="font-display text-2xl font-semibold text-accent">{t.yaJugada(j.puntos)}</p>
            <p className="text-sm text-neutral-500">
              {j.recompensa && (j.recompensa.monedas > 0 || j.recompensa.xp > 0)
                ? t.recompensaGanada(formatoMillones(j.recompensa.monedas, locale), j.recompensa.xp)
                : t.sinRecompensa}
            </p>
            {puedeReintentar && (
              <div className="pt-1">
                <button type="button" disabled={cargando} onClick={() => onIniciar("diaria", "estandar", true)} className={boton}>
                  {t.usarReintento} ({estado.reintentos})
                </button>
                <p className="mt-1 text-xs text-neutral-500">{t.reintentoAyuda}</p>
              </div>
            )}
          </div>
        ) : (
          <button type="button" disabled={cargando} onClick={() => onIniciar("diaria", "estandar")} className={`mt-3 ${boton}`}>
            {j?.enCurso ? t.continuarDelDia : t.jugarDelDia}
          </button>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="font-display text-lg font-semibold">{t.partidaLibre}</h3>
        <p className="mt-0.5 text-sm text-neutral-500">{t.partidaLibreAyuda}</p>

        <div role="radiogroup" aria-label={t.modo} className="mt-3 grid grid-cols-2 gap-2">
          {(["estandar", "leyenda"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={modo === m}
              onClick={() => setModo(m)}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                modo === m
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-neutral-200 text-neutral-700 hover:border-accent dark:border-neutral-800 dark:text-neutral-300"
              }`}
            >
              <span className="block text-sm font-semibold">
                {m === "estandar" ? t.modoEstandar : t.modoLeyenda}
              </span>
              <span className="block text-xs text-neutral-500">
                {m === "estandar" ? t.modoEstandarAyuda : t.modoLeyendaAyuda}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={cargando}
          onClick={() => onIniciar("libre", modo)}
          className="mt-3 w-full rounded-xl border border-accent px-4 py-3 text-[15px] font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
        >
          {t.jugarLibre}
        </button>
      </section>
    </div>
  );
}
