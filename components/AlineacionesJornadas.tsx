"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import type { Textos } from "@/lib/i18n/textos";
import {
  fetchAlineacionesSemanas,
  type AlineacionSemana,
  type JugadorSemana,
} from "@/lib/supabase/alineacionesQueries";

function fechaCorta(fecha: string, locale: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
  });
}

function textoResultado(j: JugadorSemana, tm: Textos["managers"]): string {
  if (j.descanso) return tm.descanso;
  if (j.resultado === "victoria") return tm.victoria;
  if (j.resultado === "tablas") return tm.tablas;
  if (j.resultado === "derrota") return tm.derrota;
  return tm.sinResultado;
}

// Pestaña "Jornadas" del perfil de un manager: qué titulares puso cada fin de
// semana (la foto que se toma el sábado a las 16:00) y los puntos que hizo
// cada uno en la ronda que jugó, con todos los torneos del fin de semana juntos.
export default function AlineacionesJornadas({ equipoId }: { equipoId: string }) {
  const tm = useT().managers;
  const { locale } = useIdioma();
  const [semanas, setSemanas] = useState<AlineacionSemana[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setCargando(true);
      const lista = await fetchAlineacionesSemanas(createClient(), equipoId);
      setSemanas(lista);
      // Por defecto, la última.
      setSeleccion(lista.length > 0 ? lista.length - 1 : null);
      setCargando(false);
    })();
  }, [equipoId]);

  if (cargando) {
    return <p className="text-sm text-neutral-500">{tm.cargandoJornadas}</p>;
  }

  if (semanas.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        {tm.sinJornadas}
      </p>
    );
  }

  const actual = seleccion !== null ? semanas[seleccion] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {semanas.map((a, i) => (
          <button
            key={a.clave}
            onClick={() => setSeleccion(i)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              seleccion === i
                ? "border-accent bg-accent text-white"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            {fechaCorta(a.fecha, locale)}
          </button>
        ))}
      </div>

      {actual && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div>
              <p className="text-sm font-semibold">{tm.finDeSemana(fechaCorta(actual.fecha, locale))}</p>
              <p className="text-xs text-neutral-500">
                {actual.pendiente
                  ? tm.pendiente
                  : tm.cerrada}
              </p>
            </div>
            {!actual.pendiente && (
              <p className="text-lg font-semibold">{tm.pts(actual.puntos)}</p>
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
                        {tm.capitanCorto}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {tm.categoriaCorta(j.categoria)}
                    {!actual.pendiente && ` · ${textoResultado(j, tm)}`}
                  </p>
                  {!actual.pendiente && j.torneo && (
                    <p className="text-[11px] text-neutral-400">
                      {j.torneo}
                      {j.jornada !== null && tm.ronda(j.jornada)}
                    </p>
                  )}
                </div>
                {!actual.pendiente && (
                  <div className="text-right">
                    <p className="text-sm font-semibold">{tm.pts(j.puntos)}</p>
                    {j.capitan && j.torneo && (
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
