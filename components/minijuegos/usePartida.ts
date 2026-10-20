"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIdioma } from "@/components/IdiomaProvider";
import {
  iniciarPartidaDB,
  responderPartidaDB,
  type FinalPartida,
  type JuegoId,
  type ModoJuego,
  type Pregunta,
  type ResultadoRespuesta,
  type TipoPartida,
} from "@/lib/supabase/minijuegosQueries";

export type Fase = "inicio" | "cargando" | "jugando" | "revelado" | "fin";
export type Respuesta = Extract<ResultadoRespuesta, { ok: true }>;

// Una ronda ya jugada, para el repaso al terminar: lo que se preguntó, lo que se
// envió y lo que contestó el servidor.
export interface Ronda {
  pregunta: Pregunta;
  enviada: Record<string, unknown>;
  resultado: Respuesta;
}

interface Opciones {
  // true: tras cada respuesta se enseña el resultado y se espera a "Siguiente"
  // (juegos sin cronómetro). false: la siguiente pregunta sale ya (juegos con
  // cronómetro: el reloj del servidor corre desde que se envía la respuesta).
  pausaTrasRespuesta: boolean;
  onCambio: () => void; // pide recargar el estado del día
}

// Controla una partida de un minijuego: iniciar, responder y los pasos entre
// preguntas. Todo el cálculo (aciertos, puntos, tiempos) lo hace el servidor.
export function usePartida(juego: JuegoId, { pausaTrasRespuesta, onCambio }: Opciones) {
  const supabase = createClient();
  const { idioma } = useIdioma();
  const [fase, setFase] = useState<Fase>("inicio");
  const [partida, setPartida] = useState<string | null>(null);
  const [ranked, setRanked] = useState(false);
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [recibidaEn, setRecibidaEn] = useState(0);
  const [pendiente, setPendiente] = useState<Pregunta | null>(null);
  const [ultima, setUltima] = useState<Respuesta | null>(null);
  const [puntos, setPuntos] = useState(0);
  const [final, setFinal] = useState<FinalPartida | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Ronda[]>([]);
  const preguntaRef = useRef<Pregunta | null>(null);
  const enviando = useRef(false);

  const mostrar = useCallback((p: Pregunta) => {
    setPregunta(p);
    preguntaRef.current = p;
    setRecibidaEn(performance.now());
  }, []);

  const iniciar = useCallback(
    async (tipo: TipoPartida, modo: ModoJuego, reintento = false) => {
      setFase("cargando");
      setError(null);
      setUltima(null);
      setFinal(null);
      setHistorial([]);
      const r = await iniciarPartidaDB(supabase, juego, tipo, modo, reintento, idioma);
      if (!r.ok) {
        setError(r.mensaje);
        setFase("inicio");
        onCambio();
        return;
      }
      setPartida(r.partida);
      setRanked(r.ranked);
      setPuntos(r.puntos);
      mostrar(r.pregunta);
      setFase("jugando");
      onCambio();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [juego, idioma, mostrar, onCambio]
  );

  const responder = useCallback(
    async (respuesta: Record<string, unknown>) => {
      if (!partida || enviando.current) return false;
      enviando.current = true;
      setError(null);
      const r = await responderPartidaDB(supabase, partida, respuesta);
      enviando.current = false;
      if (!r.ok) {
        setError(r.mensaje);
        return false;
      }
      if (preguntaRef.current) {
        const jugada: Ronda = { pregunta: preguntaRef.current, enviada: respuesta, resultado: r };
        setHistorial((h) => [...h, jugada]);
      }
      setUltima(r);
      setPuntos(r.puntos);
      if (r.terminada) {
        setFinal(r.final);
        setPendiente(null);
        setFase(pausaTrasRespuesta ? "revelado" : "fin");
        onCambio();
      } else if (pausaTrasRespuesta) {
        setPendiente(r.pregunta);
        setFase("revelado");
      } else if (r.pregunta) {
        mostrar(r.pregunta);
        setFase("jugando");
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partida, pausaTrasRespuesta, mostrar, onCambio]
  );

  // Después de ver el resultado de una respuesta (juegos con pausa).
  const continuar = useCallback(() => {
    if (ultima?.terminada) {
      setFase("fin");
    } else if (pendiente) {
      mostrar(pendiente);
      setPendiente(null);
      setFase("jugando");
    }
  }, [ultima, pendiente, mostrar]);

  const volver = useCallback(() => {
    setFase("inicio");
    setPartida(null);
    setPregunta(null);
    setUltima(null);
    setFinal(null);
    setError(null);
    onCambio();
  }, [onCambio]);

  return {
    fase,
    ranked,
    pregunta,
    recibidaEn,
    ultima,
    historial,
    puntos,
    final,
    error,
    iniciar,
    responder,
    continuar,
    volver,
  };
}
