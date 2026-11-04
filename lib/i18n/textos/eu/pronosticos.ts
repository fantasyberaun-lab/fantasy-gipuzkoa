import type { Seccion } from "../es/pronosticos";

const eu: Seccion = {
  pestana: "Pronostikoak",
  titulo: "Pronostikoak",
  intro:
    "Eman zure iritzia partida bakoitzak nola amaituko duen, erronda hasi aurretik. Aukerakoa da, nahi dituzun mahaiak soilik jokatzen dituzu eta ez du sari edo punturik ematen.",
  sin: "Oraingoz ez dago erronda argitaraturik pronostikatzeko.",
  volver: "Itzuli txapelketetara",
  jornadaFecha: (n: number, fecha: string) =>
    fecha ? `${n}. jardunaldia · ${fecha}` : `${n}. jardunaldia`,
  abiertaEtiqueta: "Irekita",
  cerradaEtiqueta: "Itxita",
  cerradaAviso: "Erronda hasi da edo ez du daturik: pronostikoak itxita daude.",
  haciendo: (hechos: number, total: number) => `${total} mahaitatik ${hechos} pronostikatuta`,
  blancas: "Zuriak",
  tablas: "Berdinketa",
  negras: "Beltzak",
  acierto: "Asmatu",
  fallo: "Huts",
  quitar: "Kendu pronostikoa",
  guardado: "Pronostikoa gordeta",
  quitado: "Pronostikoa kenduta",
  error: "Ezin izan da pronostikoa gorde.",
  resumen: (aciertos: number, resueltos: number) =>
    `Zure asmatzeak: ${aciertos} / ${resueltos} jokatutako partida`,
};

export default eu;
