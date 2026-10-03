"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  actualizarEloDB,
  fetchTodosLosJugadores,
  jugadoresAFilasCsv,
  type ResultadoCambioElo,
} from "@/lib/supabase/adminQueries";
import { descargarTexto, leerEloDeCsv, parseCsv, toCsv } from "@/lib/csv";

type Datos = { fide_id: string; elo: number }[];

function mesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Panel de admin: descargar el estado actual de los jugadores en CSV y subir
// el CSV con los Elo del mes (vista previa + aplicar). Solo root.
export default function ActualizarEloPanel({ onAplicado }: { onAplicado?: () => void }) {
  const supabase = createClient();

  const [mes, setMes] = useState(mesActual());
  const [datos, setDatos] = useState<Datos | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [ignoradas, setIgnoradas] = useState(0);
  const [vista, setVista] = useState<Extract<ResultadoCambioElo, { ok: true }> | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  async function descargar() {
    setError(null);
    setOcupado(true);
    const jugadores = await fetchTodosLosJugadores(supabase);
    setOcupado(false);
    if (jugadores.length === 0) {
      setError("No se han podido leer los jugadores.");
      return;
    }
    const hoy = new Date().toISOString().slice(0, 10);
    descargarTexto(`jugadores_${hoy}.csv`, toCsv(jugadoresAFilasCsv(jugadores)));
  }

  async function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(null);
    setExito(null);
    setVista(null);
    setDatos(null);

    const leido = leerEloDeCsv(parseCsv(await archivo.text()));
    if (!leido.ok) {
      setError(leido.mensaje);
      return;
    }
    setNombreArchivo(archivo.name);
    setIgnoradas(leido.ignoradas);
    setDatos(leido.datos);
    await previsualizar(leido.datos);
  }

  async function previsualizar(d: Datos | null = datos) {
    if (!d) return;
    setError(null);
    setOcupado(true);
    const r = await actualizarEloDB(supabase, `${mes}-01`, d, false);
    setOcupado(false);
    if (!r.ok) {
      setError(r.mensaje);
      setVista(null);
      return;
    }
    setVista(r);
  }

  async function aplicar() {
    if (!datos || !vista) return;
    const ok = window.confirm(
      `Se actualizará el Elo de ${vista.resumen.cambian_elo} jugadores, se reajustarán sus valores de mercado y se avisará a todos los managers. ¿Continuar?`
    );
    if (!ok) return;
    setError(null);
    setOcupado(true);
    const r = await actualizarEloDB(supabase, `${mes}-01`, datos, true);
    setOcupado(false);
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    setExito(`Aplicado: ${r.resumen.cambian_elo} jugadores con Elo nuevo (${r.resumen.suben} suben, ${r.resumen.bajan} bajan, ${r.resumen.debuts} debuts).`);
    setVista(null);
    setDatos(null);
    setNombreArchivo("");
    onAplicado?.();
  }

  const r = vista?.resumen;
  const filas = vista
    ? [...vista.filas].sort(
        (a, b) => Math.abs(b.elo_despues - b.elo_antes) - Math.abs(a.elo_despues - a.elo_antes)
      )
    : [];

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div>
        <h3 className="font-medium">Actualizar Elo (lista FIDE mensual)</h3>
        <p className="text-xs text-neutral-500">
          Sube un CSV con las columnas <code>fide_id</code> y <code>elo</code>. Primero verás una
          vista previa; no se cambia nada hasta que pulses &quot;Aplicar&quot;. El CSV de estado
          actual que descargas aquí también sirve para subirlo de vuelta.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          Mes de la lista
          <input
            type="month"
            value={mes}
            onChange={(e) => {
              setMes(e.target.value);
              setVista(null);
            }}
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="cursor-pointer rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover">
          Subir CSV de Elo
          <input type="file" accept=".csv,text/csv,.txt" onChange={elegirArchivo} className="hidden" />
        </label>
        <button
          onClick={descargar}
          disabled={ocupado}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
        >
          Descargar CSV del estado actual
        </button>
        {ocupado && <span className="text-xs text-neutral-500">Procesando…</span>}
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}
      {exito && <p className="text-sm text-positive">{exito}</p>}

      {vista && r && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            <span className="font-medium">{nombreArchivo}</span>: {r.en_lista} filas válidas
            {ignoradas > 0 && ` (${ignoradas} ignoradas por no tener ID o Elo)`}.{" "}
            {r.coinciden} coinciden con jugadores de la base.{" "}
            <span className="font-medium">{r.cambian_elo} cambian de Elo</span> ({r.suben} suben,{" "}
            {r.bajan} bajan, {r.debuts} debuts).
          </p>
          {(r.sin_dato_en_lista > 0 || r.no_encontrados.length > 0) && (
            <p className="text-xs text-neutral-500">
              {r.sin_dato_en_lista > 0 &&
                `${r.sin_dato_en_lista} jugadores con ID FIDE no aparecen en el CSV (se quedan como están). `}
              {r.no_encontrados.length > 0 &&
                `IDs del CSV que no están en la base (primeros ${r.no_encontrados.length}): ${r.no_encontrados.join(", ")}.`}
            </p>
          )}

          {filas.length > 0 && (
            <div className="max-h-96 overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 bg-neutral-50 text-left text-xs uppercase text-neutral-500 dark:bg-neutral-900">
                  <tr>
                    <th className="px-3 py-2 font-medium">Jugador</th>
                    <th className="px-3 py-2 font-medium">Elo</th>
                    <th className="px-3 py-2 font-medium">Valor (M)</th>
                    <th className="px-3 py-2 font-medium">Cambio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filas.map((f) => {
                    const d = f.elo_despues - f.elo_antes;
                    return (
                      <tr key={f.id} className={f.aviso ? "bg-amber-50 dark:bg-amber-900/20" : ""}>
                        <td className="px-3 py-1.5">
                          {f.nombre}
                          {f.aviso && <span title="Cambio de Elo muy grande: revísalo"> ⚠️</span>}
                          <span className="block text-xs text-neutral-500">{f.club}</span>
                        </td>
                        <td className="px-3 py-1.5">
                          {f.elo_antes === 0 ? "sin Elo" : f.elo_antes} → {f.elo_despues}{" "}
                          {f.elo_antes > 0 && (
                            <span className={d > 0 ? "text-positive" : d < 0 ? "text-negative" : ""}>
                              ({d > 0 ? "+" : ""}
                              {d})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {f.valor_antes} → {f.valor_despues}
                        </td>
                        <td
                          className={`px-3 py-1.5 ${
                            (f.cambio_pct ?? 0) > 0 ? "text-positive" : (f.cambio_pct ?? 0) < 0 ? "text-negative" : ""
                          }`}
                        >
                          {f.cambio_pct === null ? "–" : `${f.cambio_pct > 0 ? "+" : ""}${f.cambio_pct} %`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={aplicar}
              disabled={ocupado || r.cambian_elo === 0}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              Aplicar actualización
            </button>
            <button
              onClick={() => {
                setVista(null);
                setDatos(null);
                setNombreArchivo("");
              }}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
