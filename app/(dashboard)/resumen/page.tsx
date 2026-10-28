"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/IdiomaProvider";
import CompartirButton from "@/components/CompartirButton";

interface Resumen {
  hay: boolean;
  equipo?: string;
  liga?: string;
  puntos?: number;
  posicion?: number | null;
  variacion?: number | null;
}

// Pantalla "Tu semana": el resumen semanal del manager (ver 0115). Es el destino
// del aviso push 'resumen' (/resumen) y se puede compartir en redes.
export default function ResumenPage() {
  const supabase = createClient();
  const t = useT();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("resumen_semanal");
      const d = (data ?? {}) as Record<string, unknown>;
      setResumen({
        hay: Boolean(d.hay),
        equipo: typeof d.equipo === "string" ? d.equipo : undefined,
        liga: typeof d.liga === "string" ? d.liga : undefined,
        puntos: d.puntos != null ? Number(d.puntos) : undefined,
        posicion: d.posicion != null ? Number(d.posicion) : null,
        variacion: d.variacion != null ? Number(d.variacion) : null,
      });
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargando) {
    return <p className="text-center text-sm text-neutral-500">{t.comun.cargando}</p>;
  }

  if (!resumen || !resumen.hay) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">{t.engagement.resumenTitulo}</h1>
        <p className="mt-3 text-sm text-neutral-500">{t.engagement.resumenSin}</p>
      </div>
    );
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
    `/api/compartir/resumen?equipo=${encodeURIComponent(equipo ?? "")}` +
    `&puntos=${encodeURIComponent(String(puntos ?? 0))}` +
    `&posicion=${encodeURIComponent(String(posicion ?? ""))}` +
    `&variacion=${encodeURIComponent(String(variacion ?? ""))}`;

  const textoCompartir = `${t.engagement.resumenPuntos(puntos ?? 0)} — Beraun Fantasy`;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-center font-display text-2xl font-semibold">{t.engagement.resumenTitulo}</h1>

      <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="banner-tablero px-5 py-4 text-white">
          <p className="text-sm text-white/80">{t.engagement.resumenEquipo}</p>
          <p className="font-display text-xl font-semibold">{equipo}</p>
          {liga && <p className="mt-0.5 text-xs text-white/70">{t.engagement.resumenLiga}: {liga}</p>}
        </div>

        <div className="flex flex-col items-center px-5 py-8">
          <p className="font-display text-6xl font-bold text-accent">{puntos}</p>
          <p className="mt-1 text-sm text-neutral-500">{t.engagement.resumenPuntos(puntos ?? 0)}</p>

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

      <div className="mt-5 flex justify-center">
        <CompartirButton urlImagen={urlImagen} texto={textoCompartir} nombreArchivo="mi-semana.png" />
      </div>
    </div>
  );
}
