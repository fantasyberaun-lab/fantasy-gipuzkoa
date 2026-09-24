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
import { estadoTorneo, formatearPuntos, MARCADOR, type Torneo } from "@/lib/torneos";
import FichaTorneo from "@/components/FichaTorneo";
import type { LadoPartida } from "@/lib/supabase/torneosQueries";

type Pestana = "jugadores" | "resultados";

// Un jugador de una partida: el nombre lleva a su perfil (dentro del
// contexto de este torneo) y debajo van sus puntos Fantasy.
function LadoDePartida({
  lado,
  torneoId,
  alineacion,
}: {
  lado: LadoPartida;
  torneoId: string;
  alineacion: "text-right" | "text-left";
}) {
  return (
    <div className={alineacion}>
      {lado.id ? (
        <Link
          href={`/jugadores/${lado.id}?torneo=${torneoId}`}
          className="font-medium hover:underline"
        >
          {lado.nombre}
        </Link>
      ) : (
        <span className="font-medium">
          {lado.nombre}
          {lado.elo != null ? ` (${lado.elo})` : ""}
        </span>
      )}
      {lado.puntosFantasy != null && (
        <p className="text-xs text-neutral-500">{lado.puntosFantasy} pts</p>
      )}
    </div>
  );
}

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
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500 dark:bg-neutral-900">
                <tr>
                  <th className="px-3 py-2 font-medium">Jugador</th>
                  <th className="px-3 py-2 font-medium">Club</th>
                  <th className="px-3 py-2 font-medium">Cat.</th>
                  <th className="px-3 py-2 font-medium">Elo</th>
                  <th className="px-3 py-2 text-right font-medium">Partidas</th>
                  <th className="px-3 py-2 text-right font-medium">Puntos</th>
                  <th className="px-3 py-2 text-right font-medium">Perf. Elo</th>
                  <th className="px-3 py-2 text-right font-medium">Pts Fantasy</th>
                </tr>
              </thead>
              <tbody>
                {detalle.participantes.map((j) => (
                  <tr key={j.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-3 py-2 font-medium">
                      <Link
                        href={`/jugadores/${j.id}?torneo=${torneo.id}`}
                        className="hover:underline"
                      >
                        {j.nombre}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-neutral-500">{j.club}</td>
                    <td className="px-3 py-2">{j.categoria}ª</td>
                    <td className="px-3 py-2">{j.elo}</td>
                    <td className="px-3 py-2 text-right">{j.partidas}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {j.partidas > 0 ? formatearPuntos(j.puntos) : "–"}
                    </td>
                    <td className="px-3 py-2 text-right">{j.rendimiento ?? "–"}</td>
                    <td className="px-3 py-2 text-right text-neutral-500">{j.puntosFantasy}</td>
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

            {jornadaActual &&
              jornadaActual.partidas.length === 0 &&
              jornadaActual.descansan.length === 0 && (
                <p className="py-6 text-center text-sm text-neutral-500">
                  Todavía no hay resultados en esta jornada.
                </p>
              )}

            {jornadaActual && jornadaActual.partidas.length > 0 && (
              <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {jornadaActual.partidas.map((partida) => (
                  <li
                    key={partida.clave}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-2.5 text-sm"
                  >
                    <LadoDePartida lado={partida.a} torneoId={torneo.id} alineacion="text-right" />
                    <span className="min-w-[3.5rem] text-center font-semibold">
                      {MARCADOR[partida.resultadoA]}
                    </span>
                    <LadoDePartida lado={partida.b} torneoId={torneo.id} alineacion="text-left" />
                  </li>
                ))}
              </ul>
            )}

            {jornadaActual && jornadaActual.descansan.length > 0 && (
              <p className="text-xs text-neutral-500">
                Sin emparejar (descansan):{" "}
                {jornadaActual.descansan.map((d, i) => (
                  <span key={d.id}>
                    {i > 0 && ", "}
                    <Link
                      href={`/jugadores/${d.id}?torneo=${torneo.id}`}
                      className="font-medium hover:underline"
                    >
                      {d.nombre}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        ))}
    </div>
  );
}