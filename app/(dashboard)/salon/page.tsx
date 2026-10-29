"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useT } from "@/components/IdiomaProvider";
import { fetchSalonFama, type RecordSalon, type SalonFama } from "@/lib/supabase/salonQueries";

// Salón de la fama (Fase 3): récords de la liga, derivados (0122).
export default function SalonPage() {
  const supabase = createClient();
  const t = useT();
  const { equipo } = useGameState();
  const [salon, setSalon] = useState<SalonFama | null>(null);

  useEffect(() => {
    if (!equipo.leagueId) return;
    fetchSalonFama(supabase, equipo.leagueId).then(setSalon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo.leagueId]);

  if (salon === null) {
    return <p className="text-center text-sm text-neutral-500">{t.comun.cargando}</p>;
  }

  const tarjetas: { icono: string; titulo: string; rec: RecordSalon | null; sub: string }[] = [
    {
      icono: "👑",
      titulo: t.salon.lider,
      rec: salon.lider,
      sub: salon.lider ? t.salon.puntos(salon.lider.valor) : "",
    },
    {
      icono: "🔥",
      titulo: t.salon.mejorJornada,
      rec: salon.mejorJornada,
      sub: salon.mejorJornada
        ? `${t.salon.puntos(salon.mejorJornada.valor)}${
            salon.mejorJornada.jornada != null
              ? ` · ${t.salon.enJornada(salon.mejorJornada.jornada)}`
              : ""
          }`
        : "",
    },
    {
      icono: "⚔️",
      titulo: t.salon.reyDuelos,
      rec: salon.reyDuelos,
      sub: salon.reyDuelos ? t.salon.victorias(salon.reyDuelos.valor) : "",
    },
  ];

  const hayAlguno = tarjetas.some((c) => c.rec);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-semibold">{t.salon.titulo}</h1>

      {!hayAlguno ? (
        <p className="mt-3 text-sm text-neutral-500">{t.salon.sin}</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {tarjetas
            .filter((c) => c.rec)
            .map((c) => (
              <div
                key={c.titulo}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="text-3xl" aria-hidden="true">
                  {c.icono}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">{c.titulo}</p>
                  <p className="truncate text-[15px] font-semibold">{c.rec!.equipo}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {c.rec!.manager} · {c.sub}
                  </p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
