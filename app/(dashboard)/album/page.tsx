"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/IdiomaProvider";
import { fetchAlbum, type CartaAlbum, type Rareza } from "@/lib/supabase/albumQueries";

const ORDEN_RAREZA: Rareza[] = ["legendario", "epico", "raro", "comun"];

// Marco por rareza (conseguido). Sin conseguir va en gris apagado.
const MARCO: Record<Rareza, string> = {
  legendario: "border-gold bg-gold/5",
  epico: "border-brand-500 bg-brand-50 dark:bg-brand-950/30",
  raro: "border-accent bg-accent/5",
  comun: "border-neutral-300 dark:border-neutral-700",
};
const PUNTO: Record<Rareza, string> = {
  legendario: "bg-gold",
  epico: "bg-brand-500",
  raro: "bg-accent",
  comun: "bg-neutral-400",
};

// Álbum de cromos (Fase 3): colección cosmética de los jugadores que has tenido
// en plantilla, por rareza (0123).
export default function AlbumPage() {
  const supabase = createClient();
  const t = useT();
  const [cartas, setCartas] = useState<CartaAlbum[] | null>(null);

  useEffect(() => {
    fetchAlbum(supabase).then(setCartas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { conseguidos, total } = useMemo(() => {
    const lista = cartas ?? [];
    return { conseguidos: lista.filter((c) => c.conseguido).length, total: lista.length };
  }, [cartas]);

  if (cartas === null) {
    return <p className="text-center text-sm text-neutral-500">{t.comun.cargando}</p>;
  }

  if (cartas.length === 0) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">{t.album.titulo}</h1>
        <p className="mt-3 text-sm text-neutral-500">{t.album.sin}</p>
      </div>
    );
  }

  const progreso = total > 0 ? (conseguidos / total) * 100 : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-semibold">{t.album.titulo}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t.album.intro}</p>

      <div className="mt-4">
        <p className="text-sm font-semibold">{t.album.progreso(conseguidos, total)}</p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      {ORDEN_RAREZA.map((rareza) => {
        const grupo = cartas.filter((c) => c.rareza === rareza);
        if (grupo.length === 0) return null;
        return (
          <section key={rareza} className="mt-6">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              <span className={`h-2 w-2 rounded-full ${PUNTO[rareza]}`} aria-hidden="true" />
              {t.album.rarezas[rareza]}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {grupo.map((c) => (
                <div
                  key={c.playerId}
                  className={`rounded-xl border-2 p-2.5 transition-opacity ${
                    c.conseguido ? MARCO[c.rareza] : "border-neutral-200 opacity-50 dark:border-neutral-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-500">
                      {c.categoria ? t.album.categoria(c.categoria) : ""}
                    </span>
                    {c.conseguido ? (
                      <span className={`h-2 w-2 rounded-full ${PUNTO[c.rareza]}`} aria-hidden="true" />
                    ) : (
                      <span className="text-neutral-400" aria-hidden="true">🔒</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[15px] font-semibold leading-tight">{c.nombre}</p>
                  {c.club && <p className="truncate text-xs text-neutral-500">{c.club}</p>}
                  <p className="mt-1 font-display text-lg font-bold text-accent">
                    {c.elo > 0 ? c.elo : "—"}
                  </p>
                  {!c.conseguido && (
                    <p className="text-[11px] text-neutral-400">{t.album.bloqueado}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
