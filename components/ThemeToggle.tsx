"use client";

import { useEffect, useState } from "react";
import { aplicarTema, guardarPreferenciaTema, leerPreferenciaTema } from "@/lib/tema";

// Botón suelto de claro/oscuro (lo usa el panel de admin). En la app de
// managers el tema se elige desde el menú de ajustes (MenuAjustes).
export default function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(aplicarTema(leerPreferenciaTema()));
  }, []);

  function toggle() {
    setIsDark(guardarPreferenciaTema(isDark ? "claro" : "oscuro"));
  }

  // onDark: para usarlo sobre la cabecera morada.
  const estilo = onDark
    ? "border-white/25 text-white/80 hover:border-gold hover:text-gold"
    : "border-neutral-300 text-neutral-600 hover:border-accent hover:text-accent dark:border-neutral-700 dark:text-neutral-300";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${estilo}`}
    >
      {isDark ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
