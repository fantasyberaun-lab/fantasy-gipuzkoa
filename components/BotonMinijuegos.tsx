"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/IdiomaProvider";

// Pestaña flotante pegada al borde derecho que lleva a /minijuegos.
//   - Estrecha (24 px): en móvil solo entra 8 px en las tarjetas, que tienen
//     12 px de margen interior, así que no tapa texto.
//   - Va a media altura, por encima de la barra inferior (z-30 frente al z-40 de
//     la barra; en un móvil de 640 px de alto queda a 94 px de ella).
//   - Se esconde mientras se hace scroll y vuelve al parar, para no estorbar al leer.
//   - No aparece en el chat, donde el borde derecho es el botón de enviar.
const OCULTA_EN = ["/chat"];

export default function BotonMinijuegos() {
  const pathname = usePathname();
  const t = useT().minijuegos;
  const [escondida, setEscondida] = useState(false);
  const temporizador = useRef<number | null>(null);

  useEffect(() => {
    function alHacerScroll() {
      setEscondida(true);
      if (temporizador.current) window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setEscondida(false), 700);
    }
    window.addEventListener("scroll", alHacerScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", alHacerScroll);
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, []);

  if (OCULTA_EN.some((r) => pathname?.startsWith(r))) return null;

  return (
    <Link
      href="/minijuegos"
      aria-label={t.flotanteAria}
      className={`fixed right-[env(safe-area-inset-right)] top-[58%] z-30 flex w-6 flex-col items-center gap-1.5 rounded-l-lg bg-gold py-2.5 text-brand-950 shadow-lg ring-1 ring-black/10 transition-transform duration-200 hover:bg-gold-dark focus-visible:translate-x-0 ${
        escondida ? "translate-x-full" : "translate-x-0"
      }`}
    >
      <span className="text-xs leading-none" aria-hidden="true">
        🎮
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider [text-orientation:mixed] [writing-mode:vertical-rl]">
        {t.flotante}
      </span>
    </Link>
  );
}
