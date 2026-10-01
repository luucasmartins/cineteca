@AGENTS.md

# CineTeca

Catálogo de filmes em pt-BR, com dados do TMDB, contas de usuário e visual escuro no estilo streaming.

- **Produção:** https://cineteca-gules.vercel.app (Vercel, publica sozinha a cada push no `master`).
- **Repositório:** github.com/luucasmartins/cineteca — **público** desde 2026-09-30. Nenhum segredo no histórico (auditado). Continue sem commitar chaves.
- **Dono:** não programa. Fale com ele em português, com passos de clique em clique nos painéis (Vercel, Supabase, Google). **Nunca peça segredos no chat:** diga exatamente em qual arquivo ou campo do painel ele deve colar.

## Como trabalhar com o dono

- **Seja direto.** Entregue o resultado, sem repetir o pedido nem enrolar.
- **Terminal é seu trabalho.** Rode você mesmo instalação, testes, typecheck, build e scripts. Só peça ação manual quando for impossível por ferramenta: login em painel, 2FA, clique em UI externa ou merge do Pull Request.
- **Um passo de cada vez nos painéis.** Ele pediu isso explicitamente. Peça o print e confirme antes do próximo.
- **Verifique em vez de perguntar.** Dá para conferir muita coisa daqui: `curl` no site publicado, consulta ao Supabase com a chave secreta do `.env.local`, leitura do log do servidor de desenvolvimento. Prefira medir a pedir que ele descreva.
- **Opções sempre com recomendação:** qual e por quê, em uma linha. Em decisão técnica relevante, prós e contras por opção.
- **Decisões no final.** O que depender dele fica num bloco separado no fim da resposta:

  ```
  ---
  Preciso de você:
  - <pergunta ou decisão, com recomendação em uma linha>
  ---
  ```

- **Não declare "pronto" sem verificar.** Rode os testes e, quando a mudança for visível, confira no site.
- **Se faltar variável de ambiente**, diga qual e em qual arquivo ou painel ela entra. Não invente valor.

## Mudanças no código

- Menor diff que resolve. Siga o estilo existente e não refatore código vizinho sem pedido.
- Comentários só para lógica não óbvia.
- Crie e edite só dentro do projeto. Temporários ficam fora do repositório (pasta de rascunho da sessão).
- Não apague arquivos que você não criou nesta sessão.
- **Git:** commit só quando o dono pedir, ou por tarefa ao executar um plano aprovado. Uma mudança lógica por commit. Nunca `push --force` no `master`.
- **Outra sessão de IA pode estar mexendo neste repositório ao mesmo tempo.** Já aconteceu (o trailer de fundo e o `.gitignore` das skills vieram de outra janela). Confira `git log` antes de concluir que um commit é seu.
- Mantenha este arquivo enxuto: procedimentos longos vão para `docs/` ou skills.

## Fases

- **Fase 1 — concluída e no ar.** Catálogo, busca, gênero, detalhes, banner em carrossel, trailer de fundo.
  - Spec: `docs/superpowers/specs/2026-09-29-catalogo-filmes-fase1-design.md`
- **Fase 2 — concluída e no ar.** Contas no Supabase (e-mail/senha e Google), listas na conta, Minha conta, janela de login ao favoritar sem conta, importação das listas antigas do navegador.
  - Spec: `docs/superpowers/specs/2026-09-29-cineteca-fase2-contas-design.md`
  - Plano: `docs/superpowers/plans/2026-09-29-cineteca-fase2.md`
- **Fase 3 — concluída.** Curtir / não curtir na página do filme, página `/mais-curtidos` e fileira na home. Banco aplicado nos dois projetos Supabase.
  - Spec: `docs/superpowers/specs/2026-09-30-cineteca-fase3-avaliacoes-design.md`
  - Plano: `docs/superpowers/plans/2026-09-30-cineteca-fase3.md`
  - O voto é gravado com update e, se não existir, insert: `upsert` leva 42501, porque o banco só libera update em `curtiu` e `atualizado_em`.
- **Fase 4 — próxima, sem spec ainda.** Decidido com o dono em 2026-10-01, só com dados do TMDB:
  - "Visão & Construção" na página do filme: direção, fotografia, roteiro e direção de arte.
  - Galeria de imagens do filme (só exibir; "clipar" para o perfil fica para depois).
  - Botão "Fure a bolha": sugestão surpresa de filme bem avaliado, com mínimo de votos no TMDB.
  - Ficaram de fora por enquanto: sessão dupla, tags de vibe, diário/dashboard, paleta de cores. Sliders de atributos foram descartados (contradizem o joinha da Fase 3).

