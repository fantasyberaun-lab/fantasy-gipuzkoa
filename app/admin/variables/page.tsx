"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  deshacerCambioConfig,
  fetchHistorialConfig,
  fetchLigasTerritoriales,
  fetchVariablesConfig,
  guardarCategoriasLiga,
  guardarVariableConfig,
  type CambioConfig,
  type CategoriaLiga,
  type LigaTerritorial,
  type ValorConfig,
  type VariableConfig,
} from "@/lib/supabase/configQueries";

const INPUT =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const BOTON =
  "rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50";
const BOTON_SUAVE =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800";

type Pestana = "variables" | "ligas" | "historial";

// Nombre que se enseña de una liga territorial: el territorio y su ámbito.
function nombreTerritorio(l: LigaTerritorial) {
  const ambito = l.ambito === "comunidad" ? "comunidad" : l.ambito === "pais" ? "país" : "provincia";
  return `${l.region ?? l.nombre} (${ambito})`;
}

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

function mostrar(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "number" || typeof v === "string") return String(v);
  return JSON.stringify(v);
}

function Aviso({ tipo, children }: { tipo: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role={tipo === "error" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 text-sm ${
        tipo === "error"
          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
          : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      }`}
    >
      {children}
    </p>
  );
}

// Variables ajustables (0092-0094), ligas territoriales de prueba y categorías por liga
// (0093). Los permisos y los rangos los fuerza la base de datos: aquí solo se avisa.
export default function AdminVariablesPage() {
  const supabase = createClient();
  const [pestana, setPestana] = useState<Pestana>("variables");
  const [ligas, setLigas] = useState<LigaTerritorial[]>([]);
  const [ambito, setAmbito] = useState<string>(""); // "" = global, si no id de liga
  const [variables, setVariables] = useState<VariableConfig[]>([]);
  const [historial, setHistorial] = useState<CambioConfig[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function cargarLigas() {
    const r = await fetchLigasTerritoriales(supabase);
    if (r.ok) setLigas(r.lista);
    else setError(r.mensaje);
  }

  async function cargarVariables(liga: string) {
    const r = await fetchVariablesConfig(supabase, liga || null);
    if (r.ok) {
      setVariables(r.lista);
      setError(null);
    } else setError(r.mensaje);
  }

  async function cargarHistorial() {
    const r = await fetchHistorialConfig(supabase, 60);
    if (r.ok) setHistorial(r.lista);
    else setError(r.mensaje);
  }

  async function recargarTodo(liga = ambito) {
    setCargando(true);
    await Promise.all([cargarLigas(), cargarVariables(liga), cargarHistorial()]);
    setCargando(false);
  }

  useEffect(() => {
    recargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambiarAmbito(liga: string) {
    setAmbito(liga);
    setMensaje(null);
    cargarVariables(liga);
  }

  const ligaElegida = ligas.find((l) => l.id === ambito) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm dark:bg-neutral-800">
          {(
            [
              ["variables", "Variables"],
              ["ligas", "Ligas y categorías"],
              ["historial", "Historial"],
            ] as [Pestana, string][]
          ).map(([id, texto]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPestana(id)}
              className={`rounded-md px-3 py-1 font-medium ${
                pestana === id ? "bg-white shadow-sm dark:bg-neutral-700" : "text-neutral-500"
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
        {pestana === "variables" && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500">Ámbito</span>
            <select value={ambito} onChange={(e) => cambiarAmbito(e.target.value)} className={INPUT}>
              <option value="">Global (todas las ligas)</option>
              {ligas.map((l) => (
                <option key={l.id} value={l.id}>
                  {nombreTerritorio(l)}
                  {l.estado === "prueba" ? " · prueba" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {mensaje && <Aviso tipo="ok">{mensaje}</Aviso>}
      {cargando && <p className="text-sm text-neutral-500">Cargando…</p>}

      {!cargando && pestana === "variables" && (
        <SeccionVariables
          variables={variables}
          liga={ligaElegida}
          onCambio={async (texto) => {
            setMensaje(texto);
            setError(null);
            await Promise.all([cargarVariables(ambito), cargarHistorial()]);
          }}
          onError={(m) => {
            setMensaje(null);
            setError(m);
          }}
        />
      )}

      {!cargando && pestana === "ligas" && (
        <SeccionLigas
          ligas={ligas}
          onCambio={async (texto) => {
            setMensaje(texto);
            setError(null);
            await Promise.all([cargarLigas(), cargarHistorial()]);
          }}
          onError={(m) => {
            setMensaje(null);
            setError(m);
          }}
        />
      )}

      {!cargando && pestana === "historial" && (
        <SeccionHistorial
          historial={historial}
          onCambio={async (texto) => {
            setMensaje(texto);
            setError(null);
            await recargarTodo();
          }}
          onError={(m) => {
            setMensaje(null);
            setError(m);
          }}
        />
      )}
    </div>
  );
}

// --- Variables -------------------------------------------------------------------------------

function FilaVariable({
  v,
  liga,
  onCambio,
  onError,
}: {
  v: VariableConfig;
  liga: LigaTerritorial | null;
  onCambio: (texto: string) => Promise<void>;
  onError: (mensaje: string) => void;
}) {
  const supabase = createClient();
  const editable = v.estado === "activa" && (liga === null || v.permiteLiga);
  const actual = liga ? v.valorLiga ?? v.valorGlobal ?? v.valorDefecto : v.valorGlobal ?? v.valorDefecto;
  const [texto, setTexto] = useState(mostrar(actual));
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    setTexto(mostrar(actual));
  }, [actual]);

  function interpretar(): ValorConfig | null {
    if (v.tipo === "booleano") return texto === "Sí";
    const limpio = texto.trim().replace(",", ".");
    if (limpio === "" || Number.isNaN(Number(limpio))) return null;
    return Number(limpio);
  }

  async function guardar(valor: ValorConfig | null) {
    setTrabajando(true);
    const r = await guardarVariableConfig(supabase, v.clave, valor, liga?.id ?? null, null);
    setTrabajando(false);
    if (!r.ok) {
      onError(r.mensaje);
      return;
    }
    await onCambio(valor === null ? `${v.etiqueta}: vuelve al valor global.` : `${v.etiqueta} guardado.`);
  }

  const rango =
    v.minimo !== null && v.maximo !== null ? `Entre ${v.minimo} y ${v.maximo}${v.unidad ? ` ${v.unidad}` : ""}.` : null;
  const valorNumero = interpretar();
  const sinCambios = valorNumero === actual;

  return (
    <li className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{v.etiqueta}</p>
          {v.descripcion && <p className="mt-0.5 text-sm text-neutral-500">{v.descripcion}</p>}
          {rango && editable && <p className="mt-0.5 text-xs text-neutral-400">{rango}</p>}
          {v.estado !== "activa" && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              {v.estado === "economia"
                ? "Fase posterior (economía del juego)."
                : "Aún no se puede editar: el juego lo lee de código."}{" "}
              Vive en <code>{v.funcionSql ?? "SQL"}</code>. Valor actual: {mostrar(v.valorDefecto)}
              {v.unidad ? ` ${v.unidad}` : ""}.
            </p>
          )}
          {v.estado === "activa" && liga && !v.permiteLiga && (
            <p className="mt-1 text-xs text-neutral-400">Variable global: no admite valor por liga.</p>
          )}
        </div>

        {editable && (
          <div className="flex flex-wrap items-center gap-2">
            {v.tipo === "booleano" ? (
              <select value={texto} onChange={(e) => setTexto(e.target.value)} className={INPUT}>
                <option>Sí</option>
                <option>No</option>
              </select>
            ) : (
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                inputMode="decimal"
                className={`${INPUT} w-28`}
                aria-label={v.etiqueta}
              />
            )}
            <button
              type="button"
              className={BOTON}
              disabled={trabajando || valorNumero === null || sinCambios}
              onClick={() => guardar(valorNumero)}
            >
              Guardar
            </button>
            {liga && v.valorLiga !== null && (
              <button type="button" className={BOTON_SUAVE} disabled={trabajando} onClick={() => guardar(null)}>
                Quitar de {nombreTerritorio(liga)}
              </button>
            )}
          </div>
        )}
      </div>
      {editable && (
        <p className="mt-2 text-xs text-neutral-400">
          Por defecto: {mostrar(v.valorDefecto)}
          {v.unidad ? ` ${v.unidad}` : ""}
          {liga && v.valorLiga !== null ? " · esta liga tiene valor propio" : ""}
          {liga && v.valorLiga === null && v.permiteLiga ? " · usa el valor global" : ""}
        </p>
      )}
    </li>
  );
}

const TRAMOS_ELO = ["Hasta 29", "De 30 a 99", "De 100 a 199", "De 200 a 299", "300 o más"];

function comoTabla(v: unknown): number[][] {
  const t = Array.isArray(v) ? v : [];
  return TRAMOS_ELO.map((_, i) => {
    const f = Array.isArray(t[i]) ? (t[i] as unknown[]) : [];
    return [Number(f[0] ?? 0), Number(f[1] ?? 0)];
  });
}

// Tabla de puntos por diferencia de Elo: cinco tramos con puntos de victoria y de tablas.
function FilaTablaPuntos({
  v,
  liga,
  onCambio,
  onError,
}: {
  v: VariableConfig;
  liga: LigaTerritorial | null;
  onCambio: (texto: string) => Promise<void>;
  onError: (mensaje: string) => void;
}) {
  const supabase = createClient();
  const editable = v.estado === "activa" && liga === null;
  const actual = comoTabla(v.valorGlobal ?? v.valorDefecto);
  const [filas, setFilas] = useState<string[][]>(actual.map((f) => f.map(String)));
  const [trabajando, setTrabajando] = useState(false);
  const claveActual = JSON.stringify(actual);

  useEffect(() => {
    setFilas(actual.map((f) => f.map(String)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveActual]);

  const nueva = filas.map((f) => f.map((x) => Number(x.trim().replace(",", "."))));
  const valida = filas.every((f) => f.every((x) => x.trim() !== "" && !Number.isNaN(Number(x.trim().replace(",", ".")))));
  const sinCambios = JSON.stringify(nueva) === claveActual;

  async function guardar() {
    setTrabajando(true);
    const r = await guardarVariableConfig(supabase, v.clave, nueva, null, null);
    setTrabajando(false);
    if (!r.ok) {
      onError(r.mensaje);
      return;
    }
    await onCambio(`${v.etiqueta} guardada.`);
  }

  return (
    <li className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="font-medium">{v.etiqueta}</p>
      {v.descripcion && <p className="mt-0.5 text-sm text-neutral-500">{v.descripcion}</p>}
      {liga && <p className="mt-1 text-xs text-neutral-400">Variable global: no admite valor por liga.</p>}
      <table className="mt-3 text-sm">
        <thead>
          <tr className="text-left text-xs text-neutral-500">
            <th className="pr-4 font-medium">Diferencia de Elo</th>
            <th className="pr-4 font-medium">Victoria</th>
            <th className="font-medium">Tablas</th>
          </tr>
        </thead>
        <tbody>
          {TRAMOS_ELO.map((nombre, i) => (
            <tr key={nombre}>
              <td className="pr-4 py-1">{nombre}</td>
              {[0, 1].map((c) => (
                <td key={c} className="pr-4 py-1">
                  <input
                    value={filas[i]?.[c] ?? ""}
                    disabled={!editable}
                    onChange={(e) =>
                      setFilas(filas.map((f, fi) => (fi === i ? f.map((x, ci) => (ci === c ? e.target.value : x)) : f)))
                    }
                    inputMode="numeric"
                    className={`${INPUT} w-16`}
                    aria-label={`${nombre}: ${c === 0 ? "victoria" : "tablas"}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className={BOTON} disabled={trabajando || !valida || sinCambios} onClick={guardar}>
            Guardar
          </button>
          <span className="text-xs text-neutral-400">
            Entre {v.minimo ?? 0} y {v.maximo ?? 20} puntos; las tablas no pueden superar a la victoria. Solo afecta a los
            resultados que se guarden a partir de ahora.
          </span>
        </div>
      )}
    </li>
  );
}

function SeccionVariables({
  variables,
  liga,
  onCambio,
  onError,
}: {
  variables: VariableConfig[];
  liga: LigaTerritorial | null;
  onCambio: (texto: string) => Promise<void>;
  onError: (mensaje: string) => void;
}) {
  const grupos = useMemo(() => {
    const mapa = new Map<string, VariableConfig[]>();
    for (const v of variables) mapa.set(v.grupo, [...(mapa.get(v.grupo) ?? []), v]);
    return Array.from(mapa.entries());
  }, [variables]);

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-500">
        {liga
          ? `Valores propios de ${nombreTerritorio(liga)}: solo cambian lo que ahí se indique; el resto usa el valor global.`
          : "Valores globales: se aplican a todas las ligas que no tengan uno propio."}{" "}
        Los cambios son inmediatos y quedan en el historial, desde donde se pueden deshacer.
      </p>
      {grupos.map(([grupo, lista]) => (
        <section key={grupo} className="space-y-3">
          <h2 className="text-lg font-semibold">{grupo}</h2>
          <ul className="space-y-3">
            {lista.map((v) =>
              v.tipo === "tabla_puntos" ? (
                <FilaTablaPuntos key={v.clave} v={v} liga={liga} onCambio={onCambio} onError={onError} />
              ) : (
                <FilaVariable key={`${v.clave}:${liga?.id ?? "global"}`} v={v} liga={liga} onCambio={onCambio} onError={onError} />
              )
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

// --- Ligas y categorías --------------------------------------------------------------------------

function slug(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}

function TarjetaLiga({
  liga,
  onCambio,
  onError,
}: {
  liga: LigaTerritorial;
  onCambio: (texto: string) => Promise<void>;
  onError: (mensaje: string) => void;
}) {
  const supabase = createClient();
  const [cats, setCats] = useState<CategoriaLiga[]>(liga.categorias);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    setCats(liga.categorias);
  }, [liga.categorias]);

  const cambiada = JSON.stringify(cats) !== JSON.stringify(liga.categorias);

  function editar(i: number, campo: keyof CategoriaLiga, valor: string) {
    setCats((prev) => prev.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)));
  }

  function mover(i: number, delta: number) {
    setCats((prev) => {
      const j = i + delta;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  function anadir() {
    setCats((prev) => {
      let n = prev.length + 1;
      while (prev.some((c) => c.codigo === `cat-${n}`)) n += 1;
      return [...prev, { codigo: `cat-${n}`, nombre: "", nombre_eu: null, nombre_en: null }];
    });
  }

  async function guardar() {
    setTrabajando(true);
    const limpias = cats.map((c) => ({
      ...c,
      codigo: slug(c.codigo) || slug(c.nombre),
      nombre: c.nombre.trim(),
    }));
    const r = await guardarCategoriasLiga(supabase, liga.id, limpias);
    setTrabajando(false);
    if (!r.ok) {
      onError(r.mensaje);
      return;
    }
    await onCambio(`Categorías de ${liga.nombre} guardadas.`);
  }

  return (
    <li className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {nombreTerritorio(liga)}{" "}
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {liga.estado === "prueba" ? "Prueba · solo root" : "Activa"}
            </span>
          </p>
          <p className="text-xs text-neutral-500">
            {liga.nombre} · {liga.miembros} {liga.miembros === 1 ? "equipo" : "equipos"} · código{" "}
            <code>{liga.codigo}</code>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Categorías</p>
        {cats.map((c, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[8rem_1fr_1fr_1fr_auto]">
            <input
              value={c.codigo}
              onChange={(e) => editar(i, "codigo", e.target.value)}
              className={INPUT}
              aria-label="Código"
              placeholder="código"
            />
            <input
              value={c.nombre}
              onChange={(e) => editar(i, "nombre", e.target.value)}
              className={INPUT}
              aria-label="Nombre en castellano"
              placeholder="Castellano"
            />
            <input
              value={c.nombre_eu ?? ""}
              onChange={(e) => editar(i, "nombre_eu", e.target.value)}
              className={INPUT}
              aria-label="Nombre en euskera"
              placeholder="Euskera"
            />
            <input
              value={c.nombre_en ?? ""}
              onChange={(e) => editar(i, "nombre_en", e.target.value)}
              className={INPUT}
              aria-label="Nombre en inglés"
              placeholder="Inglés"
            />
            <div className="flex gap-1">
              <button type="button" className={BOTON_SUAVE} onClick={() => mover(i, -1)} aria-label="Subir">
                ↑
              </button>
              <button type="button" className={BOTON_SUAVE} onClick={() => mover(i, 1)} aria-label="Bajar">
                ↓
              </button>
              <button
                type="button"
                className={BOTON_SUAVE}
                onClick={() => setCats((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Quitar"
                disabled={cats.length <= 1}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BOTON_SUAVE} onClick={anadir} disabled={cats.length >= 12}>
            Añadir categoría
          </button>
          <button type="button" className={BOTON} onClick={guardar} disabled={trabajando || !cambiada}>
            Guardar categorías
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          El orden de la lista es el orden de las categorías. Los jugadores y torneos todavía usan las tres de
          Gipuzkoa: cada liga las usará cuando tenga su propio catálogo de jugadores.
        </p>
      </div>
    </li>
  );
}

function SeccionLigas({
  ligas,
  onCambio,
  onError,
}: {
  ligas: LigaTerritorial[];
  onCambio: (texto: string) => Promise<void>;
  onError: (mensaje: string) => void;
}) {
  return (
    <section className="space-y-3">
      <p className="text-sm text-neutral-500">
        Ligas territoriales de prueba. Solo root puede crear un equipo en ellas (entrando con el código); el resto de
        usuarios no las ve ni puede unirse, aunque conozca el código.
      </p>
      {ligas.length === 0 && <p className="text-sm text-neutral-500">No hay ligas territoriales (¿se aplicó la migración 0093?).</p>}
      <ul className="space-y-3">
        {ligas.map((l) => (
          <TarjetaLiga key={l.id} liga={l} onCambio={onCambio} onError={onError} />
        ))}
      </ul>
    </section>
  );
}

// --- Historial ------------------------------------------------------------------------------------------

function SeccionHistorial({
  historial,
  onCambio,
  onError,
}: {
  historial: CambioConfig[];
  onCambio: (texto: string) => Promise<void>;
  onError: (mensaje: string) => void;
}) {
  const supabase = createClient();
  const [trabajando, setTrabajando] = useState<number | null>(null);

  async function deshacer(c: CambioConfig) {
    setTrabajando(c.id);
    const r = await deshacerCambioConfig(supabase, c.id);
    setTrabajando(null);
    if (!r.ok) {
      onError(r.mensaje);
      return;
    }
    await onCambio("Cambio deshecho.");
  }

  if (historial.length === 0) return <p className="text-sm text-neutral-500">Todavía no hay cambios registrados.</p>;

  return (
    <ul className="space-y-2">
      {historial.map((c) => (
        <li
          key={c.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800"
        >
          <div className="min-w-0">
            <p>
              <code>{c.clave}</code>
              {c.ligaNombre ? ` · ${c.ligaNombre}` : " · global"}:{" "}
              <span className="text-neutral-500">{mostrar(c.anterior)}</span> → <strong>{mostrar(c.nuevo)}</strong>
              {c.revierteId !== null && <span className="ml-2 text-xs text-neutral-400">(deshace #{c.revierteId})</span>}
            </p>
            <p className="text-xs text-neutral-500">
              {fechaHora(c.fecha)} · {c.usuario ?? "migración o SQL directo"}
              {c.motivo ? ` · ${c.motivo}` : ""}
            </p>
          </div>
          {c.deshacible && (
            <button type="button" className={BOTON_SUAVE} disabled={trabajando !== null} onClick={() => deshacer(c)}>
              Deshacer
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
