import { definirTextos } from "../definir";

// Racha diaria y cofre.
export default definirTextos(
  {
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
      `Racha de ${n} día${n === 1 ? "" : "s"}${pendiente ? ". Hoy falta reclamar" : ""}`,
  },
  {
    eu: {
      cofreAria: "Boladaren kutxa",
      diasDeRachaExclamacion: (n: number) => `${n} eguneko bolada!`,
      abrirCofre: "Ireki kutxa",
      masElMillon: (equipos: number) =>
        `Gehi gaurko milioia, ${equipos === 1 ? "zure taldean" : `zure ${equipos} taldeetan`}.`,
      aFichar: "Fitxatzera!",
      tocaCofre: "Sakatu kutxa irekitzeko",
      empiezaRacha: "Hasi zure bolada",
      diasDeRacha: (n: number) => `${n} eguneko bolada`,
      vuelveManana: (detalle: string) => `Itzuli bihar · ${detalle}`,
      proximoCofreEn: (dias: number) => `hurrengo kutxa ${dias} egun barru`,
      cofreEn: (dias: number) => `kutxa ${dias} egun barru`,
      hoyCofre: "Gaur 5-10 M-ko kutxa irekiko duzu!",
      cofreEnDias: (dias: number) => `5-10 M-ko kutxa ${dias} egun barru`,
      reclamada: "Jasota",
      reclamar: (importe: number) => `Jaso ${importe} M`,
      ingresadoEquipos: (equipos: number) => `Zure ${equipos} taldeetan sartu da.`,
      chipAria: (n: number, pendiente: boolean) =>
        `${n} eguneko bolada${pendiente ? ". Gaurkoa jasotzeke" : ""}`,
    },
    en: {
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
        `${n}-day streak${pendiente ? ". Today's reward is unclaimed" : ""}`,
    },
  }
);
