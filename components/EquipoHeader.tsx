"use client";

import { useRouter } from "next/navigation";
import { useGameState } from "@/components/GameStateProvider";
import { createClient } from "@/lib/supabase/client";

export default function EquipoHeader() {
  const { equipo } = useGameState();
  const router = useRouter();
  const supabase = createClient();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <div>
        {/* TODO: sustituir por el nombre real del equipo del usuario logueado, cuando haya autenticación */}
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Tu equipo
        </p>
        <h1 className="text-2xl font-semibold">{equipo.nombreEquipo}</h1>
        <button
          onClick={cerrarSesion}
          className="mt-1 text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-300"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="rounded-xl border border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Saldo
        </p>
        <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {equipo.saldo} M
        </p>
      </div>
    </div>
  );
}