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

export const VERSION_PRIVACIDAD = "2.2";
export const FECHA_PRIVACIDAD = "19 de octubre de 2026";

export const VERSION_CONDICIONES = "1.1";
export const FECHA_CONDICIONES = "19 de octubre de 2026";

// Chat (migración 0089). Estos números viven también en game_config:
// 'chat_dias_conservacion', 'chat_dias_denuncias' y 'chat_max_denuncias_dia'.
// Si cambias uno, cambia el otro y sube la versión de los textos legales.
export const DIAS_CONSERVACION_CHAT = 90;
export const MESES_CONSERVACION_DENUNCIAS = 12;
export const MAX_DENUNCIAS_DIA_CHAT = 3;

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
