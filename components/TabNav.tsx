"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useGameState } from "@/components/GameStateProvider";

// Iconos (trazo, 24x24) para la barra inferior del móvil.
const icon = (d: string) => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

interface Tab {
  href: string;
  label: string; // mismo nombre en escritorio y en la barra inferior del móvil
  icono: ReactNode;
}

const TABS: Tab[] = [
  {
    href: "/plantilla",
    label: "Plantilla",
    icono: icon(
      "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    ),
  },
  {
    href: "/mercado",
    label: "Mercado",
    icono: icon(
      "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
    ),
  },
  {
    href: "/jugadores",
    label: "Jugadores",
    icono: icon(
      "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    ),
  },
  {
    href: "/clasificacion",
    label: "Clasificación",
    icono: icon(
      "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
    ),
  },
  {
    href: "/torneos",
    label: "Torneos",
    icono: icon(
      "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    ),
  },
  {
    href: "/notificaciones",
    label: "Avisos",
    icono: icon(
      "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
    ),
  },
];

function Badge({ n, className = "" }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span
      aria-label={`${n} sin leer`}
      className={`rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ${className}`}
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

export default function TabNav() {
  const pathname = usePathname();
  const { notificacionesNoLeidas, esLigaPublica } = useGameState();

  // En la liga pública no hay plantillas ajenas con clausulazos ni avisos de
  // fichajes: todo se hace desde el Mercado.
  const tabs = esLigaPublica
    ? TABS.filter((tab) => tab.href !== "/jugadores" && tab.href !== "/notificaciones")
    : TABS;

  return (
    <>
      {/* Escritorio / tablet: pestañas arriba, como siempre. */}
      <nav className="hidden gap-6 border-b border-neutral-200 dark:border-neutral-800 sm:flex">
        {tabs.map((tab) => {
          const isActive = pathname?.startsWith(tab.href);
          const badge = tab.href === "/notificaciones" ? notificacionesNoLeidas : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {tab.label}
              <Badge n={badge} />
            </Link>
          );
        })}
      </nav>

      {/* Móvil: barra fija abajo, todas las pestañas visibles sin deslizar. */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-[#EDEAE3]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-neutral-800 dark:bg-[#141416]/95 sm:hidden"
      >
        <ul className="mx-auto flex max-w-md">
          {tabs.map((tab) => {
            const isActive = pathname?.startsWith(tab.href);
            const badge = tab.href === "/notificaciones" ? notificacionesNoLeidas : 0;
            return (
              <li key={tab.href} className="min-w-0 flex-1">
                <Link
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex flex-col items-center gap-0.5 px-0.5 pb-2 pt-2 text-[10px] font-medium transition-colors ${
                    isActive ? "text-accent" : "text-neutral-500"
                  }`}
                >
                  <span className="relative">
                    {tab.icono}
                    <Badge
                      n={badge}
                      className="absolute -right-2.5 -top-1.5 px-1 py-[3px] text-[9px]"
                    />
                  </span>
                  <span className="w-full truncate text-center">{tab.label}</span>
                  {isActive && (
                    <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
