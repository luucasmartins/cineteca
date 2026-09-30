@AGENTS.md

# CineTeca

Catálogo público de filmes em pt-BR, com dados do TMDB e visual escuro no estilo streaming.

- **Produção:** https://cineteca-gules.vercel.app (Vercel, publica sozinha a cada push no `master`).
- **Repositório:** github.com/luucasmartins/cineteca (privado).
- **Dono:** não programa. Fale com ele em português, com passos de clique em clique nos painéis (Vercel, Supabase, Google). **Nunca peça segredos no chat:** diga exatamente em qual arquivo ou campo do painel ele deve colar.

## Como trabalhar com o dono

- **Seja direto.** Entregue o resultado, sem repetir o pedido nem enrolar.
- **Terminal é seu trabalho.** Rode você mesmo instalação, testes, typecheck, build e scripts. Só peça ação manual quando for impossível por ferramenta: login em painel, 2FA, clique em UI externa ou enviar ao GitHub.
- **Opções sempre com recomendação:** qual e por quê, em uma linha. Em decisão técnica relevante, prós e contras por opção. Pergunta simples não vira análise gigante.
- **Decisões no final.** O que depender dele fica num bloco separado no fim da resposta:

  ```
  ---
  Preciso de você:
  - <pergunta ou decisão, com recomendação em uma linha>
  ---
  ```

- **Não declare "pronto" sem verificar.** Rode os testes e, quando a mudança for visível, confira no site local.
- **Se faltar variável de ambiente**, diga qual e em qual arquivo ou painel ela entra. Não invente valor.

## Mudanças no código

- Menor diff que resolve. Siga o estilo existente e não refatore código vizinho sem pedido.
- Comentários só para lógica não óbvia.
- Crie e edite só dentro do projeto. Temporários ficam fora do repositório (pasta de rascunho da sessão).
- Não apague arquivos que você não criou nesta sessão.
- **Git:** commit só quando o dono pedir, ou por tarefa ao executar um plano aprovado (como o da Fase 2). Uma mudança lógica por commit, mensagem dizendo o que mudou e por quê. Nunca `push --force` no `master`.
- **Tarefas longas:** siga o checklist do plano em `docs/superpowers/plans/` e marque o que foi feito. Se a conversa ficar longa com trabalho pendente, grave um handoff (estado atual + próximo passo) num `.md` no projeto.
- Mantenha este arquivo enxuto: procedimentos longos vão para `docs/` ou skills.

## Fases

- **Fase 1 — concluída e no ar.** Catálogo, busca, gênero, detalhes, Minha lista no `localStorage`.
  - Spec: `docs/superpowers/specs/2026-09-29-catalogo-filmes-fase1-design.md`
- **Fase 2 — spec e plano aprovados, implementação não iniciada.** Contas no Supabase (e-mail + senha e Google) e listas na conta.
  - Spec: `docs/superpowers/specs/2026-09-29-cineteca-fase2-contas-design.md`
  - Plano: `docs/superpowers/plans/2026-09-29-cineteca-fase2.md`
  - As Tasks 2 e 10 são feitas com o dono. Implemente em um branch (`fase-2`), não direto no `master`.

## Stack

- Next.js 16.3 (App Router), React 19, TypeScript 7, Tailwind v4.
- Testes: Vitest 5 (unitários) e Playwright (ponta a ponta, desktop + celular).
- Hospedagem: Vercel. Node 24 no Windows.

## Comandos

- `npm run dev` — site local em http://localhost:3000. Usa o `.env.local`.
- `npm test` — testes unitários.
- `npm run typecheck` — `next typegen` + `tsc`.
- `npm run test:e2e` — Playwright. Sobe um TMDB simulado (porta 4010), faz `next build` e roda `next start` na porta 3100.

## Estrutura

