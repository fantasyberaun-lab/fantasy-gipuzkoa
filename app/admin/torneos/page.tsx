"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  actualizarTorneoDB,
  crearTorneoDB,
  eliminarTorneoDB,
  fetchTorneos,
  type DatosTorneo,
  type SistemaTorneo,
  type TorneoAdmin,
} from "@/lib/supabase/adminQueries";
import type { Categoria } from "@/lib/types";

// El formulario trabaja siempre con strings (es lo que devuelven los
// inputs); se convierte a DatosTorneo al guardar.
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
  sistema: SistemaTorneo;
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
  numeroRondas: "9",
  sistema: "suizo",
  ritmoJuego: "",
  computoElo: "",
  desempates: "",
  webUrl: "",
  emailContacto: "",
};

const SISTEMAS: { valor: SistemaTorneo; etiqueta: string }[] = [
  { valor: "suizo", etiqueta: "Sistema suizo" },
  { valor: "round_robin", etiqueta: "Round robin (todos contra todos)" },
  { valor: "eliminatoria", etiqueta: "Eliminatoria" },
  { valor: "otro", etiqueta: "Otro" },
];

const ETIQUETA_SISTEMA: Record<SistemaTorneo, string> = {
  suizo: "Sistema suizo",
  round_robin: "Round robin",
  eliminatoria: "Eliminatoria",
  otro: "Otro",
};

const INPUT =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

const vacioANull = (texto: string) => (texto.trim() === "" ? null : texto.trim());

function formADatos(f: FormTorneo): DatosTorneo {
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
    pais: f.pais.trim() || "España",
    fechaInicio: vacioANull(f.fechaInicio),
    fechaFin: vacioANull(f.fechaFin),
    numeroRondas: Number(f.numeroRondas),
    sistema: f.sistema,
    ritmoJuego: vacioANull(f.ritmoJuego),
    computoElo: vacioANull(f.computoElo),
    desempates: vacioANull(f.desempates),
    webUrl: vacioANull(f.webUrl),
    emailContacto: vacioANull(f.emailContacto),
  };
}

function torneoAForm(t: TorneoAdmin): FormTorneo {
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
    pais: t.pais,
    fechaInicio: t.fechaInicio ?? "",
    fechaFin: t.fechaFin ?? "",
    numeroRondas: String(t.numeroRondas),
    sistema: t.sistema,
    ritmoJuego: t.ritmoJuego ?? "",
    computoElo: t.computoElo ?? "",
    desempates: t.desempates ?? "",
    webUrl: t.webUrl ?? "",
    emailContacto: t.emailContacto ?? "",
  };
}

function formatearFecha(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function rangoFechas(t: TorneoAdmin): string | null {
  const inicio = formatearFecha(t.fechaInicio);
  const fin = formatearFecha(t.fechaFin);
  if (inicio && fin) return inicio === fin ? inicio : `${inicio} – ${fin}`;
  return inicio ?? fin;
}

// Estado derivado de las fechas: no se guarda, así nunca queda desfasado.
function estadoTorneo(t: TorneoAdmin): "Próximo" | "En curso" | "Finalizado" | null {
  const hoy = new Date().toISOString().slice(0, 10);
  if (t.fechaInicio && hoy < t.fechaInicio) return "Próximo";
  if (t.fechaFin && hoy > t.fechaFin) return "Finalizado";
  if (t.fechaInicio) return "En curso";
  return null;
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

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-neutral-500">{etiqueta}</dt>
      <dd className="whitespace-pre-line">{valor}</dd>
    </div>
  );
}

