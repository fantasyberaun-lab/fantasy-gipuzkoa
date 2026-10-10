"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  COOKIE_IDIOMA,
  IDIOMAS,
  LOCALE_INTL,
  NOMBRES_IDIOMA,
  type Idioma,
} from "@/lib/i18n/config";
import { TEXTOS, type Textos } from "@/lib/i18n/textos";

interface IdiomaContextValue {
  idioma: Idioma;
  locale: string; // para Intl: "es-ES", "eu-ES", "en-GB"
  t: Textos;
  setIdioma: (idioma: Idioma) => void;
}

const IdiomaContext = createContext<IdiomaContextValue | null>(null);

// El idioma inicial lo lee el layout raíz de la cookie, así servidor y
// cliente pintan lo mismo desde el primer render.
export function IdiomaProvider({
  idiomaInicial,
  children,
}: {
  idiomaInicial: Idioma;
  children: React.ReactNode;
}) {
  const [idioma, setEstado] = useState<Idioma>(idiomaInicial);

  const setIdioma = useCallback((nuevo: Idioma) => {
    // Un año; SameSite=Lax basta (no es una cookie de sesión).
    document.cookie = `${COOKIE_IDIOMA}=${nuevo}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = nuevo;
    setEstado(nuevo);
    // Recarga completa para que los Server Components se pinten en el nuevo
    // idioma. Con router.refresh() el service worker podría servir una
    // respuesta RSC cacheada en el idioma anterior.
    window.location.reload();
  }, []);

  const valor = useMemo(
    () => ({ idioma, locale: LOCALE_INTL[idioma], t: TEXTOS[idioma], setIdioma }),
    [idioma, setIdioma]
  );

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>;
}

export function useIdioma(): IdiomaContextValue {
  const ctx = useContext(IdiomaContext);
  if (!ctx) throw new Error("useIdioma debe usarse dentro de <IdiomaProvider>");
  return ctx;
}

// Atajo para componentes cliente: const t = useT(); t.comun.guardar
export function useT(): Textos {
  return useIdioma().t;
}

// Lista para pintar un selector: [{ id: "es", nombre: "Castellano" }, …]
export const OPCIONES_IDIOMA = IDIOMAS.map((id) => ({ id, nombre: NOMBRES_IDIOMA[id] }));
