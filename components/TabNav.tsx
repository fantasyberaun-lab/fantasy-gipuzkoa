"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGameState } from "@/components/GameStateProvider";

const TABS = [
  { href: "/plantilla", label: "Mi plantilla" },
  { href: "/mercado", label: "Mercado" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/clasificacion", label: "Clasificación" },
  { href: "/torneos", label: "Torneos" },
  { href: "/notificaciones", label: "Notificaciones" },
];

export default function TabNav() {
  const pathname = usePathname();
  const { notificacionesNoLeidas } = useGameState();

  return (
    <nav className="flex gap-6 overflow-x-auto whitespace-nowrap border-b border-neutral-200 dark:border-neutral-800">
      {TABS.map((tab) => {
        const isActive = pathname?.startsWith(tab.href);
        const badge = tab.href === "/notificaciones" ? notificacionesNoLeidas : 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {tab.label}
            {badge > 0 && (
              <span
                aria-label={`${badge} sin leer`}
                className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
              >
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
