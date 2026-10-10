"use client";

import { useEffect, useState } from "react";
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
          className={`h-2 flex-1 rounded-full ${
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
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-neutral-900">
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

// Tarjeta de la racha diaria (encima de las pestañas). Ver 0075_racha_diaria.sql.
export default function RachaDiaria() {
  const supabase = createClient();
  const t = useT();
  const { recargar, cargando } = useGameState();
  const [estado, setEstado] = useState<EstadoRacha | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cobro, setCobro] = useState<Cobro | null>(null);
  const [mostrarCofre, setMostrarCofre] = useState(false);

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

  async function reclamar() {
    setEnviando(true);
    setError(null);
    const r = await reclamarRecompensaDB(supabase);
    if (r.ok) {
      setCobro(r);
      if (r.importeCofre > 0) setMostrarCofre(true);
      await Promise.all([cargar(), recargar()]);
    } else {
      setError(r.mensaje);
      await cargar();
    }
    setEnviando(false);
  }

  if (cargando || !estado) return null;

  const hechosCiclo = estado.racha === 0 ? 0 : estado.diasCofre - estado.diasParaCofre;
  // Si hoy toca cofre (y aún no se ha reclamado), el ciclo se ve lleno al cobrar.
  const tocaCofreHoy = !estado.reclamadaHoy && estado.diasParaCofre === 1;

  return (
    <section className="mb-5 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <span aria-hidden="true">🔥</span>
            {estado.racha === 0 ? t.racha.empiezaRacha : t.racha.diasDeRacha(estado.racha)}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {estado.reclamadaHoy
              ? t.racha.vuelveManana(
                  estado.diasParaCofre === estado.diasCofre
                    ? t.racha.proximoCofreEn(estado.diasCofre)
                    : t.racha.cofreEn(estado.diasParaCofre)
                )
              : tocaCofreHoy
                ? t.racha.hoyCofre
                : t.racha.cofreEnDias(estado.diasParaCofre)}
          </p>
        </div>

        {estado.reclamadaHoy ? (
          <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800">
            {cobro ? `+${redondear2(cobro.importeDiario + cobro.importeCofre)} M` : t.racha.reclamada}
          </span>
        ) : (
          <button
            onClick={reclamar}
            disabled={enviando}
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {enviando ? "…" : t.racha.reclamar(redondear2(estado.recompensaDiaria))}
          </button>
        )}
      </div>

      <div className="mt-3">
        <PuntosCiclo
          hechos={estado.reclamadaHoy && estado.diasParaCofre === estado.diasCofre ? estado.diasCofre : hechosCiclo}
          total={estado.diasCofre}
        />
      </div>

      {error && <p className="mt-2 text-xs text-negative dark:text-red-400">{error}</p>}
      {cobro && cobro.equipos > 1 && !mostrarCofre && (
        <p className="mt-2 text-xs text-neutral-500">
          {t.racha.ingresadoEquipos(cobro.equipos)}
        </p>
      )}

      {mostrarCofre && cobro && (
        <ModalCofre cobro={cobro} onCerrar={() => setMostrarCofre(false)} />
      )}
    </section>
  );
}
