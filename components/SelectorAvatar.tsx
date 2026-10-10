"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useT } from "@/components/IdiomaProvider";
import { cambiarAvatarDB } from "@/lib/supabase/queries";
import { AVATARES } from "@/lib/avatares";

const OPCION =
  "flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 text-[11px] leading-tight transition-colors disabled:opacity-50";

// Elegir icono de perfil, en Ajustes > Mi cuenta. En prueba: MenuAjustes solo
// lo enseña a los root y la base de datos (cambiar_avatar, 0077) también lo
// exige.
export default function SelectorAvatar() {
  const supabase = createClient();
  const t = useT();
  const ta = t.avatares;
  const { avatar, setAvatar } = useGameState();
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function elegir(id: string | null) {
    if (id === avatar || guardando) return;
    setGuardando(true);
    setAviso(null);
    const r = await cambiarAvatarDB(supabase, id);
    setGuardando(false);
    if (!r.ok) {
      setAviso({ tipo: "error", texto: r.mensaje });
      return;
    }
    setAvatar(id);
    setAviso({ tipo: "ok", texto: ta.guardado });
  }

  const clase = (activo: boolean) =>
    `${OPCION} ${
      activo
        ? "border-accent bg-accent/10"
        : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-700"
    }`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-neutral-500">{ta.titulo}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {AVATARES.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => elegir(a.id)}
            disabled={guardando}
            aria-pressed={avatar === a.id}
            className={clase(avatar === a.id)}
          >
            <Image src={a.srcMarco} alt="" width={96} height={96} className="rounded-lg" />
            <span className="text-center">{a.nombre}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => elegir(null)}
          disabled={guardando}
          aria-pressed={avatar === null}
          className={clase(avatar === null)}
        >
          <span className="flex h-24 w-24 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
            —
          </span>
          <span className="text-center">{ta.sinAvatar}</span>
        </button>
      </div>
      <p className="text-xs text-neutral-500">{ta.ayuda}</p>
      {aviso && (
        <p
          className={`text-sm ${
            aviso.tipo === "ok" ? "text-green-600 dark:text-green-400" : "text-negative"
          }`}
        >
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
