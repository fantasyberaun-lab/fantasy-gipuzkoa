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
supabase/migrations/   0001 … 0103, la lógica de negocio vive aquí (misiones: 0103, el catálogo de escalones y XP está en misiones_catalogo())
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
| Máx. titulares por equipo | `plantilla.maximoTitulares` (valor por defecto) | variable `plantilla_max_titulares` (0092/0094; `validar_max_titulares()` la lee) |
| Máx. titulares por torneo | `plantilla.maximoTitularesPorTorneo` (valor por defecto) | variable `plantilla_max_titulares_torneo` (0092/0094) |
| Puntos por descanso | `puntosPorDescanso` | variable `puntos_descanso` (0092/0094; `puntos_descanso()` la lee) |
| Multiplicador capitán | `capitan.multiplicador` | variable `capitan_multiplicador` (0096; `multiplicador_capitan()` la lee, global) |
| Blindaje (% del valor) | `blindaje.porcentaje` | variable `blindaje_porcentaje` (0096; `porcentaje_blindaje()` la lee, global) |
| Cláusula (% de lo pagado; sin pago, del valor) | `clausula.porcentaje` | variable `clausula_porcentaje` (0096/0111; `calcular_clausula()`, usada por `pagar_clausula_privada`, `player_status` y `fetchMiPlantilla`) |
| Subida de cláusula | `subidaClausula.multiplicador` | variable `clausula_multiplicador_subida` (0096; `subir_clausula`) |
| Tamaño de plantilla | `plantilla.tamanoPlantilla` | variable `plantilla_tamano` (0096; `validar_composicion_plantilla`) |
| Valor de la plantilla inicial (400 M) | — | variable `plantilla_inicial_valor_max` (0097; `asignar_plantilla_inicial`) |
| Puntos por diferencia de Elo | `puntuacionPorDiferenciaElo` | variable `puntos_por_diferencia_elo` (0096; `calcular_puntos_resultado`) |
| Horas de tanda del mercado (1, 2 o 3 al día) | `horasTandaMercado()` en `lib/mercadoCountdown.ts` | variable `mercado_tandas_dia` (0100; `horas_mercado()`, `pujas_ocultas(liga)`; la cambia también el administrador de la liga) |

Todas esas filas se editan desde Admin > Variables (global o por liga, según la variable) y la base de
datos las lee de la tabla: el valor de `gameConfig.ts` solo es el de respaldo, y el frontend usa el de
`reglas_liga()` (`lib/reglasJuego.ts`). Excepciones: "Límite de operaciones por periodo" sigue sin
aplicarse en ninguna función (solo lectura en el panel), y los textos de ayuda de las reglas
("Cómo funciona el juego") con la tabla de puntos por Elo son fijos.

Territorios (0093/0095): cada provincia o comunidad tiene su liga pública (`leagues.ambito/region`,
una pública por territorio). Las ligas existentes y las privadas son Gipuzkoa. Las demás están en
estado `prueba` (solo root). El selector del formulario de liga está en `lib/territorios.ts`.

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
