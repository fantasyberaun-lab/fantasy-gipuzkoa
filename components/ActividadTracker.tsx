"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MISMA_RUTA_MS = 30_000; // no se cuenta dos veces la misma pantalla en 30 s
const VOLVER_TRAS_MS = 30 * 60_000; // la app (PWA) puede quedarse abierta horas

// /torneos/3f2a... -> /torneos/:id, para que cada torneo no sea una ruta distinta.
function normalizarRuta(ruta: string): string {
  return ruta
    .split("/")
    .map((trozo) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trozo) || /^\d+$/.test(trozo)
        ? ":id"
        : trozo
    )
    .join("/");
}

// No pinta nada: anota en Supabase (registrar_actividad) qué pantalla abre cada
// manager, para las métricas de Admin > Actividad. Si falla, no pasa nada.
export default function ActividadTracker() {
  const pathname = usePathname();
  const supabase = createClient();
  const ultimo = useRef<{ ruta: string; en: number }>({ ruta: "", en: 0 });

  function registrar(ruta: string) {
    const normalizada = normalizarRuta(ruta);
    const ahora = Date.now();
    if (ultimo.current.ruta === normalizada && ahora - ultimo.current.en < MISMA_RUTA_MS) return;
    ultimo.current = { ruta: normalizada, en: ahora };
    supabase.rpc("registrar_actividad", { p_ruta: normalizada }).then(
      () => {},
      () => {}
    );
  }

  useEffect(() => {
    if (pathname) registrar(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Si dejas la app abierta y vuelves horas después, cuenta como actividad de ese día.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState !== "visible" || !pathname) return;
      if (Date.now() - ultimo.current.en > VOLVER_TRAS_MS) registrar(pathname);
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
