"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import CompartirButton from "@/components/CompartirButton";
import { formatoMillones } from "@/lib/minijuegos";
import {
  fetchResumenPendiente,
  marcarResumenVisto,
  type ResumenSemanal as Resumen,
} from "@/lib/supabase/resumenQueries";

// Número que sube de 0 al valor al aparecer (o al cambiar de liga). Con
// "reducir movimiento" activado se pinta directamente el valor final.
function useContador(valor: number, duracion = 700): number {
  const [n, setN] = useState(valor);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(valor);
      return;
    }
    let raf = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const p = Math.min(1, (ahora - inicio) / duracion);
      setN(Math.round(valor * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracion]);
  return n;
}

// Datos de ejemplo para ver la pantalla sin esperar a cerrar una jornada: se abre
// añadiendo ?resumen=demo a cualquier página. No lee ni guarda nada.
const DEMO: Resumen = {
  semana: "demo",
  jornada: 8,
  ligas: [
    {
      equipo: "Los Peones Locos",
      liga: "Liga Gipuzkoa",
      puntos: 47,
      posicion: 2,
      variacion: 3,
      equipos: 24,
      total: 312,
      importe: 47,
      mejor: { nombre: "Etxeberria Agirre, Jon", puntos: 16 },
    },
    {
      equipo: "Gambito de Bera",
      liga: "Liga del club",
      puntos: 31,
      posicion: 5,
      variacion: -1,
      equipos: 9,
      total: 240,
      importe: 31,
      mejor: { nombre: "Garmendia Lasa, Ane", puntos: 12 },
    },
    {
      equipo: "Torre y Txapela",
      liga: "Cuadrilla",
      puntos: 18,
      posicion: 1,
      variacion: 0,
      equipos: 6,
      total: 198,
      importe: 18,
      mejor: null,
    },
  ],
};

// Color del puesto: oro, plata y bronce para el podio.
function clasePuesto(posicion: number | null): string {
  if (posicion === 1) return "text-gold-dark dark:text-gold";
  if (posicion === 2) return "text-neutral-400";
  if (posicion === 3) return "text-amber-700 dark:text-amber-600";
  return "";
}

