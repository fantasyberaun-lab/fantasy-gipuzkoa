"use client";

import { IdiomaProviderBase } from "@/components/IdiomaProvider";
import textos from "@/lib/i18n/textos/eu";

// Solo este archivo importa los textos de este idioma: si el jugador usa otro,
// el navegador no descarga este trozo.
export default function ProveedorEu({ children }: { children: React.ReactNode }) {
  return (
    <IdiomaProviderBase idioma="eu" textos={textos}>
      {children}
    </IdiomaProviderBase>
  );
}
