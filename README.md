# Beraun Fantasy

Fantasy de ajedrez del club Gaztelu Beltza Xake Kluba / Beraun Bera Xake
Taldea, basado en los Campeonatos de Gipuzkoa Individual. Cada manager forma
una plantilla de 10 jugadores reales (máximo 6 titulares), puntúa según los
resultados y el Elo de los rivales y compite en ligas con mercado, pujas,
ofertas y clausulazos.

La aplicación está en producción con usuarios y datos reales de torneos. La
interfaz está disponible en castellano, euskera e inglés.

## Estado actual

### Juego y mercado

- Plantillas de 10 jugadores, titulares por torneo, capitán y blindaje.
- Puntuación por resultado y diferencia de Elo.
- Jornadas, emparejamientos, resultados, cierre de jornada y pagos.
- Clasificación por liga y perfiles de managers.
- Mercado público de compra y venta instantánea.
- Mercado privado por tandas con pujas visibles u ocultas.
- Ofertas directas, clausulazos, subida de cláusula y venta a la máquina.
- Valores de mercado dinámicos con histórico y variación diaria.
- Restricciones de saldo, candados, límites de plantilla y titulares.

### Ligas y comunidad

- Ligas públicas, privadas y territoriales.
- Administración de ligas privadas: tandas, sanciones, expulsiones y
  readmisiones.
- Chat, foros, menciones, respuestas, edición, borrado y reacciones.
- Notificaciones de operaciones, jornadas, comunicados y foros.
- Misiones, niveles, experiencia, tutoriales y rachas diarias.
- Minijuegos, ranking de minijuegos y pronósticos.
- Resumen semanal y buzón de sugerencias.

### Administración y datos

- Panel root para torneos, resultados, comunicados, variables, actividad,
  sugerencias y moderación del chat.
- Importador de Info64 y Chess-Results con emparejamiento por FIDE ID y
  nombre.
- Actualización mensual del Elo FIDE mediante GitHub Actions y script manual.
- Lógica crítica en funciones SQL con RLS y RPC de Supabase.

### Cuenta, privacidad y PWA

- Registro, confirmación por correo, login por email o nombre de usuario y
  recuperación mediante Resend.
- Cambio de usuario, contraseña y avatar.
- Eliminación de cuenta, aceptación de textos legales y protección de
  menores.
- PWA manual con manifest, service worker, caché de estáticos, pantalla
  offline e instalación desde navegador.
- Notificaciones Web Push para ofertas, clausulazos, torneos y comunicados.

## Tecnologías

- Next.js 14 (App Router), React 18 y TypeScript estricto.
- Tailwind CSS 3.
- Supabase Postgres, Auth, RLS, funciones SQL y RPC.
- Vercel Analytics y Speed Insights.
- Resend para recuperación de cuentas.
- Web Push sin SDK adicional.

## Estructura

```text
app/
  (auth)/                 login, registro y recuperación
  (dashboard)/            plantilla, mercado, ligas, torneos y comunidad
  (juegos)/               minijuegos y pronósticos
  (legal)/                condiciones, privacidad y eliminación de cuenta
  admin/                  panel root
  api/                    route handlers
  auth/callback/          retorno de Supabase Auth
components/               componentes de interfaz y juego
lib/
  i18n/                   textos es/eu/en y carga diferida
  importador/             Info64, Chess-Results y emparejamiento
  supabase/               clientes y consultas por área
  legal/                  responsable y versiones legales
  gameConfig.ts           valores de respaldo del reglamento
supabase/migrations/      esquema y lógica de negocio, hasta 0122
scripts/                  Elo FIDE, actualización manual y pruebas
public/                   manifest, service worker, iconos y offline
```

Las consultas de Supabase viven en `lib/supabase/*Queries.ts`. Los
componentes cliente usan `lib/supabase/client.ts`; los Server Components y
route handlers usan `lib/supabase/server.ts`. La service role key solo se usa
en servidor.

## Desarrollo local

Requisitos: Node.js 20 o compatible, npm, un proyecto Supabase y la CLI de
Supabase si se van a aplicar migraciones.

```bash
npm ci
copy .env.example .env.local
npm run dev
```

La aplicación se sirve en <http://localhost:3000>.

Comandos disponibles:

```bash
npm run dev
npm run build
npm run lint
npm run test:importador
npm run supabase:types
supabase db push
```

No se deben guardar secretos en el repositorio. Los valores reales van en
`.env.local`, Vercel o los secrets de GitHub Actions.

## Variables de entorno

Consulta `.env.example`. Las variables principales son:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_PROJECT_ID`.
- `NEXT_PUBLIC_SITE_URL`.
- `RESEND_API_KEY` y `EMAIL_FROM`.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`.
- `CRON_SECRET`.

La URL pública debe ser una URL absoluta válida. Si no se define, la
aplicación usa `https://fantasy.beraunberaxake.com`.

## Base de datos y tareas operativas

Las migraciones están numeradas y no se deben editar después de aplicarlas:
para cualquier cambio se crea una nueva migración. La versión actual del
repositorio llega a `0122_clasificacion_solo_tu_liga.sql`.

Algunas tareas se activan desde Supabase y no desde una migración:

- Programar la variación diaria de valores.
- Activar `pg_net` y el cron del despacho de Web Push.
- Guardar el secreto del cron en Vault.
- Comprobar las políticas RLS después de aplicar migraciones.

La actualización de Elo se ejecuta automáticamente mediante
`.github/workflows/actualizar-elo.yml` y requiere los secrets
`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

## Verificación

Antes de subir cambios:

```bash
npm run lint
npm run build
npm run test:importador
```

Además, se debe revisar el diff y probar manualmente los flujos afectados en
móvil y escritorio. No hay todavía una suite general end-to-end: las áreas
más importantes para ampliar la cobertura son mercado, permisos/RLS, cierre
de jornada, administración de ligas y notificaciones push.

## Reglas de producto

- Los textos visibles de la aplicación deben vivir en las tres carpetas de
  idioma de `lib/i18n/textos/{es,eu,en}`.
- Una sección nueva de textos se registra en los tres `index.ts`.
- Las reglas configurables deben mantenerse sincronizadas entre
  `lib/gameConfig.ts` y las funciones SQL correspondientes.
- Los datos personales solo se muestran a usuarios registrados y dentro de
  la liga permitida.
- No se debe exponer ningún email ni ninguna clave secreta al navegador.
