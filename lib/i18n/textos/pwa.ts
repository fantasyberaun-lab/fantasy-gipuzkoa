import { definirTextos } from "../definir";

// Botón de instalar la app (PWA).
export default definirTextos(
  {
    instalarApp: "Instalar app",
    // iOS: "<antes> ↑<despues>"
    iosAntes: "Pulsa el icono Compartir",
    iosDespues: ' de Safari y luego "Añadir a pantalla de inicio".',
    android: 'Abre el menú (⋮) de Chrome y toca "Añadir a pantalla de inicio" o "Instalar app".',
  },
  {
    eu: {
      instalarApp: "Instalatu aplikazioa",
      iosAntes: "Sakatu Safariko Partekatu ikonoa",
      iosDespues: ' eta gero "Gehitu hasierako pantailan".',
      android:
        'Ireki Chromeko menua (⋮) eta sakatu "Gehitu hasierako pantailan" edo "Instalatu aplikazioa".',
    },
    en: {
      instalarApp: "Install app",
      iosAntes: "Tap Safari's Share icon",
      iosDespues: ' and then "Add to Home Screen".',
      android: 'Open Chrome\'s menu (⋮) and tap "Add to Home screen" or "Install app".',
    },
  }
);
