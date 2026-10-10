"use client";

import Segmentado from "@/components/Segmentado";
import { OPCIONES_IDIOMA, useIdioma } from "@/components/IdiomaProvider";

// Selector de idioma del menú de ajustes. Al cambiar se guarda en la cookie
// "idioma" y se recarga la página (ver IdiomaProvider).
export default function SelectorIdioma() {
  const { idioma, setIdioma, t } = useIdioma();
  return (
    <>
      <Segmentado
        etiqueta={t.idioma.titulo}
        valor={idioma}
        onCambiar={(nuevo) => {
          if (nuevo !== idioma) setIdioma(nuevo);
        }}
        opciones={OPCIONES_IDIOMA.map((o) => ({ valor: o.id, texto: o.nombre }))}
      />
      {idioma !== "es" && <p className="mt-1.5 text-xs text-neutral-500">{t.idioma.aviso}</p>}
    </>
  );
}
