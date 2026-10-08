# Fantasy Beraun Bera (repo: fantasy-gipuzkoa)

Fantasy de ajedrez basado en los Campeonatos de Gipuzkoa Individual (Reglamento V3.1).
Cada manager tiene una plantilla de jugadores reales, puntúa según resultados y Elo del rival,
y juega un mercado con pujas, ofertas directas y clausulazos. Lo gestiona el club
Gaztelu Beltza Xake Kluba (Beraun Bera Xake Taldea). Idioma de la app, del código de dominio
y de los comentarios: **español**. Responde siempre en español.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS 3
- Supabase: Postgres + Auth + RLS + funciones SQL + pg_cron
- Vercel (despliegue automático desde GitHub) + `@vercel/analytics`
- Resend: correo de recuperación de cuenta (llamada directa a su API, sin SDK)
- PWA montada a mano (`public/sw.js`, `manifest.json`, `components/PwaProvider.tsx`), sin `next-pwa`
- GitHub Actions: `.github/workflows/actualizar-elo.yml` (Elo FIDE mensual)

## Comandos

```bash
npm install
npm run dev                # http://localhost:3000
npm run build              # ejecutar antes de subir cambios grandes
npm run lint
npm run test:importador    # pruebas sin red del importador (tsx scripts/test-importador.ts)
npm run supabase:types     # regenera lib/supabase/database.types.ts (necesita SUPABASE_PROJECT_ID)
supabase db push           # aplica migraciones nuevas al proyecto enlazado
```

No hay suite de tests general: la verificación es `npm run build` + `npm run lint` + prueba manual.

## Estructura

```
app/
  (auth)/        login, registro, recuperar
  (dashboard)/   plantilla, mercado, clasificacion, jugadores, torneos, managers/[id], notificaciones
  (legal)/       condiciones, privacidad
  admin/         panel root: resultados, torneos, comunicados, actividad
  api/           login, recuperar, importador, actividad (route handlers)
  auth/callback/ retorno de Supabase Auth
components/      UI (client y server); components/legal/ para RGPD y aceptaciones
lib/
  gameConfig.ts  parámetros del reglamento en código (ver "Reglas que viven en dos sitios")
  types.ts       tipos de dominio
  supabase/      client.ts, server.ts, middleware.ts + *Queries.ts por área
  importador/    lectores de Info64 y Chess-Results, emparejado de jugadores
  legal/         datos del responsable y versiones de los textos legales
scripts/         fide-elo.mjs (Elo FIDE), actualizar-elo.sh (manual), test-importador.ts
supabase/migrations/   0001 … 0074, la lógica de negocio vive aquí
middleware.ts    refresca la sesión de Supabase en cada petición
```

Alias de imports: `@/*` apunta a la raíz del repo.

## Convenciones

- **Dos clientes de Supabase**: `lib/supabase/client.ts` en componentes `"use client"`,
  `lib/supabase/server.ts` en Server Components y route handlers. No mezclarlos.
- Las consultas van en `lib/supabase/*Queries.ts`, no sueltas en componentes.
- La **service role key** solo se usa en servidor (`app/api/*`, `lib/recuperacion.ts`, scripts).
  Nunca en componentes cliente ni en variables `NEXT_PUBLIC_*`.
- La lógica de negocio crítica (fichajes, pujas, puntos, valores, cierre de jornada) está en
  **funciones SQL** (`security definer`, ejecutadas vía RPC), no en el frontend. Si cambias una
  regla, cambia la función SQL.
- Tailwind con modo oscuro (`dark:`). Mantén la paleta de `tailwind.config.ts`.
- TypeScript estricto: no uses `any` salvo que sea inevitable y comentado.
- Textos de la interfaz en español, tono cercano, tuteo.

## Migraciones de base de datos (lo más delicado)

- Las migraciones están numeradas (`0001_…` a `0074_…`). **Nunca edites una migración ya aplicada**:
  crea la siguiente (`0075_nombre_corto.sql`) con `create or replace function`, `if not exists`, etc.
- Cada migración lleva un comentario inicial explicando qué hace y por qué (sigue ese estilo).
- Toda tabla nueva: **RLS activada** y políticas explícitas. Una tabla con RLS y sin políticas
  es intencionada cuando solo debe tocarla la service role (ejemplo: `recuperaciones_cuenta`).
