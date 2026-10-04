"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchActividad, type Actividad } from "@/lib/supabase/actividadQueries";

const PERIODOS = [
  { dias: 7, texto: "7 días" },
  { dias: 30, texto: "30 días" },
  { dias: 90, texto: "90 días" },
];

const NOMBRE_RUTA: Record<string, string> = {
  "/": "Inicio",
  "/plantilla": "Plantilla",
  "/mercado": "Mercado",
  "/jugadores": "Jugadores",
  "/clasificacion": "Clasificación",
  "/torneos": "Torneos",
  "/notificaciones": "Avisos",
};

function hace(iso: string | null): string {
  if (!iso) return "Nunca";
  const ms = Date.now() - Date.parse(iso);
  const min = Math.floor(ms / 60000);
  if (min < 2) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

function Tarjeta({ valor, texto, ayuda }: { valor: string | number; texto: string; ayuda?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800" title={ayuda}>
      <p className="text-2xl font-bold tabular-nums">{valor}</p>
      <p className="text-xs text-neutral-500">{texto}</p>
    </div>
  );
}

export default function AdminActividadPage() {
  const supabase = createClient();
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState<Actividad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [soloInactivos, setSoloInactivos] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargando(true);
      const r = await fetchActividad(supabase, dias);
      if (cancelado) return;
      if (r.ok) {
        setDatos(r.actividad);
        setError(null);
      } else {
        setError(r.mensaje);
      }
      setCargando(false);
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias]);

  const maximo = useMemo(() => Math.max(1, ...(datos?.porDia.map((d) => d.usuarios) ?? [1])), [datos]);

  const usuarios = useMemo(() => {
    if (!datos) return [];
    const q = busqueda.trim().toLowerCase();
    const hace14 = Date.now() - 14 * 86400000;
    return datos.usuarios.filter((u) => {
      if (q && !`${u.nombre} ${u.equipos ?? ""}`.toLowerCase().includes(q)) return false;
      if (soloInactivos) {
        const ultima = Math.max(
          u.ultimaActividad ? Date.parse(u.ultimaActividad) : 0,
          u.ultimoLogin ? Date.parse(u.ultimoLogin) : 0,
          Date.parse(u.registrado)
        );
        return ultima < hace14;
      }
      return true;
    });
  }, [datos, busqueda, soloInactivos]);

  if (error) return <p className="text-sm text-negative">{error}</p>;
  if (!datos) return <p className="text-sm text-neutral-500">Cargando actividad…</p>;

  const t = datos.totales;
  const fechaCorta = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Actividad de los managers (no cuenta la del administrador).
          {datos.registroDesde && <> Se registra desde el {fechaCorta(datos.registroDesde)}.</>}
        </p>
        <div className="flex gap-1">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              onClick={() => setDias(p.dias)}
              aria-pressed={dias === p.dias}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                dias === p.dias
                  ? "border-accent bg-accent text-white"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {p.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tarjeta valor={t.activosHoy} texto="Activos hoy" />
        <Tarjeta valor={t.activos7d} texto="Activos en 7 días" />
        <Tarjeta valor={t.activos30d} texto="Activos en 30 días" />
        <Tarjeta valor={t.registrados} texto="Managers registrados" ayuda={`${t.nuevosPeriodo} nuevos en ${dias} días`} />
        <Tarjeta valor={t.visitasPeriodo} texto={`Pantallas vistas (${dias} d)`} />
        <Tarjeta valor={t.nuevosPeriodo} texto={`Registros nuevos (${dias} d)`} />
        <Tarjeta valor={t.login7d} texto="Inicios de sesión (7 d)" ayuda="Dato de Supabase Auth" />
        <Tarjeta valor={t.sinEntrar14d} texto="Sin entrar en 14 días" />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Managers activos por día</h3>
        <div className="overflow-x-auto">
          <div className="flex h-32 min-w-full items-end gap-[3px]" style={{ minWidth: `${datos.porDia.length * 10}px` }}>
            {datos.porDia.map((d) => (
              <div
                key={d.dia}
                className="group relative flex h-full flex-1 flex-col justify-end"
                title={`${fechaCorta(d.dia)}: ${d.usuarios} managers, ${d.visitas} pantallas`}
              >
                <div
                  className={`w-full rounded-t ${d.usuarios > 0 ? "bg-accent" : "bg-neutral-200 dark:bg-neutral-800"}`}
                  style={{ height: d.usuarios > 0 ? `${Math.max((d.usuarios / maximo) * 100, 4)}%` : "2px" }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-neutral-500">
            <span>{fechaCorta(datos.porDia[0]?.dia ?? "")}</span>
            <span>máx. {maximo} en un día</span>
            <span>{fechaCorta(datos.porDia[datos.porDia.length - 1]?.dia ?? "")}</span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Pantallas más vistas ({dias} días)</h3>
        {datos.paginas.length === 0 ? (
          <p className="text-sm text-neutral-500">Todavía no hay visitas registradas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
            {datos.paginas.map((p) => (
              <li key={p.ruta} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{NOMBRE_RUTA[p.ruta] ?? p.ruta}</span>
                  {NOMBRE_RUTA[p.ruta] && <span className="ml-2 text-xs text-neutral-500">{p.ruta}</span>}
                </span>
                <span className="shrink-0 text-xs text-neutral-500">
                  {p.visitas} visitas · {p.usuarios} managers
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold">Managers</h3>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <input type="checkbox" checked={soloInactivos} onChange={(e) => setSoloInactivos(e.target.checked)} />
            Sin entrar en 14 días
          </label>
          <span className="text-xs text-neutral-500">{usuarios.length} resultados</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-3 py-2 font-medium">Manager</th>
                <th className="px-3 py-2 font-medium">Última actividad</th>
                <th className="px-3 py-2 font-medium">Último login</th>
                <th className="px-3 py-2 text-right font-medium">Días activo</th>
                <th className="px-3 py-2 text-right font-medium">Pantallas</th>
                <th className="px-3 py-2 text-right font-medium">Operaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {cargando && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-neutral-500">
                    Actualizando…
                  </td>
                </tr>
              )}
              {!cargando &&
                usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{u.nombre}</p>
                      {u.equipos && <p className="text-xs text-neutral-500">{u.equipos}</p>}
                    </td>
                    <td className="px-3 py-2">{hace(u.ultimaActividad)}</td>
                    <td className="px-3 py-2 text-neutral-500">{hace(u.ultimoLogin)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.diasActivos}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.visitas}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.operaciones}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          «Operaciones» = fichajes, ventas, ofertas aceptadas y cláusulas del periodo. «Último login» lo
          guarda Supabase al iniciar sesión; «Última actividad» es la última pantalla que abrió.
        </p>
      </section>
    </div>
  );
}
