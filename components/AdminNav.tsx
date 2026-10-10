"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { contarSugerenciasPendientes } from "@/lib/supabase/sugerenciasQueries";

const TABS = [
  { href: "/admin", label: "Jugadores" },
  { href: "/admin/torneos", label: "Torneos" },
  { href: "/admin/resultados", label: "Resultados" },
  { href: "/admin/comunicados", label: "Comunicados" },
  { href: "/admin/actividad", label: "Actividad" },
  { href: "/admin/sugerencias", label: "Sugerencias" },
];

export default function AdminNav() {
  const pathname = usePathname();
  // Sugerencias sin leer, para el globo de la pestaña. Se recuenta al cambiar
  // de pestaña (p. ej. al volver tras marcar varias como leídas).
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    contarSugerenciasPendientes(createClient()).then(setPendientes);
  }, [pathname]);

  return (
    <nav className="flex gap-6 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {tab.label}
            {tab.href === "/admin/sugerencias" && pendientes > 0 && (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {pendientes > 9 ? "9+" : pendientes}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
