"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useT } from "@/components/IdiomaProvider";
import { fetchEstadoNivel } from "@/lib/supabase/nivelesQueries";
import {
  fetchTutorialMisionesVisto,
  marcarTutorialMisionesDB,
} from "@/lib/supabase/misionesQueries";

// Guía de estreno de las misiones (0108_tutorial_misiones.sql). Se enseña una sola
// vez a cada usuario, la primera vez que entra tras publicarlas:
//   1) señala con un aro intermitente la tarjeta "Mi perfil" y explica qué son,
//   2) lleva a la pestaña Misiones, señala la primera misión y explica cómo se reclama.
// Se marca como vista en cuanto empieza (profiles.tutorial_misiones_visto), así que
// no vuelve a salir aunque se cierre a medias. Si el usuario aún no ha visto la guía
// de niveles se espera a la próxima visita, para no pisarse con ella. Mismo diseño
// que TutorialNiveles: todo va en un portal sobre la pantalla.

type Paso = 0 | 1 | 2; // 0 = no se está enseñando

const OBJETIVOS: Record<Exclude<Paso, 0>, string> = {
  1: '[data-tutorial="perfil"]',
  2: '[data-tutorial="misiones-serie"]',
};
const MARGEN = 12;
const RELLENO = 6; // aire entre el objetivo y el aro
const ESPERA_OBJETIVO_MS = 2500; // si el objetivo no aparece, se explica sin señalarlo
const TOTAL = 2;

interface Caja {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TutorialMisiones() {
  const supabase = createClient();
  const t = useT();
  const tt = t.misiones.tutorial;
  const router = useRouter();
  const { cargando, equipo } = useGameState();
  const [pendiente, setPendiente] = useState(false);
  const [paso, setPaso] = useState<Paso>(0);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [sinObjetivo, setSinObjetivo] = useState(false);
  const comprobadoRef = useRef(false);
  const desplazadoRef = useRef<Paso>(0);

  // ¿Le toca la guía a este usuario? Se pregunta una vez, con el equipo cargado.
  useEffect(() => {
    if (cargando || !equipo.id || comprobadoRef.current) return;
    comprobadoRef.current = true;
    (async () => {
      const [visto, nivel] = await Promise.all([
        fetchTutorialMisionesVisto(supabase),
        fetchEstadoNivel(supabase),
      ]);
      if (!visto && nivel?.tutorialVisto) setPendiente(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, equipo.id]);

  // Empieza cuando no hay otra ventana encima (aceptación legal, cofre...).
  useEffect(() => {
    if (!pendiente || paso !== 0) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (document.querySelector('[aria-modal="true"]')) return;
      clearInterval(id);
      setPendiente(false);
      setPaso(1);
      marcarTutorialMisionesDB(supabase);
    }, 1200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendiente, paso]);

  // Sigue al objetivo del paso (cambia con el scroll, el giro de pantalla o la
  // carga de la página nueva). Si tarda demasiado en aparecer, se explica sin él.
  useEffect(() => {
    if (paso === 0) return;
    setCaja(null);
    setSinObjetivo(false);
    desplazadoRef.current = 0;
    const inicio = Date.now();
    let raf = 0;
    const medir = () => {
      const el = document.querySelector(OBJETIVOS[paso]);
      if (el) {
        if (desplazadoRef.current !== paso) {
          desplazadoRef.current = paso;
          if (paso === 1) el.scrollIntoView({ block: "center", behavior: "smooth" });
          else {
            el.scrollIntoView({ block: "start", behavior: "smooth" });
            window.scrollBy({ top: -96, behavior: "smooth" });
          }
        }
        const r = el.getBoundingClientRect();
        const nueva = { top: r.top, left: r.left, width: r.width, height: r.height };
        setCaja((c) =>
          c && c.top === nueva.top && c.left === nueva.left && c.width === nueva.width && c.height === nueva.height
            ? c
            : nueva
        );
      } else {
        setCaja(null);
        if (Date.now() - inicio > ESPERA_OBJETIVO_MS) setSinObjetivo(true);
      }
      raf = requestAnimationFrame(medir);
    };
    raf = requestAnimationFrame(medir);
    return () => cancelAnimationFrame(raf);
  }, [paso]);

  if (paso === 0) return null;
  // Esperando a que aparezca el objetivo (p. ej. mientras carga la pestaña de misiones).
  if (!caja && !sinObjetivo) return null;

  const titulo = paso === 1 ? tt.perfilTitulo : tt.escalonTitulo;
  const texto = paso === 1 ? tt.perfilTexto : tt.escalonTexto;

  function terminar() {
    setPaso(0);
  }

  function siguiente() {
    if (paso === 1) {
      router.push(`/managers/${equipo.id}?tab=misiones`);
      setPaso(2);
    } else {
      terminar();
    }
  }

  // Colocación de la tarjeta: debajo del objetivo si cabe, si no encima, y si no
  // en el borde inferior. Siempre dentro de la pantalla.
  const ancho = document.documentElement.clientWidth;
  const alto = window.innerHeight;
  const anchoTarjeta = Math.min(320, ancho - MARGEN * 2);
  const ESTIMADO = 230;
  let estiloTarjeta: React.CSSProperties = {
    width: anchoTarjeta,
    left: (ancho - anchoTarjeta) / 2,
    top: Math.max(MARGEN, (alto - ESTIMADO) / 2),
  };
  if (caja) {
    const izquierda = Math.min(
      Math.max(caja.left + caja.width / 2 - anchoTarjeta / 2, MARGEN),
      ancho - anchoTarjeta - MARGEN
    );
    const debajo = caja.top + caja.height + RELLENO + MARGEN;
    const encima = caja.top - RELLENO - MARGEN;
    if (debajo + ESTIMADO <= alto) {
      estiloTarjeta = { width: anchoTarjeta, left: izquierda, top: debajo };
    } else if (encima - ESTIMADO >= 0) {
      estiloTarjeta = { width: anchoTarjeta, left: izquierda, bottom: alto - encima };
    } else {
      estiloTarjeta = { width: anchoTarjeta, left: izquierda, bottom: MARGEN };
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-[60]"
    >
      {/* Capa que bloquea lo de detrás mientras dura la guía. */}
      <div className={`absolute inset-0 ${caja ? "" : "bg-brand-950/80"}`} />

      {caja && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl ring-2 ring-gold motion-safe:animate-pulse"
          style={{
            top: caja.top - RELLENO,
            left: caja.left - RELLENO,
            width: caja.width + RELLENO * 2,
            height: caja.height + RELLENO * 2,
            // El "foco": todo lo que queda fuera del aro se oscurece.
            boxShadow: "0 0 0 9999px rgba(14, 12, 30, 0.8)",
          }}
        />
      )}

      <div
        style={estiloTarjeta}
        className="absolute rounded-2xl bg-white p-4 text-neutral-900 shadow-2xl ring-1 ring-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-white/10"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
          {tt.pasoDe(paso, TOTAL)}
        </p>
        <p className="mt-0.5 font-display text-xl font-semibold leading-tight">{titulo}</p>
        <p className="mt-1.5 text-sm leading-snug text-neutral-600 dark:text-neutral-300">{texto}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          {paso < TOTAL ? (
            <button
              type="button"
              onClick={terminar}
              className="text-xs font-medium text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              {tt.saltar}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={siguiente}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {paso < TOTAL ? tt.siguiente : tt.entendido}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
