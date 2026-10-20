"use client";

import { useState } from "react";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import { formatoMillones } from "@/lib/minijuegos";
import type { FinalPartida } from "@/lib/supabase/minijuegosQueries";
import RepasoPartida from "./RepasoPartida";
import type { Ronda } from "./usePartida";

// Resumen al terminar una partida (del día o libre).
export default function FinPartida({
  puntos,
  final,
  perfecta = false,
  repaso = [],
  onOtra,
  onVolver,
}: {
  puntos: number;
  final: FinalPartida | null;
  perfecta?: boolean;
  repaso?: Ronda[];
  onOtra: () => void;
  onVolver: () => void;
}) {
  const t = useT().minijuegos;
  const { locale } = useIdioma();
  const ranked = !!final?.ranked;
  const r = final?.recompensa ?? null;
  const [verRepaso, setVerRepaso] = useState(false);

  return (
    <div className="space-y-4 text-center">
      <h3 className="font-display text-xl font-semibold">{t.finTitulo}</h3>
      {perfecta && <p className="text-sm font-semibold text-gold-dark">{t.holPerfecta}</p>}
      <p className="font-display text-5xl font-semibold text-accent">{t.finPuntos(final?.puntos ?? puntos)}</p>

      {ranked ? (
        <p className="text-sm text-neutral-500">{final?.mejora ? t.finMejora : t.finNoMejora}</p>
      ) : (
        <p className="text-sm text-neutral-500">{t.finLibre}</p>
      )}

      {r && (
        <div className="mx-auto max-w-xs rounded-xl border border-gold/60 p-3 dark:border-gold/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t.finRecompensa}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-gold-dark">
            +{formatoMillones(r.monedas, locale)} M · {t.masXp(r.xp)}
          </p>
          {(r.topeMonedas || r.topeXp) && <p className="mt-1 text-xs text-neutral-500">{t.finTope}</p>}
        </div>
      )}

      {repaso.length > 0 && (
        <div className="space-y-3 text-left">
          <button
            type="button"
            aria-expanded={verRepaso}
            onClick={() => setVerRepaso((v) => !v)}
            className="w-full rounded-xl border border-gold/60 px-5 py-3 text-[15px] font-semibold text-gold-dark transition-colors hover:bg-gold/10 dark:border-gold/40"
          >
            {verRepaso ? t.repasoOcultar : t.repasoVer}
          </button>
          {verRepaso && <RepasoPartida rondas={repaso} />}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onOtra}
          className="rounded-xl bg-accent px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          {t.jugarOtra}
        </button>
        <button
          type="button"
          onClick={onVolver}
          className="rounded-xl border border-neutral-300 px-5 py-3 text-[15px] font-semibold transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
        >
          {t.volverInicio}
        </button>
      </div>
    </div>
  );
}
