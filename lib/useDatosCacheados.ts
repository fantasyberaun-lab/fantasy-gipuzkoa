"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Caché en memoria de las pantallas de consulta (torneos, fichas de jugador y
// de manager). Al volver a una pantalla ya vista se enseña al instante lo último
// que se cargó y se refresca por detrás. Se pierde al recargar la app y se vacía
// al cerrar sesión, para que otro usuario en el mismo navegador no vea nada ajeno.
const cache = new Map<string, unknown>();
let escuchandoSesion = false;

function vaciarAlCerrarSesion() {
  if (escuchandoSesion) return;
  escuchandoSesion = true;
  createClient().auth.onAuthStateChange((evento) => {
    if (evento === "SIGNED_OUT") cache.clear();
  });
}

export function useDatosCacheados<T>(
  clave: string,
  cargar: () => Promise<T>
): { datos: T | undefined; cargando: boolean } {
  const [, setVersion] = useState(0);

  useEffect(() => {
    vaciarAlCerrarSesion();
    let vigente = true;
    cargar()
      .then((valor) => {
        cache.set(clave, valor);
        if (vigente) setVersion((v) => v + 1);
      })
      .catch(() => {
        // Si falla, se queda lo que hubiera en caché.
      });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const datos = cache.get(clave) as T | undefined;
  return { datos, cargando: !cache.has(clave) };
}
