"use client";

import Link from "next/link";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import ComunicadoCard from "@/components/ComunicadoCard";
import { useGameState } from "@/components/GameStateProvider";
import { useIdioma } from "@/components/IdiomaProvider";
import { ordenarComunicados } from "@/lib/comunicados";
import type { Notificacion } from "@/lib/types";

const ETIQUETA: Record<Notificacion["tipo"], { clases: string }> = {
  oferta_recibida: {
    clases: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  fichaje: {
    clases: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  clausulazo: {
    clases: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
  clausula_subida: {
    clases: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
  oferta_rechazada: {
    clases: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
  venta: {
    clases: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  },
  actualizacion_elo: {
    clases: "bg-accent text-white",
  },
  pago_jornada: {
    clases: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

// Una actualización de Elo se mantiene fijada arriba durante este tiempo.
const DIAS_FIJADA = 7;
// Las sugerencias leídas siguen saliendo en Avisos durante este tiempo.
const DIAS_SUGERENCIAS = 14;

// Rellena los huecos {actor}, {jugador}… de una frase con enlaces o negritas.
function rellenar(texto: string, valores: Record<string, ReactNode>): ReactNode {
  return texto.split(/(\{\w+\})/).map((trozo, i) => {
    const clave = /^\{(\w+)\}$/.exec(trozo)?.[1];
    return clave && clave in valores ? <Fragment key={i}>{valores[clave]}</Fragment> : trozo;
  });
}

function mesDe(periodo: string, locale: string): string {
  return new Date(`${periodo}T12:00:00`).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

function TarjetaElo({ n, nueva }: { n: Notificacion; nueva: boolean }) {
  const { t, locale } = useIdioma();
  const a = t.avisos;
  const d = n.datosElo;
  const dif = d ? Math.round((d.valorDespues - d.valorAntes) * 100) / 100 : 0;
  const pct = d && d.valorAntes > 0 ? (dif / d.valorAntes) * 100 : 0;
  const signo = dif > 0 ? "+" : "";
  return (
    <li className="rounded-2xl border-2 border-accent bg-accent/10 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {a.importante}
          </span>
          <h3 className="mt-2 text-base font-bold">
            {a.eloTitulo}
            {d ? ` · ${mesDe(d.periodo, locale)}` : ""}
          </h3>
        </div>
        {nueva && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-label={a.nueva} />}
      </div>
      {d && (
        <div className="mt-3 flex flex-col gap-1.5 text-sm">
          <p>{a.eloTexto(d.jugadoresActualizados)}</p>
          <p>
            {a.valorPlantilla}{" "}
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
              ? a.ningunCambio
              : a.conCambio(d.jugadoresConCambio)}
            {d.mejor && a.mayorSubida(d.mejor.nombre, d.mejor.delta)}
            {d.peor && a.mayorBajada(d.peor.nombre, Math.abs(d.peor.delta))}
          </p>
        </div>
      )}
      <p className="mt-2 text-xs text-neutral-500">{hace(n.creada, locale, a.ahoraMismo)}</p>
    </li>
  );
}

function hace(iso: string, locale: string, ahoraMismo: string): string {
  const segundos = Math.round((Date.parse(iso) - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(segundos);
  if (abs < 60) return ahoraMismo;
  if (abs < 3600) return rtf.format(Math.round(segundos / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(segundos / 3600), "hour");
  return rtf.format(Math.round(segundos / 86400), "day");
}

export default function NotificacionesPage() {
  const { t, locale } = useIdioma();
  const a = t.avisos;
  const {
    notificaciones,
    notificacionesVistasEn,
    marcarNotificacionesVistas,
    comunicados,
    comunicadosVistosEn,
    marcarComunicadosVistos,
    sugerencias,
    marcarAvisosSugerenciasVistos,
    esLigaPublica,
    equipo,
    cargando,
  } = useGameState();

  // Instante de la última visita ANTES de marcarlo como visto ahora: sirve
  // para resaltar lo nuevo mientras estás en el panel.
  const [corte, setCorte] = useState<number | null>(null);
  const [corteComunicados, setCorteComunicados] = useState<number | null>(null);
  // Sugerencias leídas que aún no habías visto al entrar (se resaltan).
  const [sugerenciasNuevas, setSugerenciasNuevas] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (cargando) return;
    setCorte((previo) => previo ?? notificacionesVistasEn);
    setCorteComunicados((previo) => previo ?? comunicadosVistosEn);
    marcarNotificacionesVistas();
    marcarComunicadosVistos();
    // Se vuelve a marcar si llega un aviso nuevo mientras el panel está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, notificaciones.length, comunicados.length]);

  // Igual con las sugerencias: se apuntan las nuevas antes de marcarlas vistas.
  useEffect(() => {
    if (cargando) return;
    const noVistas = sugerencias.filter((s) => s.leidaEn && !s.avisoVisto).map((s) => s.id);
    if (noVistas.length === 0) return;
    setSugerenciasNuevas((previo) => new Set([...Array.from(previo ?? []), ...noVistas]));
    marcarAvisosSugerenciasVistos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, sugerencias]);

  if (cargando) {
    return <p className="text-sm text-neutral-500">{a.cargando}</p>;
  }

  const jugador = (n: Notificacion): ReactNode =>
    n.jugadorId ? (
      <Link href={`/jugadores/${n.jugadorId}`} className="font-medium hover:underline">
        {n.jugadorNombre}
      </Link>
    ) : (
      <span className="font-medium">{n.jugadorNombre}</span>
    );

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
    const valores = {
      actor: <span className="font-medium">{n.actorNombre}</span>,
      jugador: jugador(n),
    };
    const imp = n.importe;

    if (n.tipo === "oferta_recibida") return rellenar(a.ofertaRecibida(imp), valores);
    if (n.tipo === "fichaje") return rellenar(yo ? a.fichajeYo(imp) : a.fichajeOtro(imp), valores);
    if (n.tipo === "venta") return rellenar(yo ? a.ventaYo(imp) : a.ventaOtro(imp), valores);
    if (n.tipo === "clausula_subida") return rellenar(a.clausulaSubida(imp), valores);
    if (n.tipo === "oferta_rechazada") return rellenar(a.ofertaRechazada(imp), valores);

    if (n.tipo === "pago_jornada") {
      const d = n.datosPago;
      const jornada = d?.jornada ?? null;
      const importe = n.importe ?? 0;
      const signo = importe > 0 ? "+" : "";
      if (d?.correccion) {
        return rellenar(a.pagoCorreccion(jornada, d.puntos), {
          importe: (
            <span className="font-semibold">
              {signo}
              {importe} M
            </span>
          ),
        });
      }
      return rellenar(a.pagoIngreso(jornada, d?.puntos ?? 0), {
        importe: <span className="font-semibold">{importe} M</span>,
      });
    }

    // clausulazo
    if (yo) return rellenar(a.clausulazoYo(n.objetivoNombre ?? null, imp), valores);
    if (n.objetivoId === equipo.id) return rellenar(a.clausulazoAMi(imp), valores);
    return rellenar(a.clausulazoOtro(n.objetivoNombre ?? null, imp), valores);
  };

  const comunicadosOrdenados = ordenarComunicados(comunicados);

  // Sugerencias leídas por el club: las de los últimos días y las que aún
  // no habías visto. Las nuevas suben arriba del todo.
  const sugerenciasLeidas = sugerencias.filter(
    (s) =>
      s.leidaEn &&
      (sugerenciasNuevas?.has(s.id) ||
        ahora - Date.parse(s.leidaEn) < DIAS_SUGERENCIAS * 86400 * 1000)
  );
  const haySugerenciasNuevas = sugerenciasLeidas.some((s) => sugerenciasNuevas?.has(s.id));

  const bloqueSugerencias = sugerenciasLeidas.length > 0 && (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {t.sugerencias.avisosTitulo}
      </h3>
      <ul className="flex flex-col gap-2">
        {sugerenciasLeidas.map((s) => {
          const nueva = sugerenciasNuevas?.has(s.id) ?? false;
          return (
            <li
              key={s.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                nueva ? "border-accent/60 bg-accent/5" : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                {t.sugerencias.avisoEtiqueta}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {t.sugerencias.avisoTexto(
                    new Date(s.creada).toLocaleDateString(locale, { day: "numeric", month: "long" })
                  )}
                </p>
                <p className="mt-1 line-clamp-2 text-xs italic text-neutral-500">«{s.texto}»</p>
                {s.respuesta && (
                  <p className="mt-2 rounded-lg bg-accent/10 px-2.5 py-2 text-sm">
                    <span className="font-semibold">{t.sugerencias.avisoRespuesta}</span>{" "}
                    <span className="whitespace-pre-line">{s.respuesta}</span>
                  </p>
                )}
                <p className="mt-0.5 text-xs text-neutral-500">
                  {hace(s.leidaEn as string, locale, a.ahoraMismo)}
                </p>
              </div>
              {nueva && (
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label={a.nueva} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );

  const bloqueComunicados = (
    <section>
      {!esLigaPublica && (
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {a.comunicados}
        </h3>
      )}
      {comunicadosOrdenados.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          {esLigaPublica
            ? a.sinComunicadosPublica
            : a.sinComunicados}
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
          {a.tipos[n.tipo]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm">{texto(n)}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{hace(n.creada, locale, a.ahoraMismo)}</p>
        </div>
        {nueva && (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label={a.nueva} />
        )}
      </li>
    );
  };

  // Liga pública: comunicados del administrador + tus ingresos por ronda
  // (no se enseñan las operaciones de otros managers).
  if (esLigaPublica) {
    return (
      <div className="flex flex-col gap-6">
        {haySugerenciasNuevas && bloqueSugerencias}
        <div>
          <h2 className="mb-3 text-lg font-semibold">{a.comunicados}</h2>
          {bloqueComunicados}
        </div>
        {!haySugerenciasNuevas && bloqueSugerencias}
        {ordenadas.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {a.tusIngresos}
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
        <h2 className="mb-3 text-lg font-semibold">{a.avisos}</h2>
        {haySugerenciasNuevas ? (
          <div className="flex flex-col gap-6">
            {bloqueSugerencias}
            {bloqueComunicados}
          </div>
        ) : (
          bloqueComunicados
        )}
      </div>

      {!haySugerenciasNuevas && bloqueSugerencias}

      <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {a.actividad}
      </h3>
      {notificaciones.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          {a.sinMovimientos}
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

