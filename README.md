# CineTeca

Catálogo de filmes em português. Descubra filmes, veja trailers e onde assistir no Brasil, e monte suas listas de Favoritos e Salvos.

Os dados de filmes vêm do [TMDB](https://www.themoviedb.org). Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.

## Rodar no seu computador

1. Instale o [Node.js](https://nodejs.org) (versão 20 ou mais nova).
2. Na pasta do projeto, rode `npm install`.
3. Copie `.env.local.example` para `.env.local` e cole o seu token do TMDB depois de `TMDB_READ_TOKEN=`.
4. Rode `npm run dev` e abra http://localhost:3000.

## Testes

- `npm test` — testes unitários.
- `npm run test:e2e` — testes no navegador (computador e celular) com um TMDB simulado. Não precisam de token.
- `npm run typecheck` — confere os tipos do TypeScript.

## Publicar na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Em https://vercel.com, clique em **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, crie `TMDB_READ_TOKEN` com o seu token.
4. Clique em **Deploy**. A cada novo commit no GitHub, a Vercel publica sozinha.

## Onde fica cada coisa

- `lib/tmdb/` — tudo o que fala com o TMDB. Roda só no servidor.
- `lib/lista/` — Favoritos e Salvos. Hoje ficam guardados no navegador; na Fase 2 passam a ficar na conta do usuário.
- `components/` — peças visuais do site.
- `app/` — páginas.
