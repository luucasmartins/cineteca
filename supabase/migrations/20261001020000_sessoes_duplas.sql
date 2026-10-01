-- CineTeca: Sessão dupla (dois filmes sob um título, pública por link).
-- Aplicar no SQL Editor do Supabase, nos projetos "cineteca" e "cineteca-testes".

create table public.sessoes_duplas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null check (char_length(trim(titulo)) between 1 and 60),
  filme1_id integer not null check (filme1_id > 0),
  filme1_titulo text not null check (char_length(filme1_titulo) <= 300),
  filme1_poster text,
  filme1_ano text,
  filme2_id integer not null check (filme2_id > 0),
  filme2_titulo text not null check (char_length(filme2_titulo) <= 300),
  filme2_poster text,
  filme2_ano text,
  criado_em timestamptz not null default now(),
  check (filme1_id <> filme2_id)
);

create index sessoes_duplas_por_usuario on public.sessoes_duplas (usuario_id, criado_em desc);

revoke all on public.sessoes_duplas from anon, authenticated;
grant select, insert, delete on public.sessoes_duplas to authenticated;

alter table public.sessoes_duplas enable row level security;

create policy "sessoes_duplas: ler as próprias" on public.sessoes_duplas
  for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "sessoes_duplas: inserir as próprias" on public.sessoes_duplas
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "sessoes_duplas: apagar as próprias" on public.sessoes_duplas
  for delete to authenticated using ((select auth.uid()) = usuario_id);
