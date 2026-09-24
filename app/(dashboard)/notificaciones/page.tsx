"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useGameState } from "@/components/GameStateProvider";
import type { Notificacion } from "@/lib/types";

const ETIQUETA: Record<Notificacion["tipo"], { texto: string; clases: string }> = {
  oferta_recibida: {
    texto: "Oferta",
    clases: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  fichaje: {
    texto: "Fichaje",
    clases: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  clausulazo: {
    texto: "Cláusula",
    clases: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
};

function hace(iso: string): string {
  const segundos = Math.round((Date.parse(iso) - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const abs = Math.abs(segundos);
  if (abs < 60) return "ahora mismo";
  if (abs < 3600) return rtf.format(Math.round(segundos / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(segundos / 3600), "hour");
  return rtf.format(Math.round(segundos / 86400), "day");
}

export default function NotificacionesPage() {
  const {
    notificaciones,
    notificacionesVistasEn,
    marcarNotificacionesVistas,
    equipo,
    cargando,
  } = useGameState();

  // Instante de la última visita ANTES de marcarlo como visto ahora: sirve
  // para resaltar lo nuevo mientras estás en el panel.
  const [corte, setCorte] = useState<number | null>(null);

  useEffect(() => {
    if (cargando) return;
    setCorte((previo) => previo ?? notificacionesVistasEn);
    marcarNotificacionesVistas();
    // Se vuelve a marcar si llega un aviso nuevo mientras el panel está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, notificaciones.length]);

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando notificaciones…</p>;
  }

  const jugador = (n: Notificacion): ReactNode =>
    n.jugadorId ? (
      <Link href={`/jugadores/${n.jugadorId}`} className="font-medium hover:underline">
        {n.jugadorNombre}
      </Link>
    ) : (
      <span className="font-medium">{n.jugadorNombre}</span>
    );

  const dinero = (n: Notificacion) => (n.importe !== null ? ` por ${n.importe} M` : "");

  const texto = (n: Notificacion): ReactNode => {
    const yo = n.actorId === equipo.id;
    const actor = <span className="font-medium">{n.actorNombre}</span>;

    if (n.tipo === "oferta_recibida") {
      return (
        <>
          {actor} te ha hecho una oferta{n.importe !== null ? ` de ${n.importe} M` : ""} por{" "}
          {jugador(n)}.
        </>
      );
    }

    if (n.tipo === "fichaje") {
      return yo ? (
        <>
          Has fichado a {jugador(n)}
          {dinero(n)}.
        </>
      ) : (
        <>
          {actor} ha fichado a {jugador(n)}
          {dinero(n)}.
        </>
      );
    }

    // clausulazo
    if (yo) {
      return (
        <>
          Has pagado la cláusula de {jugador(n)}
          {n.objetivoNombre ? ` (de ${n.objetivoNombre})` : ""}
          {dinero(n)}.
        </>
      );
    }
    if (n.objetivoId === equipo.id) {
      return (
        <>
          {actor} te ha quitado a {jugador(n)} pagando su cláusula{dinero(n)}.
        </>
      );
    }
    return (
      <>
        {actor} ha pagado la cláusula de {jugador(n)}
        {n.objetivoNombre ? ` (de ${n.objetivoNombre})` : ""}
        {dinero(n)}.
      </>
    );
  };

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Notificaciones</h2>

      {notificaciones.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          Todavía no hay movimientos en tu liga.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notificaciones.map((n) => {
            const nueva =
              corte !== null && n.actorId !== equipo.id && Date.parse(n.creada) > corte;
            const etiqueta = ETIQUETA[n.tipo];
            return (
              <li
                key={n.id}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  nueva
                    ? "border-accent/60 bg-accent/5"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${etiqueta.clases}`}
                >
                  {etiqueta.texto}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{texto(n)}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{hace(n.creada)}</p>
                </div>
                {nueva && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Nueva" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
