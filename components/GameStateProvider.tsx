"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { redondear2 } from "@/lib/saldo";
import { motivoBloqueoTitular } from "@/lib/titulares";
import { clausulazosCerrados, MENSAJE_CLAUSULAZOS_CERRADOS } from "@/lib/mercadoCountdown";
import {
  aceptarOfertaDB,
  blindarJugadorDB,
  crearLigaDB,
  fetchClasificacion,
  fetchJugadoresLiga,
  fetchMercado,
  fetchMiPlantilla,
  fetchMiRol,
  fetchMisLigas,
  fetchMisOfertas,
  fetchNotificaciones,
  fetchOfertasRecibidas,
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
  EquipoManager,
  JugadorLiga,
  LigaResumen,
  MercadoDelDia,
  Notificacion,
  OfertaPendiente,
  OfertaRecibida,
  PlantillaSlot,
  PujaMercado,
} from "@/lib/types";

const EQUIPO_VACIO: EquipoManager = { id: "", leagueId: "", nombreEquipo: "", saldo: 0 };
const LIGA_ACTIVA_KEY = "liga-activa-id";

export function calcularClausula(valorMercado: number) {
  return Math.ceil(valorMercado * 1.5);
}

type ResultadoAccion = { ok: true } | { ok: false; mensaje: string };

interface GameState {
  cargando: boolean;
  tieneEquipo: boolean;
  esRoot: boolean;
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
  const supabase = createClient();

  const [cargando, setCargando] = useState(true);
  const [tieneEquipo, setTieneEquipo] = useState(false);
  const [esRoot, setEsRoot] = useState(false);
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

  async function cargarTodo(forzarLigaId?: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCargando(false);
      return;
    }

    const rol = await fetchMiRol(supabase, user.id);
    setEsRoot(rol === "root");

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

    const [plantilla, ligaJugadores, misOfertas, ofertasParaMi, jugadoresMercado, pujas, tabla, avisos] =
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
        esPublica
          ? Promise.resolve({ notificaciones: [] as Notificacion[], vistasEn: Date.now() })
          : fetchNotificaciones(supabase, miEquipo.leagueId, miEquipo.id),
      ]);

    setSquad(
      plantilla.map(({ titular: _titular, capitan: _capitan, ...resto }) => resto)
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
            propietario: null,
            esMiEquipo: idsMiPlantilla.has(j.id),
            candado: false,
            blindado: false,
          }))
        : ligaJugadores
    );
    setOfertas(misOfertas);
    setOfertasRecibidas(ofertasParaMi);
    setMercado(jugadoresMercado);
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

  async function recargarNotificaciones() {
    if (!equipo.id || !equipo.leagueId || esLigaPublica) return;
    const avisos = await fetchNotificaciones(supabase, equipo.leagueId, equipo.id);
    setNotificaciones(avisos.notificaciones);
    setNotificacionesVistasEn(avisos.vistasEn);
  }

  // Los avisos nuevos llegan por Supabase Realtime (la RLS de la tabla
  // hace que cada manager solo reciba los suyos). Como red de seguridad,
  // también se recargan al volver a la pestaña del navegador.
  useEffect(() => {
    if (!equipo.id || !equipo.leagueId || esLigaPublica) return;

    const canal = supabase
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
      supabase.removeChannel(canal);
      document.removeEventListener("visibilitychange", alVolver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo.id, equipo.leagueId, esLigaPublica]);

  async function marcarNotificacionesVistas() {
    if (!equipo.leagueId || esLigaPublica) return;
    const vistasEn = await marcarNotificacionesVistasDB(supabase, equipo.leagueId);
    if (vistasEn !== null) setNotificacionesVistasEn(vistasEn);
  }

  const notificacionesNoLeidas = notificaciones.filter(
    (n) => n.actorId !== equipo.id && Date.parse(n.creada) > notificacionesVistasEn
  ).length;

  async function toggleTitular(id: string): Promise<ResultadoAccion> {
    const nuevoValor = !titulares[id];
    if (nuevoValor) {
      const motivo = motivoBloqueoTitular(squad, titulares, id);
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
    if (!equipo.id) return { ok: false, mensaje: "No tienes equipo todavía." };
    if (!titulares[id]) {
      return { ok: false, mensaje: "El capitán tiene que ser titular." };
    }
    const capitanAnterior = capitanId;
    const nuevoValor = capitanId !== id;
    setCapitanId(nuevoValor ? id : null);
    const resultado = await toggleCapitanDB(supabase, equipo.id, id, nuevoValor);
    if (!resultado.ok) setCapitanId(capitanAnterior);
    return resultado;
  }

  async function blindarJugador(jugadorId: string): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: "No tienes equipo todavía." };
    const resultado = await blindarJugadorDB(supabase, jugadorId, equipo.leagueId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function venderJugador(
    id: string,
    valorMercado: number
  ): Promise<ResultadoAccion> {
    if (!equipo.id) return { ok: false, mensaje: "No tienes equipo todavía." };
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
    if (!equipo.leagueId) return { ok: false, mensaje: "No tienes equipo todavía." };
    // Aviso inmediato; la base de datos lo vuelve a comprobar (clausulazos_cerrados).
    if (!esLigaPublica && clausulazosCerrados()) {
      return { ok: false, mensaje: MENSAJE_CLAUSULAZOS_CERRADOS };
    }
    const resultado = await pagarClausulaDB(supabase, jugadorId, equipo.leagueId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function subirClausula(
    jugadorId: string,
    importe: number
  ): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: "No tienes equipo todavía." };
    if (!Number.isFinite(importe) || importe <= 0) {
      return { ok: false, mensaje: "Introduce un importe válido." };
    }
    if (importe > saldoFuturo) {
      return {
        ok: false,
        mensaje: `No puedes pagar más de tu saldo futuro (${saldoFuturo} M).`,
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
    if (!equipo.id) return { ok: false, mensaje: "No tienes equipo todavía." };
    if (!Number.isFinite(importe) || importe <= 0) {
      return { ok: false, mensaje: "Introduce un importe válido." };
    }
    if (importe > saldoFuturo) {
      return {
        ok: false,
        mensaje: `No puedes ofertar más de tu saldo futuro (${saldoFuturo} M).`,
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
    if (!equipo.leagueId) return { ok: false, mensaje: "No tienes equipo todavía." };
    const resultado = await ficharJugadorDB(supabase, jugadorId, equipo.leagueId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function pujarMercado(
    listingId: string,
    importe: number
  ): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: "No tienes equipo todavía." };
    if (!Number.isFinite(importe) || importe <= 0) {
      return { ok: false, mensaje: "Introduce un importe válido." };
    }
    // El límite (saldo + deuda máxima - otras pujas) lo valida el servidor.
    const resultado = await pujarMercadoDB(supabase, listingId, importe, equipo.leagueId);
    if (resultado.ok) await cargarTodo();
    return resultado;
  }

  async function cancelarPuja(listingId: string): Promise<ResultadoAccion> {
    if (!equipo.leagueId) return { ok: false, mensaje: "No tienes equipo todavía." };
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