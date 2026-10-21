"use client";

import { useEffect, useState, type ReactNode } from "react";
import CofreAnimado from "@/components/CofreAnimado";
import { sonar } from "@/lib/sonido";

export type ResultadoAbrir = { ok: true; premio: ReactNode } | { ok: false; mensaje: string };

// Cofre a pantalla completa: cerrado hasta que se toca; entonces `onAbrir`
// (que habla con el servidor) devuelve lo ganado y el cofre se abre con su
// animación y su sonido. El llamador lo monta en un portal sobre document.body.
export default function CofreGrande({
  titulo,
  aria,
  ayuda,
  etiquetaAbrir,
  etiquetaContinuar,
  etiquetaCerrar,
  onAbrir,
  onCerrar,
}: {
  titulo: string;
  aria: string;
  ayuda: string;
  etiquetaAbrir: string;
  etiquetaContinuar: string;
  etiquetaCerrar: string;
  onAbrir: () => Promise<ResultadoAbrir>;
  onCerrar: () => void;
}) {
  const [abriendo, setAbriendo] = useState(false);
  const [premio, setPremio] = useState<ReactNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    if (abriendo || premio) return;
    setAbriendo(true);
    setError(null);
    sonar("cofre-abrir");
    const r = await onAbrir();
    setAbriendo(false);
    if (r.ok) {
      setPremio(r.premio);
      sonar("cofre-premio");
    } else {
      setError(r.mensaje);
      sonar("fallo");
    }
  }

  useEffect(() => {
    if (abriendo) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abriendo, onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={aria}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 overflow-y-auto bg-brand-950/95 px-4 py-6 text-center backdrop-blur-sm"
    >
      {!premio && (
        <button
          type="button"
          onClick={onCerrar}
          disabled={abriendo}
          aria-label={etiquetaCerrar}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-gold disabled:opacity-40"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <p className="font-display text-xl font-semibold text-white">{titulo}</p>

      <button
        type="button"
        onClick={abrir}
        disabled={abriendo || premio !== null}
        aria-label={etiquetaAbrir}
        className="w-[min(78vw,360px)] transition-transform duration-300 hover:scale-105 disabled:hover:scale-100"
      >
        <CofreAnimado estado={premio ? "abierto" : abriendo ? "abriendo" : "cerrado"} className="h-auto w-full" />
      </button>

      {premio ? (
        <div className="cofre-premio-entra flex flex-col items-center">
          {premio}
          <button
            type="button"
            onClick={onCerrar}
            className="mt-6 w-full min-w-[12rem] rounded-xl bg-accent px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {etiquetaContinuar}
          </button>
        </div>
      ) : (
        <div className="min-h-[3rem]">
          <p className="text-sm text-white/70">{ayuda}</p>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
