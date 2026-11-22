"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useIdioma, useT } from "@/components/IdiomaProvider";
import { cambiarAvatarDB } from "@/lib/supabase/queries";
import {
  AVATARES,
  ESPECIALES,
  GRUPOS_ICONOS,
  comoSeConsigueAvatar,
  descripcionAvatar,
  nombreAvatar,
  type Avatar,
} from "@/lib/avatares";
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
              {avatar.especial ? t.avatares.bloqueado : tn.bloqueadoHasta(avatar.nivel)}
            </span>
          )}
        </div>

        <div>
          <p className="font-display text-2xl font-semibold leading-tight">{nombre}</p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-gold">
            {avatar.especial
              ? tn.especialEtiqueta
              : desbloqueado
                ? tn.desbloqueadoEnNivel(avatar.nivel)
                : tn.bloqueadoEnNivel(avatar.nivel, xpParaNivel(avatar.nivel).toLocaleString(locale))}
          </p>
        </div>

        <p className="text-sm leading-snug text-white/80">{descripcionAvatar(avatar, t)}</p>

        {avatar.especial && (
          <p className="w-full rounded-xl bg-white/10 px-3 py-2 text-left text-xs leading-snug text-white/80">
            <span className="block font-semibold uppercase tracking-wide text-gold">{t.avatares.comoSeConsigue}</span>
            {comoSeConsigueAvatar(avatar, t)}
          </p>
        )}

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

// Colección de iconos de perfil, agrupada por cómo se consiguen (lib/avatares.ts,
// GRUPOS_ICONOS): por nivel, premios de fin de liga y eventos. Los que tienes se
// pueden elegir; los que no salen en gris y dicen cómo conseguirlos. Se usa en la
// pestaña Iconos del perfil. La base de datos (cambiar_avatar, 0086 y 0140) vuelve
// a comprobar el nivel y los premios.
export default function SelectorAvatar({
  nivel,
  especiales = [],
}: {
  nivel: number;
  // Ids de los iconos especiales (premios de liga o evento) que tiene el usuario.
  especiales?: string[];
}) {
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

  const tiene = (a: Avatar) => (a.especial ? especiales.includes(a.id) : a.nivel <= nivel);
  const tengo = AVATARES.filter(tiene).length + ESPECIALES.filter(tiene).length;
  const total = AVATARES.length + ESPECIALES.length;

  const lista = AVATARES.filter((a) =>
    filtro === "todos" ? true : filtro === "mios" ? a.nivel <= nivel : a.nivel > nivel
  );

  const FILTROS: [Filtro, string][] = [
    ["todos", tn.filtroTodos],
    ["mios", tn.filtroMios],
    ["bloqueados", tn.filtroBloqueados],
  ];

  function abrir(a: Avatar) {
    setError(null);
    setAbierto(a);
  }

  // Cuadrícula de iconos de premio (fin de liga, eventos): los que no tienes salen
  // en gris con un candado, y al abrirlos dicen cómo se consiguen.
  function cuadriculaEspeciales(grupo: Avatar["grupo"]) {
    return (
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {ESPECIALES.filter((a) => a.grupo === grupo).map((a) => {
          const mio = tiene(a);
          const enUso = avatar === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => abrir(a)}
              aria-label={nombreAvatar(a, t)}
              className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-1.5 text-center text-[11px] font-medium leading-tight transition-colors ${
                enUso ? "border-gold bg-gold/10" : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-700"
              }`}
            >
              <span className="relative block w-full">
                <Image
                  src={a.srcMarco}
                  alt=""
                  width={96}
                  height={96}
                  className={`h-auto w-full rounded-xl ${mio ? "" : "brightness-[.45] grayscale"}`}
                />
                {!mio && (
                  <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-black/70 p-1.5 text-white">
                    <Candado className="h-3.5 w-3.5" />
                  </span>
                )}
              </span>
              <span className={mio ? "" : "text-neutral-500"}>{nombreAvatar(a, t)}</span>
              {enUso && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-neutral-950">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  const Cabecera = ({ grupo }: { grupo: Avatar["grupo"] }) => (
    <div>
      <p className="text-sm font-semibold">{t.avatares.grupos[grupo].titulo}</p>
      <p className="text-xs text-neutral-500">{t.avatares.grupos[grupo].ayuda}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{t.avatares.titulo}</p>
        <p className="text-xs font-medium text-neutral-500">{t.avatares.coleccion(tengo, total)}</p>
      </div>

      {GRUPOS_ICONOS.map((grupo) => (
        <section key={grupo} className="flex flex-col gap-2.5">
          {grupo === "nivel" ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <Cabecera grupo="nivel" />
                <div className="flex shrink-0 gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-900">
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
                      onClick={() => abrir(a)}
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
            </>
          ) : (
            <>
              <Cabecera grupo={grupo} />
              {cuadriculaEspeciales(grupo)}
            </>
          )}
        </section>
      ))}

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
          desbloqueado={tiene(abierto)}
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
