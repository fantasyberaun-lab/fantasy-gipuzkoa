import type { Ancho } from "../../definir";

// Ajustes de la cuenta (AjustesCuenta) y eliminar cuenta (EliminarCuentaButton).

const es = {
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
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
