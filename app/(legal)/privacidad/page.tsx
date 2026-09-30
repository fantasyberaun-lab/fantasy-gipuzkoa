import type { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";
import InfoBasicaRGPD from "@/components/legal/InfoBasicaRGPD";
import {
  PIE_PRIVACIDAD,
  SECCIONES_PRIVACIDAD,
  SUBTITULO_PRIVACIDAD,
  TITULO_PRIVACIDAD,
} from "@/lib/legal/privacidad";

export const metadata: Metadata = {
  title: "Política de privacidad · Beraun Fantasy",
};

export default function PrivacidadPage() {
  return (
    <LegalDocument
      titulo={TITULO_PRIVACIDAD}
      subtitulo={SUBTITULO_PRIVACIDAD}
      secciones={SECCIONES_PRIVACIDAD}
      pie={PIE_PRIVACIDAD}
    >
      <InfoBasicaRGPD />
    </LegalDocument>
  );
}
