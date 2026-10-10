"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGameState } from "@/components/GameStateProvider";
import CambiarLigaModal from "@/components/CambiarLigaModal";
import SaldoConPujas from "@/components/SaldoConPujas";
import MenuAjustes from "@/components/MenuAjustes";
import InstallPwaButton from "@/components/InstallPwaButton";
import InfoReglasButton from "@/components/InfoReglasButton";
import { useT } from "@/components/IdiomaProvider";

// Contenido de la cabecera morada: escudo, nombre del equipo, liga y saldo.
export default function EquipoHeader() {
  const { equipo, cargando, misLigas, comprometidoEnPujas } = useGameState();
  const t = useT();
  const ligaActiva = misLigas.find((l) => l.ligaId === equipo.leagueId);

  return (
    <div className="flex flex-col gap-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Image
            src="/icons/icon-192.png"
            alt={t.ajustes.escudoAlt}
            width={36}
            height={36}
            className="rounded-full"
            priority
          />
          <span className="hidden text-sm font-medium text-white/70 sm:inline">
            Beraun Fantasy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <InstallPwaButton onDark />
          <InfoReglasButton onDark />
          <MenuAjustes />
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {cargando ? t.comun.cargando : equipo.nombreEquipo}
          </h1>
          {!cargando && ligaActiva && (
            <p className="mt-0.5 truncate text-sm text-white/70">
              {ligaActiva.nombre}
              {ligaActiva.tipo === "publica" ? t.ajustes.todosContraTodos : ""}
            </p>
          )}
        </div>

        <div className="shrink-0 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/15">
          <p className="text-xs font-medium text-white/70">{t.ajustes.saldo}</p>
          <p className="font-display text-2xl font-semibold leading-tight text-gold [&_span]:text-red-300">
            {cargando ? (
              "…"
            ) : (
              <SaldoConPujas saldo={equipo.saldo} comprometido={comprometidoEnPujas} />
            )}
          </p>
          {!cargando && equipo.saldo < 0 && (
            <p
              role="status"
              title={t.ajustes.saldoNegativoTitle}
              className="mt-1 flex max-w-[11.5rem] items-start gap-1 text-[10.5px] leading-snug text-red-200/90"
            >
              <svg
                className="mt-[1px] h-3 w-3 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 2 1 18h18L10 2Zm-1 6h2v5H9V8Zm0 6h2v2H9v-2Z" />
              </svg>
              <span>{t.ajustes.saldoNegativo}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Fila de acciones justo debajo de la cabecera. Lo de la cuenta (cerrar
// sesión, eliminarla, admin...) está en el menú de ajustes (MenuAjustes).
export function EquipoAcciones() {
  const { equipo, cargando } = useGameState();
  const t = useT();
  const [mostrarModalLiga, setMostrarModalLiga] = useState(false);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <button
        onClick={() => setMostrarModalLiga(true)}
        disabled={cargando}
        className="flex items-center gap-1 rounded-full border border-neutral-300 px-2.5 py-1 font-medium text-neutral-700 transition-colors hover:border-accent hover:text-accent disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
        {t.ajustes.cambiarLiga}
      </button>

      {!cargando && equipo.id && (
        <Link
          href={`/managers/${equipo.id}`}
          className="font-medium text-neutral-700 underline underline-offset-2 hover:text-accent dark:text-neutral-300"
        >
          {t.ajustes.miPerfil}
        </Link>
      )}

      {mostrarModalLiga && (
        <CambiarLigaModal onCerrar={() => setMostrarModalLiga(false)} />
      )}
    </div>
  );
}
