"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchTorneos } from "@/lib/supabase/torneosQueries";
import { estadoTorneo, ordenarTorneos, rangoFechas, type Torneo } from "@/lib/torneos";

// Listado de torneos para los managers: SOLO LECTURA. Crear, editar o borrar
// torneos (y sus jornadas) es cosa del panel de administración (/admin/torneos),
// que además queda protegido por el middleware y por RLS (es_root()).
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

  if (torneos.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500">
        Todavía no hay torneos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        Los torneos reales de los que salen las jornadas del Fantasy. Entra en uno para ver
        sus jugadores y resultados.
      </p>
      <ul className="flex flex-col gap-3">
        {torneos.map((t) => {
          const estado = estadoTorneo(t);
          const fechas = rangoFechas(t);
          return (
            <li key={t.id}>
              <Link
                href={`/torneos/${t.id}`}
                className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-accent dark:border-neutral-800"
              >
                <h2 className="text-base font-semibold">{t.nombre}</h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  {t.categoria && <span>{t.categoria}ª categoría</span>}
                  {estado && (
                    <span className="rounded-full border border-neutral-300 px-2 py-0.5 dark:border-neutral-700">
                      {estado}
                    </span>
                  )}
                  {fechas && <span>{fechas}</span>}
                  <span>
                    {t.participantes} jugador{t.participantes === 1 ? "" : "es"}
                  </span>
                  <span>
                    {t.rondasCreadas}
                    {t.numeroRondas != null ? ` / ${t.numeroRondas}` : ""} jornada
                    {t.rondasCreadas === 1 ? "" : "s"}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
