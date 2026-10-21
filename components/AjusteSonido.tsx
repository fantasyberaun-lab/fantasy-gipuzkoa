"use client";

import { useEffect, useState } from "react";
import Segmentado from "@/components/Segmentado";
import { useT } from "@/components/IdiomaProvider";
import {
  guardarPreferenciaSonido,
  leerPreferenciaSonido,
  sonar,
  type EstiloSonido,
} from "@/lib/sonido";

type Modo = "si" | "no";

// Interruptor y volumen de los efectos de sonido (Ajustes > Configuración).
export default function AjusteSonido() {
  const t = useT();
  const [activo, setActivo] = useState(true);
  const [volumen, setVolumen] = useState(60);
  const [estilo, setEstilo] = useState<EstiloSonido>("suave");

  useEffect(() => {
    const p = leerPreferenciaSonido();
    setActivo(p.activo);
    setVolumen(Math.round(p.volumen * 100));
    setEstilo(p.estilo);
  }, []);

  function cambiarModo(m: Modo) {
    const nuevo = m === "si";
    setActivo(nuevo);
    guardarPreferenciaSonido({ activo: nuevo, volumen: volumen / 100, estilo });
    if (nuevo) sonar("acierto"); // pequeña muestra al activarlo
  }

  function cambiarVolumen(v: number) {
    setVolumen(v);
    guardarPreferenciaSonido({ activo, volumen: v / 100, estilo });
  }

  function cambiarEstilo(e: EstiloSonido) {
    setEstilo(e);
    guardarPreferenciaSonido({ activo, volumen: volumen / 100, estilo: e });
    sonar("fichar"); // muestra del estilo elegido
  }

  return (
    <div className="space-y-3">
      <Segmentado<Modo>
        etiqueta={t.ajustes.sonido}
        valor={activo ? "si" : "no"}
        onCambiar={cambiarModo}
        opciones={[
          { valor: "si", texto: t.ajustes.sonidoActivado },
          { valor: "no", texto: t.ajustes.sonidoSilenciado },
        ]}
      />
      {activo && (
        <Segmentado<EstiloSonido>
          etiqueta={t.ajustes.sonidoEstilo}
          valor={estilo}
          onCambiar={cambiarEstilo}
          opciones={[
            { valor: "suave", texto: t.ajustes.sonidoSuave },
            { valor: "arcade", texto: t.ajustes.sonidoArcade },
          ]}
        />
      )}
      {activo && (
        <label className="flex items-center gap-3 text-sm">
          <span className="shrink-0 text-neutral-600 dark:text-neutral-300">
            {t.ajustes.sonidoVolumen}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={volumen}
            onChange={(e) => cambiarVolumen(Number(e.target.value))}
            onPointerUp={() => sonar("acierto")}
            onKeyUp={() => sonar("acierto")}
            aria-label={t.ajustes.sonidoVolumen}
            className="min-w-0 flex-1 accent-[rgb(var(--accent))]"
          />
          <span className="w-10 shrink-0 text-right tabular-nums text-neutral-500">{volumen}%</span>
        </label>
      )}
      <p className="text-xs text-neutral-500">{t.ajustes.sonidoAyuda}</p>
    </div>
  );
}