- `lib/tmdb/` — único ponto que fala com o TMDB, somente no servidor (`server-only`). O token não pode chegar ao navegador.
- `lib/lista/` — Favoritos e Salvos, atrás da interface assíncrona `ListaStore`. A Fase 2 troca a implementação sem mexer nas telas.
- `app/api/filmes/route.ts` — rota interna usada pela rolagem infinita e pela busca.
- `components/` — um componente por arquivo. Estilos compartilhados ficam em `components/estilos.ts`: `CONTEUDO`, `BOTAO_PRIMARIO`, `BOTAO_SECUNDARIO`.
- `app/(inicio)/` — página inicial (grupo de rotas com `loading.tsx` próprio).
- `e2e/mock-tmdb/` — dados e servidor do TMDB simulado.

## Regras do projeto

- **Texto:** tudo na tela em pt-BR. Chamadas ao TMDB usam `language=pt-BR` e `region=BR`. Só filmes, nada de séries.
- **Cores e fonte:**
  - fundo `#0B0B0F` e superfícies `#16161D`;
  - destaque vermelho `#D7263D`, hover `#B01E32`;
  - fonte Manrope.
  - Nunca use o logo ou o nome da Netflix.
- **Atribuição do TMDB:** obrigatória pelos termos de uso. Fica no rodapé, discreta. O dono pediu para remover e aceitou a versão discreta, então não remova. O crédito da JustWatch fica em "Onde assistir".
- **Imagens:** use `<img>` simples, não `next/image`. Se a imagem pode faltar, use `ImagemComReserva`.
- **Erros:** falhas do TMDB são registradas uma vez em `tmdbFetch`, com o prefixo `[CineTeca]`. Nunca registre tokens, chaves, senhas ou cabeçalhos.
- **Commits:** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Armadilhas conhecidas

- **Next 16:**
  - `params` e `searchParams` são `Promise`.
  - O antigo `middleware.ts` agora se chama `proxy.ts`.
  - Em `error.tsx`, use `retry` (busca de novo), não `reset`.
  - Na dúvida, leia `node_modules/next/dist/docs/`.
- **Vitest:** hooks (`beforeEach`, `afterEach`...) precisam de corpo em bloco `{ ... }`. Um valor retornado vira teardown e é chamado sem argumentos.
- **TypeScript 7:** a variável do `catch` é `unknown`, então faça um cast quando precisar.
- **Playwright:**
  - Use `getByText` para mensagens. O Next injeta um anunciador de rota com `role="alert"`.
  - Durante o streaming existe uma cópia escondida do conteúdo. Se um texto casar duas vezes, use `.filter({ visible: true })`.
  - Use `exact: true` quando um nome é substring de outro ("Ação" e "Animação").
  - Os testes que conferem um filme específico no banner usam `page.emulateMedia({ reducedMotion: 'reduce' })` para que ele não troque sozinho.
- **Windows:**
  - Use PowerShell 5.1 (sem `&&`) ou Git Bash.
  - O caminho do projeto tem espaço e acento, então coloque-o sempre entre aspas.
  - O "Acesso controlado a pastas" do Windows Defender bloqueava o `.git` na Área de Trabalho; o dono desativou.
- **GitHub:** o `gh` não está instalado e o terminal do Claude não consegue abrir o login do Git. Para enviar ao GitHub, o dono usa o painel Controle do Código-Fonte do VS Code.

## Variáveis de ambiente

Os arquivos `.env*.local` e `.env` ficam fora do git.

- **`.env.local`** (desenvolvimento): `TMDB_READ_TOKEN`, com o token real do dono.
  - Na Fase 2 entram também `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `NEXT_PUBLIC_SITE_URL`.
- **Vercel:** as mesmas variáveis, com os valores de produção.
- **`.env.test.local`** (a partir da Fase 2): chaves do projeto Supabase `cineteca-testes`, usadas pelo e2e e por `npm run test:supabase`.
- Nunca leia nem imprima o conteúdo desses arquivos. Para conferir se uma variável está preenchida, use um `Select-String` que devolve só verdadeiro ou falso.
