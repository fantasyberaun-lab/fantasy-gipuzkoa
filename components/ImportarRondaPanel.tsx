"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  contarEmparejamientosDB,
  guardarResultadoDB,
  marcarDescansoDB,
  publicarEmparejamientosDB,
  retirarEmparejamientosDB,
  type EmparejamientoPublicable,
  type JugadorAdmin,
} from "@/lib/supabase/adminQueries";
import type { JugadorOrigen, PartidaOrigen, RondaOrigen } from "@/lib/importador/tipos";
import { buscarJugador, crearIndice, type Enlace } from "@/lib/importador/emparejar";
import { pedirRonda } from "@/lib/importador/cliente";

const BOTON =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-neutral-700";

const TEXTO_RESULTADO: Record<PartidaOrigen["resultado"], string> = {
  blancas: "1-0",
  negras: "0-1",
  tablas: "½-½",
  pendiente: "sin resultado",
  incomparecencia: "incomparecencia",
  desconocido: "?",
};

function Etiqueta({ enlace }: { enlace: Enlace | null }) {
  if (!enlace) return <span className="text-xs text-neutral-400">fuera del Fantasy</span>;
  if (enlace.por === "nombre") {
    return <span className="text-xs text-amber-600 dark:text-amber-400">por nombre</span>;
  }
  return null;
}

