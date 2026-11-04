import type { Seccion } from "../es/cuenta";

const eu: Seccion = {
  tituloAjustes: "Kontuaren ezarpenak",
  nombreUsuario: "Erabiltzaile-izena",
  formatoNombre:
    "Erabiltzaile-izenak 3 eta 20 karaktere artean izan behar ditu: letrak, zenbakiak, puntua, marratxoa edo azpimarra (zuriunerik gabe).",
  yaEsTuNombre: "Hori da dagoeneko zure erabiltzaile-izena.",
  nombreActualizado: "Erabiltzaile-izena eguneratu da.",
  ayudaNombre: (dias: number) =>
    `${dias} egunetik behin alda dezakezu, eta ezin da beste erabiltzaile batenaren berdina izan.`,
  podrasCambiarlo: (fecha: string) => ` Berriro aldatu ahal izango duzu data honetan: ${fecha}.`,
  cambiarNombre: "Izena aldatu",
  cambiarPassword: "Pasahitza aldatu",
  passwordActual: "Oraingo pasahitza",
  passwordNueva: "Pasahitz berria",
  repitePassword: "Errepikatu pasahitz berria",
  passwordCorta: (min: number) => `Pasahitz berriak gutxienez ${min} karaktere izan behar ditu.`,
  noCoinciden: "Pasahitz berriak ez datoz bat.",
  igualQueActual: "Pasahitz berriak oraingoaren desberdina izan behar du.",
  passwordActualizada: "Pasahitza eguneratu da.",
  eliminarTitulo: "Zure kontua ezabatu",
  eliminarExplicacion:
    "Zure kontua, taldea, saldoa eta plantilla ezabatuko dira. Zure jokalariak merkatura itzuliko dira. Ezin da desegin.",
  palabraConfirmacion: "ezabatu",
  escribeAntes: "Idatzi",
  escribeDespues: "berresteko",
  eliminando: "Ezabatzen…",
  eliminarCuenta: "Kontua ezabatu",
};

export default eu;
