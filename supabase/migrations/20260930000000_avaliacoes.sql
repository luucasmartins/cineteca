-- CineTeca Fase 3: avaliações (curti / não curti) e ranking.
-- Aplicar no SQL Editor do Supabase, nos projetos "cineteca" e "cineteca-testes".

create table public.avaliacoes (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  filme_id integer not null check (filme_id > 0),
  curtiu boolean not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, filme_id)
);

create index avaliacoes_por_filme on public.avaliacoes (filme_id);

-- Cópia dos dados de exibição dos filmes votados. Só o servidor escreve aqui.
create table public.filmes_avaliados (
  filme_id integer primary key check (filme_id > 0),
  titulo text not null check (char_length(titulo) <= 300),
  poster_url text,
  ano text,
  atualizado_em timestamptz not null default now()
);

revoke all on public.avaliacoes from anon, authenticated;
revoke all on public.filmes_avaliados from anon, authenticated;
grant select, insert, delete on public.avaliacoes to authenticated;
grant update (curtiu, atualizado_em) on public.avaliacoes to authenticated;
grant select on public.filmes_avaliados to anon, authenticated;

alter table public.avaliacoes enable row level security;
alter table public.filmes_avaliados enable row level security;

create policy "avaliacoes: ler as próprias" on public.avaliacoes
  for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "avaliacoes: inserir as próprias" on public.avaliacoes
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "avaliacoes: atualizar as próprias" on public.avaliacoes
  for update to authenticated using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);
create policy "avaliacoes: apagar as próprias" on public.avaliacoes
  for delete to authenticated using ((select auth.uid()) = usuario_id);

create policy "filmes_avaliados: qualquer um lê" on public.filmes_avaliados
  for select to anon, authenticated using (true);

-- security_invoker = false é proposital: a visão precisa somar votos de todo mundo,
-- que a RLS esconde. Ela devolve só números agregados, nunca quem votou.
create view public.ranking_filmes with (security_invoker = false) as
  select
    f.filme_id,
    f.titulo,
    f.poster_url,
    f.ano,
    count(*)::int as votos,
    count(*) filter (where a.curtiu)::int as curtidas,
    round(count(*) filter (where a.curtiu) * 100.0 / count(*))::int as aprovacao
  from public.avaliacoes a
  join public.filmes_avaliados f on f.filme_id = a.filme_id
  group by f.filme_id, f.titulo, f.poster_url, f.ano
  having count(*) >= 3
  order by aprovacao desc, votos desc, f.filme_id;

grant select on public.ranking_filmes to anon, authenticated;
