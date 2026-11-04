import type { Ancho } from "../../definir";

// Menú de ajustes (MenuAjustes), cabecera (EquipoHeader) y enlaces legales.

const es = {
  boton: "Ajustes",
  titulos: {
    inicio: "Ajustes",
    cuenta: "Mi cuenta",
    configuracion: "Configuración",
    legal: "Información legal",
    eliminar: "Eliminar cuenta",
    sugerencias: "Enviar sugerencia",
    redes: "Síguenos",
  },
  redesDetalle: "Instagram, TikTok y web del club",
  redesIntro: "Síguenos para no perderte nada del club.",
  webClub: "Web del club",
  miCuentaDetalle: "Nombre de usuario y contraseña",
  configuracionDetalle: "Idioma, tema claro u oscuro y sonido",
  legalDetalle: "Privacidad, condiciones y contacto",
  panelAdmin: "Panel de administración",
  cerrarSesion: "Cerrar sesión",
  eliminarCuenta: "Eliminar cuenta",
  tema: "Tema",
  temaClaro: "Claro",
  temaOscuro: "Oscuro",
  temaAuto: "Automático",
  temaAutoAyuda: "Automático sigue el modo de tu móvil u ordenador.",
  sonido: "Sonido",
  sonidoActivado: "Activado",
  sonidoSilenciado: "Silenciado",
  sonidoVolumen: "Volumen",
  sonidoEstilo: "Estilo de sonido",
  sonidoSuave: "Suave",
  sonidoArcade: "Arcade",
  sonidoAyuda: "Efectos al abrir cofres, fichar, vender y terminar minijuegos. Se guarda en este dispositivo.",
  privacidad: "Política de privacidad",
  condiciones: "Condiciones de uso",
  contactar: "Contactar con el club",
  // Cabecera
  escudoAlt: "Escudo Beraun",
  todosContraTodos: " · Todos contra todos",
  saldo: "Saldo",
  saldoNegativoTitle:
    "Con el saldo en negativo no puntúas en la jornada. Vende un jugador o espera a recuperar saldo antes de que empiece.",
  saldoNegativo: "No puntuarás si sigues en negativo cuando empiece la jornada",
  cambiarLiga: "Cambiar o crear liga",
  miPerfil: "Mi perfil",
  miPerfilDetalle: "Tus estadísticas",
  cambiarLigaCorto: "Mis ligas",
  cambiarLigaDetalle: "Cambia o crea una",
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;
