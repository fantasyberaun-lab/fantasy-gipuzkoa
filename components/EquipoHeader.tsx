"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameState } from "@/components/GameStateProvider";
import { createClient } from "@/lib/supabase/client";
import EliminarCuentaButton from "@/components/EliminarCuentaButton";
import CambiarLigaModal from "@/components/CambiarLigaModal";

export default function EquipoHeader() {
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
    <div className="flex items-center gap-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Tu equipo
        </p>
        <h1 className="text-2xl font-semibold">
          {cargando ? "Cargando…" : equipo.nombreEquipo}
        </h1>

        <button
          onClick={() => setMostrarModalLiga(true)}
          disabled={cargando}
          className="mt-1 flex items-center gap-1 rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          Cambiar o crear liga
        </button>

        <div className="mt-1 flex items-center gap-3 text-xs">
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
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Saldo
        </p>
        <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {cargando ? "…" : `${equipo.saldo} M`}
        </p>
      </div>

      {mostrarModalLiga && (
        <CambiarLigaModal onCerrar={() => setMostrarModalLiga(false)} />
      )}
    </div>
  );
}