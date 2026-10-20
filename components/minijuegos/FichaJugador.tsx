"use client";

import { useT } from "@/components/IdiomaProvider";
import type { CartaJugador } from "@/lib/supabase/minijuegosQueries";

// Ficha de un jugador con sus datos (Elo, club, categoría y, si viene, valor y año).
// Si recibe onClick es un botón; "marca" pinta el borde del color de su pareja.
export default function FichaJugador({
  j,
  onClick,
  seleccionada = false,
  marca,
  deshabilitada = false,
}: {
  j: CartaJugador;
  onClick?: () => void;
  seleccionada?: boolean;
  marca?: string;
  deshabilitada?: boolean;
}) {
  const t = useT().minijuegos;
  const datos: string[] = [
    j.elo > 0 ? `${t.eloEtiqueta} ${j.elo}` : t.fichaSinElo,
    j.club ?? t.fichaSinClub,
  ];
  if (j.categoria) datos.push(`${t.categoriaEtiqueta} ${j.categoria}`);
  if (j.valor != null) datos.push(`${t.valorEtiqueta} ${j.valor} M`);
  if (j.anio != null) datos.push(String(j.anio));

  const clases = `block w-full rounded-xl border px-3 py-3 text-left transition-colors ${
    seleccionada ? "border-accent bg-accent/10" : "border-neutral-300 dark:border-neutral-700"
  } ${onClick && !deshabilitada ? "hover:border-accent hover:bg-accent/5" : ""}`;
  const contenido = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 break-words text-[15px] font-semibold">{j.nombre}</span>
        {marca && (
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white"
            aria-hidden="true"
          >
            {marca}
          </span>
        )}
      </span>
      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500">
        {datos.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </span>
    </>
  );

  if (!onClick) return <div className={clases}>{contenido}</div>;
  return (
    <button type="button" onClick={onClick} disabled={deshabilitada} aria-pressed={seleccionada} className={clases}>
      {contenido}
    </button>
  );
}
