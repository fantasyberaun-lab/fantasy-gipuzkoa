"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { fetchResumenChat, type ResumenChat } from "@/lib/supabase/chatQueries";

// Contadores del chat de la liga activa, para el globo de la pestaña Chat.
//
// Sin Realtime a propósito: la liga pública puede tener muchísima gente conectada y
// Realtime sobre una tabla comprueba permisos por cada mensaje y cada persona. Aquí
// se pregunta al abrir la app, al volver a la pestaña y cada 90 s mientras está
// visible (chat_resumen, una lectura por índice). Con el chat abierto, ChatPanel
// consulta por su cuenta cada pocos segundos.
const CADA_MS = 90_000;

interface ChatContextValue {
  resumen: ResumenChat;
  // Número que enseña la pestaña: en la pública solo las menciones (con miles de
  // mensajes el total no dice nada); en una privada, los mensajes sin leer.
  globo: number;
  refrescar: () => Promise<void>;
  // El panel avisa al leer: pone los contadores a cero sin esperar a la red.
  marcarLeidoLocal: (ultimoId: number) => void;
}

const SIN_RESUMEN: ResumenChat = { noLeidos: 0, menciones: 0, ultimoId: 0 };

const ChatContext = createContext<ChatContextValue>({
  resumen: SIN_RESUMEN,
  globo: 0,
  refrescar: async () => {},
  marcarLeidoLocal: () => {},
});

export function useChat() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const { equipo, esLigaPublica, cargando } = useGameState();
  const ligaId = equipo.leagueId;
  const [resumen, setResumen] = useState<ResumenChat>(SIN_RESUMEN);
  // Para descartar respuestas de una liga que ya no es la activa.
  const ligaActual = useRef<string | null>(null);
  ligaActual.current = ligaId || null;

  const refrescar = useCallback(async () => {
    if (!ligaId) return;
    const r = await fetchResumenChat(supabase, ligaId);
    if (r && ligaActual.current === ligaId) setResumen(r);
  }, [supabase, ligaId]);

  useEffect(() => {
    setResumen(SIN_RESUMEN);
    if (cargando || !ligaId) return;
    refrescar();

    const temporizador = window.setInterval(() => {
      if (document.visibilityState === "visible") refrescar();
    }, CADA_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(temporizador);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, ligaId]);

  const marcarLeidoLocal = useCallback((ultimoId: number) => {
    setResumen((r) => ({ noLeidos: 0, menciones: 0, ultimoId: Math.max(r.ultimoId, ultimoId) }));
  }, []);

  const globo = esLigaPublica ? resumen.menciones : resumen.noLeidos;

  const valor = useMemo(
    () => ({ resumen, globo, refrescar, marcarLeidoLocal }),
    [resumen, globo, refrescar, marcarLeidoLocal]
  );

  return <ChatContext.Provider value={valor}>{children}</ChatContext.Provider>;
}
