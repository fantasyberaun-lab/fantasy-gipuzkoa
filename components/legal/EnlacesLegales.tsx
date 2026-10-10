"use client";

import Link from "next/link";
import { useT } from "@/components/IdiomaProvider";

export default function EnlacesLegales({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <nav
      aria-label={t.ajustes.titulos.legal}
      className={`flex items-center justify-center gap-4 text-xs text-neutral-500 ${className}`}
    >
      <Link href="/privacidad" className="underline-offset-2 hover:underline">
        {t.ajustes.privacidad}
      </Link>
      <Link href="/condiciones" className="underline-offset-2 hover:underline">
        {t.ajustes.condiciones}
      </Link>
    </nav>
  );
}