## Pendências abertas

- **Recuperação de senha não envia e-mail.** O Supabase só entrega para os donos do projeto sem SMTP próprio, e editar os modelos de e-mail também exige SMTP. Depende de o dono ter um domínio para ligar o Resend. As telas e a rota `/auth/callback` já funcionam.
- **Dois filmes de teste** na conta real do dono (`makersnegocios@gmail.com`), para ele remover pela tela.

## Stack

- Next.js 16.3 (App Router), React 19, TypeScript 7, Tailwind v4.
- Supabase (Postgres + Auth), `@supabase/ssr` e `@supabase/supabase-js`.
- Testes: Vitest 5 (unitários e integração) e Playwright (ponta a ponta, desktop + celular).
- Hospedagem: Vercel. Node 24 no Windows 10.

## Comandos

- `npm run dev` — site local em http://localhost:3000. Usa o `.env.local` (projeto Supabase de **produção**).
- `npm test` — testes unitários.
- `npm run test:supabase` — testes de banco contra o projeto `cineteca-testes`.
- `npm run typecheck` — `next typegen` + `tsc`.
- `npm run test:e2e` — Playwright. Sobe um TMDB simulado (porta 4010), faz `next build` e roda `next start` na porta 3100, usando o `.env.test.local`.

## Estrutura

- `lib/tmdb/` — único ponto que fala com o TMDB, somente no servidor (`server-only`).
- `lib/supabase/` — `config` (lê as variáveis), `servidor` (cookies), `navegador` (singleton), `admin` (chave secreta, server-only).
- `lib/auth/` — `validacao`, `erros`, `usuario`, `sessao`, `rotas` e as Server Actions em `acoes.ts`.
- `lib/lista/` — Favoritos e Salvos atrás da interface `ListaStore`; `supabase.ts` é a implementação em uso, `local.ts` só serve à importação das listas antigas.
- `app/api/filmes/route.ts` — rota interna da rolagem infinita e da busca.
- `app/(conta)/` — entrar, cadastro, conta, recuperar-senha, redefinir-senha.
- `app/auth/callback` e `app/auth/confirmar` — retorno do Google e do link de senha.
- `components/` — um componente por arquivo. Estilos compartilhados em `components/estilos.ts`: `CONTEUDO`, `BOTAO_PRIMARIO`, `BOTAO_SECUNDARIO`.
- `proxy.ts` — renova a sessão do Supabase antes de cada página.
- `supabase/migrations/` — SQL aplicado à mão nos dois projetos.
- `e2e/conta/` — `ajudantes.ts` (criar/apagar conta, entrar pela tela, `esperarNaConta`) e `fixtures.ts` (`usuario`, `logado`).

## Regras do projeto

- **Texto:** tudo na tela em pt-BR. Chamadas ao TMDB usam `language=pt-BR` e `region=BR`. Só filmes, nada de séries.
- **Cores e fonte:** fundo `#0B0B0F`, superfícies `#16161D`, fonte Manrope. Marca verde `#01BD4E` (`destaque`, hover `destaque-escuro` `#01993F`), **sempre com texto preto** sobre ela: branco dá 2,50 de contraste e reprova, preto dá 8,39. O vermelho `#D7263D` vive no token `perigo` e só serve a erro e a "Excluir minha conta". Use sempre os tokens, nunca a cor escrita à mão. O logo é `public/logo.png` e substitui o texto na barra e no rodapé. Nunca use o logo ou o nome da Netflix.
- **Atribuição do TMDB:** obrigatória pelos termos. Fica no rodapé, discreta. O dono pediu para remover e aceitou a versão discreta, então não remova.
- **Imagens:** `<img>` simples, não `next/image`. Se a imagem pode faltar, use `ImagemComReserva`, que exige a prop `reserva` (ex.: `/poster-padrao.svg`).
- **Acessibilidade:** o site respeita `prefers-reduced-motion` — o banner para de trocar e o trailer de fundo não carrega. É proposital.
- **Erros:** nunca deixe uma falha parecer sucesso ou lista vazia. Falha de gravação desfaz na tela e avisa; falha de leitura mostra erro com "Tentar de novo". Logs com prefixo `[CineTeca]`, só o código do erro — nunca tokens, chaves, senhas, cabeçalhos ou id de usuário.
- **Commits:** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Armadilhas conhecidas

