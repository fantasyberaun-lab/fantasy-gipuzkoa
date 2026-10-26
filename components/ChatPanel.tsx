"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useGameState } from "@/components/GameStateProvider";
import { useChat } from "@/components/ChatProvider";
import { useIdioma } from "@/components/IdiomaProvider";
import AvatarPerfil from "@/components/AvatarPerfil";
import InsigniaNivel from "@/components/InsigniaNivel";
import Reacciones, { BotonReaccion } from "@/components/Reacciones";
import {
  borrarMensajeChatDB,
  buscarManagersChat,
  denunciarMensajeChatDB,
  enviarMensajeChat,
  fetchEstadoChat,
  fetchMensajesChat,
  fetchMensajesNuevos,
  fetchNovedadesChat,
  editarMensajeChat,
  marcarChatLeidoDB,
  marcarNormasChatVistasDB,
  silenciarChatPublicoDB,
  type EstadoChat,
  type ManagerMencionable,
  type MensajeChat,
} from "@/lib/supabase/chatQueries";
import { fetchReaccionesChat, reaccionarChatDB, type ReaccionesMensaje } from "@/lib/supabase/foroQueries";

// Sondeo (sin Realtime, ver ChatProvider): cada pocos segundos con el chat abierto
// y la pestaña visible; más despacio si lleva un rato sin novedades.
const SONDEO_PRIVADA_MS = 8_000;
const SONDEO_PUBLICA_MS = 10_000;
const SONDEO_LENTO_MS = 30_000;
const TRAS_INACTIVIDAD_MS = 3 * 60_000;
// Cada tantas vueltas se vuelve a pedir la última página para que desaparezcan los
// mensajes que han borrado otros (el sondeo normal solo trae los nuevos).
const VUELTAS_PARA_RECONCILIAR = 12;
// Cada tantas vueltas se vuelven a pedir las reacciones de los mensajes en pantalla (0112).
const VUELTAS_PARA_REACCIONES = 3;
const PAGINA = 40;
// Ids de mensajes borrados ya aplicados (0090): cursor por liga.
type CursorBorrados = { liga: string | null; seq: number | null };
const AGRUPAR_MS = 5 * 60_000;

const EMOJIS = [
  "😀", "😂", "😅", "🙂", "😉", "😍", "🤔", "😮", "😢", "😡", "😎", "🥲",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "👀", "🤞", "🎉", "🔥", "🏆", "❤️",
  "♟️", "♞", "♝", "♜", "♛", "♚", "⏱️", "💀",
];

const D_ENVIAR = "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5";
const D_EMOJI =
  "M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z";
const D_PUNTOS = "M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z";
const D_FLECHA_ABAJO = "M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3";

