"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameState } from "@/components/GameStateProvider";
import { useIdioma } from "@/components/IdiomaProvider";
import { createClient } from "@/lib/supabase/client";
import {
  anularSancionDB,
  cambiarTandasMercadoDB,
  expulsarDB,
  fetchPanelAdminLiga,
  readmitirDB,
  sancionarDB,
  type PanelAdminLiga,
  type TipoSancion,
} from "@/lib/supabase/adminLigaQueries";
import { horasTandaMercado, tandaCercana } from "@/lib/mercadoCountdown";

// Panel del administrador de una liga privada (0099). Solo lo ve quien creó la
// liga; la base de datos vuelve a comprobarlo en cada acción.

type Accion = TipoSancion | "expulsar";
type Aviso = { ok: boolean; texto: string };

const SECCION = "rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800";
const TITULO_SECCION = "mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500";
const ENTRADA =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export default function AdminLigaPage() {
  const { t, locale } = useIdioma();
  const ta = t.adminLiga;
  const { equipo, misLigas, clasificacion, cargando, esLigaPublica, recargar } = useGameState();
  const supabase = useMemo(() => createClient(), []);
  const ligaId = equipo.leagueId;
  const liga = misLigas.find((l) => l.ligaId === ligaId);

  const [panel, setPanel] = useState<PanelAdminLiga | null>(null);
  const [fase, setFase] = useState<"cargando" | "ok" | "error">("cargando");
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Formulario de sanción abierto (uno a la vez).
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [accion, setAccion] = useState<Accion>("puntos");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  // Hora actual, para saber si estamos en las 2 h antes de una tanda (cada 30 s basta).
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const cargarPanel = useCallback(async () => {
    if (!ligaId) return;
    const p = await fetchPanelAdminLiga(supabase, ligaId);
    setPanel(p);
    setFase(p ? "ok" : "error");
  }, [supabase, ligaId]);

  useEffect(() => {
    if (cargando || !liga?.soyAdmin) return;
    setFase("cargando");
    cargarPanel();
  }, [cargando, liga?.soyAdmin, cargarPanel]);

  if (cargando) return <p className="text-sm text-neutral-500">{ta.cargando}</p>;

  const volver = (
    <Link href="/clasificacion" className="text-sm font-medium text-accent">
      {ta.volver}
    </Link>
  );

  if (esLigaPublica || !liga?.soyAdmin) {
    return (
      <div className="flex flex-col gap-3">
        {volver}
        <p className="text-sm text-neutral-500">{esLigaPublica ? ta.soloPrivadas : ta.soloAdmin}</p>
      </div>
    );
  }

  const mostrar = (ok: boolean, texto: string) => {
    setAviso({ ok, texto });
    window.setTimeout(() => setAviso((a) => (a?.texto === texto ? null : a)), 5000);
  };

  // Tras cada acción: el panel y todo el juego (clasificación, saldo, avisos).
  const trasAccion = async () => {
    await Promise.all([cargarPanel(), recargar()]);
  };

  const abrir = (equipoId: string) => {
    setAbiertoId((prev) => (prev === equipoId ? null : equipoId));
    setAccion("puntos");
    setCantidad("");
    setMotivo("");
  };

  const cambiarTandas = async (n: number) => {
    if (!ligaId || enviando || !panel || panel.tandas === n) return;
    // Aviso inmediato; la base de datos lo vuelve a comprobar (admin_liga_tandas_mercado).
    const cercana = tandaCercanaAhora(n);
    if (cercana !== null) return mostrar(false, ta.mercadoBloqueado(cercana));
    setEnviando(true);
    const r = await cambiarTandasMercadoDB(supabase, ligaId, n);
    setEnviando(false);
    if (!r.ok) return mostrar(false, r.mensaje);
    mostrar(true, ta.mercadoGuardado);
    await trasAccion();
  };

  const aplicar = async (equipoId: string, nombreEquipo: string) => {
    if (!ligaId || enviando) return;
    setEnviando(true);
    const num = Number(cantidad.replace(",", "."));
    const r =
      accion === "expulsar"
        ? await expulsarDB(supabase, ligaId, equipoId, motivo)
        : await sancionarDB(
            supabase,
            ligaId,
            equipoId,
            accion,
            accion === "advertencia" ? null : num,
            motivo
          );
    setEnviando(false);
    if (!r.ok) return mostrar(false, r.mensaje);
    mostrar(
      true,
      accion === "expulsar"
        ? ta.hecho.expulsion(nombreEquipo)
        : accion === "advertencia"
          ? ta.hecho.advertencia(nombreEquipo)
          : ta.hecho[accion](nombreEquipo, num)
    );
    setAbiertoId(null);
    await trasAccion();
  };

  const anular = async (id: string) => {
    if (enviando) return;
    setEnviando(true);
    const r = await anularSancionDB(supabase, id);
    setEnviando(false);
    setAnulandoId(null);
    if (!r.ok) return mostrar(false, r.mensaje);
    mostrar(true, ta.anulada);
    await trasAccion();
  };

  const readmitir = async (userId: string, nombre: string) => {
    if (!ligaId || enviando) return;
    setEnviando(true);
    const r = await readmitirDB(supabase, ligaId, userId);
    setEnviando(false);
    if (!r.ok) return mostrar(false, r.mensaje);
    mostrar(true, ta.readmitido(nombre));
    await cargarPanel();
  };

  // Tanda a menos de 2 h, del horario actual o del que se quiere poner (null si no hay).
  function tandaCercanaAhora(nuevas: number): number | null {
    const actuales = horasTandaMercado(panel?.tandas ?? 3);
    return tandaCercana(ahora, actuales) ?? tandaCercana(ahora, horasTandaMercado(nuevas));
  }
  const bloqueoActual = panel ? tandaCercana(ahora, horasTandaMercado(panel.tandas)) : null;

  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });

  const rivales = clasificacion
    .filter((c) => !c.esMiEquipo && c.equipoId)
    .sort((a, b) => a.nombreEquipo.localeCompare(b.nombreEquipo));

  const opciones: { valor: Accion; texto: string }[] = [
    { valor: "puntos", texto: ta.tipoPuntos },
    { valor: "millones", texto: ta.tipoMillones },
    { valor: "advertencia", texto: ta.tipoAdvertencia },
    { valor: "expulsar", texto: ta.tipoExpulsar },
  ];

  return (
    <div className="flex flex-col gap-4">
      {volver}
      <div>
        <h2 className="font-display text-xl font-semibold">{ta.titulo}</h2>
        <p className="text-sm text-neutral-500">{liga.nombre}</p>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{ta.intro}</p>
      </div>

      {aviso && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${
            aviso.ok
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-red-50 text-negative dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {fase === "cargando" && <p className="text-sm text-neutral-500">{ta.cargando}</p>}
      {fase === "error" && <p className="text-sm text-negative">{ta.errorCarga}</p>}

      {fase === "ok" && panel && (
        <>
          {/* Mercado */}
          <section className={SECCION}>
            <h3 className={TITULO_SECCION}>{ta.mercadoTitulo}</h3>
            <p className="mb-3 text-sm">{ta.mercadoTexto}</p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => cambiarTandas(n)}
                  disabled={enviando}
                  aria-pressed={panel.tandas === n}
                  className={`rounded-xl border px-2 py-2.5 text-center transition-colors disabled:opacity-60 ${
                    panel.tandas === n
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-neutral-300 hover:border-accent dark:border-neutral-700"
                  }`}
                >
                  <span className="block text-sm font-semibold">{ta.tandas(n)}</span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-neutral-500">
                    {ta.horasTandas(n)}
                  </span>
                </button>
              ))}
            </div>
            {bloqueoActual !== null ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {ta.mercadoBloqueado(bloqueoActual)}
              </p>
            ) : (
              <p className="mt-2 text-xs text-neutral-500">{ta.mercadoAviso}</p>
            )}
          </section>

          {/* Managers */}
          <section className={SECCION}>
            <h3 className={TITULO_SECCION}>{ta.managersTitulo}</h3>
            {rivales.length === 0 ? (
              <p className="text-sm text-neutral-500">{ta.sinManagers}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {rivales.map((c) => {
                  const id = c.equipoId as string;
                  const abierto = abiertoId === id;
                  return (
                    <li
                      key={id}
                      className={`rounded-xl border ${
                        abierto ? "border-neutral-400 dark:border-neutral-600" : "border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.nombreEquipo}</p>
                          <p className="truncate text-xs text-neutral-500">
                            {c.nombreManager} · {ta.pts(c.puntos)}
                            {c.puntosSancion ? (
                              <span className="text-negative"> · {ta.sancionPts(c.puntosSancion)}</span>
                            ) : null}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => abrir(id)}
                          className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium dark:border-neutral-700"
                        >
                          {abierto ? ta.cerrarAccion : ta.accion}
                        </button>
                      </div>

                      {abierto && (
                        <div className="flex flex-col gap-3 border-t border-neutral-200 p-3 dark:border-neutral-800">
                          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                            {opciones.map((o) => (
                              <button
                                key={o.valor}
                                type="button"
                                onClick={() => {
                                  setAccion(o.valor);
                                  setCantidad("");
                                }}
                                aria-pressed={accion === o.valor}
                                className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                                  accion === o.valor
                                    ? o.valor === "expulsar"
                                      ? "border-negative bg-negative/10 text-negative"
                                      : "border-accent bg-accent/10 text-accent"
                                    : "border-neutral-300 dark:border-neutral-700"
                                }`}
                              >
                                {o.texto}
                              </button>
                            ))}
                          </div>

                          {(accion === "puntos" || accion === "millones") && (
                            <label className="text-xs font-medium text-neutral-500">
                              {accion === "puntos" ? ta.cantidadPuntos : ta.cantidadMillones}
                              <input
                                type="number"
                                inputMode={accion === "puntos" ? "numeric" : "decimal"}
                                min={accion === "puntos" ? 1 : 0.01}
                                step={accion === "puntos" ? 1 : 0.01}
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                className={`mt-1 ${ENTRADA}`}
                              />
                            </label>
                          )}

                          <label className="text-xs font-medium text-neutral-500">
                            {ta.motivo}
                            <textarea
                              value={motivo}
                              onChange={(e) => setMotivo(e.target.value)}
                              maxLength={300}
                              rows={2}
                              placeholder={ta.motivoPlaceholder}
                              className={`mt-1 resize-none ${ENTRADA}`}
                            />
                          </label>

                          {accion === "expulsar" && (
                            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-negative dark:bg-red-950/40 dark:text-red-300">
                              {ta.avisoExpulsar(c.nombreEquipo)}
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() => aplicar(id, c.nombreEquipo)}
                            disabled={
                              enviando ||
                              motivo.trim().length < 3 ||
                              ((accion === "puntos" || accion === "millones") && !(Number(cantidad) > 0))
                            }
                            className={`rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-40 ${
                              accion === "expulsar" ? "bg-negative" : "bg-accent hover:bg-accent-hover"
                            }`}
                          >
                            {enviando
                              ? ta.enviando
                              : accion === "expulsar"
                                ? ta.confirmarExpulsion
                                : ta.confirmarSancion}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Historial de sanciones */}
          <section className={SECCION}>
            <h3 className={TITULO_SECCION}>{ta.historialTitulo}</h3>
            {panel.sanciones.length === 0 ? (
              <p className="text-sm text-neutral-500">{ta.sinHistorial}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
                {panel.sanciones.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{s.nombreEquipo}</span>{" "}
                        <span className={s.tipo === "advertencia" ? "text-amber-700 dark:text-amber-300" : "text-negative"}>
                          {s.tipo === "advertencia"
                            ? ta.lineaSancion.advertencia
                            : ta.lineaSancion[s.tipo](s.cantidad ?? 0)}
                        </span>
                      </p>
                      <p className="text-xs text-neutral-500">
                        {fecha(s.creada)} · «{s.motivo}»
                      </p>
                    </div>
                    {anulandoId === s.id ? (
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <p className="max-w-[12rem] text-right text-[11px] text-neutral-500">{ta.confirmarAnular}</p>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAnulandoId(null)}
                            className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium dark:border-neutral-700"
                          >
                            {ta.no}
                          </button>
                          <button
                            type="button"
                            onClick={() => anular(s.id)}
                            disabled={enviando}
                            className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
                          >
                            {ta.si}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAnulandoId(s.id)}
                        className="shrink-0 text-xs font-medium text-accent underline underline-offset-2"
                      >
                        {ta.anular}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Expulsados */}
          <section className={SECCION}>
            <h3 className={TITULO_SECCION}>{ta.expulsadosTitulo}</h3>
            {panel.expulsados.length === 0 ? (
              <p className="text-sm text-neutral-500">{ta.sinExpulsados}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
                {panel.expulsados.map((e) => (
                  <li key={e.userId} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{ta.expulsadoLinea(e.nombreManager, e.nombreEquipo)}</p>
                      <p className="text-xs text-neutral-500">
                        {fecha(e.creado)} · «{e.motivo}»
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => readmitir(e.userId, e.nombreManager)}
                      disabled={enviando}
                      className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-neutral-700"
                    >
                      {ta.readmitir}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
