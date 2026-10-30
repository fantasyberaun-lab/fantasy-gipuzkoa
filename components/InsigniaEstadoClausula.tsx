"use client";

import { useEffect, useState } from "react";

// Etiqueta con el estado de la cláusula de un jugador fichado: blindado
// (su dueño ha pagado el blindaje), candado (recién fichado) o clausulable.
// La usan la Plantilla, Jugadores y la plantilla de un rival en Clasificación.

export type EstadoClausula = "blindado" | "candado" | "clausulable";

// El blindaje manda sobre el candado: los dos impiden el clausulazo, pero el
// blindado es lo que el dueño ha elegido y lo que dice la base de datos primero.
export function estadoClausula(j: { blindado?: boolean; candado?: boolean }): EstadoClausula {
  return j.blindado ? "blindado" : j.candado ? "candado" : "clausulable";
}

const iconoBlindado =
  "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z";
const iconoCandado =
  "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z";
const iconoClausulable =
  "M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z";

const estadoEstilo: Record<EstadoClausula, { icono: string; clases: string }> = {
  blindado: {
    icono: iconoBlindado,
    clases: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  },
  candado: {
    icono: iconoCandado,
    clases: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  clausulable: {
    icono: iconoClausulable,
    clases: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
};

// Tiempo que queda hasta una fecha: "6d 4h", "5h 12m" o "8m". null si ya ha pasado.
export function tiempoRestante(hasta: string | null | undefined, ahora: number): string | null {
  if (!hasta) return null;
  const minutos = Math.floor((new Date(hasta).getTime() - ahora) / 60000);
  if (!Number.isFinite(minutos) || minutos <= 0) return null;
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${minutos % 60}m`;
  return `${minutos}m`;
}

// Icono solo (filas compactas) o icono + texto. Con `hasta` (candado o blindado)
// añade una cuenta atrás discreta que se actualiza cada minuto.
export default function InsigniaEstadoClausula({
  estado,
  texto,
  title,
  className = "text-xs",
  hasta,
}: {
  estado: EstadoClausula;
  texto?: string;
  title: string;
  className?: string;
  hasta?: string | null;
}) {
  const { icono, clases } = estadoEstilo[estado];
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!hasta) return;
    const id = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(id);
  }, [hasta]);
  const restante = estado === "clausulable" ? null : tiempoRestante(hasta, ahora);
  const titulo = restante ? `${title} · ${restante}` : title;
  return (
    <span
      title={titulo}
      aria-label={titulo}
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${clases} ${className}`}
    >
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={icono} />
      </svg>
      {texto}
      {restante && <span className="font-normal opacity-70">{restante}</span>}
    </span>
  );
}
