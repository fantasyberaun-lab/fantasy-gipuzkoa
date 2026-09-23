"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchDetalleTorneo,
  fetchTorneo,
  type DetalleTorneo,
} from "@/lib/supabase/torneosQueries";
import { estadoTorneo, type Torneo } from "@/lib/torneos";
import FichaTorneo from "@/components/FichaTorneo";
import type { ResultadoPartida } from "@/lib/types";

type Pestana = "jugadores" | "resultados";

const ETIQUETA_RESULTADO: Record<ResultadoPartida, string> = {
  victoria: "Victoria",
  tablas: "Tablas",
  derrota: "Derrota",
};

const COLOR_RESULTADO: Record<ResultadoPartida, string> = {
  victoria: "text-positive",
  tablas: "text-neutral-500",
  derrota: "text-negative",
};

export default function TorneoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [detalle, setDetalle] = useState<DetalleTorneo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<Pestana>("jugadores");
  const [jornadaId, setJornadaId] = useState<string>("");

  useEffect(() => {
    (async () => {
      setCargando(true);
      const [t, d] = await Promise.all([
        fetchTorneo(supabase, id),
        fetchDetalleTorneo(supabase, id),
      ]);
      setTorneo(t);
      setDetalle(d);
      // Por defecto, la última jornada del torneo.
      setJornadaId(d.jornadas[d.jornadas.length - 1]?.id ?? "");
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando torneo…</p>;
  }

  if (!torneo || !detalle) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500">No se ha encontrado este torneo.</p>
        <Link href="/torneos" className="text-sm text-accent underline underline-offset-2">
          ← Volver a torneos
        </Link>
      </div>
    );
  }

  const estado = estadoTorneo(torneo);
  const jornadaActual = detalle.jornadas.find((j) => j.id === jornadaId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/torneos"
          className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-300"
        >
          ← Torneos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{torneo.nombre}</h2>
          {estado && (
            <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-500 dark:border-neutral-700">
              {estado}
            </span>
          )}
        </div>
        {torneo.categoria && (
          <p className="text-xs text-neutral-500">{torneo.categoria}ª categoría</p>
        )}
      </div>

      <details open className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <summary className="cursor-pointer text-sm font-medium">
          Información del torneo
        </summary>
        <div className="mt-3">
          <FichaTorneo torneo={torneo} />
        </div>
      </details>

      <div className="flex gap-2">
        {(
          [
            ["jugadores", `Jugadores (${detalle.participantes.length})`],
            ["resultados", `Resultados (${detalle.jornadas.length})`],
          ] as [Pestana, string][]
        ).map(([clave, etiqueta]) => (
          <button
            key={clave}
            onClick={() => setPestana(clave)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              pestana === clave
                ? "bg-accent text-white"
                : "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {pestana === "jugadores" &&
        (detalle.participantes.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            Todavía no hay jugadores inscritos en este torneo.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500 dark:bg-neutral-900">
                <tr>
                  <th className="px-3 py-2 font-medium">Jugador</th>
                  <th className="px-3 py-2 font-medium">Club</th>
                  <th className="px-3 py-2 font-medium">Cat.</th>
                  <th className="px-3 py-2 font-medium">Elo</th>
                  <th className="px-3 py-2 text-right font-medium">Partidas</th>
                  <th className="px-3 py-2 text-right font-medium">Pts Fantasy</th>
                </tr>
              </thead>
              <tbody>
                {detalle.participantes.map((j) => (
                  <tr key={j.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-3 py-2 font-medium">{j.nombre}</td>
                    <td className="px-3 py-2 text-neutral-500">{j.club}</td>
                    <td className="px-3 py-2">{j.categoria}ª</td>
                    <td className="px-3 py-2">{j.elo}</td>
                    <td className="px-3 py-2 text-right">{j.partidas}</td>
                    <td className="px-3 py-2 text-right font-medium">{j.puntos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {pestana === "resultados" &&
        (detalle.jornadas.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            Este torneo todavía no tiene jornadas.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <select
              value={jornadaId}
              onChange={(e) => setJornadaId(e.target.value)}
              className="w-fit rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              {detalle.jornadas.map((j) => (
                <option key={j.id} value={j.id}>
                  Jornada {j.numero}
                </option>
              ))}
            </select>

            {jornadaActual && jornadaActual.resultados.length === 0 && (
              <p className="py-6 text-center text-sm text-neutral-500">
                Todavía no hay resultados en esta jornada.
              </p>
            )}

            {jornadaActual && jornadaActual.resultados.length > 0 && (
              <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {jornadaActual.resultados.map((r) => (
                  <li
                    key={r.playerId}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{r.jugadorNombre}</p>
                      <p className="text-xs text-neutral-500">
                        <span className={COLOR_RESULTADO[r.resultado]}>
                          {ETIQUETA_RESULTADO[r.resultado]}
                        </span>{" "}
                        vs {r.rivalNombre ?? "rival externo"}
                        {r.rivalElo != null ? ` (${r.rivalElo})` : ""}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-medium">{r.puntos} pts</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
    </div>
  );
}
