"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_RESPUESTA,
  borrarSugerenciaDB,
  fetchSugerenciasAdmin,
  marcarSugerenciaLeidaDB,
  type SugerenciaAdmin,
  type TipoSugerencia,
} from "@/lib/supabase/sugerenciasQueries";

const INPUT =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

const TIPO: Record<TipoSugerencia, { texto: string; clases: string }> = {
  sugerencia: {
    texto: "Sugerencia",
    clases: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
  error: {
    texto: "Error",
    clases: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
  otro: {
    texto: "Otro",
    clases: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
};

type Filtro = "pendientes" | "leidas" | "todas";

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

// Buzón de sugerencias de los managers (0076). Al marcar una como leída, el
// autor ve el check en su historial y un aviso en la pestaña Avisos.
export default function AdminSugerenciasPage() {
  const supabase = createClient();

  const [lista, setLista] = useState<SugerenciaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  // Sugerencia con el cuadro de respuesta abierto y su borrador.
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    const r = await fetchSugerenciasAdmin(supabase);
    if (r.ok) {
      setLista(r.lista);
      setError(null);
    } else {
      setError(r.mensaje);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function marcar(s: SugerenciaAdmin, leida: boolean, conRespuesta: string | null) {
    setGuardando(s.id);
    setError(null);
    const r = await marcarSugerenciaLeidaDB(supabase, s.id, leida, conRespuesta);
    setGuardando(null);
    if (!r.ok) return setError(r.mensaje);
    setRespondiendo(null);
    setRespuesta("");
    await cargar();
  }

  async function borrar(s: SugerenciaAdmin) {
    if (!confirm("¿Borrar esta sugerencia? No se puede deshacer y el autor dejará de verla.")) return;
    const r = await borrarSugerenciaDB(supabase, s.id);
    if (!r.ok) return setError(r.mensaje);
    setLista((prev) => prev.filter((x) => x.id !== s.id));
  }

  function abrirRespuesta(s: SugerenciaAdmin) {
    setRespondiendo(s.id);
    setRespuesta(s.respuesta ?? "");
  }

  const pendientes = lista.filter((s) => !s.leidaEn);
  const leidas = lista.filter((s) => s.leidaEn);
  const visibles = filtro === "pendientes" ? pendientes : filtro === "leidas" ? leidas : lista;

  const FILTROS: { valor: Filtro; texto: string }[] = [
    { valor: "pendientes", texto: `Pendientes (${pendientes.length})` },
    { valor: "leidas", texto: `Leídas (${leidas.length})` },
    { valor: "todas", texto: `Todas (${lista.length})` },
  ];

  const fila = (s: SugerenciaAdmin) => {
    const tipo = TIPO[s.tipo] ?? TIPO.otro;
    const ocupada = guardando === s.id;
    return (
      <li
        key={s.id}
        className={`flex flex-col gap-2 rounded-xl border p-4 ${
          s.leidaEn
            ? "border-neutral-200 dark:border-neutral-800"
            : "border-accent/60 bg-accent/5"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tipo.clases}`}
          >
            {tipo.texto}
          </span>
          <span className="font-semibold">{s.nombre ?? "Usuario eliminado"}</span>
          <span className="text-neutral-500">· {fechaHora(s.creada)}</span>
          <span className="flex-1" />
          {s.leidaEn ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              ✓ Leída el {fechaHora(s.leidaEn)}
            </span>
          ) : (
            <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-white">Nueva</span>
          )}
        </div>

        <p className="whitespace-pre-line text-sm">{s.texto}</p>

        {s.respuesta && respondiendo !== s.id && (
          <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm">
            <span className="font-semibold">Tu respuesta:</span>{" "}
            <span className="whitespace-pre-line">{s.respuesta}</span>
          </p>
        )}

        {respondiendo === s.id ? (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500">
                Respuesta opcional (la verá el autor en Avisos)
              </span>
              <textarea
                value={respuesta}
                maxLength={MAX_RESPUESTA}
                rows={3}
                onChange={(e) => setRespuesta(e.target.value)}
                placeholder="¡Gracias! Lo tendremos en cuenta para la próxima actualización."
                className={INPUT}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => marcar(s, true, respuesta)}
                disabled={ocupada}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {ocupada ? "Guardando…" : s.leidaEn ? "Guardar respuesta" : "Marcar como leída"}
              </button>
              <button
                onClick={() => setRespondiendo(null)}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs dark:border-neutral-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {!s.leidaEn && (
              <button
                onClick={() => marcar(s, true, null)}
                disabled={ocupada}
                className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {ocupada ? "Guardando…" : "✓ Marcar como leída"}
              </button>
            )}
            <button
              onClick={() => abrirRespuesta(s)}
              className="rounded border border-neutral-300 px-2 py-1 font-medium text-neutral-800 dark:border-neutral-700 dark:text-neutral-200"
            >
              {s.respuesta ? "Editar respuesta" : s.leidaEn ? "Responder" : "Leída y responder"}
            </button>
            {s.leidaEn && (
              <button
                onClick={() => marcar(s, false, null)}
                disabled={ocupada}
                className="rounded border border-neutral-300 px-2 py-1 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
              >
                Volver a pendiente
              </button>
            )}
            <span className="flex-1" />
            <button
              onClick={() => borrar(s)}
              className="rounded border border-neutral-300 px-2 py-1 text-negative dark:border-neutral-700"
            >
              Borrar
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-neutral-500">
        Mensajes que mandan los managers desde Ajustes → Enviar sugerencia. Al marcar una como
        leída, el autor ve un check en su historial y un aviso en la pestaña Avisos (con tu
        respuesta, si escribes una).
      </p>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setFiltro(f.valor)}
            aria-pressed={filtro === f.valor}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filtro === f.valor
                ? "border-accent bg-accent text-white"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            {f.texto}
          </button>
        ))}
        <span className="flex-1" />
        <button
          type="button"
          onClick={cargar}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs dark:border-neutral-700"
        >
          Actualizar
        </button>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      {cargando ? (
        <p className="text-sm text-neutral-500">Cargando sugerencias…</p>
      ) : visibles.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          {filtro === "pendientes" ? "No hay sugerencias pendientes. 🎉" : "No hay sugerencias."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">{visibles.map(fila)}</ul>
      )}
    </div>
  );
}
