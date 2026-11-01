import { definirTextos } from "../definir";

// Textos de las funciones de enganche de la Fase 0: compartir en redes y
// resumen semanal.
export default definirTextos(
  {
    compartir: "Compartir",
    compartirCopiado: "¡Imagen copiada! Ya puedes pegarla en tu story.",
    compartirError: "No se ha podido compartir. Inténtalo de nuevo.",
    compartirPreparando: "Preparando imagen…",
    resumenTitulo: "Tu semana",
    resumenEquipo: "Equipo",
    resumenLiga: "Liga",
    resumenPuntos: (n: number) => `${n} ${n === 1 ? "punto" : "puntos"} esta semana`,
    resumenPosicion: (n: number) => `Vas ${n}.º en tu liga`,
    resumenSube: (n: number) => `Has subido ${n} ${n === 1 ? "puesto" : "puestos"}`,
    resumenBaja: (n: number) => `Has bajado ${n} ${n === 1 ? "puesto" : "puestos"}`,
    resumenIgual: "Mantienes tu puesto",
    resumenCerrar: "Cerrar",
  },
  {
    eu: {
      compartir: "Partekatu",
      compartirCopiado: "Irudia kopiatuta! Orain zure storyan itsats dezakezu.",
      compartirError: "Ezin izan da partekatu. Saiatu berriro.",
      compartirPreparando: "Irudia prestatzen…",
      resumenTitulo: "Zure astea",
      resumenEquipo: "Taldea",
      resumenLiga: "Liga",
      resumenPuntos: (n: number) => `${n} puntu aste honetan`,
      resumenPosicion: (n: number) => `${n}. zaude zure ligan`,
      resumenSube: (n: number) => `${n} postu igo zara`,
      resumenBaja: (n: number) => `${n} postu jaitsi zara`,
      resumenIgual: "Postuari eusten diozu",
      resumenCerrar: "Itxi",
    },
    en: {
      compartir: "Share",
      compartirCopiado: "Image copied! You can paste it into your story.",
      compartirError: "Couldn't share. Please try again.",
      compartirPreparando: "Preparing image…",
      resumenTitulo: "Your week",
      resumenEquipo: "Team",
      resumenLiga: "League",
      resumenPuntos: (n: number) => `${n} ${n === 1 ? "point" : "points"} this week`,
      resumenPosicion: (n: number) => `You're ${n}th in your league`,
      resumenSube: (n: number) => `You climbed ${n} ${n === 1 ? "place" : "places"}`,
      resumenBaja: (n: number) => `You dropped ${n} ${n === 1 ? "place" : "places"}`,
      resumenIgual: "You held your place",
      resumenCerrar: "Close",
    },
  }
);