- El rol admin es `profiles.rol = 'root'`, comprobado con `public.es_root()` en las políticas.
- Funciones que solo debe llamar el servidor: `revoke` a `public/anon/authenticated` y `grant` solo
  a `service_role`.
- Los cron jobs (pg_cron) **no** los programan las migraciones: se dejan documentados al final del
  archivo y se activan a mano en Supabase.
- Antes de proponer una migración, avisa de su impacto en datos existentes y de si hay que
  lanzarla a mano en el SQL Editor o con `supabase db push`.

## Reglas que viven en dos sitios (mantener sincronizadas)

Algunos valores del reglamento están en `lib/gameConfig.ts` **y** en una función SQL. Si cambias
uno, cambia el otro y dilo en la respuesta:

| Regla | `gameConfig.ts` | SQL |
|---|---|---|
| Máx. titulares por equipo | `plantilla.maximoTitulares` | `validar_max_titulares()` (0050) |
| Máx. titulares por torneo | `plantilla.maximoTitularesPorTorneo` | `validar_titulares_por_torneo()` (0048) |
| Puntos por descanso | `puntosPorDescanso` | `puntos_descanso()` (0023) |
| Multiplicador capitán | `capitan.multiplicador` | `multiplicador_capitan()` (0033) |
| Blindaje (% del valor) | `blindaje.porcentaje` | `porcentaje_blindaje()` (0033) |

Puntos por partida: según diferencia de Elo (tabla en `gameConfig.puntuacionPorDiferenciaElo`).
Valor de mercado dinámico: ver 0041 (K = 4 %, suelo 10 M, variación diaria con pg_cron).

## Variables de entorno

Plantilla en `.env.example`; los valores reales van en `.env.local` (ignorado por git) y en
Vercel → Settings → Environment Variables.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: públicas
- `SUPABASE_SERVICE_ROLE_KEY`: **secreta**, solo servidor
- `SUPABASE_PROJECT_ID`: para generar tipos
- `RESEND_API_KEY`, `EMAIL_FROM`: correo (dominio verificado en Resend)
- `NEXT_PUBLIC_SITE_URL`: URL pública para enlaces en correos
- GitHub Actions usa los secrets `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

**Nunca** escribas, muestres ni subas claves reales. Si ves una en un archivo, avísame.

## Flujo de trabajo con Git

- Trabaja en una rama (`git switch -c feature/nombre`) y no directamente en `main`;
  Vercel crea una preview por rama y `main` publica en producción.
- Antes de commitear: `npm run build` y `npm run lint` sin errores, y revisa `git diff`.
- Commits pequeños, mensaje en español, en imperativo y descriptivo.
- No hagas `git push` ni `supabase db push` sin que te lo pida.

## Datos legales y RGPD (hay menores entre los usuarios)

- Datos del responsable y versiones de documentos en `lib/legal/config.ts`. Si cambias el texto
  de `condiciones.ts` o `privacidad.ts`, **sube la versión** allí: la app volverá a pedir
  aceptación (`LegalGate`).
- Hay protección específica de menores (migración 0031) y consentimientos (0045). No muestres datos
  personales a usuarios no registrados ni fuera de la misma liga.
- Cualquier dato personal nuevo exige revisar la política de privacidad.

## Cosas que NO hacer

- No expongas el email de un usuario al navegador: el login por nombre de usuario se resuelve en
  servidor (`app/api/login`) para no revelar qué usuarios existen.
- No desactives RLS "para que funcione": arregla la política.
- No añadas dependencias nuevas sin avisar (el proyecto evita deps innecesarias: PWA a mano,
  Resend sin SDK).
- No toques `public/sw.js` sin comprobar el comportamiento offline y la caché.

## Notas

- El `README.md` está parcialmente desactualizado (habla de `mockData.ts` y de plantilla de 6;
  la plantilla real es de 10 con máximo 6 titulares). Fíate de este archivo, del código y de las
  migraciones.
- `scripts/actualizar-elo.sh` es la alternativa manual al workflow de Elo; pide la clave por
  teclado, no la guardes en el script.
