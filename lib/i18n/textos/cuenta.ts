import { definirTextos } from "../definir";

// Ajustes de la cuenta (AjustesCuenta) y eliminar cuenta (EliminarCuentaButton).
export default definirTextos(
  {
    tituloAjustes: "Ajustes de la cuenta",
    nombreUsuario: "Nombre de usuario",
    formatoNombre:
      "El nombre de usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo (sin espacios).",
    yaEsTuNombre: "Ese ya es tu nombre de usuario.",
    nombreActualizado: "Nombre de usuario actualizado.",
    ayudaNombre: (dias: number) =>
      `Puedes cambiarlo una vez cada ${dias} días y no puede coincidir con el de otro usuario.`,
    podrasCambiarlo: (fecha: string) => ` Podrás volver a cambiarlo el ${fecha}.`,
    cambiarNombre: "Cambiar nombre",
    cambiarPassword: "Cambiar contraseña",
    passwordActual: "Contraseña actual",
    passwordNueva: "Contraseña nueva",
    repitePassword: "Repite la contraseña nueva",
    passwordCorta: (min: number) => `La contraseña nueva debe tener al menos ${min} caracteres.`,
    noCoinciden: "Las contraseñas nuevas no coinciden.",
    igualQueActual: "La contraseña nueva tiene que ser distinta de la actual.",
    passwordActualizada: "Contraseña actualizada.",
    // Eliminar cuenta
    eliminarTitulo: "Eliminar tu cuenta",
    eliminarExplicacion:
      "Se borrarán tu cuenta, tu equipo, tu saldo y tu plantilla. Tus jugadores volverán al mercado. No se puede deshacer.",
    // La palabra que hay que escribir para confirmar.
    palabraConfirmacion: "eliminar",
    escribeAntes: "Escribe",
    escribeDespues: "para confirmar",
    eliminando: "Eliminando…",
    eliminarCuenta: "Eliminar cuenta",
  },
  {
    eu: {
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
    },
    en: {
      tituloAjustes: "Account settings",
      nombreUsuario: "Username",
      formatoNombre:
        "Your username must be 3 to 20 characters long: letters, numbers, dots, hyphens or underscores (no spaces).",
      yaEsTuNombre: "That's already your username.",
      nombreActualizado: "Username updated.",
      ayudaNombre: (dias: number) =>
        `You can change it once every ${dias} days, and it can't match another user's.`,
      podrasCambiarlo: (fecha: string) => ` You can change it again on ${fecha}.`,
      cambiarNombre: "Change username",
      cambiarPassword: "Change password",
      passwordActual: "Current password",
      passwordNueva: "New password",
      repitePassword: "Repeat new password",
      passwordCorta: (min: number) => `Your new password must be at least ${min} characters long.`,
      noCoinciden: "The new passwords don't match.",
      igualQueActual: "Your new password must be different from the current one.",
      passwordActualizada: "Password updated.",
      eliminarTitulo: "Delete your account",
      eliminarExplicacion:
        "Your account, team, balance and squad will be deleted. Your players will go back to the market. This can't be undone.",
      palabraConfirmacion: "delete",
      escribeAntes: "Type",
      escribeDespues: "to confirm",
      eliminando: "Deleting…",
      eliminarCuenta: "Delete account",
    },
  }
);
