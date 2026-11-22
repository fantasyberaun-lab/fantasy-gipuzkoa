"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/IdiomaProvider";
import SelectorAvatar from "@/components/SelectorAvatar";
import { EVENTO_XP } from "@/components/RachaDiaria";
import { fetchEstadoNivel, fetchIconosEspeciales } from "@/lib/supabase/nivelesQueries";

// Pestaña "Iconos" del perfil propio: toda la colección de iconos, separada de los
// niveles. Algunos se desbloquean por nivel; otros (fin de liga, eventos) se consiguen
// por otros medios. Ver lib/avatares.ts (grupos) y 0140_iconos_fin_de_liga.sql.
export default function PestanaIconos({ onVerNiveles }: { onVerNiveles?: () => void }) {
  const supabase = createClient();
  const t = useT();
  const [nivel, setNivel] = useState<number | null>(null);
  const [especiales, setEspeciales] = useState<string[]>([]);
  const [error, setError] = useState(false);

  async function cargar() {
    fetchIconosEspeciales(supabase).then(setEspeciales);
    const e = await fetchEstadoNivel(supabase);
    if (e) {
      setNivel(e.nivel);
      setError(false);
    } else {
      setError(true);
    }
  }

  useEffect(() => {
    cargar();
    // El nivel (y con él los iconos por nivel) cambia al ganar XP.
    window.addEventListener(EVENTO_XP, cargar);
    return () => window.removeEventListener(EVENTO_XP, cargar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (nivel === null) {
    return (
      <p className={`text-sm ${error ? "text-negative dark:text-red-400" : "text-neutral-500"}`}>
        {error ? t.niveles.error : t.niveles.cargando}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SelectorAvatar nivel={nivel} especiales={especiales} />
      {onVerNiveles && (
        <button
          type="button"
          onClick={onVerNiveles}
          className="w-fit text-left text-sm text-accent underline-offset-2 hover:underline"
        >
          {t.niveles.pestana} →
        </button>
      )}
    </div>
  );
}
