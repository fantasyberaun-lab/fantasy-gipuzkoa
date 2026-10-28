"use client";

import { useState } from "react";
import { useT } from "@/components/IdiomaProvider";

// Botón "Compartir": intenta compartir una imagen (generada en el servidor) por
// el menú nativo del móvil (ideal para stories de Instagram). Si el navegador no
// admite compartir archivos, comparte el texto y el enlace; y si tampoco, abre
// la imagen en una pestaña nueva para guardarla a mano.
export default function CompartirButton({
  urlImagen,
  texto,
  nombreArchivo = "beraun-fantasy.png",
  className,
}: {
  urlImagen: string;
  texto: string;
  nombreArchivo?: string;
  className?: string;
}) {
  const t = useT();
  const [estado, setEstado] = useState<"listo" | "preparando" | "error">("listo");

  async function compartir() {
    setEstado("preparando");
    try {
      const nav = navigator as Navigator & {
        canShare?: (data?: { files?: File[] }) => boolean;
      };

      let archivo: File | null = null;
      try {
        const resp = await fetch(urlImagen);
        if (resp.ok) {
          const blob = await resp.blob();
          archivo = new File([blob], nombreArchivo, { type: blob.type || "image/png" });
        }
      } catch {
        archivo = null;
      }

      if (archivo && nav.canShare?.({ files: [archivo] }) && nav.share) {
        await nav.share({ files: [archivo], text: texto });
      } else if (nav.share) {
        await nav.share({ text: texto, url: window.location.origin });
      } else {
        window.open(urlImagen, "_blank", "noopener,noreferrer");
      }
      setEstado("listo");
    } catch (e) {
      // El usuario cancela el diálogo de compartir: no es un error.
      if (e instanceof DOMException && e.name === "AbortError") {
        setEstado("listo");
        return;
      }
      setEstado("error");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={compartir}
        disabled={estado === "preparando"}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
        }
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
          />
        </svg>
        {estado === "preparando" ? t.engagement.compartirPreparando : t.engagement.compartir}
      </button>
      {estado === "error" && (
        <p className="mt-1 text-xs text-negative">{t.engagement.compartirError}</p>
      )}
    </div>
  );
}
