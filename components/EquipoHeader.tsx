"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameState } from "@/components/GameStateProvider";
import { createClient } from "@/lib/supabase/client";
import EliminarCuentaButton from "@/components/EliminarCuentaButton";
import CambiarLigaModal from "@/components/CambiarLigaModal";
import SaldoConPujas from "@/components/SaldoConPujas";
import ThemeToggle from "@/components/ThemeToggle";
import InstallPwaButton from "@/components/InstallPwaButton";
import InfoReglasButton from "@/components/InfoReglasButton";

// Contenido de la cabecera morada: escudo, nombre del equipo, liga y saldo.
export default function EquipoHeader() {
  const { equipo, cargando, misLigas, comprometidoEnPujas } = useGameState();
  const ligaActiva = misLigas.find((l) => l.ligaId === equipo.leagueId);

  return (
    <div className="flex flex-col gap-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Image
            src="/icons/icon-192.png"
            alt="Escudo Beraun"
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
          <ThemeToggle onDark />
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {cargando ? "Cargando…" : equipo.nombreEquipo}
          </h1>
          {!cargando && ligaActiva && (
            <p className="mt-0.5 truncate text-sm text-white/70">
              {ligaActiva.nombre}
              {ligaActiva.tipo === "publica" ? " · Todos contra todos" : ""}
            </p>
          )}
        </div>

        <div className="shrink-0 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/15">
          <p className="text-xs font-medium text-white/70">Saldo</p>
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
              title="Con el saldo en negativo no puntúas en la jornada. Vende un jugador o espera a recuperar saldo antes de que empiece."
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
              <span>No puntuarás si sigues en negativo cuando empiece la jornada</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Fila de acciones de cuenta, justo debajo de la cabecera.
export function EquipoAcciones() {
  const { equipo, cargando, esRoot } = useGameState();
  const router = useRouter();
  const supabase = createClient();
  const [mostrarModalLiga, setMostrarModalLiga] = useState(false);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
        Cambiar o crear liga
      </button>

      {!cargando && equipo.id && (
        <Link
          href={`/managers/${equipo.id}`}
          className="font-medium text-neutral-700 underline underline-offset-2 hover:text-accent dark:text-neutral-300"
        >
          Mi perfil
        </Link>
      )}
      <button
        onClick={cerrarSesion}
        className="text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-300"
      >
        Cerrar sesión
      </button>
      <EliminarCuentaButton />
      {esRoot && (
        <Link
          href="/admin"
          className="font-medium text-accent underline underline-offset-2"
        >
          Admin
        </Link>
      )}

      {mostrarModalLiga && (
        <CambiarLigaModal onCerrar={() => setMostrarModalLiga(false)} />
      )}
    </div>
  );
}
