"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/IdiomaProvider";
import CompartirButton from "@/components/CompartirButton";
import {
  fetchResumenPendiente,
  marcarResumenVisto,
  type ResumenSemanal as Resumen,
} from "@/lib/supabase/resumenQueries";

// Pantalla "Tu semana" (0117): al entrar tras cerrarse la jornada se pone una vez
// delante de todo, con un botón para compartirla y otro para cerrarla. Sin avisos
// push: solo se ve al volver a entrar en la app.
export default function ResumenSemanal() {
  const supabase = createClient();
  const t = useT();
  const [resumen, setResumen] = useState<Resumen | null>(null);

  useEffect(() => {
    let vivo = true;
    fetchResumenPendiente(supabase).then((r) => {
      if (vivo) setResumen(r);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!resumen || typeof document === "undefined") return null;

  function cerrar() {
    if (resumen) marcarResumenVisto(supabase, resumen.semana);
    setResumen(null);
  }

  const { equipo, liga, puntos, posicion, variacion } = resumen;
  const variacionTexto =
    variacion == null
      ? null
      : variacion > 0
        ? t.engagement.resumenSube(variacion)
        : variacion < 0
          ? t.engagement.resumenBaja(Math.abs(variacion))
          : t.engagement.resumenIgual;

  const urlImagen =
    `/api/compartir/resumen?equipo=${encodeURIComponent(equipo)}` +
    `&puntos=${encodeURIComponent(String(puntos))}` +
    `&posicion=${encodeURIComponent(String(posicion ?? ""))}` +
    `&variacion=${encodeURIComponent(String(variacion ?? ""))}`;
  const textoCompartir = `${t.engagement.resumenPuntos(puntos)} — Beraun Fantasy`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.engagement.resumenTitulo}
      className="fixed inset-0 z-[55] flex flex-col items-center justify-center gap-4 overflow-y-auto bg-brand-950/95 px-4 py-6 backdrop-blur-sm"
    >
      <h1 className="text-center font-display text-2xl font-semibold text-white">
        {t.engagement.resumenTitulo}
      </h1>

      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <div className="banner-tablero px-5 py-4 text-white">
          <p className="text-sm text-white/80">{t.engagement.resumenEquipo}</p>
          <p className="font-display text-xl font-semibold">{equipo}</p>
          {liga && (
            <p className="mt-0.5 text-xs text-white/70">
              {t.engagement.resumenLiga}: {liga}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center px-5 py-8">
          <p className="font-display text-6xl font-bold text-accent">{puntos}</p>
          <p className="mt-1 text-sm text-neutral-500">{t.engagement.resumenPuntos(puntos)}</p>

          {posicion != null && (
            <p className="mt-5 text-lg font-semibold">{t.engagement.resumenPosicion(posicion)}</p>
          )}
          {variacionTexto && (
            <p
              className={`mt-1 text-sm font-semibold ${
                variacion && variacion > 0
                  ? "text-positive"
                  : variacion && variacion < 0
                    ? "text-negative"
                    : "text-neutral-500"
              }`}
            >
              {variacionTexto}
            </p>
          )}
        </div>
      </div>

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
    </div>,
    document.body
  );
}
