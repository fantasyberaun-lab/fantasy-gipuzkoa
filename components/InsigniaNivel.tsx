"use client";

import { useT } from "@/components/IdiomaProvider";

// Insignia pequeña con el nivel ("Nv 12"), para la clasificación y los perfiles.
// En la cabecera morada se usa NivelChip, que además sigue la XP.
export default function InsigniaNivel({ nivel, className = "" }: { nivel: number; className?: string }) {
  const tn = useT().niveles;
  return (
    <span
      title={tn.nivel(nivel)}
      aria-label={tn.nivel(nivel)}
      className={`inline-flex shrink-0 items-center rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-gold-dark dark:text-gold ${className}`}
    >
      {tn.nivelCorto(nivel)}
    </span>
  );
}
