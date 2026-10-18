"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useT } from "@/components/IdiomaProvider";
import { redondear2 } from "@/lib/saldo";
import {
  abrirCofreDB,
  fetchEstadoRacha,
  registrarInicioSesionDB,
  type EstadoRacha,
  type ResultadoCofre,
} from "@/lib/supabase/rachaQueries";

type Cofre = Extract<ResultadoCofre, { ok: true }>;

// Aviso a otros componentes (pestaña de niveles) de que ha cambiado la XP.
export const EVENTO_XP = "fantasy:xp";

// Puntos de la semana de racha: los días ya hechos del ciclo hasta el cofre.
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

// Modal del cofre: primero cerrado; al tocarlo se abre de verdad (el premio se
// sortea en el servidor) y enseña lo ganado.
function ModalCofre({
  racha,
  onAbrir,
  onCerrar,
}: {
  racha: number;
  onAbrir: () => Promise<ResultadoCofre>;
  onCerrar: () => void;
}) {
  const t = useT();
  const [abriendo, setAbriendo] = useState(false);
  const [cofre, setCofre] = useState<Cofre | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    if (abriendo || cofre) return;
    setAbriendo(true);
    setError(null);
    const r = await onAbrir();
    setAbriendo(false);
    if (r.ok) setCofre(r);
    else setError(r.mensaje);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.racha.cofreAria}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center text-neutral-900 shadow-xl dark:bg-neutral-900 dark:text-neutral-100">
        <p className="text-sm font-medium text-neutral-500">
          {t.racha.diasDeRachaExclamacion(cofre?.racha ?? racha)}
        </p>
        <button
          onClick={abrir}
          disabled={abriendo || cofre !== null}
          className={`mx-auto mt-4 block text-7xl transition-transform duration-300 ${
            cofre ? "scale-110" : "animate-bounce hover:scale-110"
          }`}
          aria-label={t.racha.abrirCofre}
        >
          {cofre ? "💰" : "🎁"}
        </button>
        {cofre ? (
          <>
            <p className="mt-4 font-display text-4xl font-semibold text-accent">
              +{redondear2(cofre.importeCofre)} M
            </p>
            <p className="mt-1 text-sm font-semibold text-gold-dark">
              {t.racha.masXp(cofre.xp)}
            </p>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {t.racha.ingresadoEquipos(cofre.equipos)}
            </p>
            <button
              onClick={onCerrar}
              className="mt-5 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              {t.racha.aFichar}
            </button>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{t.racha.tocaCofre}</p>
            {error && <p className="mt-2 text-xs text-negative dark:text-red-400">{error}</p>}
            {error && (
              <button
                onClick={onCerrar}
                className="mt-4 w-full rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium dark:border-neutral-700"
              >
                {t.comun.cerrar}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Racha diaria: un chip "🔥 N" en la cabecera, junto al saldo. La entrada de cada
// día se registra sola al abrir la app (cobra el millón y da XP); lo único que
// se reclama es el cofre, que avisa con un punto amarillo. Ver 0086_niveles.sql.
export default function RachaDiaria() {
  const supabase = createClient();
  const t = useT();
  const { recargarSaldo, cargando } = useGameState();
  const [estado, setEstado] = useState<EstadoRacha | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [mostrarCofre, setMostrarCofre] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const entrandoRef = useRef(false);
  // Posición del desplegable. Va en un portal (fuera de la cabecera, que tiene
  // overflow: hidden) y se coloca a mano bajo el chip, sin salirse de la pantalla.
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  async function cargar() {
    setEstado(await fetchEstadoRacha(supabase));
  }

  // Registra la entrada de hoy (si falta) y refresca la racha. La PWA puede
  // quedarse abierta de un día para otro, por eso también se llama al volver.
  async function entrar() {
    if (entrandoRef.current) return;
    entrandoRef.current = true;
    try {
      const r = await registrarInicioSesionDB(supabase);
      if (r.ok && r.nuevo) {
        setAviso(t.racha.entradaHoy(redondear2(r.importeDiario), r.xp));
        window.dispatchEvent(new Event(EVENTO_XP));
        await recargarSaldo();
      }
      await cargar();
    } finally {
      entrandoRef.current = false;
    }
  }

  useEffect(() => {
    entrar();
    const alVolver = () => {
      if (document.visibilityState === "visible") entrar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El aviso de "+1 M · +10 XP" se quita solo.
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(id);
  }, [aviso]);

  function alternar() {
    if (abierto) {
      setAbierto(false);
      return;
    }
    const r = botonRef.current?.getBoundingClientRect();
    if (r) {
      const MARGEN = 12;
      // clientWidth es el ancho visible (sin barra de scroll); innerWidth puede ser
      // mayor en el móvil y dejaba el desplegable cortado por la derecha.
      const ancho = document.documentElement.clientWidth;
      const width = Math.min(256, ancho - MARGEN * 2);
      const left = Math.min(Math.max(r.right - width, MARGEN), ancho - width - MARGEN);
      setPos({ top: r.bottom + 8, left, width });
    }
    setAbierto(true);
  }

  // Cierra el desplegable al pulsar Escape, hacer scroll o girar la pantalla.
  // (Tocar fuera lo cierra la capa transparente que hay detrás del desplegable.)
  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setAbierto(false);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", cerrar, { passive: true });
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", cerrar);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto]);

  async function abrirCofre(): Promise<ResultadoCofre> {
    const r = await abrirCofreDB(supabase);
    if (r.ok) {
      window.dispatchEvent(new Event(EVENTO_XP));
      await Promise.all([cargar(), recargarSaldo()]);
    }
    return r;
  }

  if (cargando || !estado) return null;

  const hayCofre = estado.cofresPendientes > 0;
  const hechosCiclo =
    estado.racha === 0
      ? 0
      : estado.diasParaCofre === estado.diasCofre
        ? estado.diasCofre
        : estado.diasCofre - estado.diasParaCofre;

  return (
    <>
      <button
        ref={botonRef}
        onClick={alternar}
        aria-expanded={abierto}
        aria-label={t.racha.chipAria(estado.racha, hayCofre)}
        className="relative flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20"
      >
        <span aria-hidden="true">🔥</span>
        {estado.racha}
        {hayCofre && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-brand-950" />
        )}
      </button>

      {abierto && pos && createPortal(
        <>
        {/* Capa transparente a pantalla completa: tocar en cualquier sitio fuera cierra. */}
        <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setAbierto(false)} />
        <div
          role="dialog"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="fixed z-50 rounded-xl bg-white p-4 text-neutral-900 shadow-xl ring-1 ring-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-white/10">
          <p className="text-sm font-semibold">
            🔥{" "}
            {estado.racha === 0 ? t.racha.empiezaRacha : t.racha.diasDeRacha(estado.racha)}
          </p>

          <div className="mt-2.5">
            <PuntosCiclo hechos={hechosCiclo} total={estado.diasCofre} />
          </div>

          <p className="mt-2 text-xs text-neutral-500">
            {hayCofre
              ? t.racha.cofresListos(estado.cofresPendientes)
              : estado.diasParaCofre === estado.diasCofre
                ? t.racha.proximoCofreEn(estado.diasCofre)
                : t.racha.cofreEnDias(estado.diasParaCofre)}
          </p>

          {hayCofre && (
            <button
              onClick={() => {
                setAbierto(false);
                setMostrarCofre(true);
              }}
              className="mt-3 w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              {t.racha.abrirCofre}
            </button>
          )}
        </div>
        </>,
        document.body
      )}

      {mostrarCofre && createPortal(
        <ModalCofre
          racha={estado.racha}
          onAbrir={abrirCofre}
          onCerrar={() => setMostrarCofre(false)}
        />,
        document.body
      )}

      {aviso && createPortal(
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
        >
          <p className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-white/15">
            {aviso}
          </p>
        </div>,
        document.body
      )}
    </>
  );
}
