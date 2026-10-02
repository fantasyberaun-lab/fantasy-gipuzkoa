// Llamadas del panel de admin a la ruta /api/importador.

import type { RondaOrigen, TorneoOrigen } from "./tipos";

type Respuesta<T> = { ok: true; datos: T } | { ok: false; mensaje: string };

async function pedir<T>(cuerpo: Record<string, unknown>): Promise<Respuesta<T>> {
  try {
    const res = await fetch("/api/importador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const json = await res.json();
    if (!json.ok) return { ok: false, mensaje: json.mensaje ?? "No se pudo importar." };
    return { ok: true, datos: json.datos as T };
  } catch {
    return { ok: false, mensaje: "No se pudo conectar con el servidor." };
  }
}

export const pedirTorneo = (url: string) =>
  pedir<TorneoOrigen>({ accion: "torneo", url });

export const pedirRonda = (url: string, ronda: number) =>
  pedir<RondaOrigen>({ accion: "ronda", url, ronda });
