"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Jugadores" },
  { href: "/admin/resultados", label: "Resultados" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6 border-b border-neutral-200 dark:border-neutral-800">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
