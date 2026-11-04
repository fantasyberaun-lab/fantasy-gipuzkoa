import type { Ancho } from "../../definir";

// Panel del administrador de una liga privada (0100) y el botón que lleva a él.

const es = {
  titulo: "Administrar liga",
  botonAbrir: "Administrar liga",
  botonAbrirDetalle: "Sanciones, expulsiones y mercado",
  etiquetaAdmin: "Admin",
  etiquetaAdminTitle: "Administrador de la liga (quien la creó)",
  volver: "← Volver a la clasificación",
  cargando: "Cargando el panel…",
  soloAdmin:
    "Solo el administrador de la liga puede entrar aquí. El administrador es quien creó la liga.",
  soloPrivadas: "La liga pública no tiene administrador.",
  errorCarga: "No se ha podido cargar el panel. Inténtalo de nuevo en un rato.",
  intro:
    "Como creaste esta liga, eres su administrador. Todo lo que hagas aquí sale en Notificaciones para toda la liga.",
  // Mercado
  mercadoTitulo: "Mercado",
  mercadoTexto: "¿Cuántas veces al día se resuelve el mercado de tu liga?",
  tandas: (n: number) => (n === 1 ? "1 vez" : `${n} veces`),
  horasTandas: (n: number) =>
    n === 1 ? "a las 23:00" : n === 2 ? "a las 8:00 y 23:00" : "a las 8:00, 17:00 y 23:00",
  mercadoAviso:
    "El cambio vale desde la próxima tanda. Las pujas que ya están hechas se resuelven a la siguiente hora del nuevo horario. No se puede cambiar en las 2 horas antes de una tanda.",
  mercadoGuardado: "Horario del mercado guardado.",
  mercadoBloqueado: (h: number) =>
    `Ahora no se puede cambiar: faltan menos de 2 horas para la tanda de las ${h}:00. Podrás cambiarlo a partir de las ${h}:00.`,
  // Managers
  managersTitulo: "Managers",
  sinManagers: "Todavía no hay más managers en tu liga.",
  pts: (n: number) => `${n} pts`,
  sancionPts: (n: number) => `−${n} pts de sanción`,
  accion: "Sancionar o expulsar",
  cerrarAccion: "Cerrar",
  tipoPuntos: "Quitar puntos",
  tipoMillones: "Quitar millones",
  tipoAdvertencia: "Advertencia",
  tipoExpulsar: "Expulsar",
  cantidadPuntos: "Puntos que se le quitan",
  cantidadMillones: "Millones que se le quitan",
  motivo: "Motivo (lo verá toda la liga)",
  motivoPlaceholder: "Ej.: insultos en el chat",
  avisoExpulsar: (equipo: string) =>
    `Se borrará el equipo «${equipo}» con su plantilla y sus puntos, y no podrá volver a entrar con el código hasta que lo readmitas. No se puede deshacer.`,
  confirmarSancion: "Aplicar",
  confirmarExpulsion: "Expulsar de la liga",
  enviando: "Guardando…",
  hecho: {
    puntos: (equipo: string, n: number) => `${equipo}: −${n} puntos.`,
    millones: (equipo: string, n: number) => `${equipo}: −${n} M.`,
    advertencia: (equipo: string) => `Advertencia enviada a ${equipo}.`,
    expulsion: (equipo: string) => `${equipo} ha sido expulsado de la liga.`,
  },
  // Historial
  historialTitulo: "Sanciones y advertencias",
  sinHistorial: "No has puesto ninguna sanción.",
  lineaSancion: {
    puntos: (n: number) => `−${n} puntos`,
    millones: (n: number) => `−${n} M`,
    advertencia: "Advertencia",
  },
  anular: "Anular",
  confirmarAnular: "¿Anular? Se quitará el aviso y, si eran millones, se le devolverán.",
  si: "Sí, anular",
  no: "No",
  anulada: "Sanción anulada.",
  // Expulsados
  expulsadosTitulo: "Expulsados",
  sinExpulsados: "No has expulsado a nadie.",
  expulsadoLinea: (manager: string, equipo: string) => `${manager} (era «${equipo}»)`,
  readmitir: "Readmitir",
  readmitido: (manager: string) => `${manager} ya puede volver a entrar con el código.`,
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
