"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchTorneos } from "@/lib/supabase/torneosQueries";
import {
  estadoTorneo,
  ordenarTorneos,
  rangoFechas,
  type Torneo,
} from "@/lib/torneos";

export default function TorneosPage() {
  const supabase = createClient();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      setTorneos(ordenarTorneos(await fetchTorneos(supabase)));
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando torneos…</p>;
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Torneos</h2>

      {torneos.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          Todavía no hay torneos.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {torneos.map((t) => {
            const estado = estadoTorneo(t);
            const fechas = rangoFechas(t);
            const lugar = [t.lugar, t.ciudad].filter(Boolean).join(", ");
            return (
              <li key={t.id}>
                <Link
                  href={`/torneos/${t.id}`}
                  className="flex flex-col gap-1 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{t.nombre}</p>
                    {estado && (
                      <span className="whitespace-nowrap rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-500 dark:border-neutral-700">
                        {estado}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {[
                      t.categoria ? `${t.categoria}ª categoría` : null,
                      fechas,
                      lugar || null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {t.participantes} jugador{t.participantes === 1 ? "" : "es"} ·{" "}
                    {t.rondasCreadas} jornada{t.rondasCreadas === 1 ? "" : "s"}
                    {t.numeroRondas != null ? ` de ${t.numeroRondas}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}