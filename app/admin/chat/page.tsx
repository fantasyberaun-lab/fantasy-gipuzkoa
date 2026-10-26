"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  desbanearChatDB,
  fetchBloqueosAdmin,
  fetchDenunciasAdmin,
  resolverDenunciaChatDB,
  type BloqueoAdmin,
  type DenunciaAdmin,
} from "@/lib/supabase/chatQueries";
import { fetchDenunciasForoAdmin, resolverDenunciaForoDB } from "@/lib/supabase/foroQueries";

const INPUT =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

const DURACIONES = [
  { horas: 1, texto: "1 hora" },
  { horas: 24, texto: "1 día" },
  { horas: 168, texto: "7 días" },
  { horas: 720, texto: "30 días" },
];

type Filtro = "pendientes" | "resueltas";

// Denuncia del chat o de un foro (0112) en la misma lista. En las de foros, "texto" es el
// mensaje denunciado y "temaId" lleva al tema.
type DenunciaItem = DenunciaAdmin & { origen: "chat" | "foro"; temaId: number | null; tituloTema: string | null };

// "chat" y "foro" tienen ids independientes: la clave de la lista lleva el origen.
const clave = (d: DenunciaItem) => `${d.origen}${d.id}`;

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

// Denuncias del chat y baneos activos (0089). Aceptar una denuncia borra el mensaje y,
// si se elige duración, banea al autor de ese chat. Rechazarla la archiva.
export default function AdminChatPage() {
  const supabase = createClient();
  const [denuncias, setDenuncias] = useState<DenunciaItem[]>([]);
  const [bloqueos, setBloqueos] = useState<BloqueoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [horas, setHoras] = useState<number>(0);
  const [motivo, setMotivo] = useState("");
  const [trabajando, setTrabajando] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    const [d, f, b] = await Promise.all([
      fetchDenunciasAdmin(supabase),
      fetchDenunciasForoAdmin(supabase),
      fetchBloqueosAdmin(supabase),
    ]);
    if (d.ok) {
      // Si la migración de foros aún no está aplicada, f.ok es false y solo se ven las del chat.
      const delChat: DenunciaItem[] = d.lista.map((x) => ({ ...x, origen: "chat", temaId: null, tituloTema: null }));
      const delForo: DenunciaItem[] = f.ok
        ? f.lista.map((x) => ({ ...x, origen: "foro", temaId: x.temaId, tituloTema: x.tituloTema }))
        : [];
      setDenuncias(
        [...delChat, ...delForo].sort((p, q) => Date.parse(q.creada) - Date.parse(p.creada))
      );
      setError(null);
    } else setError(d.mensaje);
    if (b.ok) setBloqueos(b.lista);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrir(d: DenunciaItem) {
    setAbierta(abierta === clave(d) ? null : clave(d));
    setHoras(0);
    setMotivo("");
  }

  async function resolver(d: DenunciaItem, aceptar: boolean) {
    setTrabajando(`d${clave(d)}`);
    const resolverDB = d.origen === "foro" ? resolverDenunciaForoDB : resolverDenunciaChatDB;
    const r = await resolverDB(
      supabase,
      d.id,
      aceptar,
      aceptar && horas > 0 ? horas : null,
      motivo.trim() || null
    );
    setTrabajando(null);
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    setAbierta(null);
    await cargar();
  }

  async function quitarBaneo(b: BloqueoAdmin) {
    setTrabajando(`b${b.userId}${b.ligaId}`);
    const r = await desbanearChatDB(supabase, b.userId, b.ligaId);
    setTrabajando(null);
    if (!r.ok) setError(r.mensaje);
    else await cargar();
  }

  const lista = denuncias.filter((d) => (filtro === "pendientes" ? d.estado === "pendiente" : d.estado !== "pendiente"));
  const pendientes = denuncias.filter((d) => d.estado === "pendiente").length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Denuncias</h2>
          <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm dark:bg-neutral-800">
            {(["pendientes", "resueltas"] as Filtro[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`rounded-md px-3 py-1 font-medium capitalize ${
                  filtro === f ? "bg-white shadow-sm dark:bg-neutral-700" : "text-neutral-500"
                }`}
              >
                {f}
                {f === "pendientes" && pendientes > 0 ? ` (${pendientes})` : ""}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {cargando && <p className="text-sm text-neutral-500">Cargando…</p>}
        {!cargando && lista.length === 0 && (
          <p className="text-sm text-neutral-500">
            {filtro === "pendientes" ? "No hay denuncias pendientes." : "Aún no hay denuncias resueltas."}
          </p>
        )}

        <ul className="space-y-3">
          {lista.map((d) => (
            <li key={clave(d)} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{d.ligaNombre}</span>
                <span>{d.ligaPublica ? "pública" : "privada"}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-semibold dark:bg-neutral-800">
                  {d.origen === "foro" ? "foro" : "chat"}
                </span>
                <span>· {fechaHora(d.creada)}</span>
                {d.estado !== "pendiente" && (
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${
                      d.estado === "aceptada"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    }`}
                  >
                    {d.estado}
                  </span>
                )}
              </div>
              {d.origen === "foro" && d.temaId !== null && (
                <p className="mt-2 text-sm">
                  <span className="text-neutral-500">Tema:</span>{" "}
                  <Link href={`/chat/foros/${d.temaId}`} className="font-medium hover:underline">
                    {d.tituloTema ?? `#${d.temaId}`}
                  </Link>
                </p>
              )}
              <blockquote className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-900">
                {d.texto}
              </blockquote>
              <p className="mt-2 text-sm">
                <span className="text-neutral-500">Autor:</span> <b>{d.autorNombre ?? "—"}</b>
                <span className="ml-3 text-neutral-500">Denuncia:</span> <b>{d.denuncianteNombre ?? "—"}</b>
              </p>
              {d.rechazadasDenunciante >= 3 && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  Ojo: {d.denuncianteNombre ?? "esta persona"} lleva {d.rechazadasDenunciante} denuncias rechazadas en 30 días
                  (posible abuso, ver Condiciones).
                </p>
              )}
              {!d.mensajeExiste && (
                <p className="mt-1 text-xs text-neutral-500">El mensaje ya no existe (borrado o caducado).</p>
              )}
              {d.autorBaneadoHasta && new Date(d.autorBaneadoHasta) > new Date() && (
                <p className="mt-1 text-xs text-neutral-500">Ya baneado hasta {fechaHora(d.autorBaneadoHasta)}.</p>
              )}

              {d.estado === "pendiente" && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => abrir(d)}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:border-accent dark:border-neutral-700"
                  >
                    {abierta === clave(d) ? "Cerrar" : "Resolver"}
                  </button>
                  {abierta === clave(d) && (
                    <div className="mt-3 space-y-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
                      <label className="block text-sm">
                        <span className="mb-1 block text-neutral-500">Si la aceptas, banear al autor</span>
                        <select value={horas} onChange={(e) => setHoras(Number(e.target.value))} className={INPUT}>
                          <option value={0}>No banear (solo borrar el mensaje)</option>
                          {DURACIONES.map((x) => (
                            <option key={x.horas} value={x.horas}>
                              {x.texto}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-neutral-500">Motivo (lo ve la persona baneada)</span>
                        <input
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          maxLength={200}
                          className={INPUT}
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={trabajando === `d${clave(d)}`}
                          onClick={() => resolver(d, true)}
                          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Aceptar
                        </button>
                        <button
                          type="button"
                          disabled={trabajando === `d${clave(d)}`}
                          onClick={() => resolver(d, false)}
                          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Baneos activos</h2>
        {!cargando && bloqueos.length === 0 && <p className="text-sm text-neutral-500">No hay nadie baneado.</p>}
        <ul className="space-y-2">
          {bloqueos.map((b) => (
            <li
              key={b.userId + b.ligaId}
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {b.nombre ?? "—"} <span className="font-normal text-neutral-500">en {b.ligaNombre}</span>
                </p>
                <p className="text-xs text-neutral-500">
                  Hasta {fechaHora(b.hasta)}
                  {b.motivo ? ` · ${b.motivo}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={trabajando === `b${b.userId}${b.ligaId}`}
                onClick={() => quitarBaneo(b)}
                className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 font-medium hover:border-accent disabled:opacity-50 dark:border-neutral-700"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
