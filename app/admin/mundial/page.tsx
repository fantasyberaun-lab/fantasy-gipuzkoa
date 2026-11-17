"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  adminArchivarClasificacion,
  adminMundialActivar,
  adminMundialAjustes,
  adminMundialCerrar,
  adminMundialConcederIcono,
  adminMundialPartidaGuardar,
  adminMundialResultadoFinal,
  adminMundialResultadoPartida,
  fetchAdminMundial,
  fetchAdminParticipantes,
  type AdminMundial,
  type AdminPartida,
  type ParticipanteAdmin,
  type RespuestaAdmin,
  type ResultadoPartida,
} from "@/lib/supabase/mundialQueries";
import { fechaCalendario, horaInputMadrid, isoDesdeMadrid } from "@/lib/mundial";

const INPUT =
  "rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const BOTON =
  "rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50";
const BOTON_SUAVE =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900";
const BOTON_PELIGRO =
  "rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50";

function Seccion({ titulo, children, nota }: { titulo: string; children: React.ReactNode; nota?: string }) {
  return (
    <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-base font-semibold">{titulo}</h2>
      {nota && <p className="mb-3 mt-0.5 text-xs text-neutral-500">{nota}</p>}
      <div className={nota ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function Etiqueta({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
      }`}
    >
      {texto}
    </span>
  );
}

function fechaHora(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid" }) : "—";
}

export default function AdminMundialPage() {
  const supabase = useMemo(() => createClient(), []);
  const [d, setD] = useState<AdminMundial | null | undefined>(undefined);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [participantes, setParticipantes] = useState<ParticipanteAdmin[] | null>(null);

  // Formularios
  const [aplicarSaldos, setAplicarSaldos] = useState(true);
  const [soloPublicas, setSoloPublicas] = useState(true);
  const [restaurar, setRestaurar] = useState(true);
  const [conservar, setConservar] = useState(false);
  const [cierre, setCierre] = useState("10");
  const [saldo, setSaldo] = useState("500");
  const [ligas, setLigas] = useState<{ id: string; nombre: string; tipo: string }[]>([]);
  const [ligaArchivo, setLigaArchivo] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("Primera liga");

  const cargar = useCallback(async () => {
    const e = await fetchAdminMundial(supabase);
    setD(e);
    if (e) {
      setCierre(String(e.evento.cierreMinutos));
      setSaldo(String(e.evento.saldoEvento));
    }
  }, [supabase]);

  useEffect(() => {
    cargar();
    supabase
      .from("leagues")
      .select("id, nombre, tipo")
      .order("nombre")
      .then(({ data }) => setLigas((data ?? []) as { id: string; nombre: string; tipo: string }[]));
  }, [cargar, supabase]);

  async function ejecutar(
    accion: () => Promise<RespuestaAdmin>,
    exito: (datos: Record<string, unknown>) => string,
    confirmacion?: string
  ) {
    if (confirmacion && !window.confirm(confirmacion)) return;
    setTrabajando(true);
    setMsg(null);
    const r = await accion();
    setTrabajando(false);
    setMsg(r.ok ? { ok: true, texto: exito(r.datos) } : { ok: false, texto: r.mensaje });
    if (r.ok) await cargar();
  }

  if (d === undefined) return <p className="text-sm text-neutral-500">Cargando…</p>;
  if (d === null)
    return (
      <p className="text-sm text-red-600">
        No se pudo leer el estado del evento. ¿Está aplicada la migración 0141 (y la 0140)?
      </p>
    );

  const e = d.evento;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">{e.nombre}</h2>
        <p className="text-sm text-neutral-500">
          Evento temporal y reversible. Nada se aplica solo: cada acción masiva (saldos, icono, cierre) se lanza desde aquí.
        </p>
      </div>

      {msg && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          }`}
        >
          {msg.texto}
        </p>
      )}

      <Seccion titulo="Estado">
        <div className="flex flex-wrap gap-2">
          <Etiqueta ok={e.activo} texto={e.activo ? "Evento activo" : "Evento apagado"} />
          <Etiqueta ok={e.activo && e.modoMatch} texto={e.modoMatch ? "Match visible (Plantilla y Mercado ocultos)" : "Plantilla y Mercado visibles"} />
          <Etiqueta ok={!!e.saldosAplicadosEn && !e.saldosRestauradosEn} texto={e.saldosAplicadosEn ? (e.saldosRestauradosEn ? "Saldos restaurados" : "Saldos del evento aplicados") : "Saldos sin tocar"} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          <dt className="text-neutral-500">Iniciado</dt>
          <dd className="sm:col-span-2">{fechaHora(e.iniciadoEn)}</dd>
          <dt className="text-neutral-500">Cerrado</dt>
          <dd className="sm:col-span-2">{fechaHora(e.cerradoEn)}</dd>
          <dt className="text-neutral-500">Participantes</dt>
          <dd className="sm:col-span-2">{d.participantes}</dd>
          <dt className="text-neutral-500">Equipos respaldados</dt>
          <dd className="sm:col-span-2">
            {d.saldosRespaldados} ({d.saldosPendientesRestaurar} pendientes de restaurar)
          </dd>
        </dl>
      </Seccion>

      <Seccion
        titulo="Encender / cerrar el evento"
        nota="Encender activa Match, oculta Plantilla y Mercado y activa a Gukesh y Sindarov como jugadores. Opcionalmente pone el saldo del evento a todos los equipos, guardando antes el saldo previo en una tabla de respaldo."
      >
        {!e.activo ? (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={aplicarSaldos} onChange={(x) => setAplicarSaldos(x.target.checked)} />
              Poner {e.saldoEvento} M a los equipos (guarda el saldo previo)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={soloPublicas} onChange={(x) => setSoloPublicas(x.target.checked)} disabled={!aplicarSaldos} />
              Solo equipos de ligas públicas (no tocar ligas privadas)
            </label>
            <div>
              <button
                className={BOTON}
                disabled={trabajando}
                onClick={() =>
                  ejecutar(
                    () => adminMundialActivar(supabase, aplicarSaldos, soloPublicas),
                    (r) => `Evento encendido. Equipos con saldo nuevo: ${r.equipos_con_saldo_nuevo ?? 0}.`,
                    aplicarSaldos
                      ? `Vas a ENCENDER el evento y poner ${e.saldoEvento} M a ${soloPublicas ? "los equipos de ligas públicas" : "TODOS los equipos"}. El saldo previo se guarda y se puede restaurar al cerrar. ¿Continuar?`
                      : "Vas a ENCENDER el evento (sin tocar saldos). ¿Continuar?"
                  )
                }
              >
                Encender evento
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={restaurar} onChange={(x) => setRestaurar(x.target.checked)} />
              Restaurar los saldos previos al cerrar
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={conservar} onChange={(x) => setConservar(x.target.checked)} disabled={!restaurar} />
              Conservar lo ganado/gastado durante el evento (saldo previo + variación)
            </label>
            <div>
              <button
                className={BOTON_PELIGRO}
                disabled={trabajando}
                onClick={() =>
                  ejecutar(
                    () => adminMundialCerrar(supabase, restaurar, conservar),
                    (r) =>
                      `Evento cerrado. Saldos restaurados: ${r.saldos_restaurados ?? 0}. Equipos con variación durante el evento: ${r.equipos_con_variacion ?? 0}.`,
                    `Vas a CERRAR el evento: vuelven Plantilla y Mercado${restaurar ? " y se restauran los saldos previos" : ""}. ¿Continuar?`
                  )
                }
              >
                Cerrar evento
              </button>
            </div>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Interruptor Match / Plantilla" nota="Muestra Match (y oculta Plantilla y Mercado) o devuelve las pestañas normales. No borra nada.">
        <div className="flex items-center gap-3">
          <Etiqueta ok={e.modoMatch} texto={e.modoMatch ? "Ahora: Match" : "Ahora: Plantilla y Mercado"} />
          <button
            className={BOTON_SUAVE}
            disabled={trabajando || !e.activo}
            onClick={() =>
              ejecutar(
                () => adminMundialAjustes(supabase, { modoMatch: !e.modoMatch }),
                () => (e.modoMatch ? "Plantilla y Mercado visibles de nuevo." : "Match visible.")
              )
            }
          >
            {e.modoMatch ? "Mostrar Plantilla y Mercado" : "Mostrar Match"}
          </button>
          {!e.activo && <span className="text-xs text-neutral-500">Solo con el evento encendido.</span>}
        </div>
      </Seccion>

      <Seccion titulo="Ajustes">
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="cierre">Cerrar pronósticos</label>
            <input id="cierre" type="number" min={0} max={1440} className={`${INPUT} w-24`} value={cierre} onChange={(x) => setCierre(x.target.value)} />
            <span>minutos antes de la partida</span>
            <button
              className={BOTON_SUAVE}
              disabled={trabajando}
              onClick={() => ejecutar(() => adminMundialAjustes(supabase, { cierreMinutos: Number(cierre) }), () => "Cierre guardado.")}
            >
              Guardar
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="saldo">Saldo del evento (M)</label>
            <input id="saldo" type="number" min={0} className={`${INPUT} w-28`} value={saldo} onChange={(x) => setSaldo(x.target.value)} disabled={!!e.saldosAplicadosEn} />
            <button
              className={BOTON_SUAVE}
              disabled={trabajando || !!e.saldosAplicadosEn}
              onClick={() => ejecutar(() => adminMundialAjustes(supabase, { saldoEvento: Number(saldo) }), () => "Saldo del evento guardado.")}
            >
              Guardar
            </button>
            {e.saldosAplicadosEn && <span className="text-xs text-neutral-500">Ya aplicado: no se puede cambiar.</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta ok={e.desempateActivo} texto={e.desempateActivo ? "Desempate activo (se vota al campeón)" : "Sin desempate"} />
            <button
              className={BOTON_SUAVE}
              disabled={trabajando}
              onClick={() =>
                ejecutar(
                  () => adminMundialAjustes(supabase, { desempateActivo: !e.desempateActivo }),
                  () => (e.desempateActivo ? "Desempate desactivado." : "Desempate activado: ahora se vota al campeón.")
                )
              }
            >
              {e.desempateActivo ? "Desactivar desempate" : "Activar desempate"}
            </button>
          </div>
        </div>
      </Seccion>

      <Seccion
        titulo="Calendario y resultados"
        nota="La hora se escribe en hora de Madrid. Por defecto 15:00. El resultado recalcula los puntos al instante y se puede corregir."
      >
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {d.partidas.map((p) => (
            <FilaAdmin key={p.id} p={p} trabajando={trabajando} ejecutar={ejecutar} supabase={supabase} />
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Resultado final (campeón)" nota="Da +1 punto a quien votó al campeón tras un desempate.">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>
            Votos: Gukesh {d.votosFinal.gukesh} · Sindarov {d.votosFinal.sindarov}
          </span>
          <select
            className={INPUT}
            value={e.resultadoFinal ?? ""}
            disabled={trabajando}
            onChange={(x) =>
              ejecutar(
                () => adminMundialResultadoFinal(supabase, (x.target.value || null) as "gukesh" | "sindarov" | null),
                () => "Resultado final guardado."
              )
            }
          >
            <option value="">Sin campeón todavía</option>
            <option value="gukesh">Campeón: Gukesh</option>
            <option value="sindarov">Campeón: Sindarov</option>
          </select>
        </div>
      </Seccion>

      <Seccion titulo="Participantes" nota="Quien ha hecho al menos un pronóstico o voto. Ellos reciben el icono.">
        <div className="flex flex-col gap-3">
          <div>
            <button className={BOTON_SUAVE} onClick={async () => setParticipantes(await fetchAdminParticipantes(supabase))}>
              {participantes ? "Actualizar lista" : "Ver participantes"}
            </button>
          </div>
          {participantes && (
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-neutral-500">
                  <tr>
                    <th className="py-1">Manager</th>
                    <th>Pron.</th>
                    <th>Acier.</th>
                    <th>Pts</th>
                    <th>Voto final</th>
                    <th>Icono</th>
                  </tr>
                </thead>
                <tbody>
                  {participantes.map((p) => (
                    <tr key={p.userId} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="py-1">{p.nombre}</td>
                      <td>{p.pronosticos}</td>
                      <td>{p.aciertos}</td>
                      <td className="font-semibold">{p.puntos}</td>
                      <td>{p.votoFinal ?? "—"}</td>
                      <td>{p.icono ? "✓" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Seccion>

      <Seccion
        titulo="Icono de Sindarov"
        nota="Se concede a todos los participantes (al menos un pronóstico o voto). No es automático. Idempotente: repetirlo solo añade a quien aún no lo tenga."
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>Concedidos: {d.iconosConcedidos}</span>
          <button
            className={BOTON}
            disabled={trabajando}
            onClick={() =>
              ejecutar(
                () => adminMundialConcederIcono(supabase),
                (r) => `Icono concedido a ${r.nuevos ?? 0} participantes nuevos (total ${r.total ?? 0}).`,
                "¿Conceder el icono de Sindarov a todos los participantes?"
              )
            }
          >
            Conceder icono
          </button>
        </div>
      </Seccion>

      <Seccion
        titulo="Archivar clasificación de una liga"
        nota="Guarda una foto de la clasificación en el Histórico (visible en Clasificación > Histórico). No borra ni modifica nada de la liga. Hazlo ANTES de encender el evento."
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select className={INPUT} value={ligaArchivo} onChange={(x) => setLigaArchivo(x.target.value)}>
            <option value="">Elige liga…</option>
            {ligas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre} ({l.tipo})
              </option>
            ))}
          </select>
          <input className={`${INPUT} w-48`} value={nombreArchivo} onChange={(x) => setNombreArchivo(x.target.value)} placeholder="Nombre en el histórico" />
          <button
            className={BOTON_SUAVE}
            disabled={trabajando || !ligaArchivo}
            onClick={() =>
              ejecutar(
                () => adminArchivarClasificacion(supabase, ligaArchivo, nombreArchivo),
                (r) => `Clasificación archivada (${r.equipos ?? 0} equipos).`,
                `¿Archivar la clasificación actual como «${nombreArchivo}»?`
              )
            }
          >
            Archivar
          </button>
        </div>
      </Seccion>

      <Seccion
        titulo="Jugadores y torneo"
        nota="Datos PROVISIONALES de Gukesh y Sindarov (Elo y valor orientativos): edítalos en la pestaña Jugadores. El torneo del Mundial se crea a mano en Torneos (al crearlo se envía un push de torneo nuevo)."
      >
        <ul className="mb-3 text-sm">
          {d.jugadores.map((j) => (
            <li key={j.id} className="flex justify-between border-t border-neutral-200 py-1 first:border-0 dark:border-neutral-800">
              <span>{j.nombre}</span>
              <span className="text-neutral-500">
                Elo {j.elo} · {j.valorMercado} M · {j.activo ? "activo" : "inactivo"}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-3 text-sm">
          <Link href="/admin" className="text-accent underline underline-offset-2">
            Jugadores
          </Link>
          <Link href="/admin/torneos" className="text-accent underline underline-offset-2">
            Torneos
          </Link>
        </div>
      </Seccion>
    </div>
  );
}

function FilaAdmin({
  p,
  trabajando,
  ejecutar,
  supabase,
}: {
  p: AdminPartida;
  trabajando: boolean;
  ejecutar: (
    accion: () => Promise<RespuestaAdmin>,
    exito: (datos: Record<string, unknown>) => string,
    confirmacion?: string
  ) => Promise<void>;
  supabase: ReturnType<typeof createClient>;
}) {
  const [fecha, setFecha] = useState(p.fecha);
  const [hora, setHora] = useState(horaInputMadrid(p.inicio));
  const titulo =
    p.tipo === "partida" ? `Partida ${p.numero}` : p.tipo === "descanso" ? "Descanso" : "Desempates";
  const cambiado = fecha !== p.fecha || hora !== horaInputMadrid(p.inicio);

  return (
    <li className="flex flex-col gap-2 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-24 font-medium">{titulo}</span>
        <input type="date" className={INPUT} value={fecha} onChange={(x) => setFecha(x.target.value)} aria-label={`Fecha de ${titulo}`} />
        {p.tipo !== "descanso" && (
          <input type="time" className={INPUT} value={hora} onChange={(x) => setHora(x.target.value)} aria-label={`Hora de ${titulo} (Madrid)`} />
        )}
        <button
          className={BOTON_SUAVE}
          disabled={trabajando || !cambiado || (p.tipo !== "descanso" && !hora)}
          onClick={() =>
            ejecutar(
              () => adminMundialPartidaGuardar(supabase, p.id, fecha, p.tipo === "descanso" ? null : isoDesdeMadrid(fecha, hora)),
              () => `${titulo} guardada (${fechaCalendario(fecha, "es-ES")}${hora ? ` ${hora}` : ""}, hora de Madrid).`
            )
          }
        >
          Guardar fecha/hora
        </button>
      </div>
      {p.tipo === "partida" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <select
            className={INPUT}
            value={p.resultado ?? ""}
            disabled={trabajando}
            aria-label={`Resultado de ${titulo}`}
            onChange={(x) =>
              ejecutar(
                () => adminMundialResultadoPartida(supabase, p.id, (x.target.value || null) as ResultadoPartida | null),
                () => `Resultado de ${titulo} guardado.`
              )
            }
          >
            <option value="">Sin resultado</option>
            <option value="gukesh">Gana Gukesh</option>
            <option value="tablas">Tablas</option>
            <option value="sindarov">Gana Sindarov</option>
          </select>
          <span>
            {p.pronosticos} pronósticos · Gukesh {p.votos.gukesh} · Tablas {p.votos.tablas} · Sindarov {p.votos.sindarov}
          </span>
        </div>
      )}
    </li>
  );
}
