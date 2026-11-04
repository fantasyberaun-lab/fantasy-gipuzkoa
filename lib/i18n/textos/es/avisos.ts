import type { Ancho } from "../../definir";

// Pestaña Avisos: notificaciones de la liga y comunicados.
// Las frases de notificaciones llevan huecos {actor}, {jugador} e {importe}
// que la pantalla rellena con enlaces o negritas.
type Num = number | null;

type Txt = string | null;

const por = (imp: Num) => (imp !== null ? ` por ${imp} M` : "");

const deObj = (obj: Txt) => (obj ? ` (de ${obj})` : "");

const dondeEs = (j: Num) => (j != null ? `la jornada ${j}` : "la jornada");

const es = {
  cargando: "Cargando notificaciones…",
  ahoraMismo: "ahora mismo",
  nueva: "Nueva",
  nuevo: "Nuevo",
  avisos: "Avisos",
  comunicados: "Comunicados",
  sinComunicadosPublica:
    "No hay comunicados por ahora. Aquí aparecerán las novedades y avisos importantes.",
  sinComunicados: "No hay comunicados vigentes.",
  tusIngresos: "Tus ingresos",
  foros: "Foros",
  foroMencion: "{actor} te ha mencionado en el tema {titulo}.",
  foroRespuesta: "{actor} ha respondido en el tema {titulo}.",
  foroTemaSinDatos: "un tema del foro",
  actividad: "Actividad de la liga",
  sinMovimientos: "Todavía no hay movimientos en tu liga.",
  // Etiquetas de las notificaciones
  tipos: {
    oferta_recibida: "Oferta",
    fichaje: "Fichaje",
    clausulazo: "Cláusula",
    clausula_subida: "Cláusula ↑",
    oferta_rechazada: "Oferta rechazada",
    venta: "Venta",
    actualizacion_elo: "Actualización de Elo",
    pago_jornada: "Ingreso",
    otro: "Aviso",
    sancion: "Sanción",
    advertencia: "Advertencia",
    expulsion: "Expulsión",
    nuevo_admin: "Administrador",
    oferta_maquina: "Oferta",
    foro_mencion: "Mención",
    foro_respuesta: "Respuesta",
  },
  avisoGenerico: "Novedad en tu liga.",
  // Etiquetas de los comunicados
  etiquetas: {
    importante: "Importante",
    actualizacion: "Actualización",
    novedad: "Novedad",
    aviso: "Aviso",
    mercado: "Mercado",
    torneo: "Torneo",
  },
  // Tarjeta de actualización de Elo
  importante: "Importante",
  eloTitulo: "Elo y valores actualizados",
  eloTexto: (n: number) =>
    `Se ha actualizado el Elo de ${n} jugadores con la nueva lista de la FIDE y su valor de mercado se ha reajustado.`,
  valorPlantilla: "Valor de tu plantilla:",
  ningunCambio: "Ninguno de tus jugadores ha cambiado de Elo.",
  conCambio: (n: number) => `${n} de tus jugadores han cambiado de Elo.`,
  mayorSubida: (nombre: string, delta: number) => ` Mayor subida: ${nombre} (▲ ${delta}).`,
  mayorBajada: (nombre: string, delta: number) => ` Mayor bajada: ${nombre} (▼ ${delta}).`,
  // Frases de las notificaciones
  ofertaRecibida: (imp: Num) =>
    `{actor} te ha hecho una oferta${imp !== null ? ` de ${imp} M` : ""} por {jugador}.`,
  fichajeYo: (imp: Num) => `Has fichado a {jugador}${por(imp)}.`,
  fichajeOtro: (imp: Num) => `{actor} ha fichado a {jugador}${por(imp)}.`,
  ventaYo: (imp: Num) => `Has vendido a {jugador}${por(imp)} al mercado.`,
  ventaOtro: (imp: Num) => `{actor} ha vendido a {jugador}${por(imp)} al mercado.`,
  clausulaSubida: (imp: Num) =>
    `Has subido la cláusula de {jugador}${imp !== null ? ` en ${imp} M` : ""}.`,
  ofertaRechazada: (imp: Num) => `Tu oferta por {jugador}${por(imp)} ha sido rechazada.`,
  pagoCorreccion: (jornada: Num, puntos: number) =>
    `Corrección de tus ingresos en ${dondeEs(jornada)}: {importe} (ahora cuentas ${puntos} puntos).`,
  pagoIngreso: (jornada: Num, puntos: number) =>
    `Has ingresado {importe} por tus ${puntos} puntos en ${dondeEs(jornada)}.`,
  // Administrador de la liga (0100). {objetivo} es el equipo; {motivo}, lo que escribió.
  sancionPuntos: (n: number) => `El administrador ha sancionado a {objetivo} con −${n} puntos. Motivo: {motivo}`,
  sancionPuntosAMi: (n: number) => `El administrador te ha sancionado con −${n} puntos. Motivo: {motivo}`,
  sancionMillones: (n: number) => `El administrador ha sancionado a {objetivo} con −${n} M. Motivo: {motivo}`,
  sancionMillonesAMi: (n: number) => `El administrador te ha sancionado con −${n} M. Motivo: {motivo}`,
  advertencia: "El administrador ha advertido a {objetivo}. Motivo: {motivo}",
  advertenciaAMi: "El administrador te ha enviado una advertencia. Motivo: {motivo}",
  expulsion: "El administrador ha expulsado a {objetivo} de la liga. Motivo: {motivo}",
  nuevoAdmin: "{objetivo} es ahora el administrador de la liga.",
  ofertaMaquina: "La máquina ha hecho una oferta por los jugadores que tienes a la venta. Acéptalas o recházalas en tu Plantilla.",
  nuevoAdminAMi:
    "Ahora eres el administrador de la liga: puedes gestionarla desde Clasificación → Administrar liga.",
  clausulazoYo: (obj: Txt, imp: Num) =>
    `Has pagado la cláusula de {jugador}${deObj(obj)}${por(imp)}.`,
  clausulazoAMi: (imp: Num) => `{actor} te ha quitado a {jugador} pagando su cláusula${por(imp)}.`,
  clausulazoOtro: (obj: Txt, imp: Num) =>
    `{actor} ha pagado la cláusula de {jugador}${deObj(obj)}${por(imp)}.`,
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
