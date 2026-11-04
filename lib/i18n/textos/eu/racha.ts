import type { Seccion } from "../es/racha";

const eu: Seccion = {
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
    `${n} eguneko bolada${pendiente ? ". Kutxa bat ireki gabe duzu" : ""}`,
  masXp: (xp: number) => `+${xp} XP`,
  cofresListos: (n: number) =>
    n === 1 ? "5-10 M-ko kutxa bat ireki gabe duzu" : `5-10 M-ko ${n} kutxa ireki gabe dituzu`,
  entradaHoy: (importe: number, xp: number) => `+${importe} M · +${xp} XP gaur sartzeagatik`,
};

export default eu;
