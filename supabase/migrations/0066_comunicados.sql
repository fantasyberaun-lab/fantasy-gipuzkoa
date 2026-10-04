-- 0066: comunicados del administrador para todos los jugadores.
--
-- Son mensajes redactados a mano (a diferencia de las notificaciones, que se
-- generan solas con las operaciones de los managers). Se ven en la pestaña
-- "Avisos" de todas las ligas, incluida la pública.
--
--   - etiqueta: Importante, Actualización, Novedad, Aviso, Mercado, Torneo.
--   - caduca_en: cuándo deja de verse. null = sin caducidad.
--   - fijado: se muestra siempre arriba.
--
-- Lectura: cualquier usuario autenticado, solo los vigentes. El root los ve
-- todos (incluidos los caducados) para poder editarlos o republicarlos.
-- Escritura: solo root (es_root, 0005).

create table if not exists public.comunicados (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  cuerpo text not null check (char_length(btrim(cuerpo)) between 1 and 4000),
  etiqueta text not null default 'aviso'
    check (etiqueta in ('importante', 'actualizacion', 'novedad', 'aviso', 'mercado', 'torneo')),
  fijado boolean not null default false,
  created_at timestamptz not null default now(),
  caduca_en timestamptz
);

create index if not exists comunicados_vigentes_idx
  on public.comunicados (created_at desc);

alter table public.comunicados enable row level security;

drop policy if exists "ver comunicados vigentes" on public.comunicados;
create policy "ver comunicados vigentes" on public.comunicados
  for select to authenticated
  using (caduca_en is null or caduca_en > now() or public.es_root());

drop policy if exists "root gestiona comunicados" on public.comunicados;
create policy "root gestiona comunicados" on public.comunicados
  for all to authenticated
  using (public.es_root()) with check (public.es_root());

-- Para que los managers vean los comunicados nuevos al instante (Realtime).
do $$
begin
  alter publication supabase_realtime add table public.comunicados;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Comunicado de ejemplo: la actualización de Elo de octubre de 2026 (14 días).
-- Bórralo desde Admin > Comunicados si no lo quieres.
insert into public.comunicados (titulo, cuerpo, etiqueta, fijado, caduca_en)
select
  'Elo y valores actualizados · octubre de 2026',
  'Se ha actualizado el Elo de 54 jugadores con la nueva lista de la FIDE y su valor de mercado se ha reajustado.',
  'importante',
  true,
  now() + interval '14 days'
where not exists (select 1 from public.comunicados);
