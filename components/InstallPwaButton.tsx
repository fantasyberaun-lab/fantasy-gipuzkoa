"use client";

import { useState } from "react";
import { usePwaInstall } from "./PwaProvider";

/**
 * Botón pequeño para instalar la PWA. Pensado para vivir en sitios
 * discretos como el login. Se oculta solo si la app ya se está
 * ejecutando instalada (standalone).
 */
export default function InstallPwaButton() {
  const { canInstall, isStandalone, platform, promptInstall } =
    usePwaInstall();
  const [showIosHint, setShowIosHint] = useState(false);

  if (isStandalone) return null;

  // Android/desktop con el evento disponible: botón real de instalar.
  if (canInstall) {
    return (
      <button
        type="button"
        onClick={promptInstall}
        className="mx-auto flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-accent hover:text-accent dark:border-neutral-700 dark:text-neutral-400"
      >
        <DownloadIcon />
        Instalar app
      </button>
    );
  }

  // iOS Safari no dispara beforeinstallprompt: mostramos una pista breve.
  if (platform === "ios") {
    return (
      <div className="mx-auto max-w-xs text-center">
        <button
          type="button"
          onClick={() => setShowIosHint((v) => !v)}
          className="mx-auto flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-accent hover:text-accent dark:border-neutral-700 dark:text-neutral-400"
        >
          <DownloadIcon />
          Instalar app
        </button>
        {showIosHint && (
          <p className="mt-2 text-[11px] leading-snug text-neutral-500">
            Pulsa el icono Compartir{" "}
            <span aria-hidden>&#x2191;</span> de Safari y luego
            &quot;Añadir a pantalla de inicio&quot;.
          </p>
        )}
      </div>
    );
  }

  // Sin soporte de instalación (otros navegadores): no mostramos nada.
  return null;
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
