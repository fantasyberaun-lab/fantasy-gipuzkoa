"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useIdioma } from "@/components/IdiomaProvider";
import AvatarPerfil from "@/components/AvatarPerfil";
import { haceTiempo } from "@/lib/tiempo";
import { tituloTema } from "@/lib/foroUi";
import {
  fetchEstadoForo,
  fetchTemasForo,
  type EstadoForo,
  type FiltroForo,
  type OrdenForo,
  type TemaForo,
} from "@/lib/supabase/foroQueries";

const PAGINA = 30;
const TOPE = 60; // máximo de temas que pide la función por llamada
const SONDEO_MS = 20_000;
const ORDENES: OrdenForo[] = ["actividad", "nuevos", "respuestas", "reacciones"];
const FILTROS: FiltroForo[] = ["todos", "mios", "sin_leer", "cerrados"];
const CLAVE_ORDEN = "foro-orden";

function ordenGuardado(): OrdenForo {
  try {
    const v = window.localStorage.getItem(CLAVE_ORDEN);
    return ORDENES.includes(v as OrdenForo) ? (v as OrdenForo) : "actividad";
  } catch {
    return "actividad";
  }
}

export default function ForoLista() {
  const supabase = useMemo(() => createClient(), []);
  const { t, locale } = useIdioma();
  const tf = t.foros;
  const { equipo, misLigas, cargando, esLigaPublica } = useGameState();
  const ligaId = equipo.leagueId;
  const ligaNombre = misLigas.find((l) => l.ligaId === ligaId)?.nombre ?? "";

  const [estado, setEstado] = useState<EstadoForo | null>(null);
  const [temas, setTemas] = useState<TemaForo[]>([]);
  const [fase, setFase] = useState<"cargando" | "ok" | "error">("cargando");
  const [filtro, setFiltro] = useState<FiltroForo>("todos");
  const [orden, setOrden] = useState<OrdenForo>("actividad");
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const claveActual = useRef("");
  const cantidad = useRef(PAGINA);

  useEffect(() => {
    setOrden(ordenGuardado());
  }, []);

  const clave = `${ligaId}|${filtro}|${orden}`;
  claveActual.current = clave;

  const cargar = useCallback(async () => {
    if (!ligaId) return;
    const mia = `${ligaId}|${filtro}|${orden}`;
    setFase("cargando");
    cantidad.current = PAGINA;
    const [est, lista] = await Promise.all([
      fetchEstadoForo(supabase, ligaId),
      fetchTemasForo(supabase, ligaId, filtro, orden, PAGINA, 0),
    ]);
    if (claveActual.current !== mia) return;
    if (!est || !lista) {
      setFase("error");
      return;
    }
    setEstado(est);
    setTemas(lista);
    setHayMas(lista.length >= PAGINA);
    setFase("ok");
  }, [supabase, ligaId, filtro, orden]);

  useEffect(() => {
    if (cargando || !ligaId) return;
    cargar();
  }, [cargando, ligaId, cargar]);

  // Sondeo suave, sin Realtime: se vuelve a pedir lo que ya hay cargado.
  useEffect(() => {
    if (!ligaId || fase !== "ok") return;
    const mia = clave;
    const refrescar = async () => {
      if (document.visibilityState !== "visible") return;
      const lista = await fetchTemasForo(supabase, ligaId, filtro, orden, Math.min(cantidad.current, TOPE), 0);
      if (lista && claveActual.current === mia) {
        setTemas(lista);
        setHayMas(lista.length >= cantidad.current);
      }
    };
    const temporizador = window.setInterval(refrescar, SONDEO_MS);
    document.addEventListener("visibilitychange", refrescar);
    return () => {
      window.clearInterval(temporizador);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [supabase, ligaId, fase, filtro, orden, clave]);

  async function verMas() {
    if (cargandoMas) return;
    setCargandoMas(true);
    const mas = await fetchTemasForo(supabase, ligaId, filtro, orden, PAGINA, temas.length);
    setCargandoMas(false);
    if (!mas) return;
    setTemas((prev) => {
      const ids = new Set(prev.map((x) => x.id));
      return [...prev, ...mas.filter((x) => !ids.has(x.id))];
    });
    cantidad.current = temas.length + mas.length;
    setHayMas(mas.length >= PAGINA);
  }

  function cambiarOrden(nuevo: OrdenForo) {
    setOrden(nuevo);
    try {
      window.localStorage.setItem(CLAVE_ORDEN, nuevo);
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  }

  if (cargando) return <p className="text-sm text-neutral-500">{tf.cargando}</p>;
  if (!ligaId) return <p className="text-sm text-neutral-500">{tf.sinLiga}</p>;

  const titulo = esLigaPublica ? tf.tituloPublico : tf.tituloDe(ligaNombre);
  const baneadoHasta = estado?.baneadoHasta && new Date(estado.baneadoHasta) > new Date() ? estado.baneadoHasta : null;

  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="min-w-0 truncate font-display text-xl font-semibold">{titulo}</h2>
        <label className="flex items-center gap-2 text-sm text-neutral-500">
          <span className="sr-only sm:not-sr-only">{tf.ordenarPor}</span>
          <select
            value={orden}
            onChange={(e) => cambiarOrden(e.target.value as OrdenForo)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
            {ORDENES.map((o) => (
              <option key={o} value={o}>
                {tf.orden[o]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label={tf.filtros.todos}>
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filtro === f
                ? "border-accent bg-accent/10 font-semibold text-accent"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-accent dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            }`}
          >
            {tf.filtros[f]}
          </button>
        ))}
      </div>

      {estado?.miembro ? (
        baneadoHasta ? (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-negative dark:bg-red-950/40 dark:text-red-300">
            <p className="font-medium">
              {tf.baneado(new Date(baneadoHasta).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }))}
            </p>
            {estado.baneoMotivo && <p className="mt-0.5 text-xs">{tf.baneoMotivo(estado.baneoMotivo)}</p>}
          </div>
        ) : (
          <Link
            href="/chat/foros/nuevo"
            className="rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-accent-hover"
          >
            + {tf.nuevoTema}
          </Link>
        )
      ) : (
        estado && <p className="text-center text-xs text-neutral-500">{tf.soloLectura}</p>
      )}

      {fase === "cargando" && <p className="py-8 text-center text-sm text-neutral-500">{tf.cargando}</p>}
      {fase === "error" && (
        <div className="py-8 text-center text-sm">
          <p className="text-negative">{tf.errorCarga}</p>
          <button type="button" onClick={cargar} className="mt-2 font-medium text-accent">
            {tf.reintentar}
          </button>
        </div>
      )}

      {fase === "ok" && temas.length === 0 && (
        <p className="py-10 text-center text-sm text-neutral-500">
          {filtro === "todos" ? tf.sinTemas : tf.sinTemasFiltro}
        </p>
      )}

      {fase === "ok" && temas.length > 0 && (
        <ul className="flex flex-col gap-2">
          {temas.map((tema) => {
            const sinLeer = (tema.nuevos ?? 0) > 0;
            return (
              <li key={tema.id}>
                <Link
                  href={`/chat/foros/${tema.id}`}
                  className={`block rounded-2xl border bg-white p-3 transition-colors hover:border-accent dark:bg-neutral-900 ${
                    tema.fijado
                      ? "border-gold ring-1 ring-gold/40"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`break-words text-[15px] leading-snug ${
                          sinLeer ? "font-bold" : "font-semibold"
                        } ${tema.eliminado ? "italic text-neutral-500" : ""}`}
                      >
                        {tema.fijado && <span aria-hidden="true">📌 </span>}
                        {tituloTema(tf, tema)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        {tema.fijado && (
                          <span className="rounded-full bg-gold/25 px-2 py-0.5 font-semibold text-gold-dark dark:text-gold">
                            {tf.fijado}
                          </span>
                        )}
                        {tema.sistema && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {tf.automatico}
                          </span>
                        )}
                        {tema.estado === "cerrado" && !tema.eliminado && (
                          <span className="rounded-full bg-neutral-200 px-2 py-0.5 font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {tf.cerradoEtiqueta}
                          </span>
                        )}
                        {!tema.eliminado && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent">
                            {tf.categorias[tema.categoria]}
                          </span>
                        )}
                        {tema.tieneEncuesta && (
                          <span className="text-neutral-500">
                            <span aria-hidden="true">📊 </span>
                            {tf.encuestaEtiqueta}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                        {!tema.sistema && tema.autorNombre && (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <AvatarPerfil avatar={tema.autorAvatar} nombre={tema.autorNombre} tamano={18} />
                            <span className="truncate">{tema.autorNombre}</span>
                          </span>
                        )}
                        <span>{tf.respuestas(tema.respuestas)}</span>
                        <span>{haceTiempo(tema.ultimaActividad, locale, t.avisos.ahoraMismo)}</span>
                      </p>
                    </div>
                    {sinLeer && (
                      <span className="mt-0.5 shrink-0 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-brand-950">
                        {tf.nuevas(tema.nuevos ?? 0)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {fase === "ok" && hayMas && (
        <div className="text-center">
          <button
            type="button"
            onClick={verMas}
            disabled={cargandoMas}
            className="rounded-full border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-500 hover:border-accent hover:text-accent disabled:opacity-50 dark:border-neutral-700"
          >
            {cargandoMas ? tf.cargandoAnteriores : tf.verMas}
          </button>
        </div>
      )}
    </section>
  );
}
