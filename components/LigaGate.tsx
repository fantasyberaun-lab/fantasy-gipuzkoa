"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGameState } from "@/components/GameStateProvider";
import { createClient } from "@/lib/supabase/client";
import LigaForm from "@/components/LigaForm";
import { useT } from "@/components/IdiomaProvider";

export default function LigaGate({ children }: { children: React.ReactNode }) {
  const { cargando, tieneEquipo, esLigaPublica } = useGameState();
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  // En la liga pública no existe la lista de jugadores con clausulazos: si
  // alguien entra por un enlace antiguo, se le lleva al Mercado. Los Avisos
  // (/notificaciones) sí existen: allí van los comunicados del administrador.
  const rutaNoDisponible = esLigaPublica && pathname === "/jugadores";

  useEffect(() => {
    if (rutaNoDisponible) router.replace("/mercado");
  }, [rutaNoDisponible, router]);

  if (cargando) {
    return (
      <div className="mx-auto max-w-sm px-4 pt-24 text-center text-sm text-neutral-500">
        {t.comun.cargando}
      </div>
    );
  }

  if (!tieneEquipo) {
    return <PantallaLiga />;
  }

  if (rutaNoDisponible) return null;

  return <>{children}</>;
}

function PantallaLiga() {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 pt-16">
      <p className="text-center text-lg font-semibold">{t.liga.tituloSinEquipo}</p>
      <p className="mt-1 text-center text-sm text-neutral-500">
        {t.liga.sinEquipo}
      </p>

      <div className="mt-6">
        <LigaForm onExito={() => window.location.reload()} />
      </div>

      <button
        onClick={cerrarSesion}
        className="mt-4 w-full text-center text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-300"
      >
        {t.liga.cerrarSesion}
      </button>
    </div>
  );
}