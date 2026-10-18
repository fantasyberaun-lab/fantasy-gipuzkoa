# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Jugadores de ajedrez de Gipuzkoa y su entorno (compañeros de club, amigos), incluidos menores de edad. Juegan en ligas cerradas entre gente que se conoce, sobre todo desde el móvil (PWA) y con frecuencia durante o justo después de las jornadas de los torneos. Su trabajo: gestionar su plantilla, pujar y negociar en el mercado, y seguir la clasificación.

## Product Purpose

Fantasy de ajedrez basado en los Campeonatos de Gipuzkoa Individual (Reglamento V3.1). Cada manager tiene una plantilla de 10 jugadores reales (máximo 6 titulares) que puntúa según resultados y Elo del rival. Lo gestiona el club Gaztelu Beltza Xake Kluba (Beraun Bera Xake Taldea). El éxito es que los jugadores del territorio vuelvan cada jornada a ver sus puntos y mover el mercado.

## Positioning

Los jugadores son personas reales del campeonato local, con puntuación por diferencia de Elo y un mercado completo (pujas, ofertas directas, clausulazos, valor dinámico). Un fantasy genérico no puede copiar que sus protagonistas son vecinos y rivales de los managers.

## Operating Context

Datos importados de Info64 y Chess-Results; Elo FIDE actualizado cada mes; valores de mercado con variación diaria; cierre de jornada y puntos calculados en funciones SQL. Panel root para resultados, torneos y comunicados. Notificaciones y correo de recuperación vía Resend.

## Capabilities and Constraints

- Plantilla, mercado, clasificación, jugadores, torneos, perfiles de managers y notificaciones.
- Interfaz y textos en español, tono cercano, tuteo; modo oscuro soportado.
- PWA hecha a mano, sin dependencias nuevas sin avisar.
- Hay menores: no se muestran datos personales a usuarios no registrados ni fuera de la misma liga; cualquier dato personal nuevo exige revisar la política de privacidad.
- No se expone el email de ningún usuario al navegador.

## Brand Commitments

- Nombre y escudo del club (Gaztelu Beltza Xake Kluba / Beraun Bera Xake Taldea) se mantienen. Ruta de los archivos del escudo: por confirmar.
- Sin otros compromisos visuales vinculantes: la paleta actual de `tailwind.config.ts` es el estado actual, no un requisito.

## Evidence on Hand

Aplicación en producción con usuarios reales y datos de torneos reales. No hay testimonios, métricas de uso ni cifras publicadas que usar: no inventarlas.

## Product Principles

- Los jugadores reales son los protagonistas; la interfaz sirve a la consulta rápida de puntos y plantilla.
- La protección de los menores condiciona cualquier decisión sobre datos y visibilidad.
- Primero móvil: se usa entre partidas y durante torneos.
- Las reglas del reglamento mandan y deben ser legibles para quien juega.
- Tono cercano y local, sin jerga de apuestas.

## Accessibility & Inclusion

Público con menores y uso en móvil: contraste suficiente, tamaños táctiles cómodos y modo oscuro. No se ha establecido un estándar formal.
