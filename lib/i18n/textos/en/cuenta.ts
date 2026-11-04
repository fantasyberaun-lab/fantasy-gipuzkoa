import type { Seccion } from "../es/cuenta";

const en: Seccion = {
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
};

export default en;
