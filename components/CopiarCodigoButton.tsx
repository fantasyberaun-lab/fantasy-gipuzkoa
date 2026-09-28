"use client";

import { useState } from "react";

// Copia el código de una liga al portapapeles y muestra "¡Copiado!" un momento.
export default function CopiarCodigoButton({
  codigo,
  className = "",
}: {
  codigo: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async (e: React.MouseEvent) => {
    // Por si el botón está dentro de otro elemento clicable.
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      // Respaldo para navegadores sin clipboard API (o sin https).
      const campo = document.createElement("textarea");
      campo.value = codigo;
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(campo);
      }
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copiar}
      className={`rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800 ${className}`}
    >
      {copiado ? "¡Copiado!" : "Copiar código"}
    </button>
  );
}