- **Next 16:** `params` e `searchParams` são `Promise`; o antigo `middleware.ts` virou `proxy.ts`; em `error.tsx` use `retry`, não `reset`. Na dúvida, leia `node_modules/next/dist/docs/`.
- **Vitest:** hooks precisam de corpo em bloco `{ ... }`. Um valor retornado vira teardown.
- **TypeScript 7:** a variável do `catch` é `unknown`.
- **Heredoc do shell colapsa `\\` em `\`.** Arquivos com barra invertida (regex, `includes('\\')`) devem ser criados com a ferramenta de escrita, não com heredoc. Já quebrou o matcher do `proxy.ts`.
- **Playwright:**
  - Use `getByText` para mensagens; o Next injeta um anunciador com `role="alert"`.
  - Os toasts duram 3 s — **nunca** use um toast como prova de que algo foi gravado. Use `esperarNaConta()`, que confere a linha no banco com `expect.poll`.
  - `getByLabel` pode casar com a região quando o `Cartao` tem o mesmo título do campo. Use `getByRole('textbox', { name, exact: true })`.
  - Escope por `getByRole('navigation', { name: 'Principal' })` ou `getByRole('main')` quando o mesmo texto existir nos dois.
  - `expect.timeout` global está em 15 s: o app fala com um Supabase remoto.
- **Supabase (painel):**
  - "Confirm email" fica no **topo** de Authentication → Sign In / Providers, na seção "User Signups" — não dentro do provedor Email.
  - Editar modelos de e-mail exige SMTP próprio. Sem SMTP, o envio só alcança os donos do projeto, 2 por hora.
  - `42501` numa chamada de `criarClienteAdmin()` em produção = a `SUPABASE_SECRET_KEY` da Vercel não é a secreta. Em 2026-10-01 estava com uma chave sem poder de admin; o dono colou a `sb_secret_` e republicou. Só produção acusa: o `.env.local` tem a chave certa.
  - O **Project URL** fica em Settings → **Data API**, não em API Keys. Copie só o domínio: `https://xxx.supabase.co`, **sem** `/rest/v1` no fim. Esse erro derruba o login inteiro.
- **Vercel:** o plano Hobby bloqueia deploy quando a conta do GitHub que envia não é a ligada à Vercel e o repositório é privado. Resolvido tornando o repositório público. Republicar um deploy bloqueado não adianta — só um commit novo é reavaliado.
- **Windows:** PowerShell 5.1 (sem `&&`) ou Git Bash. O caminho do projeto tem espaço e acento: use aspas. O "Acesso controlado a pastas" do Defender já bloqueou o `.git`.
- **GitHub:** o `git push` de um branch funciona pelo terminal (login salvo no Windows; rode com `GIT_TERMINAL_PROMPT=0` para falhar em vez de travar). O modo automático do Claude Code bloqueia o push ao `master` e o de commits que mudam este arquivo: publique por Pull Request, e o dono clica em "Merge pull request" no GitHub. O `gh` não está instalado; o dono abre o PR pelo link que o `git push` imprime. Se o push falhar, o dono envia pelo Controle do Código-Fonte do VS Code, com a conta `makersnegocios-dotcom`.

## Variáveis de ambiente

Os arquivos `.env*.local` e `.env` ficam fora do git.

- **`.env.local`** (desenvolvimento, aponta para o projeto Supabase **`cineteca`**, o de produção): `TMDB_READ_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
- **`.env.test.local`** (projeto **`cineteca-testes`**): as mesmas, com `NEXT_PUBLIC_SITE_URL=http://localhost:3100`. Usado pelo e2e e pelo `test:supabase`.
- **Vercel:** as cinco em Settings → Environments → Production. As `NEXT_PUBLIC_` são do tipo **Config** (vão ao navegador por definição); só `SUPABASE_SECRET_KEY` e `TMDB_READ_TOKEN` são **Secret**.
- Nunca leia nem imprima o conteúdo desses arquivos. Para conferir se uma variável está preenchida, use um `Select-String` que devolve só verdadeiro ou falso.
