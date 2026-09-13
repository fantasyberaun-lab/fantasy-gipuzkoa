# Fantasy Campeonatos de Gipuzkoa

Fantasy de ajedrez basado en los Campeonatos de Gipuzkoa Individual
(Reglamento V3.1 adjunto en el proyecto original). Cada manager forma
una plantilla de 6 jugadores, gana puntos según resultados y Elo del
rival, y gestiona un mercado semanal con fichajes, ofertas y
clausulazos.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (Postgres + Auth + Row Level Security)
- **Vercel** para el despliegue
- Pensado como web responsive, instalable como **PWA**

## Estructura del proyecto

```
app/
  (dashboard)/
    layout.tsx        # navegación por pestañas + toggle de tema
    plantilla/         # pestaña "Mi plantilla"
    mercado/            # pestaña "Mercado"
    clasificacion/       # pestaña "Clasificación"
  layout.tsx           # layout raíz (metadata, PWA manifest)
  page.tsx             # redirige a /plantilla

components/            # componentes de UI (PlayerCard, TabNav, ThemeToggle...)

lib/
  types.ts             # tipos de dominio (Jugador, PlantillaSlot, ...)
  gameConfig.ts         # valores por defecto del reglamento (ver más abajo)
  mockData.ts           # datos de ejemplo para desarrollar sin backend
  supabase/
    client.ts            # cliente de Supabase para componentes "use client"
    server.ts             # cliente de Supabase para Server Components

supabase/
  migrations/0001_init.sql  # esquema completo de la base de datos
```

## Cómo se ha traducido el reglamento a datos

- `players`: jugadores reales de ajedrez (nombre, club, categoría, Elo, valor de mercado).
- `matchdays`: jornadas del campeonato.
- `results`: resultado de cada jugador en cada jornada + puntos Fantasy ya calculados.
- `fantasy_teams` / `squad_slots`: equipos de los managers y su plantilla (con historial de altas/bajas).
- `matchday_captains`: el "Jugador de la Jornada" elegido por cada equipo.
- `market_listings` / `bids`: mercado y pujas activas.
- `clause_releases`: clausulazos ejecutados entre managers.
- `operations_log`: registro de fichajes/ventas/ofertas/clausulazos, para poder aplicar el límite de operaciones por periodo.
- `game_config`: aquí es donde vive todo lo que la organización puede querer ajustar sin tocar código (tabla de puntos por diferencia de Elo, presupuesto inicial, límite de operaciones, etc.). De momento en `lib/gameConfig.ts` hay unos valores por defecto en código; el siguiente paso natural es moverlos a esta tabla y construir una pantalla de administración simple para el rol `root`.

Este esquema es un punto de partida para poder empezar a construir ya;
seguramente habrá que ajustar cosas (sobre todo las políticas de RLS)
según vayamos avanzando.

## Puesta en marcha

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Crear un proyecto en [supabase.com](https://supabase.com)** y copiar
   `.env.example` a `.env.local`, rellenando con la URL y la anon key del
   proyecto (Project Settings → API).

3. **Aplicar el esquema de base de datos.** Con la [CLI de
   Supabase](https://supabase.com/docs/guides/cli) instalada y logueada:

   ```bash
   supabase link --project-ref TU_PROJECT_REF
   supabase db push
   ```

   (Alternativamente, se puede pegar el contenido de
   `supabase/migrations/0001_init.sql` directamente en el SQL Editor del
   panel de Supabase.)

4. **Arrancar en local**

   ```bash
   npm run dev
   ```

   Abrir http://localhost:3000 — redirige a `/plantilla`, que de momento
   muestra datos de ejemplo (`lib/mockData.ts`) hasta que conectemos las
   páginas a Supabase de verdad.

5. **Desplegar en Vercel**: importar el repo de GitHub en
   [vercel.com/new](https://vercel.com/new) y añadir las mismas variables
   de entorno de `.env.local` en la configuración del proyecto.

## Siguientes pasos sugeridos

- [ ] Conectar `plantilla/`, `mercado/` y `clasificacion/` a Supabase (quitar `mockData.ts`).
- [ ] Autenticación de managers (Supabase Auth) y creación del `fantasy_team` al registrarse.
- [ ] Mover `gameConfig.ts` a la tabla `game_config` + pantalla de administración para el rol `root`.
- [ ] Lógica de puntuación (calcular `results.puntos_fantasy` a partir de la diferencia de Elo y el resultado).
- [ ] Lógica de mercado: fichar, vender, pujar, aceptar ofertas y clausulazos, respetando el límite de operaciones por periodo.
- [ ] Icono real de la app en `public/icons/` y activar `next-pwa` (o similar) para que sea instalable de verdad.
- [ ] Revisar en detalle las políticas de RLS de `0001_init.sql` antes de ir a producción.

## Notas de diseño

Modo claro/oscuro ya implementado (`ThemeToggle`, clases `dark:` de
Tailwind). La paleta de `tailwind.config.ts` es solo un punto de
partida (verde tablero + neutros) — pendiente de una pasada de diseño
visual más cuidada cuando toque esa fase.
