"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useT } from "@/components/IdiomaProvider";
import { buscarAvatar, type Avatar } from "@/lib/avatares";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

// Retrato a pantalla completa (versión grande, con marco). Se cierra tocando
// fuera, con la X o con Escape. En un portal para quedar por encima de la
// cabecera y de la barra inferior del móvil.
function AvatarAmpliado({ avatar, onCerrar }: { avatar: Avatar; onCerrar: () => void }) {
  const t = useT();

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={avatar.nombre}
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
    >
      <button
        type="button"
        onClick={onCerrar}
        aria-label={t.comun.cerrar}
        className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <Image
        src={avatar.srcGrande}
        alt={avatar.nombre}
        width={800}
        height={800}
        unoptimized
        onClick={(e) => e.stopPropagation()}
        className="h-auto w-full max-w-[min(90vw,70vh,800px)] rounded-lg shadow-2xl"
      />
      <p className="font-display text-lg font-semibold text-white">{avatar.nombre}</p>
    </div>,
    document.body
  );
}

// Icono de perfil: el avatar elegido (versión sin marco) o, si no hay, las
// iniciales. Con `ampliable`, al tocarlo se abre el retrato en grande.
export default function AvatarPerfil({
  avatar,
  nombre,
  tamano = 48,
  className = "",
  ampliable = false,
}: {
  avatar: string | null | undefined;
  nombre: string;
  tamano?: number;
  className?: string;
  ampliable?: boolean;
}) {
  const elegido = buscarAvatar(avatar);
  const [ampliado, setAmpliado] = useState(false);

  if (elegido) {
    const imagen = (
      <Image
        src={elegido.src}
        alt={elegido.nombre}
        title={elegido.nombre}
        width={tamano}
        height={tamano}
        className={`shrink-0 rounded-xl ${className}`}
      />
    );
    if (!ampliable) return imagen;
    return (
      <>
        <button
          type="button"
          onClick={() => setAmpliado(true)}
          aria-label={elegido.nombre}
          className="shrink-0 rounded-xl transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {imagen}
        </button>
        {ampliado && <AvatarAmpliado avatar={elegido} onCerrar={() => setAmpliado(false)} />}
      </>
    );
  }

  return (
    <div
      style={{ width: tamano, height: tamano }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold dark:bg-neutral-800 ${className}`}
    >
      {iniciales(nombre)}
    </div>
  );
}
