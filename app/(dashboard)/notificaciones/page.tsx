"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import ComunicadoCard from "@/components/ComunicadoCard";
import { useGameState } from "@/components/GameStateProvider";
import { ordenarComunicados } from "@/lib/comunicados";
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
  clausula_subida: {
    texto: "Cláusula ↑",
    clases: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
  oferta_rechazada: {
    texto: "Oferta rechazada",
    clases: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
  venta: {
    texto: "Venta",
    clases: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  },
  actualizacion_elo: {
    texto: "Actualización de Elo",
    clases: "bg-accent text-white",
  },
  pago_jornada: {
    texto: "Ingreso",
    clases: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

// Una actualización de Elo se mantiene fijada arriba durante este tiempo.
const DIAS_FIJADA = 7;

function mesDe(periodo: string): string {
  return new Date(`${periodo}T12:00:00`).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function TarjetaElo({ n, nueva }: { n: Notificacion; nueva: boolean }) {
  const d = n.datosElo;
  const dif = d ? Math.round((d.valorDespues - d.valorAntes) * 100) / 100 : 0;
  const pct = d && d.valorAntes > 0 ? (dif / d.valorAntes) * 100 : 0;
  const signo = dif > 0 ? "+" : "";
  return (
    <li className="rounded-2xl border-2 border-accent bg-accent/10 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Importante
          </span>
          <h3 className="mt-2 text-base font-bold">
            Elo y valores actualizados{d ? ` · ${mesDe(d.periodo)}` : ""}
          </h3>
        </div>
        {nueva && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-label="Nueva" />}
      </div>
      {d && (
        <div className="mt-3 flex flex-col gap-1.5 text-sm">
          <p>
            Se ha actualizado el Elo de {d.jugadoresActualizados} jugadores con la nueva lista de la
            FIDE y su valor de mercado se ha reajustado.
          </p>
          <p>
            Valor de tu plantilla:{" "}
            <span className="font-semibold">
              {d.valorAntes} M → {d.valorDespues} M
            </span>{" "}
            <span
              className={
                dif > 0 ? "font-semibold text-accent" : dif < 0 ? "font-semibold text-red-500" : ""
              }
            >
              ({signo}
              {dif} M, {signo}
              {pct.toFixed(1)} %)
            </span>
          </p>
          <p>
            {d.jugadoresConCambio === 0
              ? "Ninguno de tus jugadores ha cambiado de Elo."
              : `${d.jugadoresConCambio} de tus jugadores han cambiado de Elo.`}
            {d.mejor && ` Mayor subida: ${d.mejor.nombre} (▲ ${d.mejor.delta}).`}
            {d.peor && ` Mayor bajada: ${d.peor.nombre} (▼ ${Math.abs(d.peor.delta)}).`}
          </p>
        </div>
      )}
      <p className="mt-2 text-xs text-neutral-500">{hace(n.creada)}</p>
    </li>
  );
}

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
    comunicados,
    comunicadosVistosEn,
    marcarComunicadosVistos,
    esLigaPublica,
    equipo,
    cargando,
  } = useGameState();

  // Instante de la última visita ANTES de marcarlo como visto ahora: sirve
  // para resaltar lo nuevo mientras estás en el panel.
  const [corte, setCorte] = useState<number | null>(null);
  const [corteComunicados, setCorteComunicados] = useState<number | null>(null);

  useEffect(() => {
    if (cargando) return;
    setCorte((previo) => previo ?? notificacionesVistasEn);
    setCorteComunicados((previo) => previo ?? comunicadosVistosEn);
    marcarNotificacionesVistas();
    marcarComunicadosVistos();
    // Se vuelve a marcar si llega un aviso nuevo mientras el panel está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, notificaciones.length, comunicados.length]);

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

  // Las actualizaciones de Elo recientes van fijadas arriba; el resto, por fecha.
  const ahora = Date.now();
  const fijada = (n: Notificacion) =>
    n.tipo === "actualizacion_elo" &&
    ahora - Date.parse(n.creada) < DIAS_FIJADA * 86400 * 1000;
  const ordenadas = [...notificaciones].sort(
    (a, b) => Number(fijada(b)) - Number(fijada(a)) || Date.parse(b.creada) - Date.parse(a.creada)
  );

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

    if (n.tipo === "venta") {
      return yo ? (
        <>
          Has vendido a {jugador(n)}
          {n.importe !== null ? ` por ${n.importe} M` : ""} al mercado.
        </>
      ) : (
        <>
          {actor} ha vendido a {jugador(n)}
          {n.importe !== null ? ` por ${n.importe} M` : ""} al mercado.
        </>
      );
    }

    if (n.tipo === "clausula_subida") {
      return (
        <>
          Has subido la cláusula de {jugador(n)}
          {n.importe !== null ? ` en ${n.importe} M` : ""}.
        </>
      );
    }

    if (n.tipo === "oferta_rechazada") {
      return (
        <>
          Tu oferta por {jugador(n)}
          {dinero(n)} ha sido rechazada.
        </>
      );
    }

    if (n.tipo === "pago_jornada") {
      const d = n.datosPago;
      const donde = d?.jornada != null ? `la jornada ${d.jornada}` : "la jornada";
      const importe = n.importe ?? 0;
      const signo = importe > 0 ? "+" : "";
      if (d?.correccion) {
        return (
          <>
            Corrección de tus ingresos en {donde}:{" "}
            <span className="font-semibold">
              {signo}
              {importe} M
            </span>{" "}
            (ahora cuentas {d.puntos} puntos).
          </>
        );
      }
      return (
        <>
          Has ingresado <span className="font-semibold">{importe} M</span> por tus{" "}
          {d?.puntos ?? 0} puntos en {donde}.
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

  const comunicadosOrdenados = ordenarComunicados(comunicados);

  const bloqueComunicados = (
    <section>
      {!esLigaPublica && (
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Comunicados
        </h3>
      )}
      {comunicadosOrdenados.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          {esLigaPublica
            ? "No hay comunicados por ahora. Aquí aparecerán las novedades y avisos importantes."
            : "No hay comunicados vigentes."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comunicadosOrdenados.map((c) => (
            <ComunicadoCard
              key={c.id}
              titulo={c.titulo}
              cuerpo={c.cuerpo}
              etiqueta={c.etiqueta}
              creado={c.creado}
              nuevo={corteComunicados !== null && Date.parse(c.creado) > corteComunicados}
            />
          ))}
        </ul>
      )}
    </section>
  );

  const fila = (n: Notificacion) => {
    const nueva = corte !== null && n.actorId !== equipo.id && Date.parse(n.creada) > corte;
    if (n.tipo === "actualizacion_elo") {
      return <TarjetaElo key={n.id} n={n} nueva={nueva} />;
    }
    const etiqueta = ETIQUETA[n.tipo];
    return (
      <li
        key={n.id}
        className={`flex items-start gap-3 rounded-xl border p-3 ${
          nueva ? "border-accent/60 bg-accent/5" : "border-neutral-200 dark:border-neutral-800"
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
  };

  // Liga pública: comunicados del administrador + tus ingresos por ronda
  // (no se enseñan las operaciones de otros managers).
  if (esLigaPublica) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Comunicados</h2>
          {bloqueComunicados}
        </div>
        {ordenadas.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Tus ingresos
            </h3>
            <ul className="flex flex-col gap-2">{ordenadas.map(fila)}</ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Avisos</h2>
        {bloqueComunicados}
      </div>

      <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Actividad de la liga
      </h3>
      {notificaciones.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          Todavía no hay movimientos en tu liga.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordenadas.map(fila)}
        </ul>
      )}
      </section>
    </div>
  );
}

