"use client";

import { useMemo, useState } from "react";
import type { JugadorAdmin } from "@/lib/supabase/adminQueries";
import type { JugadorOrigen, TorneoOrigen } from "@/lib/importador/tipos";
import { buscarJugador, crearIndice } from "@/lib/importador/emparejar";
import { pedirTorneo } from "@/lib/importador/cliente";

export interface ImportacionTorneo {
  torneo: TorneoOrigen;
  // Jugadores del torneo que ya están en tu base de jugadores
  idsJugadores: string[];
}

const INPUT =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

// Caja "Importar desde un enlace" del formulario de torneos: pegas el enlace
// de chess-results o de Info64 y rellena la ficha y los jugadores.
export default function ImportarTorneoBox({
  jugadores,
  onImportado,
}: {
  jugadores: JugadorAdmin[];
  onImportado: (datos: ImportacionTorneo) => void;
}) {
  const [url, setUrl] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<{
    torneo: TorneoOrigen;
    porFide: number;
    porNombre: number;
    sinEncontrar: JugadorOrigen[];
  } | null>(null);

  const indice = useMemo(() => crearIndice(jugadores), [jugadores]);

  async function importar() {
    setError(null);
    setResumen(null);
    if (!url.trim()) {
      setError("Pega el enlace del torneo.");
      return;
    }

    setCargando(true);
    const respuesta = await pedirTorneo(url);
    setCargando(false);

    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      return;
    }

    const torneo = respuesta.datos;
    const ids = new Set<string>();
    const sinEncontrar: JugadorOrigen[] = [];
    let porFide = 0;
    let porNombre = 0;

    for (const j of torneo.jugadores) {
      const enlace = buscarJugador(indice, j);
      if (!enlace) {
        sinEncontrar.push(j);
        continue;
      }
      ids.add(enlace.id);
      if (enlace.por === "fide") porFide++;
      else porNombre++;
    }

    setResumen({ torneo, porFide, porNombre, sinEncontrar });
    onImportado({ torneo, idsJugadores: [...ids] });
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Importar desde chess-results o Info64
      </legend>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://chess-results.com/tnr1497509.aspx  ·  https://info64.org/nombre-del-torneo"
          className={`${INPUT} sm:flex-1`}
        />
        <button
          type="button"
          onClick={importar}
          disabled={cargando}
          className="whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {cargando ? "Importando…" : "Importar datos"}
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        Rellena el nombre, el organizador, el lugar, las fechas, las rondas y los jugadores. Lo que
        no encuentre se queda como estaba, y puedes retocarlo todo antes de crear el torneo.
      </p>

      {error && <p className="text-sm text-negative">{error}</p>}

      {resumen && (
        <div className="flex flex-col gap-2 text-sm">
          <p>
            <span className="font-medium">{resumen.torneo.nombre}</span> importado de{" "}
            {resumen.torneo.fuente === "info64" ? "Info64" : "Chess-Results"}.{" "}
            {resumen.porFide + resumen.porNombre} de {resumen.torneo.jugadores.length} jugadores
            están en tu base
            {resumen.porNombre > 0 ? ` (${resumen.porNombre} enlazados por nombre: revísalos)` : ""}.
          </p>

          {resumen.torneo.avisos.map((aviso) => (
            <p key={aviso} className="text-xs text-amber-600 dark:text-amber-400">
              {aviso}
            </p>
          ))}

          {resumen.sinEncontrar.length > 0 && (
            <details className="text-xs text-neutral-600 dark:text-neutral-400">
              <summary className="cursor-pointer">
                {resumen.sinEncontrar.length} jugadores que no están en tu base (no puntuarán en el
                Fantasy; si juegan contra uno tuyo cuentan como rival externo)
              </summary>
              <ul className="mt-2 columns-1 gap-4 sm:columns-2">
                {resumen.sinEncontrar.map((j) => (
                  <li key={`${j.rank}-${j.nombre}`}>
                    {j.nombre}
                    {j.elo ? ` · ${j.elo}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </fieldset>
  );
}
