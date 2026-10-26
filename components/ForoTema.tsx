"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useChat } from "@/components/ChatProvider";
import { useIdioma } from "@/components/IdiomaProvider";
import AvatarPerfil from "@/components/AvatarPerfil";
import EditorTexto from "@/components/EditorTexto";
import EncuestaTema from "@/components/EncuestaTema";
import InsigniaNivel from "@/components/InsigniaNivel";
import Reacciones from "@/components/Reacciones";
import { resaltarMenciones } from "@/components/TextoConMenciones";
import { haceTiempo } from "@/lib/tiempo";
import { idsMencionados, textoError, tituloTema } from "@/lib/foroUi";
import {
  borrarForoDB,
  cerrarTemaForoDB,
  denunciarForoDB,
  editarForoDB,
  fetchEstadoForo,
  fetchInicialForo,
  fetchRespuestasForo,
  fetchRespuestasNuevasForo,
  fetchTemaForo,
  fijarTemaForoDB,
  marcarNormasForoVistasDB,
  marcarTemaLeidoDB,
  reaccionarForoDB,
  responderForoDB,
  type DetalleTema,
  type EncuestaForo,
  type EstadoForo,
  type MensajeForo,
} from "@/lib/supabase/foroQueries";

// Sondeo (sin Realtime, como el chat): con el tema abierto y la pestaña visible, cada pocos
// segundos se piden solo las respuestas nuevas; cada tercera vuelta se vuelve a pedir la
// última página para ver ediciones, borrados, reacciones y cambios del tema.
const SONDEO_PRIVADA_MS = 8_000;
const SONDEO_PUBLICA_MS = 10_000;
const SONDEO_LENTO_MS = 30_000;
const TRAS_INACTIVIDAD_MS = 3 * 60_000;
const VUELTAS_PARA_RECONCILIAR = 3;
const PAGINA = 40;

const D_ENVIAR = "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5";
const D_PUNTOS = "M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z";
const D_FLECHA_ABAJO = "M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3";

