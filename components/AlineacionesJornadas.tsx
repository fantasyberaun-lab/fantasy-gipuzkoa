"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchAlineacionesEquipo,
  type AlineacionJornada,
  type JugadorAlineacion,
} from "@/lib/supabase/alineacionesQueries";

function etiquetaJornada(a: AlineacionJornada): string {
  if (a.pendiente) return "Enviada (jornada sin crear)";
  return a.torneo ? `${a.torneo} · J${a.jornada}` : `Jornada ${a.jornada}`;
}

function textoResultado(j: JugadorAlineacion): string {
  if (j.descanso) return "Descansó";
  if (j.resultado === "victoria") return "Victoria";
  if (j.resultado === "tablas") return "Tablas";
  if (j.resultado === "derrota") return "Derrota";
  return "Sin resultado";
}

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Pestaña "Jornadas" del perfil de un manager: qué titulares puso en cada
// jornada (la foto que se toma el sábado a las 16:00) y los puntos de cada uno.
export default function AlineacionesJornadas({ equipoId }: { equipoId: string }) {
  const [alineaciones, setAlineaciones] = useState<AlineacionJornada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setCargando(true);
      const lista = await fetchAlineacionesEquipo(createClient(), equipoId);
      setAlineaciones(lista);
      // Por defecto, la última.
      setSeleccion(lista.length > 0 ? lista.length - 1 : null);
      setCargando(false);
    })();
  }, [equipoId]);

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando jornadas…</p>;
  }

  if (alineaciones.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Todavía no hay ninguna plantilla registrada. Las plantillas se guardan
        automáticamente los sábados a las 16:00.
      </p>
    );
  }

  const actual = seleccion !== null ? alineaciones[seleccion] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {alineaciones.map((a, i) => (
          <button
            key={a.jornadaId ?? "pendiente"}
            onClick={() => setSeleccion(i)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              seleccion === i
                ? "border-accent bg-accent text-white"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            {etiquetaJornada(a)}
          </button>
        ))}
      </div>

      {actual && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div>
              <p className="text-sm font-semibold">{etiquetaJornada(actual)}</p>
              <p className="text-xs text-neutral-500">
                {actual.pendiente
                  ? `Plantilla enviada el ${fechaHora(actual.creada)}`
                  : `Jornada creada el ${fechaHora(actual.creada)}`}
              </p>
            </div>
            {!actual.pendiente && (
              <p className="text-lg font-semibold">{actual.puntos} pts</p>
            )}
          </div>

          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {actual.jugadores.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <Link href={`/jugadores/${j.id}`} className="hover:underline">
                      {j.nombre}
                    </Link>
                    {j.capitan && (
                      <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        C
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {j.categoria}ª cat.
                    {!actual.pendiente && ` · ${textoResultado(j)}`}
                  </p>
                </div>
                {!actual.pendiente && (
                  <div className="text-right">
                    <p className="text-sm font-semibold">{j.puntos} pts</p>
                    {j.capitan && (
                      <p className="text-[11px] text-neutral-400">{j.base} × 2</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
