"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useIdioma } from "@/components/IdiomaProvider";
import EditorTexto from "@/components/EditorTexto";
import { idsMencionados, textoError } from "@/lib/foroUi";
import {
  CATEGORIAS_FORO,
  crearTemaForoDB,
  fetchEstadoForo,
  marcarNormasForoVistasDB,
  type CategoriaForo,
  type EstadoForo,
} from "@/lib/supabase/foroQueries";

const DURACIONES = [
  { clave: "sin", dias: null },
  { clave: "d1", dias: 1 },
  { clave: "d3", dias: 3 },
  { clave: "d7", dias: 7 },
] as const;

export default function ForoNuevoTema() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { t, locale } = useIdioma();
  const tf = t.foros;
  const tn = tf.nuevo;
  const { equipo, cargando, esLigaPublica } = useGameState();
  const ligaId = equipo.leagueId;

  const [estado, setEstado] = useState<EstadoForo | null>(null);
  const [fase, setFase] = useState<"cargando" | "ok" | "error">("cargando");
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<CategoriaForo | null>(null);
  const [texto, setTexto] = useState("");
  const [menciones, setMenciones] = useState<Record<string, string>>({});
  const [conEncuesta, setConEncuesta] = useState(false);
  const [opciones, setOpciones] = useState(["", ""]);
  const [dias, setDias] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cargando || !ligaId) return;
    let vigente = true;
    setFase("cargando");
    fetchEstadoForo(supabase, ligaId).then((est) => {
      if (!vigente) return;
      setEstado(est);
      setFase(est ? "ok" : "error");
    });
    return () => {
      vigente = false;
    };
  }, [cargando, ligaId, supabase]);

  async function entendiNormas() {
    setEstado((e) => (e ? { ...e, normasVistas: true } : e));
    await marcarNormasForoVistasDB(supabase);
  }

  async function publicar() {
    if (!estado || enviando) return;
    const tit = titulo.trim();
    const cuerpo = texto.trim();
    if (tit.length < estado.tituloMin) {
      setError(tf.errorTituloCorto(estado.tituloMin));
      return;
    }
    if (!categoria) {
      setError(tf.errores.categoria);
      return;
    }
    if (!cuerpo) {
      setError(tf.errores.vacia);
      return;
    }
    const limpias = opciones.map((o) => o.trim()).filter(Boolean);
    if (conEncuesta && limpias.length < 2) {
      setError(tf.errores.encuesta);
      return;
    }
    setError(null);
    setEnviando(true);
    const r = await crearTemaForoDB(
      supabase,
      ligaId,
      tit,
      categoria,
      cuerpo,
      idsMencionados(cuerpo, menciones),
      conEncuesta ? { opciones: limpias, dias: dias as 1 | 3 | 7 | null } : null
    );
    if (r.ok) {
      router.push(`/chat/foros/${r.id}`);
      return;
    }
    setEnviando(false);
    setError(textoError(tf, r, estado, true));
    if (r.codigo === "bloqueado" || r.codigo === "nivel") {
      const est = await fetchEstadoForo(supabase, ligaId);
      if (est) setEstado(est);
    }
  }

  if (cargando || fase === "cargando") return <p className="text-sm text-neutral-500">{tf.cargando}</p>;
  if (!ligaId) return <p className="text-sm text-neutral-500">{tf.sinLiga}</p>;
  if (fase === "error" || !estado) {
    return (
      <div className="py-8 text-center text-sm">
        <p className="text-negative">{tf.errorCarga}</p>
        <Link href="/chat/foros" className="mt-3 inline-block font-medium text-accent">
          ‹ {tf.volver}
        </Link>
      </div>
    );
  }

  const baneadoHasta = estado.baneadoHasta && new Date(estado.baneadoHasta) > new Date() ? estado.baneadoHasta : null;
  const bloqueo = !estado.miembro
    ? tf.soloLectura
    : baneadoHasta
      ? tf.baneado(new Date(baneadoHasta).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }))
      : !estado.nivelOk
        ? tf.nivelBloqueo(estado.nivelMinimo)
        : null;

  return (
    <section aria-label={tn.titulo} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/chat/foros" className="text-sm font-medium text-accent hover:underline">
          ‹ {tf.volver}
        </Link>
      </div>
      <h2 className="font-display text-xl font-semibold">{tn.titulo}</h2>

      {bloqueo ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-negative dark:bg-red-950/40 dark:text-red-300">{bloqueo}</p>
      ) : !estado.normasVistas ? (
        <div className="rounded-xl bg-accent/5 p-3 ring-1 ring-accent/30">
          <p className="font-display text-base font-semibold text-accent">{tf.normasTitulo}</p>
          <p className="mt-1 text-sm leading-snug">{tf.normasTexto}</p>
          <button
            type="button"
            onClick={entendiNormas}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {tf.normasEntendido}
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            publicar();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{tn.campoTitulo}</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={estado.tituloMax}
              placeholder={tn.placeholderTitulo}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <span className="self-end text-[11px] tabular-nums text-neutral-500">
              {titulo.length}/{estado.tituloMax}
            </span>
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm font-medium">{tn.campoCategoria}</legend>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS_FORO.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={categoria === c}
                  onClick={() => setCategoria(c)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    categoria === c
                      ? "border-accent bg-accent/10 font-semibold text-accent"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-accent dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                  }`}
                >
                  {tf.categorias[c]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{tn.campoTexto}</span>
            <EditorTexto
              ligaId={ligaId}
              esPublica={esLigaPublica}
              valor={texto}
              onCambiar={setTexto}
              menciones={menciones}
              onMenciones={setMenciones}
              max={estado.maxInicial}
              placeholder={tn.placeholderTexto}
              filas={4}
              alturaMaxima={220}
            />
            <span className="self-end text-[11px] tabular-nums text-neutral-500">
              {texto.length}/{estado.maxInicial}
            </span>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <button
              type="button"
              aria-expanded={conEncuesta}
              onClick={() => setConEncuesta((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-medium"
            >
              <span>
                <span aria-hidden="true">📊 </span>
                {conEncuesta ? tn.quitarEncuesta : tn.anadirEncuesta}
              </span>
              <span className="text-lg text-neutral-500">{conEncuesta ? "−" : "+"}</span>
            </button>
            {conEncuesta && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs text-neutral-500">{tn.preguntaEncuesta}</p>
                {opciones.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={o}
                      onChange={(e) => setOpciones((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                      maxLength={60}
                      placeholder={tn.opcion(i + 1)}
                      aria-label={tn.opcion(i + 1)}
                      className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    {opciones.length > 2 && (
                      <button
                        type="button"
                        aria-label={tn.quitarOpcion}
                        onClick={() => setOpciones((prev) => prev.filter((_, j) => j !== i))}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {opciones.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setOpciones((prev) => [...prev, ""])}
                    className="self-start text-sm font-medium text-accent"
                  >
                    + {tn.anadirOpcion}
                  </button>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-500">{tn.duracion}</span>
                  <select
                    value={dias === null ? "sin" : `d${dias}`}
                    onChange={(e) => setDias(DURACIONES.find((d) => d.clave === e.target.value)?.dias ?? null)}
                    className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    {DURACIONES.map((d) => (
                      <option key={d.clave} value={d.clave}>
                        {tn.duraciones[d.clave]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          {error && (
            <p role="status" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-negative dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <p className="text-xs text-neutral-500">{tn.limites(estado.maxTemasDia)}</p>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {enviando ? tn.publicando : tn.publicar}
            </button>
            <Link
              href="/chat/foros"
              className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium dark:border-neutral-700"
            >
              {tn.cancelar}
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
