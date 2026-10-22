"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameState } from "@/components/GameStateProvider";

// Las misiones viven ahora en la pestaña "Misiones" de Mi perfil. Esta ruta se
// conserva para los enlaces antiguos y redirige allí.
export default function MisionesPage() {
  const router = useRouter();
  const { equipo, cargando } = useGameState();

  useEffect(() => {
    if (cargando) return;
    router.replace(equipo.id ? `/managers/${equipo.id}?tab=misiones` : "/plantilla");
  }, [cargando, equipo.id, router]);

  return null;
}
