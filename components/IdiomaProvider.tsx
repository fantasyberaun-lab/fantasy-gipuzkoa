"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import {
  COOKIE_IDIOMA,
  IDIOMAS,
  LOCALE_INTL,
  NOMBRES_IDIOMA,
  type Idioma,
} from "@/lib/i18n/config";
import type { Textos } from "@/lib/i18n/textos";

interface IdiomaContextValue {
  idioma: Idioma;
  locale: string; // para Intl: "es-ES", "eu-ES", "en-GB"
  t: Textos;
  setIdioma: (idioma: Idioma) => void;
}

const IdiomaContext = createContext<IdiomaContextValue | null>(null);

// Proveedor común. NO importa ningún idioma: los textos se los pasa uno de los tres
// envoltorios de components/idioma/ (ProveedorEs/Eu/En), que el layout raíz elige según
// la cookie. Así el navegador solo descarga los textos de su idioma (~2/3 menos).
export function IdiomaProviderBase({
  idioma,
  textos,
  children,
}: {
  idioma: Idioma;
  textos: Textos;
  children: React.ReactNode;
}) {
  const setIdioma = useCallback((nuevo: Idioma) => {
    // Un año; SameSite=Lax basta (no es una cookie de sesión).
    document.cookie = `${COOKIE_IDIOMA}=${nuevo}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = nuevo;
    // Recarga completa: los Server Components se pintan en el nuevo idioma y se descargan
    // sus textos. Con router.refresh() el service worker podría servir una respuesta RSC
    // cacheada en el idioma anterior.
    window.location.reload();
  }, []);

  const valor = useMemo(
    () => ({ idioma, locale: LOCALE_INTL[idioma], t: textos, setIdioma }),
    [idioma, textos, setIdioma]
  );

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>;
}

export function useIdioma(): IdiomaContextValue {
  const ctx = useContext(IdiomaContext);
  if (!ctx) throw new Error("useIdioma debe usarse dentro de un proveedor de idioma");
  return ctx;
}

// Atajo para componentes cliente: const t = useT(); t.comun.guardar
export function useT(): Textos {
  return useIdioma().t;
}

// Lista para pintar un selector: [{ id: "es", nombre: "Castellano" }, …]
export const OPCIONES_IDIOMA = IDIOMAS.map((id) => ({ id, nombre: NOMBRES_IDIOMA[id] }));
