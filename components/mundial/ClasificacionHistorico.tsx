"use client";

import { useEffect, useMemo, useState } from "react";
import { useIdioma } from "@/components/IdiomaProvider";
import { createClient } from "@/lib/supabase/client";
import {
  fetchHistoricoClasificacion,
  fetchHistoricoLista,
  type FilaHistorico,
  type ItemHistorico,
} from "@/lib/supabase/mundialQueries";

const PAGINA = 50;

// Selector "Histórico" de la clasificación: las ligas ya jugadas en la liga pública (archivadas
// por el administrador, 0141) y el Mundial. Solo lectura; no toca los datos de la liga actual.
// `fijo`: id de una clasificación concreta (p. ej. "mundial"); sin selector. Lo usa "Actual" durante el evento.
export default function ClasificacionHistorico({ inicial, fijo }: { inicial?: string | null; fijo?: string }) {
  const { t, locale } = useIdioma();
  const h = t.mundial.historico;
  const supabase = useMemo(() => createClient(), []);
  const [lista, setLista] = useState<ItemHistorico[] | null>(null);
  const [elegido, setElegido] = useState<string>(fijo ?? "");
  const [filas, setFilas] = useState<FilaHistorico[] | null>(null);
  const [visibles, setVisibles] = useState(PAGINA);

  useEffect(() => {
    if (fijo) return;
    let vigente = true;
    fetchHistoricoLista(supabase).then((l) => {
      if (!vigente) return;
      setLista(l);
      const preferido = l.find((i) => i.id === inicial) ?? l[0];
      if (preferido) setElegido(preferido.id);
    });
    return () => {
      vigente = false;
    };
  }, [supabase, inicial, fijo]);

  // `fijo` manda siempre sobre lo elegido en el selector.
  const idActivo = fijo ?? elegido;

  useEffect(() => {
    if (!idActivo) return;
    let vigente = true;
    setFilas(null);
    setVisibles(PAGINA);
    fetchHistoricoClasificacion(supabase, idActivo).then((f) => {
      if (vigente) setFilas(f);
    });
    return () => {
      vigente = false;
    };
  }, [supabase, idActivo]);

  if (!fijo && lista === null) return <p className="text-sm text-neutral-500">{h.cargando}</p>;
  if (!fijo && lista !== null && lista.length === 0)
    return <p className="py-6 text-center text-sm text-neutral-500">{h.sin}</p>;

  const nombreItem = (i: ItemHistorico) => (i.tipo === "mundial" ? h.mundialNombre : i.nombre);
  const fechaItem = (i: ItemHistorico) =>
    new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(i.fecha));

  return (
    <div className="flex flex-col gap-3">
      {!fijo && <p className="text-xs text-neutral-500">{h.nota}</p>}
      {!fijo && lista && (
      <select
        aria-label={h.elegirAria}
        value={idActivo}
        onChange={(e) => setElegido(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      >
        {lista.map((i) => (
          <option key={i.id} value={i.id}>
            {nombreItem(i)} · {fechaItem(i)}
          </option>
        ))}
      </select>
      )}

      {filas === null ? (
        <p className="text-sm text-neutral-500">{h.cargando}</p>
      ) : filas.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">{h.vacia}</p>
      ) : (
        <>
          <ol className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filas.slice(0, visibles).map((f) => (
              <li
                key={`${f.posicion}-${f.nombreManager}`}
                className={`flex items-center justify-between gap-3 py-3 ${
                  f.esYo ? "rounded-lg bg-accent/10 px-3" : "px-3"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-7 shrink-0 text-center text-sm font-semibold text-neutral-500">
                    {f.posicion}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {f.nombreEquipo ?? f.nombreManager}
                      {f.esYo && <span className="ml-1.5 text-xs text-accent">({h.yo})</span>}
                    </p>
                    {f.nombreEquipo && f.nombreManager && (
                      <p className="truncate text-xs text-neutral-500">{f.nombreManager}</p>
                    )}
                    {f.aciertos !== null && f.jugadas !== null && (
                      <p className="text-xs text-neutral-500">{h.aciertos(f.aciertos, f.jugadas)}</p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {f.puntos} {h.puntos}
                </span>
              </li>
            ))}
          </ol>
          {visibles < filas.length && (
            <button
              type="button"
              onClick={() => setVisibles((v) => v + PAGINA)}
              className="self-center text-sm font-medium text-accent underline underline-offset-2"
            >
              +{Math.min(PAGINA, filas.length - visibles)}
            </button>
          )}
        </>
      )}
    </div>
  );
}
