// Datos del responsable y versiones de los textos legales.
// Si se cambia el texto de un documento, sube su versión aquí: la app volverá
// a pedir la aceptación a los usuarios ya registrados (ver LegalGate).

export const RESPONSABLE = {
  razonSocial: "Gaztelu Beltza Xake Kluba",
  nombreComercial: "Beraun Bera Xake Taldea",
  cif: "G25942632",
  domicilio: "Calle Beraun 27, bajo, 20100 Errenteria (Gipuzkoa)",
  email: "beraunberaajedrez@gmail.com",
  web: "www.beraunberaxake.com",
  aplicacion: "Fantasy Beraun Bera",
} as const;

export const VERSION_PRIVACIDAD = "2.1";
export const FECHA_PRIVACIDAD = "4 de octubre de 2026";

export const VERSION_CONDICIONES = "1.0";
export const FECHA_CONDICIONES = "30 de septiembre de 2026";

// REVISAR antes de publicar: en el documento original estos dos datos estaban
// entre corchetes (pendientes de rellenar).
export const PLAZO_INACTIVIDAD = "dos temporadas consecutivas";
export const PROVEEDORES_TECNOLOGICOS =
  "Supabase (base de datos y autenticación) y Vercel (alojamiento web)";

// Tipos de aceptación que se guardan en la tabla `consentimientos`.
export type TipoConsentimiento =
  | "condiciones"
  | "privacidad"
  | "mayor_14"
  | "comunicaciones";
