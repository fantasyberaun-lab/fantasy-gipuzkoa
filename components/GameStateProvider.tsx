"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { redondear2 } from "@/lib/saldo";
import { fetchComunicados } from "@/lib/supabase/comunicadosQueries";
import {
  fetchMisSugerencias,
  marcarAvisosSugerenciasVistosDB,
  type Sugerencia,
} from "@/lib/supabase/sugerenciasQueries";
import { fetchReglasLiga } from "@/lib/supabase/configQueries";
import {
  fijarReglasJuego,
  reglasJuegoActuales,
  registrarCargaReglas,
  REGLAS_JUEGO_POR_DEFECTO,
  type ReglasJuego,
} from "@/lib/reglasJuego";
import { motivoBloqueoTitular } from "@/lib/titulares";
import { clausulazosCerrados, proximaTandaMercado } from "@/lib/mercadoCountdown";
import { useT } from "@/components/IdiomaProvider";
import { sonar } from "@/lib/sonido";
import {
  aceptarOfertaDB,
  blindarJugadorDB,
  crearLigaDB,
  fetchClasificacion,
  fetchEstadoJugadores,
  fetchJugadoresLiga,
  fetchMercado,
  fetchMiPlantilla,
  fetchMiAvatar,
  fetchMiRol,
  fetchMisLigas,
  fetchMisLigasOError,
  fetchMisOfertas,
  fetchNotificaciones,
  fetchOfertasRecibidas,
  fetchProximosRivales,
  fetchPujasMercado,
  ficharJugadorDB,
  hacerOfertaDB,
  cancelarOfertaDB,
  cancelarPujaMercadoDB,
  marcarNotificacionesVistasDB,
  pagarClausulaDB,
  pujarMercadoDB,
  rechazarOfertaDB,
  salirLigaDB,
  subirClausulaDB,
  toggleCapitanDB,
  toggleTitularDB,
  unirseLigaDB,
  unirseLigaPublicaDB,
  venderJugadorDB,
  ponerALaVentaDB,
  quitarDeLaVentaDB,
  aceptarOfertaMaquinaDB,
  rechazarOfertaMaquinaDB,
} from "@/lib/supabase/queries";
import type {
  ClasificacionEntry,
  Comunicado,
  EquipoManager,
  JugadorLiga,
  LigaResumen,
  MercadoDelDia,
  Notificacion,
  TipoNotificacion,
  OfertaPendiente,
  OfertaRecibida,
  PlantillaSlot,
  ProximoRival,
  PujaMercado,
} from "@/lib/types";

const EQUIPO_VACIO: EquipoManager = { id: "", leagueId: "", nombreEquipo: "", saldo: 0 };
const LIGA_ACTIVA_KEY = "liga-activa-id";
// Avisos personales que sí llegan a la liga pública.
const TIPOS_LIGA_PUBLICA: TipoNotificacion[] = ["pago_jornada", "foro_mencion", "foro_respuesta"];
// Instante (ms) hasta el que el usuario ha visto los comunicados. Se guarda en
// el navegador: los comunicados son globales, no de una liga concreta.
const COMUNICADOS_VISTOS_KEY = "comunicados-vistos-en";