// Pantalla "Tu semana" (0117/0123): al entrar tras cerrarse la jornada se pone una
// vez delante de todo, con una tarjeta por cada liga del manager (se cambia con las
// pestañas, las flechas o deslizando), un botón para compartirla y otro para cerrarla.
// Sin avisos push: solo se ve al volver a entrar en la app.
export default function ResumenSemanal() {
  const supabase = createClient();
  const t = useT();
  const { locale } = useIdioma();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [indice, setIndice] = useState(0);
  const toqueX = useRef<number | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("resumen")?.startsWith("demo")) {
      setResumen(DEMO);
      return;
    }
    let vivo = true;
    fetchResumenPendiente(supabase).then((r) => {
      if (vivo) setResumen(r);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = resumen?.ligas.length ?? 0;
  const actual = resumen?.ligas[Math.min(indice, Math.max(0, total - 1))] ?? null;
  const puntosAnimados = useContador(actual?.puntos ?? 0);

  function cerrar() {
    if (resumen && resumen !== DEMO) marcarResumenVisto(supabase, resumen.semana);
    setResumen(null);
  }

  function mover(delta: number) {
    setIndice((i) => Math.min(total - 1, Math.max(0, i + delta)));
  }

  useEffect(() => {
    if (!resumen) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowLeft") mover(-1);
      if (e.key === "ArrowRight") mover(1);
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumen]);

  if (!resumen || !actual || typeof document === "undefined") return null;

  const { equipo, liga, puntos, posicion, variacion, equipos, importe, mejor } = actual;
  const variacionTexto =
    variacion == null
      ? null
      : variacion > 0
        ? `▲ ${t.engagement.resumenSube(variacion)}`
        : variacion < 0
          ? `▼ ${t.engagement.resumenBaja(Math.abs(variacion))}`
          : `= ${t.engagement.resumenIgual}`;
  const claseVariacion =
    variacion != null && variacion > 0
      ? "bg-positive/10 text-positive"
      : variacion != null && variacion < 0
        ? "bg-negative/10 text-negative"
        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800";

  const urlImagen =
    `/api/compartir/resumen?equipo=${encodeURIComponent(equipo)}` +
    `&liga=${encodeURIComponent(liga ?? "")}` +
    `&puntos=${encodeURIComponent(String(puntos))}` +
    `&posicion=${encodeURIComponent(String(posicion ?? ""))}` +
    `&variacion=${encodeURIComponent(String(variacion ?? ""))}`;
  const textoCompartir = `${t.engagement.resumenPuntos(puntos)} — Beraun Fantasy`;

  const datos: { etiqueta: string; valor: string; detalle?: string; clase?: string }[] = [];
  if (posicion != null) {
    datos.push({
      etiqueta: t.engagement.resumenPosicionEtiqueta,
      valor: t.engagement.resumenOrdinal(posicion),
      detalle: equipos ? t.engagement.resumenDe(equipos) : undefined,
      clase: clasePuesto(posicion),
    });
  }
  if (actual.total != null) {
    datos.push({ etiqueta: t.engagement.resumenAcumulado, valor: t.engagement.resumenPts(actual.total) });
  }
  if (importe != null) {
    datos.push({
      etiqueta: t.engagement.resumenGanado,
      valor: `${importe > 0 ? "+" : ""}${formatoMillones(importe, locale)} M`,
      clase: importe > 0 ? "text-positive" : "",
    });
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.engagement.resumenTitulo}
      className="fixed inset-0 z-[55] overflow-y-auto bg-brand-950/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-4 px-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            {resumen.jornada != null && (
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                {t.engagement.resumenJornada(resumen.jornada)}
              </p>
            )}
            <h1 className="font-display text-3xl font-semibold text-white">{t.engagement.resumenTitulo}</h1>
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label={t.engagement.resumenCerrar}
            className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {total > 1 && (
          <div
            role="tablist"
            aria-label={t.engagement.resumenLigas}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          >
            {resumen.ligas.map((l, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === indice}
                onClick={() => setIndice(i)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  i === indice
                    ? "bg-gold text-brand-950"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                {l.liga ?? l.equipo}
              </button>
            ))}
          </div>
        )}

        <div
          className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
          onTouchStart={(e) => {
            toqueX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (toqueX.current == null) return;
            const dx = e.changedTouches[0].clientX - toqueX.current;
            toqueX.current = null;
            if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
          }}
        >
          <div className="banner-tablero px-5 py-4 text-white">
            {liga && <p className="text-xs font-semibold uppercase tracking-wider text-gold">{liga}</p>}
            <p className="break-words font-display text-xl font-semibold">{equipo}</p>
          </div>

          <div className="flex flex-col items-center px-5 pb-5 pt-7">
            <p className="font-display text-7xl font-bold leading-none tabular-nums text-accent">
              {puntosAnimados}
            </p>
            <p className="mt-2 text-sm text-neutral-500">{t.engagement.resumenPuntosEtiqueta(puntos)}</p>
            {variacionTexto && (
              <p className={`mt-4 rounded-full px-3 py-1 text-sm font-semibold ${claseVariacion}`}>
                {variacionTexto}
              </p>
            )}
          </div>

          {datos.length > 0 && (
            <dl
              className="grid divide-x divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800"
              style={{ gridTemplateColumns: `repeat(${datos.length}, minmax(0, 1fr))` }}
            >
              {datos.map((d) => (
                <div key={d.etiqueta} className="min-w-0 px-2 py-3 text-center">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    {d.etiqueta}
                  </dt>
                  <dd className={`mt-0.5 text-lg font-bold tabular-nums ${d.clase ?? ""}`}>
                    {d.valor}
                    {d.detalle && (
                      <span className="ml-1 text-xs font-medium text-neutral-500">{d.detalle}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {mejor && (
            <div className="flex items-center gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
              <span aria-hidden="true" className="text-xl text-gold-dark dark:text-gold">
                ★
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  {t.engagement.resumenMejor}
                </p>
                <p className="truncate text-sm font-semibold">{mejor.nombre}</p>
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-accent">
                {t.engagement.resumenPts(mejor.puntos)}
              </p>
            </div>
          )}
        </div>

        {total > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => mover(-1)}
              disabled={indice === 0}
              aria-label={t.engagement.resumenAnterior}
              className="rounded-full p-2 text-white transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {resumen.ligas.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === indice ? "w-5 bg-gold" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => mover(1)}
              disabled={indice === total - 1}
              aria-label={t.engagement.resumenSiguiente}
              className="rounded-full p-2 text-white transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-start justify-center gap-3">
          <CompartirButton urlImagen={urlImagen} texto={textoCompartir} nombreArchivo="mi-semana.png" />
          <button
            type="button"
            onClick={cerrar}
            className="rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            {t.engagement.resumenCerrar}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
