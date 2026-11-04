import type { Ancho } from "../../definir";

// Crear / unirse / cambiar / salir de ligas.

const es = {
  // Pantalla sin equipo (LigaGate)
  tituloSinEquipo: "Fantasy Campeonatos de Gipuzkoa",
  sinEquipo: "Todavía no tienes equipo en ninguna liga.",
  errorCarga: "No hemos podido cargar tus ligas. Tus datos están a salvo.",
  reintentar: "Reintentar",
  cerrarSesion: "Cerrar sesión",

  // Formulario (LigaForm)
  ligaCreada: "¡Liga creada!",
  compartirCodigo: "Comparte este código con tus amigos para que se unan (máximo 9 por liga):",
  entrarMiLiga: "Entrar a mi liga",
  crearNueva: "Crear una liga nueva",
  unirmeCodigo: "Unirme a una liga con un código",
  unirmePublica: "Unirme a la liga pública (todos contra todos)",
  nombreLiga: "Nombre de la liga",
  placeholderLiga: "Fantasy con los amigos",
  nombreEquipo: "Nombre de tu equipo",
  crearLiga: "Crear liga",
  publicaDescripcion:
    "Liga abierta en la que compiten todos los managers. Todos empiezan con el mismo presupuesto y sin plantilla: construye el mejor equipo posible fichando en el Mercado, donde todos los jugadores están siempre disponibles y comprar y vender es inmediato.",
  entrando: "Entrando…",
  entrarPublica: "Entrar en la liga pública",
  codigoLiga: "Código de la liga",
  unirme: "Unirme",
  seCreaEn: "La liga se creará en:",
  ambito: "Ámbito",
  comunidad: "Comunidad autónoma",
  provincia: "Provincia",
  provinciaProximamente: "Próximamente: todavía no hay jugadores ni torneos en esta liga. De momento solo Gipuzkoa está en juego.",
  ligaDePrueba: "Liga de prueba: solo la puede abrir el administrador.",
  entrarPrueba: "Entrar en la liga de prueba",

  // Modal de ligas (CambiarLigaModal)
  salirDe: (liga: string) => `Salir de ${liga}`,
  salirAvisoAntes: "Se borrarán tu equipo ",
  salirAvisoDespues:
    ", su saldo, su plantilla y sus puntos en esta liga. Tus jugadores volverán al mercado. No se puede deshacer.",
  publicaVolver: "Podrás volver a entrar a la liga pública, pero empezarás de cero.",
  unicoMiembro: "Eres el único miembro: la liga se eliminará también.",
  necesitarasCodigo: "Para volver a entrar necesitarás el código de la liga y que haya hueco.",
  saliendo: "Saliendo…",
  salirLiga: "Salir de la liga",
  unirmeOtra: "Unirme a otra liga",
  tusLigas: "Tus ligas",
  activa: "Activa",
  resumenPublica: (equipo: string, miembros: number, saldo: number) =>
    `${equipo} · Todos contra todos · ${miembros} managers · ${saldo} M`,
  resumenPrivada: (equipo: string, miembros: number, max: number, codigo: string, saldo: number) =>
    `${equipo} · ${miembros}/${max} · código ${codigo} · ${saldo} M`,
  crearOUnirme: "Crear o unirme a otra liga",

  // Botón de copiar código
  copiado: "¡Copiado!",
  copiarCodigo: "Copiar código",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
