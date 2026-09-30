import type { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";
import {
  PIE_CONDICIONES,
  SECCIONES_CONDICIONES,
  SUBTITULO_CONDICIONES,
  TITULO_CONDICIONES,
} from "@/lib/legal/condiciones";

export const metadata: Metadata = {
  title: "Condiciones de uso · Beraun Fantasy",
};

export default function CondicionesPage() {
  return (
    <LegalDocument
      titulo={TITULO_CONDICIONES}
      subtitulo={SUBTITULO_CONDICIONES}
      secciones={SECCIONES_CONDICIONES}
      pie={PIE_CONDICIONES}
    />
  );
}
