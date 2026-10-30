-- 0113: suscripciones de notificaciones push (Web Push / PWA).
--
-- Fase 0 del plan de engagement. Permite que la app avise al manager aunque no
-- la tenga abierta (puja recibida, clausulazo, movimiento de mercado, resumen
-- semanal, nueva jornada). El envío real lo hace el servidor con la librería
-- `web-push` y la service role key; aquí solo se guardan las suscripciones del
-- navegador (endpoint + claves) y se controla quién puede tocarlas.
--
-- Cada navegador en el que el manager activa los avisos crea una suscripción.
-- Un mismo usuario puede tener varias (móvil, portátil). El endpoint es único:
-- si el navegador renueva su suscripción, se actualiza la fila por endpoint.
--
-- Nadie envía desde el cliente: solo el route handler /api/push/despachar, que
-- usa la service role key. El cliente solo da de alta y de baja SU suscripción.
--
-- Impacto en datos existentes: ninguno. Solo crea una tabla nueva. Se puede
-- lanzar con `supabase db push` o pegándola en el SQL Editor.

create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  creada_en timestamptz not null default now(),
  usada_en timestamptz
);

create index if not exists push_suscripciones_user_idx
  on public.push_suscripciones (user_id);

alter table public.push_suscripciones enable row level security;

-- El manager solo ve y gestiona SUS suscripciones. El envío (service role) se
-- salta la RLS, así que no necesita política.
drop policy if exists "ver mis suscripciones push" on public.push_suscripciones;
create policy "ver mis suscripciones push" on public.push_suscripciones
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "alta de mi suscripcion push" on public.push_suscripciones;
create policy "alta de mi suscripcion push" on public.push_suscripciones
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "actualizar mi suscripcion push" on public.push_suscripciones;
create policy "actualizar mi suscripcion push" on public.push_suscripciones
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "baja de mi suscripcion push" on public.push_suscripciones;
create policy "baja de mi suscripcion push" on public.push_suscripciones
  for delete to authenticated
  using (user_id = auth.uid());