export default function AdminTorneosPage() {
  const supabase = createClient();

  const [torneos, setTorneos] = useState<TorneoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormTorneo>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setTorneos(await fetchTorneos(supabase));
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
    setErrorForm(null);
    setFormAbierto(true);
  }

  function abrirEdicion(t: TorneoAdmin) {
    setEditandoId(t.id);
    setForm(torneoAForm(t));
    setErrorForm(null);
    setFormAbierto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cerrarForm() {
    setFormAbierto(false);
    setEditandoId(null);
    setErrorForm(null);
  }

  function validar(): string | null {
    if (!form.nombre.trim()) return "El nombre del torneo es obligatorio.";
    const rondas = Number(form.numeroRondas);
    if (!Number.isInteger(rondas) || rondas < 1) {
      return "El número de rondas tiene que ser un entero de 1 o más.";
    }
    if (form.fechaInicio && form.fechaFin && form.fechaFin < form.fechaInicio) {
      return "La fecha de fin no puede ser anterior a la de inicio.";
    }
    const torneoEditado = torneos.find((t) => t.id === editandoId);
    if (torneoEditado && rondas < torneoEditado.rondasCreadas) {
      return `Ya hay ${torneoEditado.rondasCreadas} rondas creadas; no puedes bajar de ese número.`;
    }
    return null;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);

    const problema = validar();
    if (problema) {
      setErrorForm(problema);
      return;
    }

    setGuardando(true);
    const datos = formADatos(form);
    const resultado = editandoId
      ? await actualizarTorneoDB(supabase, editandoId, datos)
      : await crearTorneoDB(supabase, datos);
    setGuardando(false);

    if (!resultado.ok) {
      setErrorForm(resultado.mensaje);
      return;
    }

    cerrarForm();
    await cargar();
  }

  async function borrar(t: TorneoAdmin) {
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
          Cada jornada del Fantasy es una ronda de un torneo. Crea aquí el torneo
          antes de crear sus jornadas.
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
          className="flex flex-col gap-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <p className="text-sm font-medium">
            {editandoId ? "Editar torneo" : "Nuevo torneo"}
          </p>

          <Seccion titulo="General">
            <Campo etiqueta="Nombre del torneo *" className="sm:col-span-2">
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => campo("nombre", e.target.value)}
                placeholder="Campeonato de Gipuzkoa Individual 2026 — Primera"
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Categoría del Fantasy">
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
                placeholder="Federación Guipuzcoana de Ajedrez"
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
            <Campo etiqueta="Árbitros adjuntos (separados por comas)" className="sm:col-span-2">
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
            <Campo etiqueta="Número de rondas *">
              <input
                type="number"
                min={1}
                value={form.numeroRondas}
                onChange={(e) => campo("numeroRondas", e.target.value)}
                className={INPUT}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Sistema de juego">
            <Campo etiqueta="Sistema">
              <select
                value={form.sistema}
                onChange={(e) => campo("sistema", e.target.value as SistemaTorneo)}
                className={INPUT}
              >
                {SISTEMAS.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.etiqueta}
                  </option>
                ))}
              </select>
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
                placeholder="Buchholz -1, Buchholz, Sonneborn-Berger"
                className={INPUT}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Enlaces y contacto">
            <Campo etiqueta="Web / enlace a chess-results">
              <input
                type="url"
                value={form.webUrl}
                onChange={(e) => campo("webUrl", e.target.value)}
                placeholder="https://chess-results.com/…"
                className={INPUT}
              />
            </Campo>
            <Campo etiqueta="Email de contacto">
              <input
                type="email"
                value={form.emailContacto}
                onChange={(e) => campo("emailContacto", e.target.value)}
                className={INPUT}
              />
            </Campo>
          </Seccion>

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
            const fechas = rangoFechas(t);
            const lugar = [t.lugar, t.ciudad, t.provincia].filter(Boolean).join(", ");
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
                        {t.rondasCreadas} / {t.numeroRondas} rondas creadas
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

                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <Dato etiqueta="Fechas" valor={fechas} />
                  <Dato etiqueta="Lugar de juego" valor={lugar || null} />
                  <Dato etiqueta="Dirección" valor={t.direccion} />
                  <Dato etiqueta="Organizador" valor={t.organizador} />
                  <Dato etiqueta="Federación" valor={t.federacion} />
                  <Dato etiqueta="Director del torneo" valor={t.director} />
                  <Dato etiqueta="Árbitro principal" valor={t.arbitroPrincipal} />
                  <Dato etiqueta="Árbitros adjuntos" valor={t.arbitrosAdjuntos} />
                  <Dato etiqueta="Sistema" valor={ETIQUETA_SISTEMA[t.sistema]} />
                  <Dato etiqueta="Ritmo de juego" valor={t.ritmoJuego} />
                  <Dato etiqueta="Cómputo de Elo" valor={t.computoElo} />
                  <Dato etiqueta="Desempates" valor={t.desempates} />
                  <Dato etiqueta="Email de contacto" valor={t.emailContacto} />
                  {t.webUrl && (
                    <div className="flex flex-col">
                      <dt className="text-xs text-neutral-500">Web</dt>
                      <dd className="truncate">
                        <a
                          href={t.webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent underline underline-offset-2"
                        >
                          {t.webUrl}
                        </a>
                      </dd>
                    </div>
                  )}
                  <Dato etiqueta="Observaciones" valor={t.observaciones} />
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
