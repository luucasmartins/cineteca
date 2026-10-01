# CineTeca — Trilha sonora — Design

**Data:** 2026-09-30
**Status:** aprovada
**Branch:** `trilha-sonora`, no worktree `.claude/worktrees/trilha-sonora`. Outra sessão trabalha no `master` na pasta principal.

## 1. Objetivo

O site ganha uma identidade sonora: uma trilha no clima de cinema toca enquanto a pessoa navega, e ela pode desligar quando quiser.

**Sucesso:**
- No primeiro clique, toque ou tecla em qualquer página, a trilha começa.
- A trilha continua tocando ao trocar de página, sem recomeçar.
- Um botão na barra superior desliga e religa o som, e o site lembra a escolha.
- O trailer com som pausa a trilha.
- Nenhuma falha de áudio quebra o site.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Música | Uma faixa livre de direitos da Pixabay Music: uso comercial permitido, sem crédito obrigatório. Estilo orquestral/cinematográfico. Claude escolhe pelo título, pelas etiquetas e pela descrição. O dono pode trocar a faixa substituindo o arquivo. |
| Início | No primeiro gesto do visitante (`pointerdown` ou `keydown`) em qualquer página. Os navegadores bloqueiam som antes disso. |
| Abrangência | O site todo. O tocador fica no layout raiz e sobrevive à navegação do App Router. |
| Repetição e volume | Toca em repetição (`loop`), com volume 0,3. |
| Desligar | Botão de alto-falante na barra superior, sempre visível. A escolha "desligada" fica no `localStorage`. |
| Trailer com som | O modal do `BotaoTrailer` pausa a trilha ao abrir e retoma ao fechar. O `TrailerFundo` já é mudo e não interfere. |

## 3. Comportamento

1. **Ao carregar:**
   - Se a preferência for "desligada", o tocador não cria o áudio nem baixa o arquivo.
   - Caso contrário, o tocador cria o elemento de áudio depois do evento `load` da janela (`preload="auto"`) e fica esperando o primeiro gesto.
2. **Primeiro gesto:** `pointerdown` ou `keydown` no `document` chama `play()`.
   - Se `play()` for rejeitado, por exemplo por causa de uma tecla que o navegador não conta como gesto, o tocador espera o próximo gesto.
   - Depois que a trilha começa a tocar, os ouvintes de gesto são removidos.
3. **Primeiro gesto no botão de som:** não inicia a trilha. O botão marca seu `pointerdown` e o ouvinte global ignora esse evento. O clique segue o fluxo normal do botão.
4. **Botão de som:**
   - **Ligada → desligada:** pausa a trilha e grava "desligada".
   - **Desligada → ligada:** apaga a preferência e dá `play()` na hora, porque o próprio clique já conta como gesto. Se o áudio ainda não existir, ele é criado nesse momento.
5. **Pausa temporária (trailer):**
   - `pausar()` só pausa se estiver tocando e guarda que a pausa foi temporária.
   - `retomar()` só volta a tocar se a pausa foi temporária e o som continua ligado.
6. **Falhas:**
   - Se o arquivo não carregar, o evento `error` do áudio é registrado uma vez com o prefixo `[CineTeca]` e o site segue em silêncio.
   - Rejeições de `play()` por política de autoplay não são registradas, porque são esperadas.
   - Se o `localStorage` estiver bloqueado, o padrão é "ligada" e nada quebra.

## 4. Peças

**Novas:**
- **`public/som/trilha.mp3`:** a faixa, com até cerca de 3 MB (MP3 a 128 kbps).
- **`docs/trilha-sonora.md`:** título, autor, link da página na Pixabay, data do download e licença. Explica também como trocar a faixa.
- **`lib/som/preferencia.ts`:** gerencia a preferência de som no navegador.
  - `somDesligado(): boolean`.
  - `gravarSomDesligado(desligado: boolean): void`.
  - Chave: `cineteca:som`, com valor `desligado`.
  - Leitura e escrita ficam em `try/catch`, no mesmo padrão de `lib/lista/local.ts`.
- **`components/TrilhaSonoraProvider.tsx`** (`'use client'`):
  - É dono do único `HTMLAudioElement` e dos ouvintes de gesto.
  - Expõe pelo contexto `{ ligada, alternar, pausar, retomar, marcarGestoDoBotao }` e o hook `useTrilhaSonora()`.
- **`components/BotaoSom.tsx`:**
  - Mostra um ícone de alto-falante, com som ou cortado. Os ícones novos entram em `components/Icones.tsx`.
  - `aria-pressed` reflete se o som está ligado.
  - `aria-label` alterna entre "Desligar trilha sonora" e "Ligar trilha sonora".

**Alteradas:**
- **`app/layout.tsx`:** o `TrilhaSonoraProvider` envolve o conteúdo junto dos outros providers.
- **`components/Navbar.tsx`:** o `BotaoSom` fica entre a busca e o menu do usuário, no computador e no celular.
- **`components/BotaoTrailer.tsx`:** o `ModalTrailer` chama `pausar()` ao montar e `retomar()` ao desmontar.

## 5. Testes

**Unitários (Vitest), `lib/som/preferencia.test.ts`:**
- grava e lê "desligado";
- religar apaga a chave;
- com o `localStorage` bloqueado, devolve "ligado" e não lança erro.

**Ponta a ponta (Playwright, desktop e celular), `e2e/trilha-sonora.spec.ts`.** O estado é lido com `audio.paused` no navegador.
- Antes de qualquer gesto, a trilha não toca. Depois de um clique na página, ela toca.
- O botão de som desliga e religa a trilha.
- Depois de desligar e recarregar, a trilha continua desligada mesmo com um clique.
- Ao abrir um filme pela página inicial, a trilha continua tocando, sem recomeçar (`currentTime` não volta a zero).
- Abrir o trailer pausa a trilha, e fechar retoma.
- Se o primeiro clique for no botão de som, a trilha não toca.

**Outras verificações:**
- A suíte atual continua passando.
- Antes do e2e, conferir que as portas 3100 e 4010 estão livres, porque a outra sessão pode estar usando.
- Conferir no site local antes de declarar pronto.

## 6. Fora do escopo

- Várias faixas ou playlist.
- Controle de volume.
- Sincronizar a preferência de som com a conta do Supabase.
- Pausar a trilha quando a aba fica em segundo plano.
