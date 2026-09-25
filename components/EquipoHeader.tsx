"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameState } from "@/components/GameStateProvider";
import { createClient } from "@/lib/supabase/client";
import EliminarCuentaButton from "@/components/EliminarCuentaButton";
import CambiarLigaModal from "@/components/CambiarLigaModal";

export default function EquipoHeader() {
  const { equipo, cargando, esRoot, misLigas } = useGameState();
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
        <button
          onClick={() => setMostrarModalLiga(true)}
          className="flex items-center gap-1.5 text-left"
        >
          <h1 className="text-2xl font-semibold">
            {cargando ? "Cargando…" : equipo.nombreEquipo}
          </h1>
          {!cargando && misLigas.length > 0 && (
            <svg
              className="mt-1 h-4 w-4 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
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