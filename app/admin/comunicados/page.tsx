"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ComunicadoCard from "@/components/ComunicadoCard";
import {
  actualizarComunicadoDB,
  borrarComunicadoDB,
  crearComunicadoDB,
  fetchTodosComunicados,
} from "@/lib/supabase/comunicadosQueries";
import {
  DURACIONES_COMUNICADO,
  ETIQUETAS_COMUNICADO,
  LISTA_ETIQUETAS,
  caducaEnDias,
  estaVigente,
  ordenarComunicados,
  textoCaducidad,
} from "@/lib/comunicados";
import type { Comunicado, EtiquetaComunicado } from "@/lib/types";

const INPUT =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

interface Form {
  titulo: string;
  cuerpo: string;
  etiqueta: EtiquetaComunicado;
  fijado: boolean;
  // Clave de DURACIONES_COMUNICADO, o "mantener" al editar sin tocar la caducidad.
  duracion: string;
}

const FORM_VACIO: Form = {
  titulo: "",
  cuerpo: "",
  etiqueta: "importante",
  fijado: false,
  duracion: "7",
};

export default function AdminComunicadosPage() {
  const supabase = createClient();

  const [lista, setLista] = useState<Comunicado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Comunicado | null>(null);
  const [form, setForm] = useState<Form>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarCaducados, setMostrarCaducados] = useState(false);

  async function cargar() {
    setCargando(true);
    setLista(await fetchTodosComunicados(supabase));
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function campo<K extends keyof Form>(clave: K, valor: Form[K]) {
    setForm((prev) => ({ ...prev, [clave]: valor }));
  }

  function abrirNuevo() {
    setEditando(null);
    setForm(FORM_VACIO);
    setError(null);
    setFormAbierto(true);
  }

  function abrirEdicion(c: Comunicado) {
    setEditando(c);
    setForm({
      titulo: c.titulo,
      cuerpo: c.cuerpo,
      etiqueta: c.etiqueta,
      fijado: c.fijado,
      duracion: "mantener",
    });
    setError(null);
    setFormAbierto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cerrar() {
    setFormAbierto(false);
    setEditando(null);
    setError(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.titulo.trim()) return setError("Ponle un título al comunicado.");
    if (!form.cuerpo.trim()) return setError("Escribe el texto del comunicado.");

    // "mantener" solo existe al editar: deja la caducidad como estaba.
    const caduca =
      form.duracion === "mantener"
        ? (editando?.caduca ?? null)
        : caducaEnDias(DURACIONES_COMUNICADO.find((d) => d.valor === form.duracion)?.dias ?? null);

    const datos = {
      titulo: form.titulo.trim(),
      cuerpo: form.cuerpo.trim(),
      etiqueta: form.etiqueta,
      fijado: form.fijado,
      caduca,
    };

    setGuardando(true);
    const resultado = editando
      ? await actualizarComunicadoDB(supabase, editando.id, datos)
      : await crearComunicadoDB(supabase, datos);
    setGuardando(false);

    if (!resultado.ok) return setError(resultado.mensaje);
    cerrar();
    await cargar();
  }

  async function borrar(c: Comunicado) {
    if (!confirm(`¿Borrar el comunicado "${c.titulo}"? Dejará de verse para todos.`)) return;
    const resultado = await borrarComunicadoDB(supabase, c.id);
    if (!resultado.ok) return setError(resultado.mensaje);
    setLista((prev) => prev.filter((x) => x.id !== c.id));
  }

  const ordenados = ordenarComunicados(lista);
  const vigentes = ordenados.filter((c) => estaVigente(c));
  const caducados = ordenados.filter((c) => !estaVigente(c));

  const fila = (c: Comunicado) => (
    <li key={c.id} className="flex flex-col gap-2">
      <ul>
        <ComunicadoCard
          titulo={c.titulo}
          cuerpo={c.cuerpo}
          etiqueta={c.etiqueta}
          creado={c.creado}
        />
      </ul>
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span className="rounded-full border border-neutral-300 px-2 py-0.5 dark:border-neutral-700">
          {textoCaducidad(c.caduca)}
        </span>
        {c.fijado && (
          <span className="rounded-full border border-neutral-300 px-2 py-0.5 dark:border-neutral-700">
            Fijado arriba
          </span>
        )}
        <span className="flex-1" />
        <button
          onClick={() => abrirEdicion(c)}
          className="rounded border border-neutral-300 px-2 py-1 font-medium text-neutral-800 dark:border-neutral-700 dark:text-neutral-200"
        >
          {estaVigente(c) ? "Editar" : "Editar / republicar"}
        </button>
        <button
          onClick={() => borrar(c)}
          className="rounded border border-neutral-300 px-2 py-1 text-negative dark:border-neutral-700"
        >
          Borrar
        </button>
      </div>
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Mensajes para todos los jugadores. Salen en la pestaña Avisos de todas las ligas,
          incluida la pública, hasta que caducan.
        </p>
        {!formAbierto && (
          <button
            onClick={abrirNuevo}
            className="whitespace-nowrap rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            + Nuevo comunicado
          </button>
        )}
      </div>

      {formAbierto && (
        <form
          onSubmit={guardar}
          noValidate
          className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <p className="text-sm font-medium">
            {editando ? "Editar comunicado" : "Nuevo comunicado"}
          </p>

          <div>
            <span className="text-xs text-neutral-500">Etiqueta</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {LISTA_ETIQUETAS.map((clave) => (
                <button
                  key={clave}
                  type="button"
                  onClick={() => campo("etiqueta", clave)}
                  aria-pressed={form.etiqueta === clave}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    form.etiqueta === clave
                      ? "border-accent bg-accent text-white"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  {ETIQUETAS_COMUNICADO[clave].texto}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Título</span>
            <input
              type="text"
              value={form.titulo}
              maxLength={120}
              onChange={(e) => campo("titulo", e.target.value)}
              placeholder="Elo y valores actualizados · octubre de 2026"
              className={INPUT}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">
              Texto (los saltos de línea se respetan)
            </span>
            <textarea
              value={form.cuerpo}
              maxLength={4000}
              onChange={(e) => campo("cuerpo", e.target.value)}
              rows={5}
              className={INPUT}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-500">Duración</span>
              <select
                value={form.duracion}
                onChange={(e) => campo("duracion", e.target.value)}
                className={INPUT}
              >
                {editando && (
                  <option value="mantener">
                    Mantener ({textoCaducidad(editando.caduca).toLowerCase()})
                  </option>
                )}
                {DURACIONES_COMUNICADO.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {editando ? `Desde ahora: ${d.etiqueta}` : d.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.fijado}
                onChange={(e) => campo("fijado", e.target.checked)}
              />
              Fijar arriba de la lista
            </label>
          </div>

          {(form.titulo.trim() || form.cuerpo.trim()) && (
            <div>
              <span className="text-xs text-neutral-500">Así lo verán los jugadores</span>
              <ul className="mt-1">
                <ComunicadoCard
                  titulo={form.titulo.trim() || "Título"}
                  cuerpo={form.cuerpo.trim() || "Texto del comunicado"}
                  etiqueta={form.etiqueta}
                  creado={new Date().toISOString()}
                />
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-negative">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Publicar"}
            </button>
            <button
              type="button"
              onClick={cerrar}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!formAbierto && error && <p className="text-sm text-negative">{error}</p>}

      {cargando ? (
        <p className="text-sm text-neutral-500">Cargando comunicados…</p>
      ) : (
        <>
          {vigentes.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">
              No hay comunicados vigentes. Publica el primero con «Nuevo comunicado».
            </p>
          ) : (
            <ul className="flex flex-col gap-5">{vigentes.map(fila)}</ul>
          )}

          {caducados.length > 0 && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setMostrarCaducados((v) => !v)}
                className="self-start text-xs font-medium text-accent underline underline-offset-2"
              >
                {mostrarCaducados ? "Ocultar" : "Ver"} caducados ({caducados.length})
              </button>
              {mostrarCaducados && (
                <ul className="flex flex-col gap-5 opacity-70">{caducados.map(fila)}</ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