function leerComunicadosVistos(): number {
  try {
    return Number(localStorage.getItem(COMUNICADOS_VISTOS_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function calcularClausula(valorMercado: number) {
  return Math.ceil(valorMercado * 1.5);
}

type ResultadoAccion = { ok: true } | { ok: false; mensaje: string };

interface GameState {
  cargando: boolean;
  tieneEquipo: boolean;
  esRoot: boolean;
  // Límites de titulares que aplica la base de datos a la liga activa.
  reglas: ReglasJuego;
  // Avatar de perfil elegido (id de lib/avatares.ts), desbloqueado por nivel.
  avatar: string | null;
  setAvatar: (avatar: string | null) => void;
  // La liga activa es la pública "todos contra todos": sin plantilla inicial,
  // todos los jugadores siempre disponibles y compra/venta instantánea.
  esLigaPublica: boolean;
  equipo: EquipoManager;
  misLigas: LigaResumen[];
  errorCarga: boolean;
  squad: PlantillaSlot[];
  titulares: Record<string, boolean>;
  // Id del jugador capitán (puntúa doble), o null si no hay.
  capitanId: string | null;
  jugadoresLiga: JugadorLiga[];
  mercado: MercadoDelDia[];
  // Pujas (de todos los equipos de la liga) por los jugadores de la tanda abierta.
  pujasMercado: PujaMercado[];
  // Suma de TUS pujas abiertas (dinero que se te descontaría si las ganases todas).
  comprometidoEnPujas: number;
  // Saldo futuro = saldo - lo comprometido en tus pujas abiertas. Es el que hay
  // que mirar para saber si te llega el dinero para fichar/ofertar.
  saldoFuturo: number;
  ofertas: OfertaPendiente[];
  ofertasRecibidas: OfertaRecibida[];
  clasificacion: ClasificacionEntry[];
  notificaciones: Notificacion[];
  notificacionesVistasEn: number;
  notificacionesNoLeidas: number;
  // Comunicados del administrador (vigentes), para todas las ligas.
  comunicados: Comunicado[];
  comunicadosVistosEn: number;
  comunicadosNoLeidos: number;
  marcarComunicadosVistos: () => void;
  // Sugerencias que ha enviado el usuario (todas las ligas). Las leídas por los
  // admins que aún no ha visto en Avisos cuentan como no leídas.
  sugerencias: Sugerencia[];
  sugerenciasNoVistas: number;
  marcarAvisosSugerenciasVistos: () => Promise<void>;
  recargarSugerencias: () => Promise<void>;
  // Lo que enseña el globo de la pestaña Avisos: notificaciones + comunicados
  // + sugerencias leídas.
  avisosNoLeidos: number;
  marcarNotificacionesVistas: () => Promise<void>;
  toggleTitular: (id: string) => Promise<ResultadoAccion>;
  toggleCapitan: (id: string) => Promise<ResultadoAccion>;
  blindarJugador: (jugadorId: string) => Promise<ResultadoAccion>;
  venderJugador: (id: string, valorMercado: number) => Promise<ResultadoAccion>;
  // Ligas privadas (0101): se vende a la máquina, que hace su oferta en cada tanda.
  ponerALaVenta: (id: string) => Promise<ResultadoAccion>;
  quitarDeLaVenta: (id: string) => Promise<ResultadoAccion>;
  aceptarOfertaMaquina: (id: string) => Promise<ResultadoAccion>;
  rechazarOfertaMaquina: (id: string) => Promise<ResultadoAccion>;
  pagarClausula: (jugadorId: string) => Promise<ResultadoAccion>;
  subirClausula: (jugadorId: string, importe: number) => Promise<ResultadoAccion>;
  hacerOferta: (jugadorId: string, importe: number) => Promise<ResultadoAccion>;
  aceptarOferta: (ofertaId: string) => Promise<ResultadoAccion>;
  rechazarOferta: (ofertaId: string) => Promise<ResultadoAccion>;
  ficharJugador: (jugadorId: string) => Promise<ResultadoAccion>;
  pujarMercado: (listingId: string, importe: number) => Promise<ResultadoAccion>;
  cancelarPuja: (listingId: string) => Promise<ResultadoAccion>;
  cancelarOferta: (ofertaId: string) => Promise<ResultadoAccion>;
  crearLiga: (
    nombreLiga: string,
    nombreEquipo: string,
    territorio?: { ambito: "provincia" | "comunidad"; region: string }
  ) => Promise<ResultadoAccion & { codigo?: string }>;
  unirseLiga: (codigo: string, nombreEquipo: string) => Promise<ResultadoAccion>;
  unirseLigaPublica: (nombreEquipo: string) => Promise<ResultadoAccion>;
  cambiarLigaActiva: (ligaId: string) => Promise<void>;
  salirLiga: (ligaId: string) => Promise<ResultadoAccion>;
  // Vuelve a cargar todos los datos del juego.
  recargar: () => Promise<void>;
  // Vuelve a leer solo el saldo (p. ej. tras cobrar la racha diaria).
  recargarSaldo: () => Promise<void>;
}

const GameStateContext = createContext<GameState | null>(null);

function leerLigaActivaGuardada(): string | null {
  try {
    return localStorage.getItem(LIGA_ACTIVA_KEY);
  } catch {
    return null;
  }
}

function guardarLigaActiva(ligaId: string) {
  try {
    localStorage.setItem(LIGA_ACTIVA_KEY, ligaId);
  } catch {
    // localStorage puede no estar disponible (modo privado, etc.) — no es crítico.
  }
}

export function GameStateProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const supabase = createClient();

  const [cargando, setCargando] = useState(true);
  const [tieneEquipo, setTieneEquipo] = useState(false);
  const [esRoot, setEsRoot] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [esLigaPublica, setEsLigaPublica] = useState(false);
  const [equipo, setEquipo] = useState<EquipoManager>(EQUIPO_VACIO);
  const [misLigas, setMisLigas] = useState<LigaResumen[]>([]);
  const [squad, setSquad] = useState<PlantillaSlot[]>([]);
  const [titulares, setTitulares] = useState<Record<string, boolean>>({});
  const [capitanId, setCapitanId] = useState<string | null>(null);
  const [jugadoresLiga, setJugadoresLiga] = useState<JugadorLiga[]>([]);
  const [mercado, setMercado] = useState<MercadoDelDia[]>([]);
  const [pujasMercado, setPujasMercado] = useState<PujaMercado[]>([]);
  const [ofertas, setOfertas] = useState<OfertaPendiente[]>([]);
  const [ofertasRecibidas, setOfertasRecibidas] = useState<OfertaRecibida[]>([]);
  const [clasificacion, setClasificacion] = useState<ClasificacionEntry[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notificacionesVistasEn, setNotificacionesVistasEn] = useState(() => Date.now());
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [comunicadosVistosEn, setComunicadosVistosEn] = useState(0);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  // Id del usuario conectado (para filtrar sus sugerencias en tiempo real).
  const [userId, setUserId] = useState("");

  // Cuándo se cargaron los datos del juego por última vez y si hay una recarga en
  // marcha. Sirven para refrescar el mercado solos cuando se resuelve una tanda.
  const ultimaCargaRef = useRef(Date.now());
  const recargandoRef = useRef(false);
  // Próximos rivales y estado de jugadores (player_status) de la última carga:
  // las recargas parciales tras una acción los reutilizan en vez de pedirlos otra vez.
  const rivalesRef = useRef<Record<string, ProximoRival[]>>({});
  const estadosRef = useRef<any[] | null>(null);
  // Liga cuyos datos se están mostrando. Si una recarga parcial termina después
  // de cambiar de liga, sus datos se descartan.
  const ligaCargadaRef = useRef("");
  const [reglas, setReglas] = useState<ReglasJuego>(REGLAS_JUEGO_POR_DEFECTO);

  function pedirEstados(leagueId: string) {
    return fetchEstadoJugadores(supabase, leagueId).then((estados) => {
      if (estados) estadosRef.current = estados;
      return estados;
    });
  }

  // Plantilla, titulares, capitán y lista de jugadores, con los próximos rivales
  // que ya se tengan (llegan aparte, ver aplicarRivales).
  function aplicarPlantillaYJugadores(
    plantilla: Awaited<ReturnType<typeof fetchMiPlantilla>>,
    ligaJugadores: JugadorLiga[],
    esPublica: boolean
  ) {
    const rivales = rivalesRef.current;
    setSquad(
      plantilla.map(({ titular: _titular, capitan: _capitan, ...resto }) => ({
        ...resto,
        proximosRivales: rivales[resto.jugador.id] ?? [],
      }))
    );
    setTitulares(
      Object.fromEntries(plantilla.map((s) => [s.jugador.id, s.titular]))
    );
    setCapitanId(plantilla.find((s) => s.capitan)?.jugador.id ?? null);
    // En la pública no hay "propietario" de un jugador: lo puede tener cualquiera.
    // Lo único que importa es si está en MI plantilla.
    const idsMiPlantilla = new Set(plantilla.map((s) => s.jugador.id));
    setJugadoresLiga(
      esPublica
        ? ligaJugadores.map((j) => ({
            ...j,
            proximosRivales: rivales[j.id] ?? [],
            propietario: null,
            esMiEquipo: idsMiPlantilla.has(j.id),
            candado: false,
            blindado: false,
          }))
        : ligaJugadores.map((j) => ({ ...j, proximosRivales: rivales[j.id] ?? [] }))
    );
  }

  function aplicarMercado(jugadoresMercado: MercadoDelDia[]) {
    const rivales = rivalesRef.current;
    setMercado(jugadoresMercado.map((j) => ({ ...j, proximosRivales: rivales[j.id] ?? [] })));
  }

  // Los próximos rivales son la consulta más lenta: la pantalla se pinta sin
  // ellos y se añaden aquí cuando llegan.
  function aplicarRivales(rivales: Record<string, ProximoRival[]>) {
    rivalesRef.current = rivales;
    setSquad((prev) =>
      prev.map((s) => ({ ...s, proximosRivales: rivales[s.jugador.id] ?? [] }))
    );
    setJugadoresLiga((prev) =>
      prev.map((j) => ({ ...j, proximosRivales: rivales[j.id] ?? [] }))
    );
    setMercado((prev) => prev.map((j) => ({ ...j, proximosRivales: rivales[j.id] ?? [] })));
  }

  // Lista de ligas y saldo del equipo activo (mis_ligas trae los dos).
  function aplicarSaldo(ligas: LigaResumen[], leagueId: string) {
    if (ligas.length === 0) return; // error de red: mejor dejar lo que había
    setMisLigas(ligas);
    const mia = ligas.find((l) => l.ligaId === leagueId);
    if (!mia) return;
    setEquipo((prev) =>
      prev.leagueId === leagueId ? { ...prev, saldo: redondear2(mia.saldo) } : prev
    );
  }

  async function cargarTodo(forzarLigaId?: string) {
    ultimaCargaRef.current = Date.now();
    // getSession lee la sesión del navegador sin ir a la red (y la refresca si
    // ha caducado). La validación de verdad ya la hace el middleware en cada
    // petición, así que aquí no hace falta pagar otra llamada a Supabase Auth.
    let {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      // Puede ser un instante en que la sesión se está refrescando: un reintento corto.
      await new Promise((r) => setTimeout(r, 700));
      session = (await supabase.auth.getSession()).data.session;
    }
    const user = session?.user;

    if (!user) {
      // Sin sesión no es "sin liga": se pide reintentar en vez de enseñar crear/unirse.
      setErrorCarga(true);
      setCargando(false);
      return;
    }
    setUserId(user.id);

    // Lo que no depende de la liga arranca ya, en paralelo. Los próximos
    // rivales (lo más lento) no se esperan: se añaden cuando llegan. Si fallan
    // los rivales o los comunicados, simplemente no se muestran.
    const rivalesP = fetchProximosRivales(supabase).catch(
      () => ({} as Record<string, ProximoRival[]>)
    );
    const comunicadosP = fetchComunicados(supabase).catch(() => [] as Comunicado[]);

    const [rol, avatarGuardado, ligas] = await Promise.all([
      fetchMiRol(supabase, user.id),
      fetchMiAvatar(supabase, user.id),
      fetchMisLigasOError(supabase),
    ]);
    setEsRoot(rol === "root");
    setAvatar(avatarGuardado);
    if (ligas === null) {
      // La consulta falló: no es que no estés en ninguna liga. Se avisa para reintentar.
      setErrorCarga(true);
      setCargando(false);
      return;
    }
    setErrorCarga(false);
    setMisLigas(ligas);

    if (ligas.length === 0) {
      ligaCargadaRef.current = "";
      setTieneEquipo(false);
      setCargando(false);
      return;
    }

    const idGuardado = forzarLigaId ?? leerLigaActivaGuardada();
    const ligaSeleccionada = ligas.find((l) => l.ligaId === idGuardado) ?? ligas[0];
    guardarLigaActiva(ligaSeleccionada.ligaId);
    ligaCargadaRef.current = ligaSeleccionada.ligaId;

    // Límites de titulares de esta liga: no bloquea la carga, y si falla valen los del reglamento.
    const ligaDeLasReglas = ligaSeleccionada.ligaId;
    // También trae cláusula, blindaje, capitán y tamaño de plantilla (0096) para enseñar los importes.
    const cargaReglas = fetchReglasLiga(supabase, ligaDeLasReglas).then((r) => {
      if (ligaCargadaRef.current === ligaDeLasReglas) {
        setReglas(r ?? REGLAS_JUEGO_POR_DEFECTO);
        fijarReglasJuego(r);
      }
    });
    registrarCargaReglas(cargaReglas);

    const esPublica = ligaSeleccionada.tipo === "publica";
    setEsLigaPublica(esPublica);
    setTieneEquipo(true);
    const miEquipo: EquipoManager = {
      id: ligaSeleccionada.equipoId,
      leagueId: ligaSeleccionada.ligaId,
      nombreEquipo: ligaSeleccionada.nombreEquipo,
      saldo: redondear2(ligaSeleccionada.saldo),
    };
    setEquipo(miEquipo);

    // player_status (lo más pesado) se pide una sola vez para jugadores y mercado.
    const estadosJugadores = pedirEstados(miEquipo.leagueId);
    const [plantilla, ligaJugadores, misOfertas, ofertasParaMi, jugadoresMercado, pujas, tabla, avisos, listaComunicados] =
      await Promise.all([
        fetchMiPlantilla(supabase, miEquipo.id),
        fetchJugadoresLiga(supabase, miEquipo.leagueId, miEquipo.id, estadosJugadores),
        // En la liga pública no hay ofertas, mercado por tandas ni avisos.
        esPublica
          ? Promise.resolve([] as OfertaPendiente[])
          : fetchMisOfertas(supabase, miEquipo.id),
        esPublica
          ? Promise.resolve([] as OfertaRecibida[])
          : fetchOfertasRecibidas(supabase, miEquipo.id),
        esPublica
          ? Promise.resolve([] as MercadoDelDia[])
          : fetchMercado(supabase, miEquipo.leagueId, estadosJugadores),
        esPublica
          ? Promise.resolve([] as PujaMercado[])
          : fetchPujasMercado(supabase, miEquipo.leagueId),
        fetchClasificacion(supabase, miEquipo.leagueId, miEquipo.id),
        // En la pública solo se cargan los ingresos por ronda (no las operaciones de otros).
        fetchNotificaciones(
          supabase,
          miEquipo.leagueId,
          miEquipo.id,
          esPublica ? TIPOS_LIGA_PUBLICA : undefined
        ),
        // Los comunicados los ven todas las ligas, también la pública.
        comunicadosP,
      ]);

    setComunicados(listaComunicados);
    setComunicadosVistosEn(leerComunicadosVistos());
    aplicarPlantillaYJugadores(plantilla, ligaJugadores, esPublica);
    setOfertas(misOfertas);
    setOfertasRecibidas(ofertasParaMi);
    aplicarMercado(jugadoresMercado);
    setPujasMercado(pujas);
    setClasificacion(tabla);
    setNotificaciones(avisos.notificaciones);
    setNotificacionesVistasEn(avisos.vistasEn);
    setCargando(false);

    // Si los rivales ya habían llegado, esto se aplica justo después.
    rivalesP.then(aplicarRivales);
  }

  // --- Recargas parciales tras una acción: solo lo que esa acción puede cambiar.
  // La recarga completa sigue haciéndose al cambiar de liga, al volver a la
  // pestaña tras un rato y después de cada tanda del mercado.

  // Fichar, vender, clausulazo, blindar, subir cláusula, aceptar oferta: cambian
  // la plantilla, los jugadores, el mercado, el saldo y las ofertas.
  async function recargarJuego() {
    const { id, leagueId } = equipo;
    if (!id || !leagueId) return;
    const esPublica = esLigaPublica;
    const estados = pedirEstados(leagueId);
    const [plantilla, ligaJugadores, jugadoresMercado, pujas, misOfertas, ofertasParaMi, ligas] =
      await Promise.all([
        fetchMiPlantilla(supabase, id),
        fetchJugadoresLiga(supabase, leagueId, id, estados),
        esPublica ? Promise.resolve(null) : fetchMercado(supabase, leagueId, estados),
        esPublica ? Promise.resolve(null) : fetchPujasMercado(supabase, leagueId),
        esPublica ? Promise.resolve(null) : fetchMisOfertas(supabase, id),
        esPublica ? Promise.resolve(null) : fetchOfertasRecibidas(supabase, id),
        fetchMisLigas(supabase),
      ]);
    if (ligaCargadaRef.current !== leagueId) return;
    aplicarPlantillaYJugadores(plantilla, ligaJugadores, esPublica);
    if (jugadoresMercado) aplicarMercado(jugadoresMercado);
    if (pujas) setPujasMercado(pujas);
    if (misOfertas) setOfertas(misOfertas);
    if (ofertasParaMi) setOfertasRecibidas(ofertasParaMi);
    aplicarSaldo(ligas, leagueId);
  }

  // Pujar / cancelar puja: cambian las pujas y su número en el mercado.
  async function recargarPujasYMercado() {
    const { leagueId } = equipo;
    if (!leagueId) return;
    const estados = estadosRef.current
      ? Promise.resolve(estadosRef.current)
      : pedirEstados(leagueId);
    const [pujas, jugadoresMercado] = await Promise.all([
      fetchPujasMercado(supabase, leagueId),
      fetchMercado(supabase, leagueId, estados),
    ]);
    if (ligaCargadaRef.current !== leagueId) return;
    setPujasMercado(pujas);
    aplicarMercado(jugadoresMercado);
  }

  async function recargarMisOfertas() {
    const { id, leagueId } = equipo;
    if (!id) return;
    const lista = await fetchMisOfertas(supabase, id);
    if (ligaCargadaRef.current === leagueId) setOfertas(lista);
  }

  async function recargarOfertasRecibidas() {
    const { id, leagueId } = equipo;
    if (!id) return;
    const lista = await fetchOfertasRecibidas(supabase, id);
    if (ligaCargadaRef.current === leagueId) setOfertasRecibidas(lista);
  }

  // Solo el saldo (p. ej. tras cobrar la racha diaria).
  async function recargarSaldo() {
    const { leagueId } = equipo;
    if (!leagueId) return;
    const ligas = await fetchMisLigas(supabase);
    if (ligaCargadaRef.current === leagueId) aplicarSaldo(ligas, leagueId);
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El mercado se resuelve a las horas de la liga (8:00, 17:00 y 23:00 por
  // defecto, ver 0100). Sin este efecto,
  // quien tuviera la app abierta seguiría viendo la tanda anterior (con jugadores
  // que acaban de ser fichados) hasta recargar la página. Se recarga todo:
  //   - 60 s después de cada tanda (margen para que termine de resolverse),
  //   - al volver a la pestaña si ha pasado una tanda o llevan más de 5 min sin cargar.
  useEffect(() => {
    const MARGEN_MS = 60_000;
    const MAX_SIN_CARGAR_MS = 5 * 60_000;

    async function recargarSiToca(alVolver: boolean) {
      if (recargandoRef.current) return;

      const ahora = Date.now();
      const desdeCarga = ahora - ultimaCargaRef.current;
      // ¿Ha habido una tanda desde la última carga (y ya pasó el margen)?
      const tandaPasada =
        proximaTandaMercado(
          new Date(ultimaCargaRef.current - MARGEN_MS),
          reglasJuegoActuales().horasMercado
        ).getTime() +
          MARGEN_MS <=
        ahora;
      const demasiadoViejo = alVolver && desdeCarga > MAX_SIN_CARGAR_MS;

      if (!tandaPasada && !demasiadoViejo) return;

      recargandoRef.current = true;
      try {
        await cargarTodo();
      } finally {
        recargandoRef.current = false;
      }
    }

    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") recargarSiToca(false);
    }, 15_000);

    const alVolver = () => {
      if (document.visibilityState === "visible") recargarSiToca(true);
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function recargarNotificaciones() {
    if (!equipo.id || !equipo.leagueId) return;
    const avisos = await fetchNotificaciones(
      supabase,
      equipo.leagueId,
      equipo.id,
      esLigaPublica ? TIPOS_LIGA_PUBLICA : undefined
    );
    setNotificaciones(avisos.notificaciones);
    setNotificacionesVistasEn(avisos.vistasEn);
  }

  async function recargarComunicados() {
    setComunicados(await fetchComunicados(supabase));
  }

  // Sugerencias propias: no dependen de la liga.
  async function recargarSugerencias() {
    setSugerencias(await fetchMisSugerencias(supabase));
  }

  // Lo nuevo llega por Supabase Realtime, en un solo canal por usuario:
  //   - avisos de la liga (la RLS hace que cada manager solo reciba los suyos;
  //     en la pública no hay tiempo real porque recibiría los fichajes de todos),
  //   - comunicados del administrador (nuevos, editados o borrados),
  //   - sus sugerencias, filtradas por usuario desde el principio, para que
  //     Supabase no tenga que mirar las de todos (cuando un admin marca una
  //     como leída llega aquí; los borrados no admiten filtro y no llegan).
  // Red de seguridad: todo se recarga al volver a la pestaña del navegador.
  useEffect(() => {
    if (!equipo.id || !equipo.leagueId || !userId) return;

    recargarSugerencias();

    // Nombre único: removeChannel es asíncrono y, con el mismo nombre, Supabase
    // devolvería el canal anterior (ya suscrito) al cambiar de liga.
    const canal = supabase.channel(`avisos-${userId}-${Math.random().toString(36).slice(2)}`);
    if (!esLigaPublica) {
      canal.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones",
          filter: `league_id=eq.${equipo.leagueId}`,
        },
        () => {
          recargarNotificaciones();
        }
      );
    }
    canal
      .on("postgres_changes", { event: "*", schema: "public", table: "comunicados" }, () => {
        recargarComunicados();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sugerencias", filter: `user_id=eq.${userId}` },
        () => {
          recargarSugerencias();
        }
      )
      .subscribe();

    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      recargarNotificaciones();
      recargarComunicados();
      recargarSugerencias();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      supabase.removeChannel(canal);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo.id, equipo.leagueId, esLigaPublica, userId]);

  const sugerenciasNoVistas = sugerencias.filter((s) => s.leidaEn && !s.avisoVisto).length;

  async function marcarAvisosSugerenciasVistos() {
    if (sugerenciasNoVistas === 0) return;
    await marcarAvisosSugerenciasVistosDB(supabase);
    setSugerencias((prev) => prev.map((s) => (s.leidaEn ? { ...s, avisoVisto: true } : s)));
  }

  function marcarComunicadosVistos() {
    const ahora = Date.now();
    try {
      localStorage.setItem(COMUNICADOS_VISTOS_KEY, String(ahora));
    } catch {
      // no es crítico
    }
    setComunicadosVistosEn(ahora);
  }

  const comunicadosNoLeidos = comunicados.filter(
    (c) => Date.parse(c.creado) > comunicadosVistosEn
  ).length;

  async function marcarNotificacionesVistas() {
    if (!equipo.leagueId) return;
    const vistasEn = await marcarNotificacionesVistasDB(supabase, equipo.leagueId);
    if (vistasEn !== null) setNotificacionesVistasEn(vistasEn);
  }

  const notificacionesNoLeidas = notificaciones.filter(
    (n) => n.actorId !== equipo.id && Date.parse(n.creada) > notificacionesVistasEn
  ).length;

  const avisosNoLeidos = notificacionesNoLeidas + comunicadosNoLeidos + sugerenciasNoVistas;

  async function toggleTitular(id: string): Promise<ResultadoAccion> {
    const nuevoValor = !titulares[id];
    if (nuevoValor) {
      const motivo = motivoBloqueoTitular(squad, titulares, id, t.plantilla, reglas);
      if (motivo) return { ok: false, mensaje: motivo };
    }
    const capitanAnterior = capitanId;
    setTitulares((prev) => ({ ...prev, [id]: nuevoValor }));
    // Un capitán que pasa a suplente pierde la capitanía (lo hace también la base de datos).
    if (!nuevoValor && capitanId === id) setCapitanId(null);
    if (!equipo.id) return { ok: true };
    const resultado = await toggleTitularDB(supabase, equipo.id, id, nuevoValor);
    if (!resultado.ok) {
      setTitulares((prev) => ({ ...prev, [id]: !nuevoValor }));
      setCapitanId(capitanAnterior);
    }
    return resultado;
  }

  async function toggleCapitan(id: string): Promise<ResultadoAccion> {
    if (!equipo.id) return { ok: false, mensaje: t.juego.sinEquipo };
    if (!titulares[id]) {
      return { ok: false, mensaje: t.juego.capitanTitular };
    }
    const capitanAnterior = capitanId;
    const nuevoValor = capitanId !== id;
    setCapitanId(nuevoValor ? id : null);
    const resultado = await toggleCapitanDB(supabase, equipo.id, id, nuevoValor);
    if (!resultado.ok) setCapitanId(capitanAnterior);
    return resultado;
  }

  async function blindarJugador(jugadorId: string): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: t.juego.sinEquipo };
    const resultado = await blindarJugadorDB(supabase, jugadorId, equipo.leagueId);
    if (resultado.ok) await recargarJuego();
    return resultado;
  }

  // Poner/quitar de la venta y aceptar/rechazar la oferta de la máquina: todas
  // cambian la plantilla o el saldo, así que se recarga el juego si sale bien.
  async function accionVentaMaquina(
    accion: (s: typeof supabase, playerId: string, leagueId: string) => Promise<ResultadoAccion>,
    playerId: string
  ): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: t.juego.sinEquipo };
    const resultado = await accion(supabase, playerId, equipo.leagueId);
    if (resultado.ok) await recargarJuego();
    return resultado;
  }

  async function venderJugador(
    id: string,
    valorMercado: number
  ): Promise<ResultadoAccion> {
    if (!equipo.id) return { ok: false, mensaje: t.juego.sinEquipo };
    // El valor lo calcula el servidor (vender_jugador): el navegador ya no manda
    // el importe. `valorMercado` se conserva en la firma por los llamadores.
    void valorMercado;
    const resultado = await venderJugadorDB(supabase, id, equipo.leagueId);
    if (resultado.ok) {
      sonar("vender");
      await recargarJuego();
    }
    return resultado;
  }

  const comprometidoEnPujas = redondear2(
    pujasMercado.filter((p) => p.esMia).reduce((total, p) => total + p.importe, 0)
  );
  const saldoFuturo = redondear2(equipo.saldo - comprometidoEnPujas);

  async function pagarClausula(jugadorId: string): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: t.juego.sinEquipo };
    // Aviso inmediato; la base de datos lo vuelve a comprobar (clausulazos_cerrados).
    if (!esLigaPublica && clausulazosCerrados()) {
      return { ok: false, mensaje: t.mercado.clausulazosCerrados };
    }
    const resultado = await pagarClausulaDB(supabase, jugadorId, equipo.leagueId);
    if (resultado.ok) {
      sonar("fichar");
      await recargarJuego();
    }
    return resultado;
  }

  async function subirClausula(
    jugadorId: string,
    importe: number
  ): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: t.juego.sinEquipo };
    if (!Number.isFinite(importe) || importe <= 0) {
      return { ok: false, mensaje: t.juego.importeInvalido };
    }
    if (importe > saldoFuturo) {
      return {
        ok: false,
        mensaje: t.juego.pagarMasQueSaldo(saldoFuturo),
      };
    }
    const resultado = await subirClausulaDB(supabase, jugadorId, equipo.leagueId, importe);
    if (resultado.ok) await recargarJuego();
    return resultado;
  }

  async function hacerOferta(
    jugadorId: string,
    importe: number
  ): Promise<ResultadoAccion> {
    if (!equipo.id) return { ok: false, mensaje: t.juego.sinEquipo };
    if (!Number.isFinite(importe) || importe <= 0) {
      return { ok: false, mensaje: t.juego.importeInvalido };
    }
    if (importe > saldoFuturo) {
      return {
        ok: false,
        mensaje: t.juego.ofertarMasQueSaldo(saldoFuturo),
      };
    }
    // Aviso inmediato; la base de datos lo vuelve a comprobar (validar_oferta_minima, 0110).
    const valor = jugadoresLiga.find((j) => j.id === jugadorId)?.valorMercado;
    if (valor !== undefined && importe < valor) {
      return { ok: false, mensaje: t.juego.ofertaMinima(valor) };
    }
    const resultado = await hacerOfertaDB(supabase, equipo.id, jugadorId, importe);
    if (resultado.ok) await recargarMisOfertas();
    return resultado;
  }

  async function aceptarOferta(ofertaId: string): Promise<ResultadoAccion> {
    const resultado = await aceptarOfertaDB(supabase, ofertaId);
    if (resultado.ok) {
      sonar("vender");
      await recargarJuego();
    }
    return resultado;
  }

  async function rechazarOferta(ofertaId: string): Promise<ResultadoAccion> {
    const resultado = await rechazarOfertaDB(supabase, ofertaId);
    if (resultado.ok) await recargarOfertasRecibidas();
    return resultado;
  }

  async function ficharJugador(jugadorId: string): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: t.juego.sinEquipo };
    const resultado = await ficharJugadorDB(supabase, jugadorId, equipo.leagueId);
    if (resultado.ok) {
      sonar("fichar");
      await recargarJuego();
    }
    return resultado;
  }

  async function pujarMercado(
    listingId: string,
    importe: number
  ): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: t.juego.sinEquipo };
    if (!Number.isFinite(importe) || importe <= 0) {
      return { ok: false, mensaje: t.juego.importeInvalido };
    }
    // El límite (saldo + deuda máxima - otras pujas) lo valida el servidor.
    const resultado = await pujarMercadoDB(supabase, listingId, importe, equipo.leagueId);
    if (resultado.ok) {
      sonar("clic");
      await recargarPujasYMercado();
    }
    return resultado;
  }

  async function cancelarPuja(listingId: string): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: t.juego.sinEquipo };
    const resultado = await cancelarPujaMercadoDB(supabase, listingId, equipo.leagueId);
    if (resultado.ok) await recargarPujasYMercado();
    return resultado;
  }

  async function cancelarOferta(ofertaId: string): Promise<ResultadoAccion> {
    const resultado = await cancelarOfertaDB(supabase, ofertaId);
    if (resultado.ok) await recargarMisOfertas();
    return resultado;
  }

  async function crearLiga(
    nombreLiga: string,
    nombreEquipo: string,
    territorio?: { ambito: "provincia" | "comunidad"; region: string }
  ): Promise<ResultadoAccion & { codigo?: string }> {
    const resultado = await crearLigaDB(supabase, nombreLiga, nombreEquipo, territorio);
    if (resultado.ok) {
      if (resultado.liga_id) guardarLigaActiva(resultado.liga_id);
      await cargarTodo(resultado.liga_id);
    }
    return resultado;
  }

  async function unirseLiga(codigo: string, nombreEquipo: string): Promise<ResultadoAccion> {
    const resultado = await unirseLigaDB(supabase, codigo, nombreEquipo);
    if (resultado.ok) {
      if (resultado.liga_id) guardarLigaActiva(resultado.liga_id);
      await cargarTodo(resultado.liga_id);
    }
    return resultado;
  }

  async function unirseLigaPublica(nombreEquipo: string): Promise<ResultadoAccion> {
    const resultado = await unirseLigaPublicaDB(supabase, nombreEquipo);
    if (resultado.ok) {
      if (resultado.liga_id) guardarLigaActiva(resultado.liga_id);
      await cargarTodo(resultado.liga_id);
    }
    return resultado;
  }

  async function cambiarLigaActiva(ligaId: string) {
    setCargando(true);
    guardarLigaActiva(ligaId);
    await cargarTodo(ligaId);
  }

  async function salirLiga(ligaId: string): Promise<ResultadoAccion> {
    const resultado = await salirLigaDB(supabase, ligaId);
    if (!resultado.ok) return resultado;

    // Si era la liga activa, olvidamos la guardada: cargarTodo() elegirá otra
    // de las que queden (o mostrará la pantalla de crear/unirse si no queda ninguna).
    if (leerLigaActivaGuardada() === ligaId) {
      try {
        localStorage.removeItem(LIGA_ACTIVA_KEY);
      } catch {
        // no es crítico
      }
    }
    setCargando(true);
    await cargarTodo();
    return resultado;
  }


  return (
    <GameStateContext.Provider
      value={{
        cargando,
        tieneEquipo,
        esRoot,
        avatar,
        setAvatar,
        esLigaPublica,
        reglas,
        equipo,
        misLigas,
        errorCarga,
        squad,
        titulares,
        capitanId,
        jugadoresLiga,
        mercado,
        pujasMercado,
        comprometidoEnPujas,
        saldoFuturo,
        ofertas,
        ofertasRecibidas,
        clasificacion,
        notificaciones,
        notificacionesVistasEn,
        notificacionesNoLeidas,
        comunicados,
        comunicadosVistosEn,
        comunicadosNoLeidos,
        marcarComunicadosVistos,
        sugerencias,
        sugerenciasNoVistas,
        marcarAvisosSugerenciasVistos,
        recargarSugerencias,
        avisosNoLeidos,
        marcarNotificacionesVistas,
        toggleTitular,
        toggleCapitan,
        blindarJugador,
        venderJugador,
        ponerALaVenta: (id) => accionVentaMaquina(ponerALaVentaDB, id),
        quitarDeLaVenta: (id) => accionVentaMaquina(quitarDeLaVentaDB, id),
        aceptarOfertaMaquina: async (id) => {
          const resultado = await accionVentaMaquina(aceptarOfertaMaquinaDB, id);
          if (resultado.ok) sonar("vender");
          return resultado;
        },
        rechazarOfertaMaquina: (id) => accionVentaMaquina(rechazarOfertaMaquinaDB, id),
        pagarClausula,
        subirClausula,
        hacerOferta,
        aceptarOferta,
        rechazarOferta,
        ficharJugador,
        pujarMercado,
        cancelarPuja,
        cancelarOferta,
        crearLiga,
        unirseLiga,
        unirseLigaPublica,
        cambiarLigaActiva,
        salirLiga,
        recargar: () => cargarTodo(),
        recargarSaldo,
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) {
    throw new Error("useGameState debe usarse dentro de <GameStateProvider>");
  }
  return ctx;
}