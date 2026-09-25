"use client";

import { useRouter } from "next/navigation";
import { useGameState } from "@/components/GameStateProvider";
import { createClient } from "@/lib/supabase/client";
import LigaForm from "@/components/LigaForm";

export default function LigaGate({ children }: { children: React.ReactNode }) {
  const { cargando, tieneEquipo } = useGameState();

  if (cargando) {
    return (
      <div className="mx-auto max-w-sm px-4 pt-24 text-center text-sm text-neutral-500">
        Cargando…
      </div>
    );
  }

  if (!tieneEquipo) {
    return <PantallaLiga />;
  }

  return <>{children}</>;
}

function PantallaLiga() {
  const router = useRouter();
  const supabase = createClient();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 pt-16">
      <p className="text-center text-lg font-semibold">Fantasy Campeonatos de Gipuzkoa</p>
      <p className="mt-1 text-center text-sm text-neutral-500">
        Todavía no tienes equipo en ninguna liga.
      </p>

      <div className="mt-6">
        <LigaForm onExito={() => window.location.reload()} />
      </div>

      <button
        onClick={cerrarSesion}
        className="mt-4 w-full text-center text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-300"
      >
        Cerrar sesión
      </button>
    </div>
  );
}