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
  usar: "Erabili ikono hau",
  enUso: "Erabiltzen ari zaren ikonoa",
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
    iconosTitulo: "Desblokeatu ikonoak",
    iconosTexto: (total: number) =>
      `${total} ikono daude, piezak eta munduko txapeldunak. Koloretsuak zureak dira jada, eta grisak mailaz igotzean desblokeatzen dira. Sakatu hautatzeko eta haien historia ezagutzeko.`,
  },
};

export default eu;
