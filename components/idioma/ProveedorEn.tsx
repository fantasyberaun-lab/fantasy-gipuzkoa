"use client";

import { IdiomaProviderBase } from "@/components/IdiomaProvider";
import textos from "@/lib/i18n/textos/en";

// Solo este archivo importa los textos de este idioma: si el jugador usa otro,
// el navegador no descarga este trozo.
export default function ProveedorEn({ children }: { children: React.ReactNode }) {
  return (
    <IdiomaProviderBase idioma="en" textos={textos}>
      {children}
    </IdiomaProviderBase>
  );
}
