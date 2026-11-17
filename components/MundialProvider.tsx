"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchMundialConfig, type MundialConfig } from "@/lib/supabase/mundialQueries";

// Interruptores del evento del Mundial (0141): si el modo Match está encendido, la pestaña
// Plantilla se cambia por Match y el Mercado se oculta. Se lee al entrar, al volver a la
// pestaña del navegador y cada 5 minutos, para que el cambio del administrador llegue solo.
interface MundialContexto extends MundialConfig {
  cargado: boolean;
  recargar: () => Promise<void>;
}

const POR_DEFECTO: MundialContexto = {
  activo: false,
  modoMatch: false,
  cargado: false,
  recargar: async () => {},
};

const Contexto = createContext<MundialContexto>(POR_DEFECTO);
const CLAVE = "mundial-config";

function leerGuardado(): MundialConfig | null {
  try {
    const bruto = sessionStorage.getItem(CLAVE);
    return bruto ? (JSON.parse(bruto) as MundialConfig) : null;
  } catch {
    return null;
  }
}

export function MundialProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<MundialConfig>({ activo: false, modoMatch: false });
  const [cargado, setCargado] = useState(false);

  const recargar = useCallback(async () => {
    const c = await fetchMundialConfig(createClient());
    setConfig(c);
    setCargado(true);
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(c));
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  }, []);

  useEffect(() => {
    // Lo último que se vio, para no parpadear mientras llega la respuesta.
    const guardado = leerGuardado();
    if (guardado) setConfig(guardado);
    recargar();
    const id = setInterval(recargar, 5 * 60 * 1000);
    const alVolver = () => {
      if (document.visibilityState === "visible") recargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [recargar]);

  return <Contexto.Provider value={{ ...config, cargado, recargar }}>{children}</Contexto.Provider>;
}

export function useMundial(): MundialContexto {
  return useContext(Contexto);
}

// Para las pantallas que se ocultan durante el evento (Plantilla, Mercado): si el modo Match
// está encendido, llevan a /match. Devuelve true mientras tanto, para no pintar la pantalla.
export function useRedirigirAMatch(): boolean {
  const { modoMatch } = useMundial();
  const router = useRouter();
  useEffect(() => {
    if (modoMatch) router.replace("/match");
  }, [modoMatch, router]);
  return modoMatch;
}
