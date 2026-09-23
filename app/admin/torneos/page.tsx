"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  actualizarTorneoDB,
  crearTorneoDB,
  eliminarTorneoDB,
  fetchTodosLosJugadores,
  type JugadorAdmin,
} from "@/lib/supabase/adminQueries";
import { fetchParticipantesIds, fetchTorneos } from "@/lib/supabase/torneosQueries";
import { estadoTorneo, ordenarTorneos, type DatosTorneo, type Torneo } from "@/lib/torneos";
import FichaTorneo from "@/components/FichaTorneo";
import type { Categoria } from "@/lib/types";

// El formulario trabaja siempre con strings (es lo que devuelven los
// inputs); se convierte a DatosTorneo al guardar. Solo el nombre es
// obligatorio: el resto son textos libres, sin ningún formato exigido.
interface FormTorneo {
  nombre: string;
  categoria: "" | "1" | "2" | "3";
  observaciones: string;
  organizador: string;
  federacion: string;
  director: string;
  arbitroPrincipal: string;
  arbitrosAdjuntos: string;
  lugar: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  pais: string;
  fechaInicio: string;
  fechaFin: string;
  numeroRondas: string;
  sistema: string;
  ritmoJuego: string;
  computoElo: string;
  desempates: string;
  webUrl: string;
  emailContacto: string;
}

const FORM_VACIO: FormTorneo = {
  nombre: "",
  categoria: "",
  observaciones: "",
  organizador: "",
  federacion: "",
  director: "",
  arbitroPrincipal: "",
  arbitrosAdjuntos: "",
  lugar: "",
  direccion: "",
  ciudad: "",
  provincia: "Gipuzkoa",
  pais: "España",
  fechaInicio: "",
  fechaFin: "",
  numeroRondas: "",
  sistema: "",
  ritmoJuego: "",
  computoElo: "",
  desempates: "",
  webUrl: "",
  emailContacto: "",
};

const INPUT =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

const vacioANull = (texto: string) => (texto.trim() === "" ? null : texto.trim());

function formADatos(f: FormTorneo): DatosTorneo {
  const rondas = Number(f.numeroRondas);
  return {
    nombre: f.nombre.trim(),
    categoria: f.categoria ? (Number(f.categoria) as Categoria) : null,
    observaciones: vacioANull(f.observaciones),
    organizador: vacioANull(f.organizador),
    federacion: vacioANull(f.federacion),
    director: vacioANull(f.director),
    arbitroPrincipal: vacioANull(f.arbitroPrincipal),
    arbitrosAdjuntos: vacioANull(f.arbitrosAdjuntos),
    lugar: vacioANull(f.lugar),
    direccion: vacioANull(f.direccion),
    ciudad: vacioANull(f.ciudad),
    provincia: vacioANull(f.provincia),
    pais: vacioANull(f.pais),
    fechaInicio: vacioANull(f.fechaInicio),
    fechaFin: vacioANull(f.fechaFin),
    numeroRondas: f.numeroRondas.trim() !== "" && Number.isFinite(rondas) ? Math.round(rondas) : null,
    sistema: vacioANull(f.sistema),
    ritmoJuego: vacioANull(f.ritmoJuego),
    computoElo: vacioANull(f.computoElo),
    desempates: vacioANull(f.desempates),
    webUrl: vacioANull(f.webUrl),
    emailContacto: vacioANull(f.emailContacto),
  };
}

function torneoAForm(t: Torneo): FormTorneo {
  return {
    nombre: t.nombre,
    categoria: t.categoria ? (String(t.categoria) as FormTorneo["categoria"]) : "",
    observaciones: t.observaciones ?? "",
    organizador: t.organizador ?? "",
    federacion: t.federacion ?? "",
    director: t.director ?? "",
    arbitroPrincipal: t.arbitroPrincipal ?? "",
    arbitrosAdjuntos: t.arbitrosAdjuntos ?? "",
    lugar: t.lugar ?? "",
    direccion: t.direccion ?? "",
    ciudad: t.ciudad ?? "",
    provincia: t.provincia ?? "",
    pais: t.pais ?? "",
    fechaInicio: t.fechaInicio ?? "",
    fechaFin: t.fechaFin ?? "",
    numeroRondas: t.numeroRondas != null ? String(t.numeroRondas) : "",
    sistema: t.sistema ?? "",
    ritmoJuego: t.ritmoJuego ?? "",
    computoElo: t.computoElo ?? "",
    desempates: t.desempates ?? "",
    webUrl: t.webUrl ?? "",
    emailContacto: t.emailContacto ?? "",
  };
}

