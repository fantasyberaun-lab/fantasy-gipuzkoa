"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useT } from "@/components/IdiomaProvider";
import {
  fetchClasificacionDuelos,
  fetchDuelosJornada,
  type Duelo,
  type DuelosJornada,
  type FilaClasifDuelos,
} from "@/lib/supabase/duelosQueries";

// Duelos cara a cara (Fase 1): tu enfrentamiento 1v1 de la jornada (en directo)
// y la clasificación por victorias de duelo. Solo ligas privadas (0118).
export default function DuelosPage() {
  const supabase = createClient();
  const t = useT();
  const { equipo, esLigaPublica } = useGameState();
  const [jornada, setJornada] = useState<DuelosJornada | null>(null);
  const [clasif, setClasif] = useState<FilaClasifDuelos[]>([]);
  const [cargando, setCargando] = useState(true);
  const ligaRef = useRef(equipo.leagueId);
  ligaRef.current = equipo.leagueId;

  const cargar = useCallback(async () => {
    if (!ligaRef.current) return;
    const [j, c] = await Promise.all([
      fetchDuelosJornada(supabase, ligaRef.current),
      fetchClasificacionDuelos(supabase, ligaRef.current),
    ]);
    setJornada(j);
    setClasif(c);
    setCargando(false);
  }, [supabase]);

  useEffect(() => {
    if (esLigaPublica) {
      setCargando(false);
      return;
    }
    cargar();
    if (!equipo.leagueId) return;
    const canal = supabase
      .channel(`duelos-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, () => cargar())
      .subscribe();
    const alVolver = () => {
      if (document.visibilityState === "visible") cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      supabase.removeChannel(canal);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo.leagueId, esLigaPublica]);

  if (esLigaPublica) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">{t.duelos.titulo}</h1>
        <p className="mt-3 text-sm text-neutral-500">{t.duelos.soloPrivadas}</p>
      </div>
    );
  }

  if (cargando) {
    return <p className="text-center text-sm text-neutral-500">{t.comun.cargando}</p>;
  }

  const miDuelo = jornada?.duelos.find(
    (d) => d.equipoA === equipo.id || d.equipoB === equipo.id
  );
  const otros = (jornada?.duelos ?? []).filter((d) => d !== miDuelo);
  const juegoYo = Boolean(miDuelo) || (jornada?.duelos ?? []).length === 0;

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{t.duelos.titulo}</h1>
        {jornada?.jornada != null && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              jornada.terminada
                ? "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                : "bg-negative/10 text-negative"
            }`}
          >
            {!jornada.terminada && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-negative" aria-hidden="true" />
            )}
            {jornada.terminada ? t.duelos.cerrada : t.duelos.enJuego}
          </span>
        )}
      </div>

      {!jornada || jornada.jornada == null ? (
        <p className="mt-4 text-sm text-neutral-500">{t.duelos.sinJornada}</p>
      ) : (
        <>
          {miDuelo && (
            <div className="mt-5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
                {t.duelos.tuDuelo}
              </p>
              <TarjetaDuelo duelo={miDuelo} miEquipo={equipo.id} destacado />
            </div>
          )}

          {!miDuelo && !juegoYo && (
            <p className="mt-4 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-500 dark:bg-neutral-800">
              {t.duelos.descansa}
            </p>
          )}

          {otros.length > 0 && (
            <div className="mt-5 flex flex-col gap-2">
              {otros.map((d) => (
                <TarjetaDuelo key={d.equipoA + d.equipoB} duelo={d} miEquipo={equipo.id} />
              ))}
            </div>
          )}
        </>
      )}

      {clasif.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">{t.duelos.clasifTitulo}</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-xs uppercase text-neutral-500 dark:bg-neutral-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">{t.duelos.col.equipo}</th>
                  <th className="px-2 py-2 text-center font-semibold">{t.duelos.col.g}</th>
                  <th className="px-2 py-2 text-center font-semibold">{t.duelos.col.e}</th>
                  <th className="px-2 py-2 text-center font-semibold">{t.duelos.col.p}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t.duelos.col.pts}</th>
                </tr>
              </thead>
              <tbody>
                {clasif.map((f, i) => {
                  const esMio = f.equipoId === equipo.id;
                  return (
                    <tr
                      key={f.equipoId}
                      className={`border-t border-neutral-100 dark:border-neutral-800 ${
                        esMio ? "bg-brand-50 dark:bg-neutral-800/60" : ""
                      }`}
                    >
                      <td className="px-3 py-2">
                        <span className="mr-2 text-xs font-bold text-neutral-400">{i + 1}</span>
                        <span className="font-semibold">{f.nombreEquipo}</span>
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums">{f.ganados}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{f.empatados}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{f.perdidos}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-accent">
                        {f.puntosLiguilla}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-neutral-500">{t.duelos.leyenda}</p>
        </div>
      )}
    </div>
  );
}

function TarjetaDuelo({
  duelo,
  miEquipo,
  destacado = false,
}: {
  duelo: Duelo;
  miEquipo: string;
  destacado?: boolean;
}) {
  const t = useT();
  const ganaA = duelo.puntosA > duelo.puntosB;
  const ganaB = duelo.puntosB > duelo.puntosA;
  const lado = (nombre: string, manager: string, puntos: number, gana: boolean, mio: boolean) => (
    <div className="min-w-0 flex-1 text-center">
      <p className={`truncate text-sm font-semibold ${mio ? "text-accent" : ""}`}>{nombre}</p>
      <p className="truncate text-xs text-neutral-500">{manager}</p>
      <p className={`font-display text-2xl font-bold tabular-nums ${gana ? "text-accent" : "text-neutral-400"}`}>
        {puntos}
      </p>
    </div>
  );
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        destacado
          ? "border-accent bg-brand-50 dark:bg-neutral-800"
          : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      }`}
    >
      <div className="flex items-center gap-2">
        {lado(duelo.nombreA, duelo.managerA, duelo.puntosA, ganaA, duelo.equipoA === miEquipo)}
        <span className="shrink-0 text-xs font-semibold text-neutral-400">{t.duelos.vs}</span>
        {lado(duelo.nombreB, duelo.managerB, duelo.puntosB, ganaB, duelo.equipoB === miEquipo)}
      </div>
    </div>
  );
}
