// Reglas de cuenta compartidas entre el registro y el perfil.

// Letras, números, punto, guion y guion bajo; sin espacios ni "@" (así se
// distingue de un email en el login). Igual que en cambiar_nombre_usuario (0050).
export const FORMATO_NOMBRE_USUARIO = /^[A-Za-z0-9_.-]{3,20}$/;
export const MENSAJE_FORMATO_NOMBRE_USUARIO =
  "El nombre de usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo (sin espacios).";

// Mantener igual que 0050 (interval '7 days').
export const DIAS_ENTRE_CAMBIOS_DE_NOMBRE = 7;

export const MIN_PASSWORD = 6;
