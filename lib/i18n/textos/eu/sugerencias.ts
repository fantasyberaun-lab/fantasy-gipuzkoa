import type { Seccion } from "../es/sugerencias";

const eu: Seccion = {
  detalleMenu: "Ideiak, akatsak edo kontatu nahi diguzun edozer",
  intro:
    "Kontaiguzu zer hobetuko zenukeen, zer faltan botatzen duzun edo zerbaitek huts egiten badu. Dena irakurtzen dugu eta, irakurtzean, Abisuetan jakinaraziko dizugu.",
  tipo: "Mota",
  tipos: {
    sugerencia: "Iradokizuna",
    error: "Akatsa",
    otro: "Bestelakoa",
  },
  mensaje: "Mezua",
  placeholder: {
    sugerencia: "Ondo legoke…",
    error: "Zer gertatu den, zein pantailatan eta zer espero zenuen…",
    otro: "Idatzi hemen zure mezua…",
  },
  sinDatosPersonales: "Ez sartu datu pertsonalik (telefonoa, helbidea…).",
  caracteres: (n: number, max: number) => `${n}/${max}`,
  enviar: "Bidali",
  enviando: "Bidaltzen…",
  enviada: "Eskerrik asko! Zure mezua jaso dugu.",
  errores: {
    sesion: "Hasi saioa iradokizunak bidaltzeko.",
    vacia: "Idatzi zure mezua bidali aurretik.",
    larga: "Mezua luzeegia da.",
    tipo: "Aukeratu mezu mota bat.",
    limite: "Gaur mezu asko bidali dituzu. Saiatu berriro bihar.",
    red: "Ezin izan da bidali. Saiatu berriro.",
  },
  historial: "Zure mezuak",
  sinHistorial: "Oraindik ez duzu bat ere bidali.",
  pendiente: "Bidalita",
  leida: "Irakurrita",
  leidaEl: (fecha: string) => `Irakurrita: ${fecha}`,
  respuesta: "Erantzuna:",
  avisosTitulo: "Zure iradokizunak",
  avisoEtiqueta: "Irakurrita ✓",
  avisoTexto: (fecha: string) =>
    `Zure mezua irakurri dugu (${fecha}). Eskerrik asko hobetzen laguntzeagatik!`,
  avisoRespuesta: "Klubaren erantzuna:",
};

export default eu;
