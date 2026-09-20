"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  actualizarJugadorDB,
  crearJugadorDB,
  eliminarJugadorDB,
  fetchTodosLosJugadores,
  recalcularValoresInicialesDB,
  type JugadorAdmin,
} from "@/lib/supabase/adminQueries";
import type { Categoria } from "@/lib/types";

const CATEGORIAS: Categoria[] = [1, 2, 3];

// Los cambios de cada fila se acumulan aquí hasta que se guardan; así no
// se dispara una escritura a Supabase en cada pulsación de tecla.
type Cambios = Partial<Omit<JugadorAdmin, "id">>;

export default function AdminJugadoresPage() {
  const supabase = createClient();

  const [jugadores, setJugadores] = useState<JugadorAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [cambiosPendientes, setCambiosPendientes] = useState<
    Record<string, Cambios>
  >({});
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [recalculando, setRecalculando] = useState(false);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoClub, setNuevoClub] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState<Categoria>(1);
  const [nuevoElo, setNuevoElo] = useState("");
  const [nuevoAnio, setNuevoAnio] = useState("");
  const [creando, setCreando] = useState(false);

  async function cargar() {
    setCargando(true);
    const datos = await fetchTodosLosJugadores(supabase);
    setJugadores(datos);
    setCambiosPendientes({});
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jugadoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return jugadores;
    return jugadores.filter(
      (j) =>
        j.nombre.toLowerCase().includes(texto) ||
        j.club.toLowerCase().includes(texto)
    );
  }, [jugadores, busqueda]);

  function editarCampo<K extends keyof Cambios>(id: string, campo: K, valor: Cambios[K]) {
    setCambiosPendientes((prev) => ({
      ...prev,
      [id]: { ...prev[id], [campo]: valor },
    }));
  }

  function valorActual<K extends keyof JugadorAdmin>(
    jugador: JugadorAdmin,
    campo: K
  ): JugadorAdmin[K] {
    const editado = cambiosPendientes[jugador.id]?.[campo as keyof Cambios];
    return editado !== undefined ? (editado as JugadorAdmin[K]) : jugador[campo];
  }

  async function guardarFila(id: string) {
    const cambios = cambiosPendientes[id];
    if (!cambios) return;

    setGuardandoId(id);
    const resultado = await actualizarJugadorDB(supabase, id, cambios);
    setGuardandoId(null);

    if (!resultado.ok) {
      setMensaje(`Error al guardar: ${resultado.mensaje}`);
      return;
    }

    setJugadores((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...cambios } : j))
    );
    setCambiosPendientes((prev) => {
      const { [id]: _quitado, ...resto } = prev;
      return resto;
    });
    setMensaje(null);
  }

  async function borrarFila(id: string, nombre: string) {
    if (!confirm(`¿Seguro que quieres borrar a ${nombre}? Esto no se puede deshacer.`)) {
      return;
    }
    const resultado = await eliminarJugadorDB(supabase, id);
    if (!resultado.ok) {
      setMensaje(`Error al borrar: ${resultado.mensaje}`);
      return;
    }
    setJugadores((prev) => prev.filter((j) => j.id !== id));
  }

  async function crearJugador(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevoClub.trim()) return;

    const elo = Number(nuevoElo) || 0;
    setCreando(true);
    const resultado = await crearJugadorDB(supabase, {
      nombre: nuevoNombre.trim(),
      club: nuevoClub.trim(),
      categoria: nuevaCategoria,
      elo,
      anioNacimiento: nuevoAnio.trim() ? Number(nuevoAnio) : null,
    });
    setCreando(false);

    if (!resultado.ok) {
      setMensaje(`Error al crear: ${resultado.mensaje}`);
      return;
    }

    setNuevoNombre("");
    setNuevoClub("");
    setNuevoElo("");
    setNuevoAnio("");
    await cargar();
  }

  const totalConCambios = Object.keys(cambiosPendientes).length;

  async function recalcularValores() {
    setAviso(null);
    setMensaje(null);

    if (totalConCambios > 0) {
      setMensaje(
        "Guarda antes los cambios pendientes de las filas (el recálculo usa lo que hay guardado)."
      );
      return;
    }

    if (
      !confirm(
        "Se recalculará el valor de mercado de TODOS los jugadores con la fórmula (Elo y año de nacimiento). Los valores que hayas puesto a mano se perderán. ¿Continuar?"
      )
    ) {
      return;
    }

    setRecalculando(true);
    const resultado = await recalcularValoresInicialesDB(supabase);
    setRecalculando(false);

    if (!resultado.ok) {
      setMensaje(resultado.mensaje);
      return;
    }

    setAviso(`Valores recalculados para ${resultado.actualizados} jugadores.`);
    await cargar();
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={crearJugador}
        className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <p className="text-sm font-medium">Añadir jugador</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="Nombre"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            type="text"
            placeholder="Club"
            value={nuevoClub}
            onChange={(e) => setNuevoClub(e.target.value)}
            className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(Number(e.target.value) as Categoria)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}ª cat.
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Elo"
            value={nuevoElo}
            onChange={(e) => setNuevoElo(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            type="number"
            placeholder="Año nac."
            value={nuevoAnio}
            onChange={(e) => setNuevoAnio(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={creando || !nuevoNombre.trim() || !nuevoClub.trim()}
            className="col-span-2 rounded-lg bg-accent py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 sm:col-span-1"
          >
            {creando ? "Añadiendo..." : "Añadir"}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o club..."
          className="w-full max-w-sm rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <p className="whitespace-nowrap text-xs text-neutral-500">
          {jugadoresFiltrados.length} de {jugadores.length} jugadores
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-neutral-500">
          El valor inicial se calcula con el Elo y el año de nacimiento. Tras
          cambiar Elos o años, recalcula los valores (solo antes de que haya
          resultados).
        </p>
        <button
          onClick={recalcularValores}
          disabled={recalculando}
          className="whitespace-nowrap rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
        >
          {recalculando ? "Recalculando..." : "Recalcular valores iniciales"}
        </button>
      </div>

      {mensaje && <p className="text-sm text-negative">{mensaje}</p>}
      {aviso && <p className="text-sm text-positive">{aviso}</p>}

      {cargando ? (
        <p className="text-sm text-neutral-500">Cargando jugadores…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Club</th>
                <th className="px-3 py-2 font-medium">Cat.</th>
                <th className="px-3 py-2 font-medium">Elo</th>
                <th className="px-3 py-2 font-medium">Año nac.</th>
                <th className="px-3 py-2 font-medium">Valor (M)</th>
                <th className="px-3 py-2 font-medium">Activo</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {jugadoresFiltrados.map((jugador) => {
                const tieneCambios = Boolean(cambiosPendientes[jugador.id]);
                return (
                  <tr
                    key={jugador.id}
                    className="border-t border-neutral-200 dark:border-neutral-800"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={valorActual(jugador, "nombre")}
                        onChange={(e) =>
                          editarCampo(jugador.id, "nombre", e.target.value)
                        }
                        className="w-40 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-neutral-300 focus:border-neutral-400 dark:hover:border-neutral-700"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={valorActual(jugador, "club")}
                        onChange={(e) =>
                          editarCampo(jugador.id, "club", e.target.value)
                        }
                        className="w-32 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-neutral-300 focus:border-neutral-400 dark:hover:border-neutral-700"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={valorActual(jugador, "categoria")}
                        onChange={(e) =>
                          editarCampo(
                            jugador.id,
                            "categoria",
                            Number(e.target.value) as Categoria
                          )
                        }
                        className="rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-neutral-300 dark:hover:border-neutral-700"
                      >
                        {CATEGORIAS.map((c) => (
                          <option key={c} value={c}>
                            {c}ª
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={valorActual(jugador, "elo")}
                        onChange={(e) =>
                          editarCampo(jugador.id, "elo", Number(e.target.value))
                        }
                        className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-neutral-300 focus:border-neutral-400 dark:hover:border-neutral-700"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={valorActual(jugador, "anioNacimiento") ?? ""}
                        onChange={(e) =>
                          editarCampo(
                            jugador.id,
                            "anioNacimiento",
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                        className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-neutral-300 focus:border-neutral-400 dark:hover:border-neutral-700"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={valorActual(jugador, "valorMercado")}
                        onChange={(e) =>
                          editarCampo(
                            jugador.id,
                            "valorMercado",
                            Number(e.target.value)
                          )
                        }
                        className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-neutral-300 focus:border-neutral-400 dark:hover:border-neutral-700"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={valorActual(jugador, "activo")}
                        onChange={(e) =>
                          editarCampo(jugador.id, "activo", e.target.checked)
                        }
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => guardarFila(jugador.id)}
                          disabled={!tieneCambios || guardandoId === jugador.id}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium disabled:opacity-30 dark:border-neutral-700"
                        >
                          {guardandoId === jugador.id ? "..." : "Guardar"}
                        </button>
                        <button
                          onClick={() => borrarFila(jugador.id, jugador.nombre)}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs text-negative dark:border-neutral-700"
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalConCambios > 0 && (
        <p className="text-xs text-neutral-500">
          {totalConCambios} fila{totalConCambios === 1 ? "" : "s"} con cambios sin
          guardar (usa el botón "Guardar" de cada fila).
        </p>
      )}
    </div>
  );
}