function Icono({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

type MenuMensaje = { id: number; confirmando: "borrar" | "denunciar" | null };
type Edicion = { id: number; texto: string; menciones: string[]; guardando: boolean };

// Recuenta las reacciones de un mensaje al cambiar la mía (para pintar al instante).
function conReaccion(m: MensajeForo, nueva: string | null): MensajeForo {
  const conteos = { ...m.reacciones };
  if (m.mia) {
    conteos[m.mia] = Math.max((conteos[m.mia] ?? 1) - 1, 0);
    if (conteos[m.mia] === 0) delete conteos[m.mia];
  }
  if (nueva) conteos[nueva] = (conteos[nueva] ?? 0) + 1;
  return { ...m, reacciones: conteos, mia: nueva };
}

export default function ForoTema({ temaId }: { temaId: number }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { t, locale } = useIdioma();
  const tf = t.foros;
  const { refrescar } = useChat();

  const [miId, setMiId] = useState("");
  const [tema, setTema] = useState<DetalleTema | null>(null);
  const [estado, setEstado] = useState<EstadoForo | null>(null);
  const [inicial, setInicial] = useState<MensajeForo | null>(null);
  const [respuestas, setRespuestas] = useState<MensajeForo[]>([]);
  const [fase, setFase] = useState<"cargando" | "ok" | "error">("cargando");
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [pendientesNuevos, setPendientesNuevos] = useState(0);

  const [texto, setTexto] = useState("");
  const [menciones, setMenciones] = useState<Record<string, string>>({});
  const [cita, setCita] = useState<MensajeForo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);
  const [menu, setMenu] = useState<MenuMensaje | null>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [accionTema, setAccionTema] = useState<"cerrar" | null>(null);

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const ultimoIdRef = useRef(0);
  const temaRef = useRef(temaId);
  temaRef.current = temaId;

  const ultimoId = respuestas.length ? respuestas[respuestas.length - 1].id : 0;
  ultimoIdRef.current = ultimoId;
  const maxLeido = Math.max(ultimoId, inicial?.id ?? 0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMiId(data.session?.user.id ?? ""));
  }, [supabase]);

  function mostrarAviso(texto: string, error = false) {
    setAviso({ texto, error });
    window.setTimeout(() => setAviso((a) => (a?.texto === texto ? null : a)), 4500);
  }

  const alFinal = () => {
    const r = finRef.current?.getBoundingClientRect();
    return r ? r.top < window.innerHeight + 80 : true;
  };

  // --- Carga inicial ----------------------------------------------------------------------
  const cargar = useCallback(async () => {
    setFase("cargando");
    setRespuestas([]);
    setPendientesNuevos(0);
    const det = await fetchTemaForo(supabase, temaId);
    if (temaRef.current !== temaId) return;
    if (!det) {
      setFase("error");
      return;
    }
    const [est, ini, resp] = await Promise.all([
      fetchEstadoForo(supabase, det.ligaId),
      fetchInicialForo(supabase, temaId),
      fetchRespuestasForo(supabase, temaId, null, PAGINA),
    ]);
    if (temaRef.current !== temaId) return;
    if (!est || !resp) {
      setFase("error");
      return;
    }
    setTema(det);
    setEstado(est);
    setInicial(ini);
    setRespuestas(resp);
    setHayMas(resp.length >= PAGINA);
    setFase("ok");
  }, [supabase, temaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Lo que ve en pantalla ya está leído.
  useEffect(() => {
    if (fase !== "ok" || maxLeido === 0 || document.visibilityState !== "visible") return;
    let vigente = true;
    marcarTemaLeidoDB(supabase, temaId, maxLeido).then(() => {
      if (vigente) refrescar();
    });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, maxLeido, temaId]);

  const añadirNuevas = useCallback((nuevas: MensajeForo[]) => {
    setRespuestas((prev) => {
      const ultimo = prev.length ? prev[prev.length - 1].id : 0;
      const utiles = nuevas.filter((m) => m.id > ultimo);
      if (utiles.length === 0) return prev;
      if (!alFinal()) setPendientesNuevos((n) => n + utiles.length);
      return [...prev, ...utiles];
    });
  }, []);

  const traerNuevas = useCallback(async () => {
    const id = temaRef.current;
    const nuevas = await fetchRespuestasNuevasForo(supabase, id, ultimoIdRef.current);
    if (temaRef.current === id && nuevas?.length) añadirNuevas(nuevas);
  }, [supabase, añadirNuevas]);

  const reconciliar = useCallback(async () => {
    const id = temaRef.current;
    const [det, ini, pagina] = await Promise.all([
      fetchTemaForo(supabase, id),
      fetchInicialForo(supabase, id),
      fetchRespuestasForo(supabase, id, null, PAGINA),
    ]);
    if (temaRef.current !== id) return;
    if (det) setTema(det);
    if (ini) setInicial(ini);
    if (!pagina) return;
    setRespuestas((prev) => {
      const ultimoAntes = prev.length ? prev[prev.length - 1].id : 0;
      let siguiente: MensajeForo[];
      if (pagina.length < PAGINA) {
        siguiente = pagina; // toda la historia cabe en la página
      } else {
        const minimo = pagina[0].id;
        siguiente = [...prev.filter((m) => m.id < minimo), ...pagina];
      }
      const ultimoDespues = siguiente.length ? siguiente[siguiente.length - 1].id : 0;
      if (ultimoDespues > ultimoAntes && !alFinal()) {
        setPendientesNuevos((n) => n + siguiente.filter((m) => m.id > ultimoAntes).length);
      }
      return siguiente;
    });
  }, [supabase]);

  // --- Sondeo --------------------------------------------------------------------------------
  useEffect(() => {
    if (fase !== "ok") return;
    const base = estado?.publica ? SONDEO_PUBLICA_MS : SONDEO_PRIVADA_MS;
    let cancelado = false;
    let temporizador = 0;
    let ultimaNovedad = Date.now();
    let vueltas = 0;

    const vuelta = async () => {
      if (cancelado) return;
      if (document.visibilityState === "visible") {
        const antes = ultimoIdRef.current;
        vueltas++;
        if (vueltas % VUELTAS_PARA_RECONCILIAR === 0) await reconciliar();
        else await traerNuevas();
        if (ultimoIdRef.current > antes) ultimaNovedad = Date.now();
      }
      if (cancelado) return;
      const lento = Date.now() - ultimaNovedad > TRAS_INACTIVIDAD_MS;
      temporizador = window.setTimeout(vuelta, lento ? SONDEO_LENTO_MS : base);
    };
    temporizador = window.setTimeout(vuelta, base);

    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(temporizador);
      ultimaNovedad = Date.now();
      vuelta();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cancelado = true;
      window.clearTimeout(temporizador);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [fase, estado?.publica, traerNuevas, reconciliar]);

  async function cargarAnteriores() {
    if (cargandoMas || respuestas.length === 0) return;
    setCargandoMas(true);
    const pagina = await fetchRespuestasForo(supabase, temaId, respuestas[0].id, PAGINA);
    setCargandoMas(false);
    if (!pagina || temaRef.current !== temaId) return;
    setRespuestas((prev) => [...pagina.filter((m) => m.id < prev[0].id), ...prev]);
    setHayMas(pagina.length >= PAGINA);
  }

  // --- Menús ---------------------------------------------------------------------------------
  useEffect(() => {
    if (!menu) return;
    const cerrar = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-menu-mensaje]")) setMenu(null);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [menu]);

  // --- Permisos ------------------------------------------------------------------------------
  const baneadoHasta = estado?.baneadoHasta && new Date(estado.baneadoHasta) > new Date() ? estado.baneadoHasta : null;
  const sinNivel = estado ? !estado.nivelOk : false;
  const mod = estado?.moderador != null;
  const abierto = tema?.estado === "abierto" && !tema.eliminado;
  const puedeParticipar = Boolean(estado?.miembro) && !baneadoHasta && !sinNivel && abierto;
  const esAutorTema = Boolean(tema?.autorId) && tema?.autorId === miId;
  const puedeCerrarTema =
    Boolean(tema) && !tema?.eliminado && (mod || (esAutorTema && !(tema?.estado === "cerrado" && tema.cerradoPorMod)));
  const puedeFijar = mod && !tema?.eliminado;

  function puedeEditar(m: MensajeForo) {
    if (!estado || m.userId !== miId || !puedeParticipar) return false;
    return Date.now() - new Date(m.creado).getTime() < estado.minutosEdicion * 60_000;
  }

  // --- Acciones --------------------------------------------------------------------------------
  async function enviar() {
    if (enviando || !tema) return;
    const limpio = texto.trim();
    if (!limpio) return;
    setEnviando(true);
    const r = await responderForoDB(supabase, temaId, limpio, idsMencionados(limpio, menciones), cita?.id ?? null);
    setEnviando(false);
    if (r.ok) {
      setTexto("");
      setMenciones({});
      setCita(null);
      await traerNuevas();
      if (r.mencionesIgnoradas > 0) mostrarAviso(tf.mencionIgnorada);
      requestAnimationFrame(() => {
        finRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
        areaRef.current?.focus();
      });
      return;
    }
    mostrarAviso(textoError(tf, r, estado), true);
    if (r.codigo === "bloqueado" || r.codigo === "nivel" || r.codigo === "cerrado") {
      const [est, det] = await Promise.all([fetchEstadoForo(supabase, tema.ligaId), fetchTemaForo(supabase, temaId)]);
      if (est) setEstado(est);
      if (det) setTema(det);
    }
  }

  function reemplazar(id: number, f: (m: MensajeForo) => MensajeForo) {
    setInicial((m) => (m && m.id === id ? f(m) : m));
    setRespuestas((prev) => prev.map((m) => (m.id === id ? f(m) : m)));
  }

  async function reaccionar(m: MensajeForo, emoji: string | null) {
    const antes = m.mia;
    reemplazar(m.id, (x) => conReaccion(x, emoji));
    const r = await reaccionarForoDB(supabase, m.id, emoji);
    if (!r.ok) {
      reemplazar(m.id, (x) => conReaccion(x, antes));
      mostrarAviso(textoError(tf, r, estado), true);
    }
  }

  function empezarCita(m: MensajeForo) {
    setMenu(null);
    setCita(m);
    requestAnimationFrame(() => areaRef.current?.focus());
  }

  function empezarEdicion(m: MensajeForo) {
    setMenu(null);
    setEdicion({ id: m.id, texto: m.texto, menciones: m.menciones, guardando: false });
  }

  async function guardarEdicion() {
    if (!edicion || edicion.guardando) return;
    const limpio = edicion.texto.trim();
    if (!limpio) return;
    const original = inicial?.id === edicion.id ? inicial : respuestas.find((m) => m.id === edicion.id);
    if (original && limpio === original.texto) {
      setEdicion(null);
      return;
    }
    setEdicion({ ...edicion, guardando: true });
    const r = await editarForoDB(supabase, edicion.id, limpio, edicion.menciones);
    if (r.ok) {
      reemplazar(edicion.id, (m) => ({ ...m, texto: r.texto, editado: r.editado ?? m.editado }));
      setEdicion(null);
      if (r.cambio) mostrarAviso(tf.mensajeEditado);
      return;
    }
    setEdicion({ ...edicion, guardando: false });
    mostrarAviso(textoError(tf, r, estado, inicial?.id === edicion.id), true);
  }

  async function confirmarAccion() {
    if (!menu || !menu.confirmando) return;
    const { id, confirmando } = menu;
    setMenu(null);
    if (confirmando === "borrar") {
      const r = await borrarForoDB(supabase, id);
      if (!r.ok) {
        mostrarAviso(textoError(tf, r, estado), true);
        return;
      }
      if (inicial?.id === id) {
        if (r.temaBorrado) router.push("/chat/foros");
        else cargar();
        return;
      }
      setRespuestas((prev) => prev.filter((m) => m.id !== id));
      setTema((x) => (x ? { ...x, respuestas: Math.max(x.respuestas - 1, 0) } : x));
    } else {
      const r = await denunciarForoDB(supabase, id);
      if (r.ok) mostrarAviso(tf.denunciaEnviada);
      else mostrarAviso(tf.errorDenuncia[r.codigo as keyof typeof tf.errorDenuncia] ?? tf.errorDenuncia.red, true);
    }
  }

  async function cambiarCierre(cerrar: boolean) {
    setAccionTema(null);
    const r = await cerrarTemaForoDB(supabase, temaId, cerrar);
    if (!r.ok) {
      mostrarAviso(textoError(tf, r, estado), true);
      return;
    }
    const det = await fetchTemaForo(supabase, temaId);
    if (det) setTema(det);
  }

  async function cambiarFijado() {
    if (!tema) return;
    const r = await fijarTemaForoDB(supabase, temaId, !tema.fijado);
    if (!r.ok) {
      mostrarAviso(textoError(tf, r, estado), true);
      return;
    }
    setTema({ ...tema, fijado: !tema.fijado });
  }

  async function entendiNormas() {
    setEstado((e) => (e ? { ...e, normasVistas: true } : e));
    await marcarNormasForoVistasDB(supabase);
  }

  // --- Pintado ----------------------------------------------------------------------------------
  const fechaHoraDe = (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });

  function cabeceraAutor(m: MensajeForo, esInicial: boolean) {
    const mio = m.userId === miId;
    const delSistema = m.userId === null;
    return (
      <div className="flex min-w-0 items-center gap-2">
        {delSistema ? (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-950 text-base text-gold"
          >
            ♟
          </span>
        ) : (
          <AvatarPerfil avatar={m.avatar} nombre={m.nombre} tamano={32} />
        )}
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <span className="min-w-0 truncate font-semibold">{delSistema ? tf.sistema : mio ? tf.tu : m.nombre}</span>
            {!delSistema && <InsigniaNivel nivel={m.nivel} className="!px-1.5 !text-[9px]" />}
            {esInicial && !delSistema && (
              <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-accent">
                {tf.autor}
              </span>
            )}
          </p>
          <p className="text-[11px] text-neutral-500" title={fechaHoraDe(m.creado)}>
            {haceTiempo(m.creado, locale, t.avisos.ahoraMismo)}
            {m.editado && <span> · {tf.editado}</span>}
          </p>
        </div>
      </div>
    );
  }

  function menuMensaje(m: MensajeForo, esInicial: boolean) {
    const mio = m.userId === miId;
    const delSistema = m.userId === null;
    const puedeBorrar = (mio || mod) && !(delSistema && estado?.moderador !== "root");
    const puedeDenunciar = !mio && !delSistema && Boolean(estado?.miembro);
    const puedeCitar = !esInicial && puedeParticipar;
    const editable = puedeEditar(m) && !delSistema;
    if (!puedeBorrar && !puedeDenunciar && !puedeCitar && !editable) return null;
    const abiertoMenu = menu?.id === m.id;
    const claseItem =
      "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800";
    return (
      <div className="relative shrink-0" data-menu-mensaje>
        <button
          type="button"
          aria-label={tf.acciones}
          aria-expanded={abiertoMenu}
          onClick={() => setMenu(abiertoMenu ? null : { id: m.id, confirmando: null })}
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <Icono d={D_PUNTOS} className="h-4 w-4" />
        </button>
        {abiertoMenu && (
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          >
            {menu?.confirmando ? (
              <div className="p-2 text-xs">
                <p className="mb-2 font-medium">
                  {menu.confirmando === "borrar"
                    ? esInicial
                      ? tf.confirmarBorrarTema
                      : tf.confirmarBorrar
                    : tf.confirmarDenunciar}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmarAccion}
                    className="flex-1 rounded-lg bg-accent px-2 py-1.5 font-semibold text-white hover:bg-accent-hover"
                  >
                    {t.comun.aceptar}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenu(null)}
                    className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 font-medium dark:border-neutral-700"
                  >
                    {t.comun.cancelar}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {puedeCitar && (
                  <button type="button" role="menuitem" onClick={() => empezarCita(m)} className={claseItem}>
                    {tf.citar}
                  </button>
                )}
                {editable && (
                  <button type="button" role="menuitem" onClick={() => empezarEdicion(m)} className={claseItem}>
                    {tf.editar}
                  </button>
                )}
                {puedeDenunciar && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setMenu({ id: m.id, confirmando: "denunciar" })}
                    className={claseItem}
                  >
                    {tf.denunciar}
                  </button>
                )}
                {puedeBorrar && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setMenu({ id: m.id, confirmando: "borrar" })}
                    className={`${claseItem} text-negative`}
                  >
                    {tf.borrar}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  function cuerpoMensaje(m: MensajeForo, esInicial: boolean) {
    if (edicion?.id === m.id) {
      const maxEd = esInicial ? estado?.maxInicial ?? 600 : estado?.maxRespuesta ?? 300;
      return (
        <div className="flex w-full flex-col gap-1.5">
          <textarea
            autoFocus
            aria-label={tf.editando}
            value={edicion.texto}
            onChange={(e) => setEdicion({ ...edicion, texto: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEdicion(null);
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                guardarEdicion();
              }
            }}
            rows={3}
            maxLength={maxEd + 50}
            className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 focus:border-accent focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <div className="flex items-center justify-end gap-2 text-xs">
            <span className={edicion.texto.length > maxEd ? "text-negative" : "text-neutral-500"}>
              {edicion.texto.length}/{maxEd}
            </span>
            <button
              type="button"
              onClick={() => setEdicion(null)}
              className="rounded-lg border border-neutral-300 px-2.5 py-1 font-medium dark:border-neutral-700"
            >
              {t.comun.cancelar}
            </button>
            <button
              type="button"
              onClick={guardarEdicion}
              disabled={edicion.guardando || !edicion.texto.trim()}
              className="rounded-lg bg-accent px-2.5 py-1 font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {tf.guardarEdicion}
            </button>
          </div>
        </div>
      );
    }
    const delSistema = m.userId === null && esInicial && tema?.sistema;
    return (
      <>
        {m.citaId !== null && (
          <div className="mb-1.5 rounded-md border-l-4 border-accent/60 bg-neutral-100 px-2 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {m.citaTexto !== null ? (
              <>
                <span className="font-semibold">{m.citaNombre}</span>
                {": "}
                <span className="break-words">{m.citaTexto}</span>
              </>
            ) : (
              <span className="italic">{tf.mensajeEliminado}</span>
            )}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-snug">
          {delSistema ? tf.jornadaIntro(tema?.jornada ?? null) : resaltarMenciones(m.texto, m.mencionesNombres)}
        </p>
      </>
    );
  }

  const puedeReaccionar = puedeParticipar;

  function tarjeta(m: MensajeForo, esInicial: boolean) {
    const mio = m.userId === miId;
    const meMencionan = !mio && miId !== "" && m.menciones.includes(miId);
    return (
      <li
        key={m.id}
        className={`rounded-2xl border bg-white p-3 dark:bg-neutral-900 ${
          esInicial ? "border-accent/60" : "border-neutral-200 dark:border-neutral-800"
        } ${meMencionan ? "ring-2 ring-gold" : ""}`}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          {cabeceraAutor(m, esInicial)}
          {menuMensaje(m, esInicial)}
        </div>
        {meMencionan && <span className="sr-only">{tf.mencionTuya}. </span>}
        {cuerpoMensaje(m, esInicial)}
        <Reacciones
          className="mt-2"
          conteos={m.reacciones}
          mia={m.mia}
          puedeReaccionar={puedeReaccionar}
          onReaccionar={(e) => reaccionar(m, e)}
        />
        {esInicial && tema?.encuesta && (
          <EncuestaTema
            temaId={temaId}
            encuesta={tema.encuesta}
            estado={estado}
            puedeVotar={puedeParticipar}
            puedeCerrar={esAutorTema || mod}
            onCambio={(e: EncuestaForo | null) => setTema((x) => (x ? { ...x, encuesta: e } : x))}
          />
        )}
      </li>
    );
  }

  if (fase === "cargando") return <p className="text-sm text-neutral-500">{tf.cargandoTema}</p>;
  if (fase === "error" || !tema || !estado) {
    return (
      <div className="py-8 text-center text-sm">
        <p className="text-negative">{tf.errorTema}</p>
        <div className="mt-3 flex justify-center gap-4">
          <button type="button" onClick={cargar} className="font-medium text-accent">
            {tf.reintentar}
          </button>
          <Link href="/chat/foros" className="font-medium text-accent">
            ‹ {tf.volver}
          </Link>
        </div>
      </div>
    );
  }

  const titulo = tituloTema(tf, tema);

  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Link href="/chat/foros" className="text-sm font-medium text-accent hover:underline">
          ‹ {tf.volver}
        </Link>
        <span className="text-xs text-neutral-500">{tf.respuestas(tema.respuestas)}</span>
      </div>

      <div>
        <h2 className={`break-words font-display text-xl font-semibold ${tema.eliminado ? "italic text-neutral-500" : ""}`}>
          {tema.fijado && <span aria-hidden="true">📌 </span>}
          {titulo}
        </h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          {tema.fijado && (
            <span className="rounded-full bg-gold/25 px-2 py-0.5 font-semibold text-gold-dark dark:text-gold">{tf.fijado}</span>
          )}
          {tema.sistema && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              {tf.automatico}
            </span>
          )}
          {tema.estado === "cerrado" && !tema.eliminado && (
            <span className="rounded-full bg-neutral-200 px-2 py-0.5 font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {tf.cerradoEtiqueta}
            </span>
          )}
          {!tema.eliminado && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent">
              {tf.categorias[tema.categoria]}
            </span>
          )}
        </div>
      </div>

      {(puedeCerrarTema || puedeFijar) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {puedeFijar && (
            <button
              type="button"
              onClick={cambiarFijado}
              className="rounded-lg border border-neutral-300 px-2.5 py-1.5 font-medium hover:border-accent hover:text-accent dark:border-neutral-700"
            >
              {tema.fijado ? tf.desfijarTema : tf.fijarTema}
            </button>
          )}
          {puedeCerrarTema &&
            (tema.estado === "cerrado" ? (
              <button
                type="button"
                onClick={() => cambiarCierre(false)}
                className="rounded-lg border border-neutral-300 px-2.5 py-1.5 font-medium hover:border-accent hover:text-accent dark:border-neutral-700"
              >
                {tf.reabrirTema}
              </button>
            ) : accionTema === "cerrar" ? (
              <span className="flex items-center gap-2 rounded-lg bg-neutral-100 px-2.5 py-1.5 dark:bg-neutral-800">
                <span>{tf.confirmarCerrar}</span>
                <button type="button" onClick={() => cambiarCierre(true)} className="font-semibold text-accent">
                  {t.comun.aceptar}
                </button>
                <button type="button" onClick={() => setAccionTema(null)} className="font-medium">
                  {t.comun.cancelar}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAccionTema("cerrar")}
                className="rounded-lg border border-neutral-300 px-2.5 py-1.5 font-medium hover:border-accent hover:text-accent dark:border-neutral-700"
              >
                {tf.cerrarTema}
              </button>
            ))}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {inicial && tarjeta(inicial, true)}
        {!inicial && tema.eliminado && (
          <li className="rounded-2xl border border-dashed border-neutral-300 p-3 text-sm italic text-neutral-500 dark:border-neutral-700">
            {tf.mensajeEliminado}
          </li>
        )}
        {hayMas && (
          <li className="text-center">
            <button
              type="button"
              onClick={cargarAnteriores}
              disabled={cargandoMas}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500 hover:border-accent hover:text-accent disabled:opacity-50 dark:border-neutral-700"
            >
              {cargandoMas ? tf.cargandoAnteriores : tf.verAnteriores}
            </button>
          </li>
        )}
        {respuestas.length === 0 && !tema.eliminado && (
          <li className="py-4 text-center text-sm text-neutral-500">{tf.sinRespuestas}</li>
        )}
        {respuestas.map((m) => tarjeta(m, false))}
      </ul>

      {pendientesNuevos > 0 && (
        <button
          type="button"
          onClick={() => {
            finRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
            setPendientesNuevos(0);
          }}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-accent-hover sm:bottom-6"
        >
          <Icono d={D_FLECHA_ABAJO} className="h-3.5 w-3.5" />
          {tf.nuevasRespuestas(pendientesNuevos)}
        </button>
      )}

      <div ref={finRef} className="rounded-2xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
        {aviso && (
          <p
            role="status"
            className={`mb-2 rounded-lg px-3 py-1.5 text-xs ${
              aviso.error
                ? "bg-red-50 text-negative dark:bg-red-950/40 dark:text-red-300"
                : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}
          >
            {aviso.texto}
          </p>
        )}

        {!estado.miembro ? (
          <p className="px-1 py-2 text-center text-xs text-neutral-500">{tf.soloLectura}</p>
        ) : baneadoHasta ? (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-negative dark:bg-red-950/40 dark:text-red-300">
            <p className="font-medium">{tf.baneado(fechaHoraDe(baneadoHasta))}</p>
            {estado.baneoMotivo && <p className="mt-0.5 text-xs">{tf.baneoMotivo(estado.baneoMotivo)}</p>}
          </div>
        ) : sinNivel ? (
          <p className="px-1 py-2 text-center text-sm text-neutral-500">{tf.nivelBloqueo(estado.nivelMinimo)}</p>
        ) : !abierto ? (
          <p className="px-1 py-2 text-center text-sm text-neutral-500">{tf.temaCerradoAviso}</p>
        ) : !estado.normasVistas ? (
          <div className="rounded-xl bg-accent/5 p-3 ring-1 ring-accent/30">
            <p className="font-display text-base font-semibold text-accent">{tf.normasTitulo}</p>
            <p className="mt-1 text-sm leading-snug">{tf.normasTexto}</p>
            <button
              type="button"
              onClick={entendiNormas}
              className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              {tf.normasEntendido}
            </button>
          </div>
        ) : (
          <div>
            {cita && (
              <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border-l-4 border-accent/60 bg-neutral-100 px-2 py-1.5 text-xs dark:bg-neutral-800">
                <div className="min-w-0">
                  <p className="font-semibold">{tf.citando(cita.nombre)}</p>
                  <p className="truncate text-neutral-500">{cita.texto}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCita(null)}
                  aria-label={tf.quitarCita}
                  className="shrink-0 rounded-full px-1.5 text-base leading-none text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                >
                  ×
                </button>
              </div>
            )}
            <EditorTexto
              ligaId={tema.ligaId}
              esPublica={estado.publica}
              valor={texto}
              onCambiar={setTexto}
              menciones={menciones}
              onMenciones={setMenciones}
              max={estado.maxRespuesta}
              placeholder={tf.placeholder}
              areaRef={areaRef}
              onEnviar={enviar}
              acciones={
                <button
                  type="button"
                  onClick={enviar}
                  disabled={enviando || texto.trim().length === 0}
                  aria-label={tf.enviar}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
                >
                  <Icono d={D_ENVIAR} />
                </button>
              }
            />
            <p className="mt-1.5 flex justify-between gap-3 px-1 text-[11px] text-neutral-500">
              <span className="min-w-0 truncate">{tf.pistaTema}</span>
              <span className={`shrink-0 tabular-nums ${texto.length >= estado.maxRespuesta ? "font-semibold text-negative" : ""}`}>
                {texto.length}/{estado.maxRespuesta}
              </span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