function Campo({
  etiqueta,
  children,
  className = "",
}: {
  etiqueta: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs text-neutral-500">{etiqueta}</span>
      {children}
    </label>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {titulo}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

// Elección de los jugadores que participan en el torneo. Trabaja con un
// Set de ids que vive en el formulario padre.
function SelectorJugadores({
  jugadores,
  seleccionados,
  onCambiar,
}: {
  jugadores: JugadorAdmin[];
  seleccionados: Set<string>;
  onCambiar: (nuevo: Set<string>) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<"" | "1" | "2" | "3">("");

  // Solo jugadores activos, más los ya inscritos aunque estén inactivos
  // (para poder verlos y quitarlos).
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return jugadores.filter((j) => {
      if (!j.activo && !seleccionados.has(j.id)) return false;
      if (filtroCategoria && String(j.categoria) !== filtroCategoria) return false;
      if (texto && !`${j.nombre} ${j.club}`.toLowerCase().includes(texto)) return false;
      return true;
    });
  }, [jugadores, seleccionados, busqueda, filtroCategoria]);

  function alternar(id: string) {
    const nuevo = new Set(seleccionados);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    onCambiar(nuevo);
  }

  function marcarVisibles() {
    const nuevo = new Set(seleccionados);
    visibles.forEach((j) => nuevo.add(j.id));
    onCambiar(nuevo);
  }

  function quitarVisibles() {
    const nuevo = new Set(seleccionados);
    visibles.forEach((j) => nuevo.delete(j.id));
    onCambiar(nuevo);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Jugadores del torneo · {seleccionados.size} seleccionado
        {seleccionados.size === 1 ? "" : "s"}
      </legend>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o club…"
          className={`${INPUT} sm:flex-1`}
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value as typeof filtroCategoria)}
          className={`${INPUT} sm:w-auto`}
        >
          <option value="">Todas las categorías</option>
          <option value="1">1ª</option>
          <option value="2">2ª</option>
          <option value="3">3ª</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={marcarVisibles}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700"
        >
          Marcar los {visibles.length} visibles
        </button>
        <button
          type="button"
          onClick={quitarVisibles}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700"
        >
          Quitar los visibles
        </button>
        <button
          type="button"
          onClick={() => onCambiar(new Set())}
          disabled={seleccionados.size === 0}
          className="rounded border border-neutral-300 px-2 py-1 disabled:opacity-40 dark:border-neutral-700"
        >
          Quitar todos
        </button>
      </div>

      <ul className="max-h-72 divide-y divide-neutral-200 overflow-y-auto rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {visibles.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-neutral-500">
            Ningún jugador coincide.
          </li>
        )}
        {visibles.map((j) => (
          <li key={j.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900">
              <input
                type="checkbox"
                checked={seleccionados.has(j.id)}
                onChange={() => alternar(j.id)}
              />
              <span className="flex-1">
                {j.nombre}
                {!j.activo && <span className="text-neutral-500"> (inactivo)</span>}
              </span>
              <span className="text-xs text-neutral-500">
                {j.club} · {j.categoria}ª · {j.elo}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export default function AdminTorneosPage() {
  const supabase = createClient();

  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [jugadores, setJugadores] = useState<JugadorAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormTorneo>(FORM_VACIO);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    const [listaTorneos, listaJugadores] = await Promise.all([
      fetchTorneos(supabase),
      fetchTodosLosJugadores(supabase),
    ]);
    setTorneos(ordenarTorneos(listaTorneos));
    setJugadores(listaJugadores);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function campo<K extends keyof FormTorneo>(clave: K, valor: FormTorneo[K]) {
    setForm((prev) => ({ ...prev, [clave]: valor }));
  }

  function abrirNuevo() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setSeleccionados(new Set());
    setErrorForm(null);
    setFormAbierto(true);
  }

  async function abrirEdicion(t: Torneo) {
    setEditandoId(t.id);
    setForm(torneoAForm(t));
    setSeleccionados(new Set(await fetchParticipantesIds(supabase, t.id)));
    setErrorForm(null);
    setFormAbierto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cerrarForm() {
    setFormAbierto(false);
    setEditandoId(null);
    setErrorForm(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);

    if (!form.nombre.trim()) {
      setErrorForm("Ponle al menos un nombre al torneo.");
      return;
    }

    setGuardando(true);
    const datos = formADatos(form);
    const ids = [...seleccionados];
    const resultado = editandoId
      ? await actualizarTorneoDB(supabase, editandoId, datos, ids)
      : await crearTorneoDB(supabase, datos, ids);
    setGuardando(false);

    if (!resultado.ok) {
      setErrorForm(resultado.mensaje);
      return;
    }

    cerrarForm();
    await cargar();
  }

  async function borrar(t: Torneo) {
    if (!confirm(`¿Seguro que quieres borrar "${t.nombre}"? Esto no se puede deshacer.`)) {
      return;
    }
    setMensaje(null);
    const resultado = await eliminarTorneoDB(supabase, t.id);
    if (!resultado.ok) {
      setMensaje(resultado.mensaje);
      return;
    }
    setTorneos((prev) => prev.filter((x) => x.id !== t.id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Cada jornada del Fantasy pertenece a un torneo y cada torneo numera las suyas
          desde 1. Crea aquí el torneo, con sus jugadores, antes de crear sus jornadas.
        </p>
        {!formAbierto && (
          <button
            onClick={abrirNuevo}
            className="whitespace-nowrap rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            + Nuevo torneo
          </button>
        )}
      </div>

      {formAbierto && (
        <form
          onSubmit={guardar}
          noValidate
          className="flex flex-col gap-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <p className="text-sm font-medium">
            {editandoId ? "Editar torneo" : "Nuevo torneo"}{" "}
            <span className="font-normal text-neutral-500">
              (solo el nombre es obligatorio; el resto es texto libre)
            </span>
          </p>

          <Seccion titulo="General">
            <Campo etiqueta="Nombre del torneo" className="sm:col-span-2">
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => campo("nombre", e.target.value)}
                placeholder="Campeonato de Gipuzkoa Individual 2026 — Primera"
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Categoría">
              <select
                value={form.categoria}
                onChange={(e) => campo("categoria", e.target.value as FormTorneo["categoria"])}
                className={INPUT}
              >
                <option value="">Sin categoría (abierto)</option>
                <option value="1">1ª categoría</option>
                <option value="2">2ª categoría</option>
                <option value="3">3ª categoría</option>
              </select>
            </Campo>
            <Campo etiqueta="Observaciones (bases, premios, notas…)" className="sm:col-span-2">
              <textarea
                value={form.observaciones}
                onChange={(e) => campo("observaciones", e.target.value)}
                rows={3}
                className={INPUT}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Organización">
            <Campo etiqueta="Organizador">
              <input
                type="text"
                value={form.organizador}
                onChange={(e) => campo("organizador", e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Federación">
              <input
                type="text"
                value={form.federacion}
                onChange={(e) => campo("federacion", e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Director del torneo">
              <input
                type="text"
                value={form.director}
                onChange={(e) => campo("director", e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Árbitro principal">
              <input
                type="text"
                value={form.arbitroPrincipal}
                onChange={(e) => campo("arbitroPrincipal", e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Árbitros adjuntos" className="sm:col-span-2">
              <textarea
                value={form.arbitrosAdjuntos}
                onChange={(e) => campo("arbitrosAdjuntos", e.target.value)}
                rows={2}
                className={INPUT}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Lugar de juego">
            <Campo etiqueta="Sala / club / recinto" className="sm:col-span-2">
              <input
                type="text"
                value={form.lugar}
                onChange={(e) => campo("lugar", e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Dirección" className="sm:col-span-2">
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => campo("direccion", e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Ciudad">
              <input
                type="text"
                value={form.ciudad}
                onChange={(e) => campo("ciudad", e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Provincia">
              <input
                type="text"
                value={form.provincia}
                onChange={(e) => campo("provincia", e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="País">
              <input
                type="text"
                value={form.pais}
                onChange={(e) => campo("pais", e.target.value)}
                className={INPUT}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Calendario">
            <Campo etiqueta="Fecha de inicio">
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => campo("fechaInicio", e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Fecha de fin">
              <input
                type="date"
                value={form.fechaFin}
                onChange={(e) => campo("fechaFin", e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Número de rondas">
              <input
                type="text"
                inputMode="numeric"
                value={form.numeroRondas}
                onChange={(e) => campo("numeroRondas", e.target.value)}
                className={INPUT}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Sistema de juego">
            <Campo etiqueta="Sistema">
              <input
                type="text"
                list="opciones-sistema"
                value={form.sistema}
                onChange={(e) => campo("sistema", e.target.value)}
                className={INPUT}
              />
              <datalist id="opciones-sistema">
                <option value="Sistema suizo" />
                <option value="Round robin" />
                <option value="Eliminatoria" />
              </datalist>
            </Campo>
            <Campo etiqueta="Ritmo de juego">
              <input
                type="text"
                value={form.ritmoJuego}
                onChange={(e) => campo("ritmoJuego", e.target.value)}
                placeholder="90 min + 30 s por jugada"
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Cómputo de Elo">
              <input
                type="text"
                list="opciones-computo-elo"
                value={form.computoElo}
                onChange={(e) => campo("computoElo", e.target.value)}
                className={INPUT}
              />
              <datalist id="opciones-computo-elo">
                <option value="FIDE" />
                <option value="FEDA" />
                <option value="FIDE y FEDA" />
                <option value="Sin cómputo" />
              </datalist>
            </Campo>
            <Campo etiqueta="Desempates">
              <input
                type="text"
                value={form.desempates}
                onChange={(e) => campo("desempates", e.target.value)}
                className={INPUT}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Enlaces y contacto">
            <Campo etiqueta="Web / enlace a chess-results">
              <input
                type="text"
                value={form.webUrl}
                onChange={(e) => campo("webUrl", e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Email de contacto">
              <input
                type="text"
                value={form.emailContacto}
                onChange={(e) => campo("emailContacto", e.target.value)}
                className={INPUT}
              />
            </Campo>
          </Seccion>

          <SelectorJugadores
            jugadores={jugadores}
            seleccionados={seleccionados}
            onCambiar={setSeleccionados}
          />

          {errorForm && <p className="text-sm text-negative">{errorForm}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Crear torneo"}
            </button>
            <button
              type="button"
              onClick={cerrarForm}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mensaje && <p className="text-sm text-negative">{mensaje}</p>}

      {cargando ? (
        <p className="text-sm text-neutral-500">Cargando torneos…</p>
      ) : torneos.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          Todavía no hay torneos. Crea el primero para poder añadirle jornadas.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {torneos.map((t) => {
            const estado = estadoTorneo(t);
            return (
              <li
                key={t.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-base font-semibold">{t.nombre}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      {t.categoria && <span>{t.categoria}ª categoría</span>}
                      {estado && (
                        <span className="rounded-full border border-neutral-300 px-2 py-0.5 dark:border-neutral-700">
                          {estado}
                        </span>
                      )}
                      <span>
                        {t.participantes} jugador{t.participantes === 1 ? "" : "es"}
                      </span>
                      <span>
                        {t.rondasCreadas}
                        {t.numeroRondas != null ? ` / ${t.numeroRondas}` : ""} jornada
                        {t.rondasCreadas === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirEdicion(t)}
                      className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium dark:border-neutral-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => borrar(t)}
                      className="rounded border border-neutral-300 px-2 py-1 text-xs text-negative dark:border-neutral-700"
                    >
                      Borrar
                    </button>
                  </div>
                </div>

                <FichaTorneo torneo={t} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
