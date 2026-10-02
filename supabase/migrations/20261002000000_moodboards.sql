-- CineTeca: Moodboards de cenas. Só o dono acessa pelo banco; a página pública lê pelo servidor.
-- Aplicar no SQL Editor do Supabase, nos projetos "cineteca-testes" e "cineteca".

create table public.moodboards (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null check (char_length(trim(titulo)) between 1 and 60),
  descricao text check (descricao is null or char_length(descricao) <= 200),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index moodboards_por_usuario on public.moodboards (usuario_id, criado_em desc);

revoke all on public.moodboards from anon, authenticated;
grant select, insert, delete on public.moodboards to authenticated;
grant update (titulo, descricao, atualizado_em) on public.moodboards to authenticated;

alter table public.moodboards enable row level security;

create policy "moodboards: ler os próprios" on public.moodboards
  for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "moodboards: inserir os próprios" on public.moodboards
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "moodboards: alterar os próprios" on public.moodboards
  for update to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);
create policy "moodboards: apagar os próprios" on public.moodboards
  for delete to authenticated using ((select auth.uid()) = usuario_id);

create table public.moodboard_cenas (
  moodboard_id uuid not null references public.moodboards (id) on delete cascade,
  filme_id integer not null check (filme_id > 0),
  caminho_imagem text not null check (caminho_imagem ~ '^/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$'),
  titulo_filme text not null check (char_length(titulo_filme) <= 300),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  primary key (moodboard_id, filme_id, caminho_imagem)
);

revoke all on public.moodboard_cenas from anon, authenticated;
grant select, insert, delete on public.moodboard_cenas to authenticated;

alter table public.moodboard_cenas enable row level security;

create policy "moodboard_cenas: ler as do próprio moodboard" on public.moodboard_cenas
  for select to authenticated using (
    exists (select 1 from public.moodboards m
            where m.id = moodboard_cenas.moodboard_id and m.usuario_id = (select auth.uid()))
  );
create policy "moodboard_cenas: inserir no próprio moodboard" on public.moodboard_cenas
  for insert to authenticated with check (
    exists (select 1 from public.moodboards m
            where m.id = moodboard_cenas.moodboard_id and m.usuario_id = (select auth.uid()))
  );
create policy "moodboard_cenas: apagar do próprio moodboard" on public.moodboard_cenas
  for delete to authenticated using (
    exists (select 1 from public.moodboards m
            where m.id = moodboard_cenas.moodboard_id and m.usuario_id = (select auth.uid()))
  );
