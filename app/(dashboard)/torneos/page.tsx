"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIdioma } from "@/components/IdiomaProvider";
import { fetchTorneos } from "@/lib/supabase/torneosQueries";
import { estadoTorneo, ordenarTorneos, rangoFechas, type Torneo } from "@/lib/torneos";

// Listado de torneos para los managers: SOLO LECTURA. Crear, editar o borrar
// torneos (y sus jornadas) es cosa del panel de administración (/admin/torneos),
// que además queda protegido por el middleware y por RLS (es_root()).
export default function TorneosPage() {
  const supabase = createClient();
  const { t: textos, locale } = useIdioma();
  const tt = textos.torneos;
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
    return <p className="text-sm text-neutral-500">{tt.cargando}</p>;
  }

  if (torneos.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500">
        {tt.vacio}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        {tt.intro}
      </p>
      <ul className="flex flex-col gap-3">
        {torneos.map((t) => {
          const estado = estadoTorneo(t);
          const fechas = rangoFechas(t, locale);
          return (
            <li key={t.id}>
              <Link
                href={`/torneos/${t.id}`}
                className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-accent dark:border-neutral-800"
              >
                <h2 className="text-base font-semibold">{t.nombre}</h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  {t.categoria && <span>{tt.categoria(t.categoria)}</span>}
                  {estado && (
                    <span className="rounded-full border border-neutral-300 px-2 py-0.5 dark:border-neutral-700">
                      {tt.estados[estado]}
                    </span>
                  )}
                  {fechas && <span>{fechas}</span>}
                  <span>{tt.jugadores(t.participantes)}</span>
                  <span>{tt.jornadas(t.rondasCreadas, t.numeroRondas)}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
