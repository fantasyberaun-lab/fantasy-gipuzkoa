"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useT } from "@/components/IdiomaProvider";
import {
  fetchJornadaEnDirecto,
  type JornadaDirecto,
} from "@/lib/supabase/directoQueries";

// Jornada en directo (Fase 1): clasificación de la última jornada que se
// actualiza sola por Realtime a medida que entran los resultados (0117).
export default function DirectoPage() {
  const supabase = createClient();
  const t = useT();
  const { equipo } = useGameState();
  const [datos, setDatos] = useState<JornadaDirecto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [parpadeo, setParpadeo] = useState(false);
  const ligaRef = useRef(equipo.leagueId);
  ligaRef.current = equipo.leagueId;

  const cargar = useCallback(
    async (conParpadeo = false) => {
      if (!ligaRef.current) return;
      const d = await fetchJornadaEnDirecto(supabase, ligaRef.current);
      setDatos(d);
      setCargando(false);
      if (conParpadeo) {
        setParpadeo(true);
        setTimeout(() => setParpadeo(false), 700);
      }
    },
    [supabase]
  );

  useEffect(() => {
    cargar();
    if (!equipo.leagueId) return;

    // Cada resultado que mete el admin dispara un refresco. results es de
    // lectura pública, así que Realtime lo entrega (0117).
    const canal = supabase
      .channel(`directo-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "results" },
        () => cargar(true)
      )
      .subscribe();

    // Red de seguridad: refresca al volver a la pestaña.
    const alVolver = () => {
      if (document.visibilityState === "visible") cargar();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      supabase.removeChannel(canal);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo.leagueId]);

  if (cargando) {
    return <p className="text-center text-sm text-neutral-500">{t.comun.cargando}</p>;
  }

  if (!datos || datos.filas.length === 0 || datos.jornada == null) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">{t.directo.titulo}</h1>
        <p className="mt-3 text-sm text-neutral-500">{t.directo.sinJornada}</p>
      </div>
    );
  }

  const maxPuntos = Math.max(1, ...datos.filas.map((f) => f.puntos));

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{t.directo.titulo}</h1>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            datos.terminada
              ? "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              : "bg-negative/10 text-negative"
          }`}
        >
          {!datos.terminada && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-negative" aria-hidden="true" />
          )}
          {datos.terminada ? t.directo.cerrada : t.directo.enJuego}
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {t.directo.jornadaNum(datos.jornada)} · {t.directo.subtitulo}
      </p>

      <ol className="mt-5 flex flex-col gap-2">
        {datos.filas.map((f, i) => {
          const esMio = f.equipoId === equipo.id;
          return (
            <li
              key={f.equipoId}
              className={`relative overflow-hidden rounded-xl border px-3 py-2.5 transition-colors ${
                esMio
                  ? "border-accent bg-brand-50 dark:bg-neutral-800"
                  : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
              }`}
            >
              {/* Barra de progreso de fondo, proporcional a los puntos. */}
              <span
                className="absolute inset-y-0 left-0 bg-accent/10"
                style={{ width: `${(f.puntos / maxPuntos) * 100}%` }}
                aria-hidden="true"
              />
              <div className="relative flex items-center gap-3">
                <span className="w-6 shrink-0 text-center text-sm font-bold text-neutral-400">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-tight">
                    {f.nombreEquipo}
                    {esMio && (
                      <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white align-middle">
                        {t.directo.tuEquipo}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-neutral-500">{f.nombreManager}</p>
                </div>
                <span
                  className={`shrink-0 font-display text-lg font-bold tabular-nums transition-transform ${
                    parpadeo ? "scale-110 text-accent" : "text-accent"
                  }`}
                >
                  {f.puntos}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
