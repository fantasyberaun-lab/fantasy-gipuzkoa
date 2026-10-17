"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import { cambiarAvatarDB } from "@/lib/supabase/queries";
import { AVATARES, descripcionAvatar, nombreAvatar, type Avatar } from "@/lib/avatares";
import { xpParaNivel } from "@/lib/niveles";

type Filtro = "todos" | "mios" | "bloqueados";

// Ficha de un icono: el retrato grande, su mini descripción y, si ya está
// desbloqueado, el botón para usarlo. En un portal para quedar por encima de la
// cabecera y de la barra inferior del móvil.
function FichaIcono({
  avatar,
  desbloqueado,
  enUso,
  guardando,
  error,
  onUsar,
  onCerrar,
}: {
  avatar: Avatar;
  desbloqueado: boolean;
  enUso: boolean;
  guardando: boolean;
  error: string | null;
  onUsar: () => void;
  onCerrar: () => void;
}) {
  const t = useT();
  const { locale } = useIdioma();
  const tn = t.niveles;
  const nombre = nombreAvatar(avatar, t);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={nombre}
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-full w-full max-w-sm flex-col items-center gap-3 overflow-y-auto rounded-3xl bg-brand-950 p-5 text-center text-white shadow-2xl ring-1 ring-white/10"
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label={t.comun.cerrar}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative w-[min(70%,15rem)]">
          <Image
            src={desbloqueado ? avatar.srcGrande : avatar.srcMarco}
            alt={nombre}
            width={desbloqueado ? 800 : 256}
            height={desbloqueado ? 800 : 256}
            unoptimized
            className={`h-auto w-full rounded-2xl shadow-xl ${
              desbloqueado ? "" : "brightness-50 grayscale"
            }`}
          />
          {!desbloqueado && (
            <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-sm font-semibold">
              <Candado className="h-4 w-4" />
              {tn.bloqueadoHasta(avatar.nivel)}
            </span>
          )}
        </div>

        <div>
          <p className="font-display text-2xl font-semibold leading-tight">{nombre}</p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-gold">
            {desbloqueado
              ? tn.desbloqueadoEnNivel(avatar.nivel)
              : tn.bloqueadoEnNivel(avatar.nivel, xpParaNivel(avatar.nivel).toLocaleString(locale))}
          </p>
        </div>

        <p className="text-sm leading-snug text-white/80">{descripcionAvatar(avatar, t)}</p>

        {desbloqueado && (
          <button
            type="button"
            onClick={onUsar}
            disabled={enUso || guardando}
            className="mt-1 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-default disabled:bg-white/10 disabled:text-white/60"
          >
            {enUso ? `✓ ${tn.enUso}` : guardando ? "…" : tn.usar}
          </button>
        )}
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    </div>,
    document.body
  );
}

function Candado({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path strokeLinecap="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

// Rejilla de iconos de perfil: los desbloqueados se pueden elegir y los que no
// salen en gris con el nivel al que se consiguen. Se usa en la pestaña Niveles
// del perfil. La base de datos (cambiar_avatar, 0086) vuelve a comprobar el nivel.
export default function SelectorAvatar({ nivel }: { nivel: number }) {
  const supabase = createClient();
  const t = useT();
  const tn = t.niveles;
  const { avatar, setAvatar } = useGameState();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [abierto, setAbierto] = useState<Avatar | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegir(id: string | null) {
    if (id === avatar || guardando) return;
    setGuardando(true);
    setError(null);
    const r = await cambiarAvatarDB(supabase, id);
    setGuardando(false);
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    setAvatar(id);
  }

  const lista = AVATARES.filter((a) =>
    filtro === "todos" ? true : filtro === "mios" ? a.nivel <= nivel : a.nivel > nivel
  );

  const FILTROS: [Filtro, string][] = [
    ["todos", tn.filtroTodos],
    ["mios", tn.filtroMios],
    ["bloqueados", tn.filtroBloqueados],
  ];

  return (
    <div data-tutorial="nivel-iconos" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t.avatares.titulo}</p>
        <div className="flex gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-900">
          {FILTROS.map(([clave, etiqueta]) => (
            <button
              key={clave}
              type="button"
              onClick={() => setFiltro(clave)}
              aria-pressed={filtro === clave}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filtro === clave
                  ? "bg-accent text-white"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {lista.map((a) => {
          const desbloqueado = a.nivel <= nivel;
          const enUso = avatar === a.id;
          const siguiente = a.nivel === nivel + 1;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setError(null);
                setAbierto(a);
              }}
              aria-label={`${nombreAvatar(a, t)} · ${tn.bloqueadoHasta(a.nivel)}`}
              className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-1.5 text-center text-[11px] font-medium leading-tight transition-colors ${
                enUso
                  ? "border-gold bg-gold/10"
                  : siguiente
                    ? "border-accent/60 bg-accent/5"
                    : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-700"
              }`}
            >
              <span className="relative block w-full">
                <Image
                  src={a.srcMarco}
                  alt=""
                  width={96}
                  height={96}
                  className={`h-auto w-full rounded-xl ${desbloqueado ? "" : "brightness-[.45] grayscale"}`}
                />
                {!desbloqueado && (
                  <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
                    <Candado className="h-3 w-3" />
                    {a.nivel}
                  </span>
                )}
              </span>
              <span className={desbloqueado ? "" : "text-neutral-500"}>{nombreAvatar(a, t)}</span>
              {enUso && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-neutral-950">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {avatar !== null && (
        <button
          type="button"
          onClick={() => elegir(null)}
          disabled={guardando}
          className="w-fit text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800 disabled:opacity-50 dark:hover:text-neutral-200"
        >
          {tn.quitar}
        </button>
      )}
      {error && !abierto && <p className="text-sm text-negative dark:text-red-400">{error}</p>}

      {abierto && (
        <FichaIcono
          avatar={abierto}
          desbloqueado={abierto.nivel <= nivel}
          enUso={avatar === abierto.id}
          guardando={guardando}
          error={error}
          onUsar={() => elegir(abierto.id)}
          onCerrar={() => setAbierto(null)}
        />
      )}
    </div>
  );
}
