import type { Ancho } from "../../definir";

// Racha diaria y cofre.

const es = {
  cofreAria: "Cofre de racha",
  diasDeRachaExclamacion: (n: number) => `¡${n} días de racha!`,
  abrirCofre: "Abrir cofre",
  masElMillon: (equipos: number) =>
    `Más el millón de hoy, en ${equipos === 1 ? "tu equipo" : `tus ${equipos} equipos`}.`,
  aFichar: "¡A fichar!",
  tocaCofre: "Toca el cofre para abrirlo",
  empiezaRacha: "Empieza tu racha",
  diasDeRacha: (n: number) => `${n} día${n === 1 ? "" : "s"} de racha`,
  vuelveManana: (detalle: string) => `Vuelve mañana · ${detalle}`,
  proximoCofreEn: (dias: number) => `próximo cofre en ${dias} días`,
  cofreEn: (dias: number) => `cofre en ${dias} día${dias === 1 ? "" : "s"}`,
  hoyCofre: "¡Hoy abres el cofre de 5 a 10 M!",
  cofreEnDias: (dias: number) => `Cofre de 5 a 10 M en ${dias} días`,
  reclamada: "Reclamada",
  reclamar: (importe: number) => `Reclamar ${importe} M`,
  ingresadoEquipos: (equipos: number) => `Ingresado en tus ${equipos} equipos.`,
  chipAria: (n: number, pendiente: boolean) =>
    `Racha de ${n} día${n === 1 ? "" : "s"}${pendiente ? ". Tienes un cofre por abrir" : ""}`,
  // Inicio de sesión automático y XP (0086)
  masXp: (xp: number) => `+${xp} XP`,
  cofresListos: (n: number) =>
    n === 1 ? "Tienes un cofre de 5 a 10 M por abrir" : `Tienes ${n} cofres de 5 a 10 M por abrir`,
  entradaHoy: (importe: number, xp: number) => `+${importe} M · +${xp} XP por entrar hoy`,
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
