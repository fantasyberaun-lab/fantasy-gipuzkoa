"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AvatarPerfil from "@/components/AvatarPerfil";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import {
  EVENTO_MINIJUEGOS,
  fetchRankingMinijuegos,
  type JuegoRanking,
  type PeriodoRanking,
  type Ranking,
} from "@/lib/supabase/minijuegosQueries";

// Ranking de un minijuego (o del total): hoy y general. Muestra los 50
// primeros y, si no estás entre ellos, tu posición.
export default function RankingMinijuegos({
  juego,
  titulo,
  ayuda,
}: {
  juego: JuegoRanking;
  titulo: string;
  ayuda?: string;
}) {
  const supabase = createClient();
  const t = useT().minijuegos;
  const { locale } = useIdioma();
  const [periodo, setPeriodo] = useState<PeriodoRanking>("dia");
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      const r = await fetchRankingMinijuegos(supabase, juego, periodo);
      if (!vivo) return;
      setRanking(r);
      setCargando(false);
    }
    setCargando(true);
    cargar();
    // Al terminar una partida cambian los puntos.
    window.addEventListener(EVENTO_MINIJUEGOS, cargar);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_MINIJUEGOS, cargar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [juego, periodo]);

  const enTop = ranking?.filas.some((f) => f.yo) ?? false;

  return (
    <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">{titulo}</h3>
        <div role="tablist" className="inline-flex rounded-full bg-neutral-100 p-0.5 dark:bg-neutral-900">
          {(["dia", "general"] as const).map((p) => (
            <button
              key={p}
              role="tab"
              type="button"
              aria-selected={periodo === p}
              onClick={() => setPeriodo(p)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                periodo === p ? "bg-accent text-white" : "text-neutral-600 hover:text-accent dark:text-neutral-300"
              }`}
            >
              {p === "dia" ? t.rankingHoy : t.rankingGeneral}
            </button>
          ))}
        </div>
      </div>
      {ayuda && <p className="mt-1 text-xs text-neutral-500">{ayuda}</p>}

      <div className="mt-3">
        {cargando ? (
          <p className="py-4 text-center text-sm text-neutral-500">{t.cargando}</p>
        ) : !ranking || ranking.filas.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-500">{t.rankingNadie}</p>
        ) : (
          <>
            <ol className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {ranking.filas.map((f) => (
                <li
                  key={`${f.pos}-${f.nombre}`}
                  className={`flex items-center gap-3 py-2 ${f.yo ? "-mx-2 rounded-lg bg-gold/15 px-2" : ""}`}
                >
                  <span className="w-7 shrink-0 text-center font-display text-lg font-semibold text-neutral-500">
                    {f.pos}
                  </span>
                  <AvatarPerfil avatar={f.avatar} nombre={f.nombre} tamano={28} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {f.nombre}
                    {f.yo && <span className="ml-1 text-xs text-neutral-500">({t.tu})</span>}
                    <span className="ml-1.5 text-xs font-normal text-neutral-500">{t.nivelCorto(f.nivel)}</span>
                  </span>
                  <span className="shrink-0 font-display text-lg font-semibold text-accent">
                    {f.puntos.toLocaleString(locale)}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-neutral-500">
              {ranking.mi && !enTop
                ? t.rankingTuPosicion(ranking.mi.pos, ranking.mi.puntos.toLocaleString(locale))
                : !ranking.mi
                  ? t.rankingSinPuntos
                  : ""}{" "}
              {t.rankingParticipantes(ranking.participantes)}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
