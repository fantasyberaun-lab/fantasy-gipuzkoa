import type { Seccion } from "../es/niveles";

const eu: Seccion = {
  pestana: "Mailak",
  cargando: "Mailak kargatzen…",
  error: "Ezin izan dira mailak kargatu.",
  nivel: (n: number) => `${n}. maila`,
  nivelCorto: (n: number) => `${n}. m.`,
  xpTotal: (xp: string) => `${xp} XP`,
  faltan: (xp: string, nivel: number) => `${xp} XP falta zaizkizu ${nivel}. mailarako`,
  siguienteIcono: "Hurrengo ikonoa",
  todosDesbloqueados: "Ikono guztiak desblokeatu dituzu. Jarraitu igotzen!",
  filtroTodos: "Denak",
  filtroMios: "Nireak",
  filtroBloqueados: "Blokeatuak",
  bloqueadoHasta: (n: number) => `${n}. maila`,
  desbloqueadoEnNivel: (n: number) => `${n}. mailan desblokeatuta`,
  bloqueadoEnNivel: (n: number, xp: string) => `${n}. mailan desblokeatzen da · ${xp} XP`,
  verIconos: "Ikusi nire ikono guztiak",
  usar: "Erabili ikono hau",
  enUso: "Erabiltzen ari zaren ikonoa",
  especialesTitulo: "Ikono bereziak",
  especialEtiqueta: "Ikono berezia · sariekin lortzen da, ez mailarekin",
  especialesAyuda: "Ikono bereziak ligetako eta ekitaldietako sariak dira. Ez dute zure mailarekin zerikusirik.",
  quitar: "Kendu ikonoa",
  comoGanar: "Nola irabazi XP",
  ganarLogin: (xp: number) => `Egunero sartu: ${xp} XP`,
  ganarCofre: (xp: number) => `Boladaren kutxa ireki: ${xp} XP`,
  ganarJornada: (xp: number) => `Jardunaldiko puntuak: ${xp} XP puntuko`,
  ganarMision: "Misioak osatu: zenbat eta zailagoak, orduan eta XP gehiago",
  tutorial: {
    saltar: "Saltatu",
    siguiente: "Hurrengoa",
    entendido: "Ulertu dut!",
    pasoDe: (n: number, total: number) => `${n} / ${total}`,
    perfilTitulo: "Mailak estreinatzen ditugu",
    perfilTexto: "Zure profilak orain zure maila eta ikonoak gordetzen ditu. Ikus dezagun.",
    nivelTitulo: "Zure maila eta XP",
    nivelTexto:
      "XP irabazten duzu egunero sartzean, boladaren kutxa irekitzean eta jardunaldi bakoitzeko puntuekin. XP gehiago, maila handiagoa.",
    iconosTitulo: "Zure hurrengo ikonoa",
    iconosTexto: (total: number) =>
      `Maila bakoitzak ikono bat desblokeatzen du: ${total} daude, piezak eta munduko txapeldunak. Zure ikono guztiak, sariak eta ekitaldietakoak barne, Ikonoak fitxan daude.`,
  },
};

export default eu;
