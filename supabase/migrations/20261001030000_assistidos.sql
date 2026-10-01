-- CineTeca: Diário pessoal (Assisti).
-- Aplicar no SQL Editor do Supabase, nos projetos "cineteca" e "cineteca-testes".

create table public.assistidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  filme_id integer not null check (filme_id > 0),
  assistido_em date not null check (assistido_em >= '1895-01-01' and assistido_em <= current_date + 1),
  anotacao text check (anotacao is null or char_length(anotacao) <= 500),
  titulo text not null check (char_length(titulo) <= 300),
  poster_url text,
  ano text,
  diretores jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now()
);

create index assistidos_por_data on public.assistidos (usuario_id, assistido_em desc);
create index assistidos_por_filme on public.assistidos (usuario_id, filme_id);

revoke all on public.assistidos from anon, authenticated;
grant select, insert, delete on public.assistidos to authenticated;
grant update (assistido_em, anotacao) on public.assistidos to authenticated;

alter table public.assistidos enable row level security;

create policy "assistidos: ler os próprios" on public.assistidos
  for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "assistidos: inserir os próprios" on public.assistidos
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "assistidos: atualizar os próprios" on public.assistidos
  for update to authenticated using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);
create policy "assistidos: apagar os próprios" on public.assistidos
  for delete to authenticated using ((select auth.uid()) = usuario_id);
