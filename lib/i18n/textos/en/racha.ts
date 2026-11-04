import type { Seccion } from "../es/racha";

const en: Seccion = {
  cofreAria: "Streak chest",
  diasDeRachaExclamacion: (n: number) => `${n}-day streak!`,
  abrirCofre: "Open chest",
  masElMillon: (equipos: number) =>
    `Plus today's million, in ${equipos === 1 ? "your team" : `your ${equipos} teams`}.`,
  aFichar: "Go sign players!",
  tocaCofre: "Tap the chest to open it",
  empiezaRacha: "Start your streak",
  diasDeRacha: (n: number) => `${n}-day streak`,
  vuelveManana: (detalle: string) => `Come back tomorrow · ${detalle}`,
  proximoCofreEn: (dias: number) => `next chest in ${dias} days`,
  cofreEn: (dias: number) => `chest in ${dias} day${dias === 1 ? "" : "s"}`,
  hoyCofre: "Today you open the 5–10 M chest!",
  cofreEnDias: (dias: number) => `5–10 M chest in ${dias} days`,
  reclamada: "Claimed",
  reclamar: (importe: number) => `Claim ${importe} M`,
  ingresadoEquipos: (equipos: number) => `Paid into your ${equipos} teams.`,
  chipAria: (n: number, pendiente: boolean) =>
    `${n}-day streak${pendiente ? ". You have a chest to open" : ""}`,
  masXp: (xp: number) => `+${xp} XP`,
  cofresListos: (n: number) =>
    n === 1 ? "You have a 5–10 M chest to open" : `You have ${n} 5–10 M chests to open`,
  entradaHoy: (importe: number, xp: number) => `+${importe} M · +${xp} XP for logging in today`,
};

export default en;