// Panel de la pantalla de Resultados: lee la ronda de la web de origen y
// permite publicar los emparejamientos y, cuando estén, los resultados.
// Nada se publica sin que el administrador pulse el botón.
export default function ImportarRondaPanel({
  urlTorneo,
  numeroRonda,
  matchdayId,
  jugadores,
  alCambiar,
}: {
  urlTorneo: string;
  numeroRonda: number;
  matchdayId: string;
  jugadores: JugadorAdmin[];
  // Para que la pantalla vuelva a leer los resultados de la jornada.
  alCambiar: () => Promise<void>;
}) {
  const supabase = createClient();
  const indice = useMemo(() => crearIndice(jugadores), [jugadores]);

  const [ronda, setRonda] = useState<RondaOrigen | null>(null);
  const [cargando, setCargando] = useState(false);
  const [ocupado, setOcupado] = useState<"emparejamientos" | "resultados" | "retirar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [informe, setInforme] = useState<{ tipo: "ok" | "error"; lineas: string[] } | null>(null);
  const [publicadas, setPublicadas] = useState<number | null>(null);
  const [soloFantasy, setSoloFantasy] = useState(true);

  const fuente = urlTorneo.includes("info64") ? "Info64" : "Chess-Results";

  // Al cambiar de jornada se descarta lo leído antes.
  useEffect(() => {
    setRonda(null);
    setError(null);
    setInforme(null);
    contarEmparejamientosDB(supabase, matchdayId).then(setPublicadas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchdayId]);

  const buscar = (j: JugadorOrigen) => buscarJugador(indice, j);

  const filas = useMemo(
    () =>
      (ronda?.partidas ?? []).map((p) => ({
        p,
        w: buscarJugador(indice, p.blancas),
        b: buscarJugador(indice, p.negras),
      })),
    [ronda, indice]
  );
  const sinRival = useMemo(
    () => (ronda?.sinRival ?? []).map((s) => ({ s, e: buscarJugador(indice, s.jugador) })),
    [ronda, indice]
  );

  const relevantes = filas.filter((f) => f.w || f.b);
  const conResultado = relevantes.filter((f) =>
    ["blancas", "negras", "tablas"].includes(f.p.resultado)
  );
  const descansos = sinRival.filter((x) => x.e && x.s.tipo === "descanso");
  const visibles = soloFantasy ? relevantes : filas;

  async function leer() {
    setError(null);
    setInforme(null);
    setCargando(true);
    const respuesta = await pedirRonda(urlTorneo, numeroRonda);
    setCargando(false);
    if (!respuesta.ok) {
      setRonda(null);
      setError(respuesta.mensaje);
      return;
    }
    setRonda(respuesta.datos);
  }

  async function publicarEmparejamientos() {
    if (!ronda) return;
    const mesas: EmparejamientoPublicable[] = [
      ...relevantes.map((f) => ({
        tablero: f.p.tablero,
        blancoPlayerId: f.w?.id ?? null,
        blancoElo: f.w ? null : f.p.blancas.elo,
        negroPlayerId: f.b?.id ?? null,
        negroElo: f.b ? null : f.p.negras.elo,
        descansa: false,
      })),
      ...descansos.map((x) => ({
        tablero: null,
        blancoPlayerId: x.e!.id,
        blancoElo: null,
        negroPlayerId: null,
        negroElo: null,
        descansa: true,
      })),
    ];

    if (mesas.length === 0) {
      setInforme({ tipo: "error", lineas: ["Ningún jugador de esta ronda está en tu base."] });
      return;
    }

    setOcupado("emparejamientos");
    const resultado = await publicarEmparejamientosDB(supabase, matchdayId, mesas);
    setOcupado(null);

    if (!resultado.ok) {
      setInforme({ tipo: "error", lineas: [resultado.mensaje] });
      return;
    }
    setPublicadas(resultado.total);
    setInforme({
      tipo: "ok",
      lineas: [`Emparejamientos publicados: ${resultado.total} (los managers ya los ven).`],
    });
  }

  async function publicarResultados() {
    if (!ronda) return;
    const ok = confirm(
      `Se guardarán los resultados de ${conResultado.length} partidas de la ronda ${ronda.numero} y se recalcularán los puntos. ` +
        "Si ya había resultados guardados de estos jugadores, se sobrescriben. ¿Continuar?"
    );
    if (!ok) return;

    setOcupado("resultados");
    const lineas: string[] = [];
    let guardadas = 0;
    let fallos = 0;

    for (const f of conResultado) {
      const { p, w, b } = f;
      const nombres = `${p.blancas.nombre} – ${p.negras.nombre}`;

      // Se guarda desde el lado de un jugador de la base. Si juegan dos de la
      // base, la base guarda sola el resultado espejo del rival.
      let input;
      if (w) {
        input = {
          playerId: w.id,
          resultado:
            p.resultado === "tablas" ? "tablas" : p.resultado === "blancas" ? "victoria" : "derrota",
          rivalPlayerId: b?.id ?? null,
          rivalElo: b ? null : p.negras.elo,
        } as const;
      } else {
        input = {
          playerId: b!.id,
          resultado:
            p.resultado === "tablas" ? "tablas" : p.resultado === "negras" ? "victoria" : "derrota",
          rivalPlayerId: null,
          rivalElo: p.blancas.elo,
        } as const;
      }

      const r = await guardarResultadoDB(supabase, { matchdayId, ...input });
      if (r.ok) guardadas++;
      else {
        fallos++;
        lineas.push(`✗ ${nombres}: ${r.mensaje}`);
      }
    }

    let descansosGuardados = 0;
    for (const x of descansos) {
      const r = await marcarDescansoDB(supabase, matchdayId, x.e!.id);
      if (r.ok) descansosGuardados++;
      else {
        fallos++;
        lineas.push(`✗ Descanso de ${x.s.jugador.nombre}: ${r.mensaje}`);
      }
    }

    // Lo que no se aplica solo, se explica.
    for (const f of relevantes) {
      if (f.p.resultado === "incomparecencia" || f.p.resultado === "desconocido") {
        lineas.push(
          `⚠ ${f.p.blancas.nombre} – ${f.p.negras.nombre}: resultado "${f.p.textoResultado}" sin aplicar, introdúcelo a mano.`
        );
      }
    }
    for (const x of sinRival) {
      if (x.e && x.s.tipo !== "descanso") {
        lineas.push(
          `⚠ ${x.s.jugador.nombre}: sin rival y resultado "${x.s.textoResultado}" sin aplicar, revísalo a mano.`
        );
      }
    }
    const pendientes = relevantes.length - conResultado.length;
    if (pendientes > 0) lineas.push(`${pendientes} partidas aún sin resultado (no se han tocado).`);

    setOcupado(null);
    await alCambiar();
    setInforme({
      tipo: fallos > 0 ? "error" : "ok",
      lineas: [
        `Resultados guardados: ${guardadas} partidas${
          descansosGuardados > 0 ? ` y ${descansosGuardados} descansos` : ""
        }${fallos > 0 ? ` · ${fallos} con error` : ""}.`,
        ...lineas,
      ],
    });
  }

  async function retirar() {
    if (!confirm("¿Retirar los emparejamientos publicados de esta ronda?")) return;
    setOcupado("retirar");
    const r = await retirarEmparejamientosDB(supabase, matchdayId);
    setOcupado(null);
    if (!r.ok) {
      setInforme({ tipo: "error", lineas: [r.mensaje] });
      return;
    }
    setPublicadas(0);
    setInforme({ tipo: "ok", lineas: ["Emparejamientos retirados."] });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Importar la ronda {numeroRonda} desde {fuente}</h3>
          <p className="text-xs text-neutral-500">
            Lee la ronda tal como está ahora en su web. No se publica nada hasta que lo pidas.
            {publicadas ? ` · ${publicadas} mesas publicadas en esta ronda.` : ""}
          </p>
        </div>
        <button onClick={leer} disabled={cargando} className={BOTON}>
          {cargando ? "Leyendo…" : ronda ? "Volver a leer" : `Leer ronda ${numeroRonda}`}
        </button>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      {ronda && (
        <>
          <p className="text-sm">
            {ronda.partidas.length} partidas
            {ronda.fecha ? ` · ${ronda.fecha}${ronda.hora ? ` ${ronda.hora}` : ""}` : ""} ·{" "}
            <span className="font-medium">{relevantes.length}</span> con jugadores de tu base ·{" "}
            <span className="font-medium">{conResultado.length}</span> con resultado
            {descansos.length > 0 ? ` · ${descansos.length} descansan` : ""}
          </p>

          {ronda.avisos.map((a) => (
            <p key={a} className="text-xs text-amber-600 dark:text-amber-400">
              {a}
            </p>
          ))}

          <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={soloFantasy}
              onChange={(e) => setSoloFantasy(e.target.checked)}
            />
            Mostrar solo partidas con jugadores de mi base
          </label>

          <div className="max-h-80 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500 dark:bg-neutral-900">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Mesa</th>
                  <th className="px-2 py-1.5 font-medium">Blancas</th>
                  <th className="px-2 py-1.5 text-center font-medium">Res.</th>
                  <th className="px-2 py-1.5 font-medium">Negras</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(({ p, w, b }) => (
                  <tr
                    key={`${p.tablero}-${p.blancas.nombre}`}
                    className="border-t border-neutral-200 dark:border-neutral-800"
                  >
                    <td className="px-2 py-1.5 text-neutral-500">{p.tablero ?? ""}</td>
                    <td className="px-2 py-1.5">
                      {p.blancas.nombre} <Etiqueta enlace={w} />
                    </td>
                    <td className="px-2 py-1.5 text-center font-medium">
                      {TEXTO_RESULTADO[p.resultado]}
                    </td>
                    <td className="px-2 py-1.5">
                      {p.negras.nombre} <Etiqueta enlace={b} />
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-center text-neutral-500">
                      Ninguna partida con jugadores de tu base.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {sinRival.length > 0 && (
            <p className="text-xs text-neutral-500">
              Sin rival:{" "}
              {sinRival
                .filter((x) => !soloFantasy || x.e)
                .map((x) => `${x.s.jugador.nombre} (${x.s.textoResultado || "—"})`)
                .join(", ") || "ninguno de tu base"}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={publicarEmparejamientos}
              disabled={ocupado !== null || relevantes.length === 0}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {ocupado === "emparejamientos" ? "Publicando…" : "Publicar emparejamientos"}
            </button>
            <button
              onClick={publicarResultados}
              disabled={ocupado !== null || conResultado.length === 0}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {ocupado === "resultados" ? "Guardando…" : "Publicar resultados"}
            </button>
            {publicadas ? (
              <button onClick={retirar} disabled={ocupado !== null} className={BOTON}>
                Retirar emparejamientos
              </button>
            ) : null}
          </div>
        </>
      )}

      {informe && (
        <div
          className={`flex flex-col gap-1 text-sm ${
            informe.tipo === "error" ? "text-negative" : "text-positive"
          }`}
        >
          {informe.lineas.map((l, i) => (
            <p key={i} className={i === 0 ? "font-medium" : "text-xs"}>
              {l}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
