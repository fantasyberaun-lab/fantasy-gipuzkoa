"use client";

import { useState } from "react";
import { usePwaInstall } from "./PwaProvider";
import { useT } from "@/components/IdiomaProvider";

/**
 * Botón pequeño para instalar la PWA. Pensado para vivir en sitios
 * discretos como el login. Se oculta solo si la app ya se está
 * ejecutando instalada (standalone).
 */
export default function InstallPwaButton({
  onDark = false,
}: {
  // onDark: para usarlo sobre la cabecera morada.
  onDark?: boolean;
}) {
  const { canInstall, isStandalone, platform, promptInstall } =
    usePwaInstall();
  const [showHint, setShowHint] = useState(false);
  const t = useT();

  const botonClase = `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
    onDark
      ? "border-white/25 text-white/80 hover:border-gold hover:text-gold"
      : "mx-auto border-neutral-300 text-neutral-500 hover:border-accent hover:text-accent dark:border-neutral-700 dark:text-neutral-400"
  }`;
  const pistaClase = `mt-2 text-[11px] leading-snug ${
    onDark ? "text-white/70" : "text-neutral-500"
  }`;

  if (isStandalone) return null;

  // Android/desktop con el evento disponible: botón real de instalar.
  if (canInstall) {
    return (
      <button
        type="button"
        onClick={promptInstall}
        className={botonClase}
      >
        <DownloadIcon />
        {t.pwa.instalarApp}
      </button>
    );
  }

  // iOS Safari no dispara beforeinstallprompt nunca. Chrome/Android sí
  // puede hacerlo, pero depende de una heurística de "engagement" del
  // navegador y a veces no llega a dispararse — antes, si no llegaba,
  // el botón no aparecía en ningún sitio para Android. Para las dos
  // plataformas mostramos el botón siempre, con instrucciones manuales
  // como respaldo.
  if (platform === "ios" || platform === "android") {
    return (
      <div className={onDark ? "max-w-xs" : "mx-auto max-w-xs text-center"}>
        <button
          type="button"
          onClick={() => setShowHint((v) => !v)}
          className={botonClase}
        >
          <DownloadIcon />
          {t.pwa.instalarApp}
        </button>
        {showHint && (
          <p className={pistaClase}>
            {platform === "ios" ? (
              <>
                {t.pwa.iosAntes} <span aria-hidden>&#x2191;</span>
                {t.pwa.iosDespues}
              </>
            ) : (
              t.pwa.android
            )}
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
