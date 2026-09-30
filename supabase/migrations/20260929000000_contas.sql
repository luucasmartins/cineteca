-- CineTeca Fase 2: perfis e listas de filmes por conta.
-- Aplicar no SQL Editor do Supabase, nos projetos "cineteca" e "cineteca-testes".

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 80),
  criado_em timestamptz not null default now()
);

create table public.filmes_lista (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('favoritos', 'salvos')),
  filme_id integer not null check (filme_id > 0),
  titulo text not null,
  poster_url text,
  ano text,
  nota numeric(3, 1),
  criado_em timestamptz not null default now(),
  primary key (usuario_id, tipo, filme_id)
);

create index filmes_lista_por_data on public.filmes_lista (usuario_id, tipo, criado_em desc);

-- Permissões: visitantes (anon) não acessam nada; contas logadas só o necessário.
revoke all on public.perfis from anon, authenticated;
revoke all on public.filmes_lista from anon, authenticated;
grant select on public.perfis to authenticated;
grant update (nome) on public.perfis to authenticated;
grant select, insert, delete on public.filmes_lista to authenticated;

alter table public.perfis enable row level security;
alter table public.filmes_lista enable row level security;

create policy "perfis: ler o próprio" on public.perfis
  for select to authenticated using ((select auth.uid()) = id);
create policy "perfis: atualizar o próprio" on public.perfis
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "filmes_lista: ler os próprios" on public.filmes_lista
  for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "filmes_lista: inserir os próprios" on public.filmes_lista
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "filmes_lista: apagar os próprios" on public.filmes_lista
  for delete to authenticated using ((select auth.uid()) = usuario_id);

-- Cria o perfil quando a conta nasce (cadastro por e-mail usa "nome"; Google usa "full_name"/"name").
create function public.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
        ''
      ),
      80
    )
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_para_novo_usuario();