function Icono({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function escaparRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pinta el texto resaltando "@alias" de quienes están mencionados en el mensaje.
function resaltar(texto: string, nombres: string[]): ReactNode {
  const lista = Array.from(new Set(nombres.filter(Boolean))).sort((a, b) => b.length - a.length);
  if (lista.length === 0) return texto;
  const re = new RegExp(`(@(?:${lista.map(escaparRegex).join("|")}))(?![\\p{L}\\p{N}_])`, "giu");
  return texto.split(re).map((trozo, i) =>
    i % 2 === 1 ? (
      <span key={i} className="rounded bg-gold/35 px-0.5 font-semibold text-neutral-900 dark:text-white">
        {trozo}
      </span>
    ) : (
      <Fragment key={i}>{trozo}</Fragment>
    )
  );
}

function mismoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// El menú se pinta con position:fixed junto al botón (arriba o abajo según el sitio que
// haya), para que no lo recorte la lista de mensajes con scroll.
type PosMenu = { left: number; top?: number; bottom?: number };
type MenuMensaje = { id: number; confirmando: "borrar" | "denunciar" | null; pos: PosMenu };
type Edicion = { id: number; texto: string; menciones: string[]; guardando: boolean };

const ANCHO_MENU = 176;
const ALTO_MENU = 132;

function posicionMenu(boton: HTMLElement): PosMenu {
  const r = boton.getBoundingClientRect();
  const left = Math.max(8, Math.min(r.right - ANCHO_MENU, window.innerWidth - ANCHO_MENU - 8));
  const cabeAbajo = r.bottom + 4 + ALTO_MENU <= window.innerHeight - 8;
  return cabeAbajo ? { left, top: r.bottom + 4 } : { left, bottom: window.innerHeight - r.top + 4 };
}

export default function ChatPanel() {
  const supabase = useMemo(() => createClient(), []);
  const { t, locale } = useIdioma();
  const tc = t.chat;
  const { equipo, misLigas, cargando, esLigaPublica } = useGameState();
  const { marcarLeidoLocal, refrescar } = useChat();
  const ligaId = equipo.leagueId;
  const ligaNombre = misLigas.find((l) => l.ligaId === ligaId)?.nombre ?? "";

  const [miId, setMiId] = useState("");
  const [estado, setEstado] = useState<EstadoChat | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [fase, setFase] = useState<"cargando" | "ok" | "error">("cargando");
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [pendientesNuevos, setPendientesNuevos] = useState(0);

  const [texto, setTexto] = useState("");
  const [menciones, setMenciones] = useState<Record<string, string>>({}); // id -> alias
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);
  const [emojisAbiertos, setEmojisAbiertos] = useState(false);
  const [menu, setMenu] = useState<MenuMensaje | null>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  // Reacciones por mensaje (0112). Si la migración aún no está aplicada, el chat sigue
  // igual y no se enseña el botón de reaccionar.
  const [reacciones, setReacciones] = useState<Record<number, ReaccionesMensaje>>({});
  const [reaccionesOk, setReaccionesOk] = useState(false);

  // Selector de @
  const [consulta, setConsulta] = useState<{ inicio: number; texto: string } | null>(null);
  const [candidatos, setCandidatos] = useState<ManagerMencionable[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [indiceCandidato, setIndiceCandidato] = useState(0);

  const listaRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const pegarAbajo = useRef(true);
  const ultimoIdRef = useRef(0);
  const ligaRef = useRef(ligaId);
  const borradosRef = useRef<CursorBorrados>({ liga: null, seq: null });
  const alturaAntes = useRef<number | null>(null);
  const forzarBajar = useRef(false);
  const idsRef = useRef<number[]>([]);

  ligaRef.current = ligaId;
  const ultimoId = mensajes.length ? mensajes[mensajes.length - 1].id : 0;
  ultimoIdRef.current = ultimoId;
  idsRef.current = mensajes.map((m) => m.id);

  // Mi id, para saber qué mensajes son míos.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMiId(data.session?.user.id ?? ""));
  }, [supabase]);

  const bajarAlFinal = useCallback((suave = false) => {
    const el = listaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: suave ? "smooth" : "auto" });
    pegarAbajo.current = true;
    setPendientesNuevos(0);
  }, []);

  function mostrarAviso(texto: string, error = false) {
    setAviso({ texto, error });
    window.setTimeout(() => setAviso((a) => (a?.texto === texto ? null : a)), 4500);
  }

  // --- Carga inicial (y al cambiar de liga) ------------------------------------------
  const cargarTodo = useCallback(async () => {
    if (!ligaId) return;
    setFase("cargando");
    setMensajes([]);
    setHayMas(false);
    setPendientesNuevos(0);
    const [est, msgs] = await Promise.all([
      fetchEstadoChat(supabase, ligaId),
      fetchMensajesChat(supabase, ligaId, null, PAGINA),
    ]);
    if (ligaRef.current !== ligaId) return;
    if (!est || !msgs) {
      setFase("error");
      return;
    }
    setEstado(est);
    setMensajes(msgs);
    setHayMas(msgs.length >= PAGINA);
    forzarBajar.current = true;
    setFase("ok");
  }, [supabase, ligaId]);

  useEffect(() => {
    if (cargando || !ligaId) return;
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, ligaId]);

  // Tras pintar: bajar al final (carga inicial, mensaje propio o ya estaba abajo) o
  // conservar la posición al cargar mensajes anteriores por arriba.
  useLayoutEffect(() => {
    const el = listaRef.current;
    if (!el) return;
    if (alturaAntes.current !== null) {
      el.scrollTop += el.scrollHeight - alturaAntes.current;
      alturaAntes.current = null;
      return;
    }
    if (forzarBajar.current || pegarAbajo.current) {
      forzarBajar.current = false;
      el.scrollTop = el.scrollHeight;
    }
  }, [mensajes, fase]);

  // Lo que ve en pantalla ya está leído.
  useEffect(() => {
    if (!ligaId || ultimoId === 0 || document.visibilityState !== "visible") return;
    marcarChatLeidoDB(supabase, ligaId, ultimoId);
    marcarLeidoLocal(ultimoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultimoId, ligaId]);

  const añadirNuevos = useCallback((nuevos: MensajeChat[]) => {
    setMensajes((prev) => {
      const ultimo = prev.length ? prev[prev.length - 1].id : 0;
      const utiles = nuevos.filter((m) => m.id > ultimo);
      if (utiles.length === 0) return prev;
      if (!pegarAbajo.current) {
        setPendientesNuevos((n) => n + utiles.length);
      }
      return [...prev, ...utiles];
    });
  }, []);

  const traerNuevos = useCallback(async () => {
    const liga = ligaRef.current;
    if (!liga) return;
    const cursor = borradosRef.current.liga === liga ? borradosRef.current.seq : null;
    const r = await fetchNovedadesChat(supabase, liga, ultimoIdRef.current, cursor);
    if (ligaRef.current !== liga) return;
    if (!r) {
      // Sin la migración 0090 (o con un fallo puntual): el sondeo de siempre.
      const nuevos = await fetchMensajesNuevos(supabase, liga, ultimoIdRef.current);
      if (ligaRef.current === liga && nuevos?.length) añadirNuevos(nuevos);
      return;
    }
    borradosRef.current = { liga, seq: r.seq };
    if (r.borrados.length) {
      const fuera = new Set(r.borrados);
      setMensajes((prev) => (prev.some((m) => fuera.has(m.id)) ? prev.filter((m) => !fuera.has(m.id)) : prev));
    }
    if (r.editados.length) {
      const porId = new Map(r.editados.map((m) => [m.id, m]));
      setMensajes((prev) => prev.map((m) => porId.get(m.id) ?? m));
    }
    if (r.nuevos.length) añadirNuevos(r.nuevos);
  }, [supabase, añadirNuevos]);

  const reconciliar = useCallback(async () => {
    const liga = ligaRef.current;
    if (!liga) return;
    const pagina = await fetchMensajesChat(supabase, liga, null, PAGINA);
    if (ligaRef.current !== liga || !pagina) return;
    setMensajes((prev) => {
      const ultimoAntes = prev.length ? prev[prev.length - 1].id : 0;
      let siguiente: MensajeChat[];
      if (pagina.length < PAGINA) {
        siguiente = pagina; // toda la historia cabe en la página
      } else {
        const minimo = pagina[0].id;
        siguiente = [...prev.filter((m) => m.id < minimo), ...pagina];
      }
      const ultimoDespues = siguiente.length ? siguiente[siguiente.length - 1].id : 0;
      if (ultimoDespues > ultimoAntes && !pegarAbajo.current) {
        setPendientesNuevos((n) => n + siguiente.filter((m) => m.id > ultimoAntes).length);
      }
      return siguiente;
    });
  }, [supabase]);

  // --- Reacciones --------------------------------------------------------------------------
  const cargarReacciones = useCallback(async () => {
    const liga = ligaRef.current;
    const ids = idsRef.current;
    if (!liga || ids.length === 0) return;
    const r = await fetchReaccionesChat(supabase, liga, ids);
    if (ligaRef.current !== liga) return;
    if (!r) {
      setReaccionesOk(false);
      return;
    }
    setReaccionesOk(true);
    setReacciones(Object.fromEntries(r));
  }, [supabase]);

  // Al cargar la página y cada vez que llegan o se borran mensajes.
  useEffect(() => {
    if (fase !== "ok") return;
    cargarReacciones();
  }, [fase, ligaId, mensajes.length, ultimoId, cargarReacciones]);

  async function reaccionar(id: number, emoji: string | null) {
    const antes = reacciones[id] ?? { conteos: {}, mia: null };
    const conteos = { ...antes.conteos };
    if (antes.mia) {
      conteos[antes.mia] = Math.max((conteos[antes.mia] ?? 1) - 1, 0);
      if (conteos[antes.mia] === 0) delete conteos[antes.mia];
    }
    if (emoji) conteos[emoji] = (conteos[emoji] ?? 0) + 1;
    setReacciones((prev) => ({ ...prev, [id]: { conteos, mia: emoji } }));
    const r = await reaccionarChatDB(supabase, id, emoji);
    if (!r.ok) {
      setReacciones((prev) => ({ ...prev, [id]: antes }));
      mostrarAviso(t.foros.errores[r.codigo as keyof typeof t.foros.errores] ?? t.foros.errores.red, true);
    }
  }

  // --- Sondeo ---------------------------------------------------------------------------
  useEffect(() => {
    if (!ligaId || fase !== "ok") return;
    const base = esLigaPublica ? SONDEO_PUBLICA_MS : SONDEO_PRIVADA_MS;
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
        else await traerNuevos();
        if (vueltas % VUELTAS_PARA_REACCIONES === 0) await cargarReacciones();
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
  }, [ligaId, fase, esLigaPublica, traerNuevos, reconciliar, cargarReacciones]);

  function alDesplazar() {
    const el = listaRef.current;
    if (!el) return;
    const cerca = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    pegarAbajo.current = cerca;
    if (cerca) setPendientesNuevos(0);
  }

  async function cargarAnteriores() {
    if (!ligaId || cargandoMas || mensajes.length === 0) return;
    setCargandoMas(true);
    const antes = mensajes[0].id;
    const pagina = await fetchMensajesChat(supabase, ligaId, antes, PAGINA);
    setCargandoMas(false);
    if (!pagina || ligaRef.current !== ligaId) return;
    alturaAntes.current = listaRef.current?.scrollHeight ?? null;
    setMensajes((prev) => [...pagina.filter((m) => m.id < prev[0].id), ...prev]);
    setHayMas(pagina.length >= PAGINA);
  }

  // --- Selector de @ ---------------------------------------------------------------------
  useEffect(() => {
    if (!consulta || !ligaId) {
      setCandidatos([]);
      setBuscando(false);
      return;
    }
    // En la pública hace falta al menos una letra (no se lista a toda la liga).
    if (esLigaPublica && consulta.texto.length === 0) {
      setCandidatos([]);
      setBuscando(false);
      return;
    }
    let vigente = true;
    setBuscando(true);
    const espera = window.setTimeout(async () => {
      const r = await buscarManagersChat(supabase, ligaId, consulta.texto);
      if (!vigente) return;
      setCandidatos(r);
      setIndiceCandidato(0);
      setBuscando(false);
    }, 150);
    return () => {
      vigente = false;
      window.clearTimeout(espera);
    };
  }, [consulta, ligaId, esLigaPublica, supabase]);

  function detectarConsulta(valor: string, cursor: number) {
    const m = /(?:^|\s)@([^\s@]{0,24})$/.exec(valor.slice(0, cursor));
    setConsulta(m ? { inicio: cursor - m[1].length - 1, texto: m[1] } : null);
  }

  function elegirCandidato(c: ManagerMencionable) {
    const area = areaRef.current;
    if (!consulta || !area) return;
    const cursor = area.selectionStart ?? texto.length;
    const nuevo = `${texto.slice(0, consulta.inicio)}@${c.nombre} ${texto.slice(cursor)}`;
    const posicion = consulta.inicio + c.nombre.length + 2;
    setTexto(nuevo);
    setMenciones((m) => ({ ...m, [c.userId]: c.nombre }));
    setConsulta(null);
    setCandidatos([]);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(posicion, posicion);
    });
  }

  function insertarEmoji(e: string) {
    const area = areaRef.current;
    const max = estado?.maxCaracteres ?? 300;
    const ini = area?.selectionStart ?? texto.length;
    const fin = area?.selectionEnd ?? texto.length;
    const nuevo = texto.slice(0, ini) + e + texto.slice(fin);
    if (nuevo.length > max) return;
    setTexto(nuevo);
    requestAnimationFrame(() => {
      if (!area) return;
      area.focus();
      area.setSelectionRange(ini + e.length, ini + e.length);
    });
  }

  function ajustarAltura() {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 96)}px`;
  }

  useEffect(ajustarAltura, [texto]);

  // --- Enviar ----------------------------------------------------------------------------
  async function enviar() {
    if (!ligaId || enviando) return;
    const limpio = texto.trim();
    if (!limpio) return;
    setEnviando(true);
    // Solo viajan los mencionados cuyo "@alias" sigue en el texto.
    const minusculas = limpio.toLowerCase();
    const ids = Object.entries(menciones)
      .filter(([, nombre]) => minusculas.includes(`@${nombre.toLowerCase()}`))
      .map(([id]) => id);
    const r = await enviarMensajeChat(supabase, ligaId, limpio, ids);
    setEnviando(false);

    if (r.ok) {
      setTexto("");
      setMenciones({});
      setConsulta(null);
      setEmojisAbiertos(false);
      forzarBajar.current = true;
      pegarAbajo.current = true;
      await traerNuevos();
      if (r.mencionesIgnoradas > 0) mostrarAviso(tc.mencionIgnorada);
      requestAnimationFrame(() => areaRef.current?.focus());
      return;
    }

    if (r.codigo === "larga") mostrarAviso(tc.errorLarga(r.maximo ?? estado?.maxCaracteres ?? 300), true);
    else mostrarAviso(tc.errores[r.codigo] ?? tc.errores.red, true);
    // Si el servidor dice que estamos baneados o sin nivel, se refleja en el panel.
    if (r.codigo === "bloqueado" || r.codigo === "nivel") {
      const est = await fetchEstadoChat(supabase, ligaId);
      if (est) setEstado(est);
    }
  }

  function alTeclear(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (candidatos.length > 0 && consulta) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndiceCandidato((i) => (i + 1) % candidatos.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndiceCandidato((i) => (i - 1 + candidatos.length) % candidatos.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        elegirCandidato(candidatos[indiceCandidato]);
        return;
      }
    }
    if (e.key === "Escape") {
      setConsulta(null);
      setEmojisAbiertos(false);
      return;
    }
    // Enter envía (en el móvil, la tecla de enviar del teclado también).
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      enviar();
    }
  }

  // --- Acciones sobre mensajes -------------------------------------------------------------
  useEffect(() => {
    if (!menu) return;
    const cerrar = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-menu-mensaje]")) setMenu(null);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const cerrar = () => setMenu(null);
    window.addEventListener("resize", cerrar);
    window.addEventListener("scroll", cerrar, true);
    return () => {
      window.removeEventListener("resize", cerrar);
      window.removeEventListener("scroll", cerrar, true);
    };
  }, [menu]);

  function puedeEditarMsg(m: MensajeChat) {
    if (!estado?.miembro || estado.baneadoHasta && new Date(estado.baneadoHasta) > new Date()) return false;
    return Date.now() - new Date(m.creado).getTime() < estado.minutosEdicion * 60_000;
  }

  function empezarEdicion(m: MensajeChat) {
    setMenu(null);
    setEdicion({ id: m.id, texto: m.texto, menciones: m.menciones, guardando: false });
  }

  async function guardarEdicion() {
    if (!edicion || edicion.guardando) return;
    const limpio = edicion.texto.trim();
    if (!limpio) return;
    const original = mensajes.find((m) => m.id === edicion.id);
    if (original && limpio === original.texto) {
      setEdicion(null);
      return;
    }
    setEdicion({ ...edicion, guardando: true });
    const r = await editarMensajeChat(supabase, edicion.id, limpio, edicion.menciones);
    if (r.ok) {
      setMensajes((prev) =>
        prev.map((m) => (m.id === edicion.id ? { ...m, texto: r.texto, editado: r.editado ?? m.editado } : m))
      );
      setEdicion(null);
      if (r.cambio) mostrarAviso(tc.mensajeEditado);
      return;
    }
    setEdicion({ ...edicion, guardando: false });
    if (r.codigo === "larga") mostrarAviso(tc.errorLarga(r.maximo ?? estado?.maxCaracteres ?? 300), true);
    else if (r.codigo === "plazo") mostrarAviso(tc.errorEditarPlazo(r.minutos ?? estado?.minutosEdicion ?? 30), true);
    else mostrarAviso(tc.errores[r.codigo] ?? tc.errores.red, true);
  }

  async function confirmarAccion() {
    if (!menu || !menu.confirmando) return;
    const { id, confirmando } = menu;
    setMenu(null);
    if (confirmando === "borrar") {
      const ok = await borrarMensajeChatDB(supabase, id);
      if (ok) setMensajes((prev) => prev.filter((m) => m.id !== id));
      else mostrarAviso(tc.errorBorrar, true);
    } else {
      const r = await denunciarMensajeChatDB(supabase, id);
      if (r.ok) mostrarAviso(tc.denunciaEnviada);
      else mostrarAviso(tc.errorDenuncia[r.codigo] ?? tc.errorDenuncia.red, true);
    }
  }

  async function alternarSilencio() {
    if (!estado) return;
    const nuevo = !estado.silenciadoPublico;
    setEstado({ ...estado, silenciadoPublico: nuevo });
    const ok = await silenciarChatPublicoDB(supabase, nuevo);
    if (!ok) setEstado((e) => (e ? { ...e, silenciadoPublico: !nuevo } : e));
    else refrescar();
  }

  async function entendiNormas() {
    setEstado((e) => (e ? { ...e, normasVistas: true } : e));
    await marcarNormasChatVistasDB(supabase);
  }

  // --- Pintado ---------------------------------------------------------------------------------
  const horaDe = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const fechaHoraDe = (iso: string) =>
    new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const etiquetaDia = (d: Date) => {
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);
    if (mismoDia(d, hoy)) return tc.hoy;
    if (mismoDia(d, ayer)) return tc.ayer;
    return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  };

  if (cargando) {
    return <p className="text-sm text-neutral-500">{tc.cargando}</p>;
  }
  if (!ligaId) {
    return <p className="text-sm text-neutral-500">{tc.sinLiga}</p>;
  }

  const max = estado?.maxCaracteres ?? 300;
  const puedeEscribir = Boolean(estado?.miembro);
  const baneadoHasta = estado?.baneadoHasta && new Date(estado.baneadoHasta) > new Date() ? estado.baneadoHasta : null;
  const sinNivel = estado ? !estado.nivelOk : false;
  const titulo = esLigaPublica ? tc.chatPublico : tc.chatDe(ligaNombre);
  const cuenta = texto.length;

  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="min-w-0 truncate font-display text-xl font-semibold">{titulo}</h2>
        {estado && (
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-neutral-500" title={tc.silenciarAyuda}>
            <span>{esLigaPublica ? tc.silenciar : tc.silenciarDesdePrivada}</span>
            <button
              type="button"
              role="switch"
              aria-checked={estado.silenciadoPublico}
              onClick={alternarSilencio}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                estado.silenciadoPublico ? "bg-accent" : "bg-neutral-300 dark:bg-neutral-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                  estado.silenciadoPublico ? "left-[1.1rem]" : "left-0.5"
                }`}
              />
            </button>
          </label>
        )}
      </div>

      {esLigaPublica && estado?.silenciadoPublico && (
        <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {tc.silenciadoAviso}
        </p>
      )}

      <div className="relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {/* Mensajes. Sin overscroll-contain a propósito: al llegar al final de la
            lista, seguir deslizando mueve la página y así se baja hasta la caja de
            escribir sin tener que tocar fuera de los mensajes (móvil). */}
        <div
          ref={listaRef}
          onScroll={alDesplazar}
          className="h-[52dvh] min-h-[18rem] overflow-y-auto px-3 py-3 sm:h-[26rem]"
        >
          {fase === "cargando" && <p className="py-8 text-center text-sm text-neutral-500">{tc.cargando}</p>}
          {fase === "error" && (
            <div className="py-8 text-center text-sm">
              <p className="text-negative">{tc.errorCarga}</p>
              <button type="button" onClick={cargarTodo} className="mt-2 font-medium text-accent">
                {tc.reintentar}
              </button>
            </div>
          )}
          {fase === "ok" && (
            <>
              {hayMas && (
                <div className="mb-3 text-center">
                  <button
                    type="button"
                    onClick={cargarAnteriores}
                    disabled={cargandoMas}
                    className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500 hover:border-accent hover:text-accent disabled:opacity-50 dark:border-neutral-700"
                  >
                    {cargandoMas ? tc.cargandoAnteriores : tc.verAnteriores}
                  </button>
                </div>
              )}
              {mensajes.length === 0 && (
                <p className="py-10 text-center text-sm text-neutral-500">{tc.vacio}</p>
              )}
              <ul className="flex flex-col">
                {mensajes.map((m, i) => {
                  const prev = mensajes[i - 1];
                  const fecha = new Date(m.creado);
                  const nuevoDia = !prev || !mismoDia(new Date(prev.creado), fecha);
                  const agrupado =
                    !nuevoDia &&
                    prev.userId === m.userId &&
                    fecha.getTime() - new Date(prev.creado).getTime() < AGRUPAR_MS;
                  const mio = m.userId === miId;
                  const meMencionan = !mio && miId !== "" && m.menciones.includes(miId);
                  const puedeBorrar = mio || estado?.moderador !== null;
                  const puedeDenunciar = !mio && Boolean(estado?.miembro);
                  const puedeEditar = mio && puedeEditarMsg(m);
                  const hayAcciones = puedeBorrar || puedeDenunciar || puedeEditar;
                  const abierto = menu?.id === m.id;

                  return (
                    <Fragment key={m.id}>
                      {nuevoDia && (
                        <li className="my-3 flex justify-center first:mt-0" aria-hidden="true">
                          <span className="rounded-full bg-neutral-100 px-3 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800">
                            {etiquetaDia(fecha)}
                          </span>
                        </li>
                      )}
                      <li className={`group flex gap-2 ${agrupado ? "mt-0.5" : "mt-3 first:mt-0"} ${mio ? "flex-row-reverse" : ""}`}>
                        {!mio && (
                          <div className="w-8 shrink-0 pt-0.5">
                            {!agrupado && <AvatarPerfil avatar={m.avatar} nombre={m.nombre} tamano={32} />}
                          </div>
                        )}
                        <div className={`flex min-w-0 max-w-[85%] flex-col ${mio ? "items-end" : "items-start"}`}>
                          {!agrupado && (
                            <p className={`mb-0.5 flex min-w-0 items-center gap-1.5 text-[11px] ${mio ? "flex-row-reverse" : ""}`}>
                              <span className="min-w-0 truncate font-semibold text-neutral-800 dark:text-neutral-100">
                                {mio ? tc.tu : m.nombre}
                              </span>
                              <InsigniaNivel nivel={m.nivel} className="!px-1.5 !text-[9px]" />
                              <span className="shrink-0 text-neutral-500">{horaDe(m.creado)}</span>
                            </p>
                          )}
                          <div className={`flex min-w-0 items-start gap-1 ${mio ? "flex-row-reverse" : ""}`}>
                            {edicion?.id === m.id ? (
                              <div className="flex w-full min-w-[min(16rem,70vw)] flex-col gap-1.5">
                                <textarea
                                  autoFocus
                                  aria-label={tc.editando}
                                  value={edicion.texto}
                                  onChange={(e) => setEdicion({ ...edicion, texto: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") setEdicion(null);
                                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                                      e.preventDefault();
                                      guardarEdicion();
                                    }
                                  }}
                                  rows={2}
                                  maxLength={(estado?.maxCaracteres ?? 300) + 50}
                                  className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 focus:border-accent focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                                />
                                <div className="flex items-center justify-end gap-2 text-xs">
                                  <span className={edicion.texto.length > (estado?.maxCaracteres ?? 300) ? "text-negative" : "text-neutral-500"}>
                                    {edicion.texto.length}/{estado?.maxCaracteres ?? 300}
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
                                    {tc.guardarEdicion}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                            <p
                              title={fechaHoraDe(m.creado)}
                              className={`min-w-0 whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm leading-snug ${
                                mio
                                  ? "rounded-tr-md bg-accent text-white"
                                  : "rounded-tl-md bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                              } ${meMencionan ? "ring-2 ring-gold" : ""}`}
                            >
                              {meMencionan && <span className="sr-only">{tc.mencionTuya}. </span>}
                              {resaltar(m.texto, m.mencionesNombres)}
                              {m.editado && (
                                <span className="ml-1.5 select-none text-[10px] opacity-70">· {tc.editado}</span>
                              )}
                            </p>
                            {reaccionesOk && puedeEscribir && !baneadoHasta && !sinNivel && (
                              <BotonReaccion mia={reacciones[m.id]?.mia ?? null} onReaccionar={(e) => reaccionar(m.id, e)} />
                            )}
                            {hayAcciones && (
                              <div className="relative shrink-0" data-menu-mensaje>
                                <button
                                  type="button"
                                  aria-label={tc.acciones}
                                  aria-expanded={abierto}
                                  onClick={(e) => setMenu(abierto ? null : { id: m.id, confirmando: null, pos: posicionMenu(e.currentTarget) })}
                                  className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 opacity-60 hover:bg-neutral-100 hover:text-neutral-700 group-hover:opacity-100 focus-visible:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                >
                                  <Icono d={D_PUNTOS} className="h-4 w-4" />
                                </button>
                                {abierto && (
                                  <div
                                    role="menu"
                                    style={{ left: menu.pos.left, top: menu.pos.top, bottom: menu.pos.bottom }}
                                    className="fixed z-50 w-44 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
                                  >
                                    {menu?.confirmando ? (
                                      <div className="p-2 text-xs">
                                        <p className="mb-2 font-medium">
                                          {menu.confirmando === "borrar" ? tc.confirmarBorrar : tc.confirmarDenunciar}
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
                                        {puedeEditar && (
                                          <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => empezarEdicion(m)}
                                            className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                          >
                                            {tc.editar}
                                          </button>
                                        )}
                                        {puedeDenunciar && (
                                          <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => setMenu({ ...menu, confirmando: "denunciar" })}
                                            className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                          >
                                            {tc.denunciar}
                                          </button>
                                        )}
                                        {puedeBorrar && (
                                          <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => setMenu({ ...menu, confirmando: "borrar" })}
                                            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-negative hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                          >
                                            {tc.borrar}
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                              </>
                            )}
                          </div>
                          {edicion?.id !== m.id && (
                            <Reacciones
                              sinBoton
                              className="mt-1"
                              conteos={reacciones[m.id]?.conteos ?? {}}
                              mia={reacciones[m.id]?.mia ?? null}
                              puedeReaccionar={reaccionesOk && puedeEscribir && !baneadoHasta && !sinNivel}
                              onReaccionar={(e) => reaccionar(m.id, e)}
                            />
                          )}
                        </div>
                      </li>
                    </Fragment>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {pendientesNuevos > 0 && (
          <button
            type="button"
            onClick={() => bajarAlFinal(true)}
            className="absolute bottom-[calc(var(--alto-redaccion,5.5rem)+0.5rem)] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-accent-hover"
          >
            <Icono d={D_FLECHA_ABAJO} className="h-3.5 w-3.5" />
            {tc.nuevosMensajes(pendientesNuevos)}
          </button>
        )}

        {/* Redacción */}
        <div className="border-t border-neutral-200 p-2.5 dark:border-neutral-800">
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

          {fase !== "ok" || !estado ? null : !puedeEscribir ? (
            <p className="px-1 py-2 text-center text-xs text-neutral-500">{tc.soloLectura}</p>
          ) : baneadoHasta ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-negative dark:bg-red-950/40 dark:text-red-300">
              <p className="font-medium">{tc.baneado(fechaHoraDe(baneadoHasta))}</p>
              {estado.baneoMotivo && <p className="mt-0.5 text-xs">{tc.baneoMotivo(estado.baneoMotivo)}</p>}
            </div>
          ) : sinNivel ? (
            <p className="px-1 py-2 text-center text-sm text-neutral-500">{tc.nivelBloqueo(estado.nivelMinimo)}</p>
          ) : !estado.normasVistas ? (
            <div className="rounded-xl bg-accent/5 p-3 ring-1 ring-accent/30">
              <p className="font-display text-base font-semibold text-accent">{tc.normasTitulo}</p>
              <p className="mt-1 text-sm leading-snug">{tc.normasTexto}</p>
              <button
                type="button"
                onClick={entendiNormas}
                className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                {tc.normasEntendido}
              </button>
            </div>
          ) : (
            <div className="relative">
              {/* Selector de a quién mencionar */}
              {consulta && (buscando || candidatos.length > 0 || consulta.texto.length > 0) && (
                <div
                  role="listbox"
                  className="absolute bottom-full left-0 z-30 mb-2 w-64 max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
                >
                  {candidatos.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-neutral-500">
                      {buscando ? tc.mencionBuscando : tc.mencionSinResultados}
                    </p>
                  ) : (
                    candidatos.map((c, i) => (
                      <button
                        key={c.userId}
                        type="button"
                        role="option"
                        aria-selected={i === indiceCandidato}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          elegirCandidato(c);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                          i === indiceCandidato ? "bg-brand-50 dark:bg-neutral-800" : ""
                        }`}
                      >
                        <AvatarPerfil avatar={c.avatar} nombre={c.nombre} tamano={24} />
                        <span className="min-w-0 flex-1 truncate font-medium">{c.nombre}</span>
                        <InsigniaNivel nivel={c.nivel} className="!px-1.5 !text-[9px]" />
                      </button>
                    ))
                  )}
                </div>
              )}

              {emojisAbiertos && (
                <div className="mb-2 grid grid-cols-8 gap-0.5 rounded-xl border border-neutral-200 p-1.5 dark:border-neutral-700 sm:grid-cols-[repeat(16,minmax(0,1fr))]">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertarEmoji(e)}
                      className="flex h-8 items-center justify-center rounded-lg text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setEmojisAbiertos((v) => !v)}
                  aria-label={tc.emojis}
                  aria-pressed={emojisAbiertos}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                    emojisAbiertos
                      ? "bg-accent/15 text-accent"
                      : "text-neutral-500 hover:bg-neutral-100 hover:text-accent dark:hover:bg-neutral-800"
                  }`}
                >
                  <Icono d={D_EMOJI} />
                </button>
                <textarea
                  ref={areaRef}
                  value={texto}
                  rows={1}
                  maxLength={max}
                  enterKeyHint="send"
                  placeholder={tc.placeholder}
                  aria-label={tc.placeholder}
                  onChange={(e) => {
                    setTexto(e.target.value);
                    detectarConsulta(e.target.value, e.target.selectionStart ?? e.target.value.length);
                  }}
                  onClick={(e) => detectarConsulta(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
                  onKeyDown={alTeclear}
                  onBlur={() => window.setTimeout(() => setConsulta(null), 150)}
                  className="max-h-24 min-h-[2.5rem] min-w-0 flex-1 resize-none rounded-2xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm leading-snug dark:border-neutral-700 dark:bg-neutral-950"
                />
                <button
                  type="button"
                  onClick={enviar}
                  disabled={enviando || texto.trim().length === 0}
                  aria-label={tc.enviar}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
                >
                  <Icono d={D_ENVIAR} />
                </button>
              </div>
              <p className="mt-1.5 flex justify-between gap-3 px-1 text-[11px] text-neutral-500">
                <span className="min-w-0 truncate">{tc.pista}</span>
                <span className={`shrink-0 tabular-nums ${cuenta >= max ? "font-semibold text-negative" : ""}`}>
                  {cuenta}/{max}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
