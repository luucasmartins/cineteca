# CineTeca

Catálogo de filmes em português. Descubra filmes, veja trailers e onde assistir no Brasil, crie sua conta e monte suas listas de Favoritos e Salvos.

Os dados de filmes vêm do [TMDB](https://www.themoviedb.org). Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.

## Rodar no seu computador

1. Instale o [Node.js](https://nodejs.org) (versão 20 ou mais nova) e rode `npm install`.
2. Copie `.env.local.example` para `.env.local` e preencha:
   - `TMDB_READ_TOKEN` — token de leitura do TMDB;
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` — do projeto Supabase `cineteca` (Project Settings → API Keys);
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
3. Rode `npm run dev` e abra http://localhost:3000.

O banco (tabelas e regras de segurança) está em `supabase/migrations/`. Para um projeto novo, cole esse SQL no SQL Editor do Supabase.

## Testes

- `npm test` — testes unitários.
- `npm run test:supabase` — confere o banco e as regras de segurança no projeto `cineteca-testes`.
- `npm run test:e2e` — testes no navegador (computador e celular), com TMDB simulado e o projeto `cineteca-testes`.
- `npm run typecheck` — confere os tipos do TypeScript.

Os dois últimos precisam de `.env.test.local`, com as chaves do projeto `cineteca-testes` e `NEXT_PUBLIC_SITE_URL=http://localhost:3100`.

## Publicar na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Em https://vercel.com, clique em **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, crie `TMDB_READ_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `NEXT_PUBLIC_SITE_URL` (o endereço do site).
4. Clique em **Deploy**. A cada novo commit no GitHub, a Vercel publica sozinha.

## Onde fica cada coisa

- `lib/tmdb/` — tudo o que fala com o TMDB. Roda só no servidor.
- `lib/supabase/` — conexão com o banco e com as contas.
- `lib/auth/` — validações, mensagens e as ações de entrar, criar conta e mexer na conta.
- `lib/lista/` — Favoritos e Salvos, guardados na conta do usuário.
- `lib/avaliacoes/` — curtidas dos usuários e o ranking dos mais curtidos.
- `lib/paleta/` e `lib/tmdb/harmonia.ts` — paletas de cores das cenas e o sorteio da página Harmonia de cores.
- `lib/premios/` — prêmios do filme (Oscar, BAFTA, Globo de Ouro e festivais), vindos do Wikidata.
- `lib/tmdb/equipe.ts` e `lib/tmdb/joia.ts` — equipe da Visão & Construção e o sorteio do Fure a bolha.
- `components/` — peças visuais do site.
- `app/` — páginas.
