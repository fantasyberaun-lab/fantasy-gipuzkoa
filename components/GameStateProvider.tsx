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
import { motivoBloqueoTitular } from "@/lib/titulares";
import { clausulazosCerrados, proximaTandaMercado } from "@/lib/mercadoCountdown";
import { useT } from "@/components/IdiomaProvider";
import {
  aceptarOfertaDB,
  blindarJugadorDB,
  crearLigaDB,
  fetchClasificacion,
  fetchJugadoresLiga,
  fetchMercado,
  fetchMiPlantilla,
  fetchMiAvatar,
  fetchMiRol,
  fetchMisLigas,
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
  venderJugadorPublicoDB,
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
const TIPOS_LIGA_PUBLICA: TipoNotificacion[] = ["pago_jornada"];
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
  // Avatar de perfil elegido (id de lib/avatares.ts). En prueba: solo se carga
  // y se enseña a los root.
  avatar: string | null;
  setAvatar: (avatar: string | null) => void;
  // La liga activa es la pública "todos contra todos": sin plantilla inicial,
  // todos los jugadores siempre disponibles y compra/venta instantánea.
  esLigaPublica: boolean;
  equipo: EquipoManager;
  misLigas: LigaResumen[];
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
    nombreEquipo: string
  ) => Promise<ResultadoAccion & { codigo?: string }>;
  unirseLiga: (codigo: string, nombreEquipo: string) => Promise<ResultadoAccion>;
  unirseLigaPublica: (nombreEquipo: string) => Promise<ResultadoAccion>;
  cambiarLigaActiva: (ligaId: string) => Promise<void>;
  salirLiga: (ligaId: string) => Promise<ResultadoAccion>;
  // Vuelve a cargar los datos del juego (p. ej. el saldo tras cobrar la racha diaria).
  recargar: () => Promise<void>;
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

  // Cuándo se cargaron los datos del juego por última vez y si hay una recarga en
  // marcha. Sirven para refrescar el mercado solos cuando se resuelve una tanda.
  const ultimaCargaRef = useRef(Date.now());
  const recargandoRef = useRef(false);

  async function cargarTodo(forzarLigaId?: string) {
    ultimaCargaRef.current = Date.now();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCargando(false);
      return;
    }

    const rol = await fetchMiRol(supabase, user.id);
    setEsRoot(rol === "root");
    setAvatar(rol === "root" ? await fetchMiAvatar(supabase, user.id) : null);

    const ligas = await fetchMisLigas(supabase);
    setMisLigas(ligas);

    if (ligas.length === 0) {
      setTieneEquipo(false);
      setCargando(false);
      return;
    }

    const idGuardado = forzarLigaId ?? leerLigaActivaGuardada();
    const ligaSeleccionada = ligas.find((l) => l.ligaId === idGuardado) ?? ligas[0];
    guardarLigaActiva(ligaSeleccionada.ligaId);

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

    const [plantilla, ligaJugadores, misOfertas, ofertasParaMi, jugadoresMercado, pujas, tabla, avisos, rivales, listaComunicados] =
      await Promise.all([
        fetchMiPlantilla(supabase, miEquipo.id),
        fetchJugadoresLiga(supabase, miEquipo.leagueId, miEquipo.id),
        // En la liga pública no hay ofertas, mercado por tandas ni avisos.
        esPublica
          ? Promise.resolve([] as OfertaPendiente[])
          : fetchMisOfertas(supabase, miEquipo.id),
        esPublica
          ? Promise.resolve([] as OfertaRecibida[])
          : fetchOfertasRecibidas(supabase, miEquipo.id),
        esPublica
          ? Promise.resolve([] as MercadoDelDia[])
          : fetchMercado(supabase, miEquipo.leagueId),
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
        // Si falla, simplemente no se muestran rivales.
        fetchProximosRivales(supabase).catch(() => ({} as Record<string, ProximoRival[]>)),
        // Los comunicados los ven todas las ligas, también la pública.
        fetchComunicados(supabase).catch(() => [] as Comunicado[]),
      ]);

    setComunicados(listaComunicados);
    setComunicadosVistosEn(leerComunicadosVistos());
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
    setOfertas(misOfertas);
    setOfertasRecibidas(ofertasParaMi);
    setMercado(jugadoresMercado.map((j) => ({ ...j, proximosRivales: rivales[j.id] ?? [] })));
    setPujasMercado(pujas);
    setClasificacion(tabla);
    setNotificaciones(avisos.notificaciones);
    setNotificacionesVistasEn(avisos.vistasEn);
    setCargando(false);
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El mercado se resuelve a las 8:00, 17:00 y 23:00 (Madrid). Sin este efecto,
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
        proximaTandaMercado(new Date(ultimaCargaRef.current - MARGEN_MS)).getTime() + MARGEN_MS <= ahora;
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

  // Los avisos nuevos llegan por Supabase Realtime (la RLS de la tabla
  // hace que cada manager solo reciba los suyos). Como red de seguridad,
  // también se recargan al volver a la pestaña del navegador.
  useEffect(() => {
    if (!equipo.id || !equipo.leagueId) return;

    // En la pública no hay tiempo real (recibiría los fichajes de todos): los
    // ingresos se recargan al volver a la pestaña.
    const canal = esLigaPublica
      ? null
      : supabase
          .channel(`notificaciones-${equipo.leagueId}`)
          .on(
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
          )
          .subscribe();

    const alVolver = () => {
      if (document.visibilityState === "visible") recargarNotificaciones();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      if (canal) supabase.removeChannel(canal);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo.id, equipo.leagueId, esLigaPublica]);

  // Los comunicados nuevos (o editados/borrados) llegan por Realtime; red de
  // seguridad: se recargan al volver a la pestaña del navegador.
  useEffect(() => {
    if (!equipo.id) return;

    const recargar = async () => setComunicados(await fetchComunicados(supabase));

    const canal = supabase
      .channel("comunicados")
      .on("postgres_changes", { event: "*", schema: "public", table: "comunicados" }, () => {
        recargar();
      })
      .subscribe();

    const alVolver = () => {
      if (document.visibilityState === "visible") recargar();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      supabase.removeChannel(canal);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo.id]);

  // Sugerencias propias: no dependen de la liga. Cuando un admin marca una como
  // leída llega por Realtime (la RLS solo deja ver las tuyas); red de
  // seguridad: se recargan al volver a la pestaña del navegador.
  async function recargarSugerencias() {
    setSugerencias(await fetchMisSugerencias(supabase));
  }

  useEffect(() => {
    if (!equipo.id) return;

    recargarSugerencias();

    const canal = supabase
      .channel("sugerencias")
      .on("postgres_changes", { event: "*", schema: "public", table: "sugerencias" }, () => {
        recargarSugerencias();
      })
      .subscribe();

    const alVolver = () => {
      if (document.visibilityState === "visible") recargarSugerencias();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      supabase.removeChannel(canal);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo.id]);

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
      const motivo = motivoBloqueoTitular(squad, titulares, id, t.plantilla);
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
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function venderJugador(
    id: string,
    valorMercado: number
  ): Promise<ResultadoAccion> {
    if (!equipo.id) return { ok: false, mensaje: t.juego.sinEquipo };
    const resultado = esLigaPublica
      ? await venderJugadorPublicoDB(supabase, id, equipo.leagueId)
      : await venderJugadorDB(supabase, equipo.id, id, valorMercado);
    if (resultado.ok) await cargarTodo();
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
    if (resultado.ok) await cargarTodo();
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
    if (resultado.ok) await cargarTodo();
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
    const resultado = await hacerOfertaDB(supabase, equipo.id, jugadorId, importe);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function aceptarOferta(ofertaId: string): Promise<ResultadoAccion> {
    const resultado = await aceptarOfertaDB(supabase, ofertaId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function rechazarOferta(ofertaId: string): Promise<ResultadoAccion> {
    const resultado = await rechazarOfertaDB(supabase, ofertaId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function ficharJugador(jugadorId: string): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: t.juego.sinEquipo };
    const resultado = await ficharJugadorDB(supabase, jugadorId, equipo.leagueId);
    if (resultado.ok) await cargarTodo();
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
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function cancelarPuja(listingId: string): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: t.juego.sinEquipo };
    const resultado = await cancelarPujaMercadoDB(supabase, listingId, equipo.leagueId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function cancelarOferta(ofertaId: string): Promise<ResultadoAccion> {
    const resultado = await cancelarOfertaDB(supabase, ofertaId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function crearLiga(
    nombreLiga: string,
    nombreEquipo: string
  ): Promise<ResultadoAccion & { codigo?: string }> {
    const resultado = await crearLigaDB(supabase, nombreLiga, nombreEquipo);
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
        equipo,
        misLigas,
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