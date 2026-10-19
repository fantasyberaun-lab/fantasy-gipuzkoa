-- 0090: los mensajes borrados desaparecen del chat de los demás en el siguiente sondeo
-- (8-10 s) en vez de tardar ~2 minutos. Aditiva: no cambia nada de lo existente salvo
-- chat_purgar(), que además limpia esta tabla. Requiere 0089.
--
-- Se guarda solo el id del mensaje borrado (nunca el texto) y la liga, durante 2 días.
-- Los borrados por antigüedad no se anotan (los hace chat_purgar, sobre mensajes que
-- nadie está viendo ya); sí se anotan los borrados por el autor, root, el creador de la
-- liga, una denuncia aceptada o la eliminación de una cuenta.

create table if not exists public.chat_borrados (
  seq        bigint generated always as identity primary key,
  league_id  uuid   not null,
  mensaje_id bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_borrados_liga_seq_idx on public.chat_borrados (league_id, seq);

alter table public.chat_borrados enable row level security;
revoke all on public.chat_borrados from anon, authenticated;

create or replace function public.chat_anotar_borrado()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.created_at >= now() - make_interval(days => greatest(public.chat_cfg('chat_dias_conservacion', 90)::integer, 1)) then
    insert into chat_borrados (league_id, mensaje_id) values (old.league_id, old.id);
  end if;
  return old;
end;
$$;

drop trigger if exists chat_mensajes_anotar_borrado on public.chat_mensajes;
create trigger chat_mensajes_anotar_borrado
  after delete on public.chat_mensajes
  for each row execute function public.chat_anotar_borrado();

-- Sondeo en una sola llamada: mensajes nuevos + ids borrados desde el cursor p_seq.
-- Con p_seq nulo (primera vez) no devuelve borrados: solo fija el cursor al último.
create or replace function public.chat_novedades(p_liga uuid, p_desde bigint, p_seq bigint)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_nuevos jsonb;
  v_borrados jsonb := '[]'::jsonb;
  v_seq bigint := p_seq;
begin
  if not public.chat_puede_leer(p_liga) then
    return jsonb_build_object('ok', false);
  end if;

  select coalesce(jsonb_agg(to_jsonb(n) order by n.id), '[]'::jsonb)
  into v_nuevos
  from public.chat_nuevos(p_liga, p_desde) n;

  if p_seq is null then
    select coalesce(max(seq), 0) into v_seq from chat_borrados;
  else
    select coalesce(jsonb_agg(mensaje_id order by seq), '[]'::jsonb), coalesce(max(seq), p_seq)
    into v_borrados, v_seq
    from (
      select seq, mensaje_id from chat_borrados
      where league_id = p_liga and seq > p_seq
      order by seq
      limit 200
    ) b;
  end if;

  return jsonb_build_object('ok', true, 'nuevos', v_nuevos, 'borrados', v_borrados, 'seq', v_seq);
end;
$$;

revoke all on function public.chat_novedades(uuid, bigint, bigint) from public, anon;
grant execute on function public.chat_novedades(uuid, bigint, bigint) to authenticated;

-- chat_purgar (0089) con una línea más: borra las anotaciones de más de 2 días.
create or replace function public.chat_purgar()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_dias integer := greatest(public.chat_cfg('chat_dias_conservacion', 90)::integer, 1);
  v_dias_den integer := greatest(public.chat_cfg('chat_dias_denuncias', 365)::integer, 1);
  v_lote integer;
  v_mensajes integer := 0;
  v_denuncias integer;
  v_bloqueos integer;
  v_vueltas integer := 0;
begin
  loop
    delete from chat_mensajes
    where id in (
      select id from chat_mensajes
      where created_at < now() - make_interval(days => v_dias)
      limit 5000
    );
    get diagnostics v_lote = row_count;
    v_mensajes := v_mensajes + v_lote;
    v_vueltas := v_vueltas + 1;
    exit when v_lote < 5000 or v_vueltas >= 20;
  end loop;

  delete from chat_denuncias
  where estado <> 'pendiente' and resuelta_en < now() - make_interval(days => v_dias_den);
  get diagnostics v_denuncias = row_count;

  delete from chat_bloqueos where hasta < now() - interval '90 days';
  get diagnostics v_bloqueos = row_count;

  delete from chat_borrados where created_at < now() - interval '2 days';

  return jsonb_build_object('mensajes', v_mensajes, 'denuncias', v_denuncias, 'bloqueos', v_bloqueos);
end;
$$;
