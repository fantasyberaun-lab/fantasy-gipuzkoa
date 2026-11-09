"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { contarSugerenciasPendientes } from "@/lib/supabase/sugerenciasQueries";
import { contarDenunciasChatPendientes } from "@/lib/supabase/chatQueries";
import { contarDenunciasForoPendientes } from "@/lib/supabase/foroQueries";
import { useT } from "@/components/IdiomaProvider";

export default function AdminNav() {
  const t = useT().nav;
  const tabs = [
    { href: "/admin", label: t.jugadores },
    { href: "/admin/torneos", label: t.torneos },
    { href: "/admin/resultados", label: t.resultados },
    { href: "/admin/comunicados", label: t.comunicados },
    { href: "/admin/actividad", label: t.actividad },
    { href: "/admin/sugerencias", label: t.sugerencias },
    { href: "/admin/chat", label: t.chat },
    { href: "/admin/variables", label: t.variables },
  ];
  const pathname = usePathname();
  // Sugerencias sin leer, para el globo de la pestaña. Se recuenta al cambiar
  // de pestaña (p. ej. al volver tras marcar varias como leídas).
  const [pendientes, setPendientes] = useState(0);
  const [denuncias, setDenuncias] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    contarSugerenciasPendientes(supabase).then(setPendientes);
    // Chat + foros (0112). Cada recuento devuelve 0 si su función aún no existe.
    Promise.all([
      contarDenunciasChatPendientes(supabase),
      contarDenunciasForoPendientes(supabase),
    ]).then(([chat, foro]) => setDenuncias(chat + foro));
  }, [pathname]);

  return (
    <nav className="flex gap-6 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
      {tabs.map((tab) => {
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
            {tab.href === "/admin/chat" && denuncias > 0 && (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {denuncias > 9 ? "9+" : denuncias}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
