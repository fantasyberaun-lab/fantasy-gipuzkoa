"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useT } from "@/components/IdiomaProvider";
import { redondear2 } from "@/lib/saldo";
import {
  fetchEstadoRacha,
  reclamarRecompensaDB,
  type EstadoRacha,
  type ResultadoReclamar,
} from "@/lib/supabase/rachaQueries";

type Cobro = Extract<ResultadoReclamar, { ok: true }>;

// Puntos de la semana de racha: los días ya reclamados del ciclo hasta el cofre.
function PuntosCiclo({ hechos, total }: { hechos: number; total: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full ${
            i < hechos ? "bg-gold" : "bg-neutral-200 dark:bg-neutral-800"
          } ${i === total - 1 ? "ring-1 ring-gold-dark/60" : ""}`}
        />
      ))}
    </div>
  );
}

// Modal del cofre: primero cerrado, al pulsar se abre y enseña el premio.
function ModalCofre({ cobro, onCerrar }: { cobro: Cobro; onCerrar: () => void }) {
  const t = useT();
  const [abierto, setAbierto] = useState(false);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.racha.cofreAria}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center text-neutral-900 shadow-xl dark:bg-neutral-900 dark:text-neutral-100">
        <p className="text-sm font-medium text-neutral-500">{t.racha.diasDeRachaExclamacion(cobro.racha)}</p>
        <button
          onClick={() => setAbierto(true)}
          disabled={abierto}
          className={`mx-auto mt-4 block text-7xl transition-transform duration-300 ${
            abierto ? "scale-110" : "animate-bounce hover:scale-110"
          }`}
          aria-label={t.racha.abrirCofre}
        >
          {abierto ? "💰" : "🎁"}
        </button>
        {abierto ? (
          <>
            <p className="mt-4 font-display text-4xl font-semibold text-accent">
              +{redondear2(cobro.importeCofre)} M
            </p>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {t.racha.masElMillon(cobro.equipos)}
            </p>
            <button
              onClick={onCerrar}
              className="mt-5 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              {t.racha.aFichar}
            </button>
          </>
        ) : (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            {t.racha.tocaCofre}
          </p>
        )}
      </div>
    </div>
  );
}

// Racha diaria: un chip "🔥 N" en la cabecera, junto al saldo. El punto amarillo
// avisa de que hoy falta reclamar; al tocarlo se abre la racha con el botón.
// Ver 0075_racha_diaria.sql.
export default function RachaDiaria() {
  const supabase = createClient();
  const t = useT();
  const { recargar, cargando } = useGameState();
  const [estado, setEstado] = useState<EstadoRacha | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cobro, setCobro] = useState<Cobro | null>(null);
  const [mostrarCofre, setMostrarCofre] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Posición del desplegable. Va en un portal (fuera de la cabecera, que tiene
  // overflow: hidden) y se coloca a mano bajo el chip.
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  async function cargar() {
    setEstado(await fetchEstadoRacha(supabase));
  }

  useEffect(() => {
    cargar();
    // La app (PWA) puede quedarse abierta de un día para otro.
    const alVolver = () => {
      if (document.visibilityState === "visible") cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alternar() {
    if (abierto) {
      setAbierto(false);
      return;
    }
    const r = botonRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: Math.max(window.innerWidth - r.right, 8) });
    setAbierto(true);
  }

  // Cierra el desplegable al tocar fuera, pulsar Escape, hacer scroll o girar la pantalla.
  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setAbierto(false);
    const fuera = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !botonRef.current?.contains(t)) cerrar();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", cerrar, { passive: true });
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", cerrar);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto]);

  async function reclamar() {
    setEnviando(true);
    setError(null);
    const r = await reclamarRecompensaDB(supabase);
    if (r.ok) {
      setCobro(r);
      if (r.importeCofre > 0) {
        setAbierto(false);
        setMostrarCofre(true);
      }
      await Promise.all([cargar(), recargar()]);
    } else {
      setError(r.mensaje);
      await cargar();
    }
    setEnviando(false);
  }

  if (cargando || !estado) return null;

  const pendiente = !estado.reclamadaHoy;
  const hechosCiclo = estado.racha === 0 ? 0 : estado.diasCofre - estado.diasParaCofre;
  const tocaCofreHoy = pendiente && estado.diasParaCofre === 1;

  return (
    <>
      <button
        ref={botonRef}
        onClick={alternar}
        aria-expanded={abierto}
        aria-label={t.racha.chipAria(estado.racha, pendiente)}
        className="relative flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20"
      >
        <span aria-hidden="true">🔥</span>
        {estado.racha}
        {pendiente && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-brand-950" />
        )}
      </button>

      {abierto && pos && createPortal(
        <div
          ref={panelRef}
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-40 w-64 rounded-xl bg-white p-4 text-neutral-900 shadow-xl ring-1 ring-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-white/10">
          <p className="text-sm font-semibold">
            🔥{" "}
            {estado.racha === 0 ? t.racha.empiezaRacha : t.racha.diasDeRacha(estado.racha)}
          </p>

          <div className="mt-2.5">
            <PuntosCiclo
              hechos={!pendiente && estado.diasParaCofre === estado.diasCofre ? estado.diasCofre : hechosCiclo}
              total={estado.diasCofre}
            />
          </div>

          <p className="mt-2 text-xs text-neutral-500">
            {!pendiente
              ? t.racha.vuelveManana(
                  estado.diasParaCofre === estado.diasCofre
                    ? t.racha.proximoCofreEn(estado.diasCofre)
                    : t.racha.cofreEn(estado.diasParaCofre)
                )
              : tocaCofreHoy
                ? t.racha.hoyCofre
                : t.racha.cofreEnDias(estado.diasParaCofre)}
          </p>

          {pendiente ? (
            <button
              onClick={reclamar}
              disabled={enviando}
              className="mt-3 w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {enviando ? "…" : t.racha.reclamar(redondear2(estado.recompensaDiaria))}
            </button>
          ) : (
            cobro && (
              <p className="mt-3 text-xs font-medium text-positive">
                +{redondear2(cobro.importeDiario + cobro.importeCofre)} M
                {cobro.equipos > 1 ? ` · ${t.racha.ingresadoEquipos(cobro.equipos)}` : ""}
              </p>
            )
          )}

          {error && <p className="mt-2 text-xs text-negative dark:text-red-400">{error}</p>}
        </div>,
        document.body
      )}

      {mostrarCofre && cobro && createPortal(
        <ModalCofre cobro={cobro} onCerrar={() => setMostrarCofre(false)} />,
        document.body
      )}
    </>
  );
}
