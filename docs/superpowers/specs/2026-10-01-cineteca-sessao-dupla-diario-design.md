# CineTeca — Sessão dupla e Diário pessoal — Design

**Data:** 2026-10-01
**Status:** aprovada pelo dono no chat, por partes ("Bora", "Pode seguir", "O que vc recomendar, tá valendo")
**Roteiro:** itens 3 (Sessão dupla) e 4 (parte pessoal do Diário) de `docs/superpowers/roteiro-proximas-fases.md`, mais o "Dashboard de Data Viz" pedido pelo dono. A Comunidade fica para uma fase própria.

## 1. Objetivo

Três partes, construídas nesta ordem:

1. **Sessão dupla** — a pessoa junta dois filmes sob um título seu (ex.: Blade Runner 2049 + Her = "Solidão Cyberpunk"), compartilha por link e baixa a imagem para as redes.
2. **Assisti** — diário pessoal: "assisti em tal dia", com anotação opcional. Rever o filme gera um novo registro.
3. **Números** — dashboard com os hábitos da pessoa: décadas mais assistidas, diretores favoritos e mapa de calor por mês, calculado a partir do Assisti.

**Sucesso:**

- Com conta, a pessoa cria uma Sessão dupla pela página do filme; o link `/sessao/[código]` abre para qualquer um, sem login, e a prévia aparece no WhatsApp.
- A Sessão dupla baixa em Stories (1080×1920) e quadrada (1080×1080).
- A pessoa registra "Assisti" pela página do filme e vê, edita e apaga os registros em `/diario`.
- A aba Números de `/diario` mostra os três números do topo, o mapa de calor, as décadas e os 5 diretores favoritos.
- Nenhuma biblioteca nova.

**Fora de escopo:** Comunidade (comentários, perfil público, denúncia) — fase própria; editar o título de uma Sessão dupla; listar sessões de outras pessoas; avaliação por estrelas; importar Favoritos como assistidos; tempo total assistido.

## 2. Decisões do dono

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Fonte de dados do dashboard | Novo registro "Assisti" com data | O mapa de calor precisa da data em que a pessoa viu, não de quando favoritou |
| Quem vê a Sessão dupla | Só quem tem conta cria; qualquer um com o link vê | A graça é compartilhar |
| Formato da imagem | Stories e quadrada; a horizontal vira prévia do link | Cobre Stories, feed e WhatsApp com um desenho só |
| Onde cria | Página do filme; lista em "Minhas sessões duplas" | O filme atual já entra como primeiro |
| O que é a "nota" do Assisti | Anotação em texto, privada | O joinha da Fase 3 continua sendo a avaliação |
| Rever o filme | Cada vez é um registro | O mapa de calor mostra o hábito real |
| Mapa de calor | Grade meses × anos | É o "consumo por mês" pedido; compara anos |
| Gráficos | SVG e CSS à mão | Visual do site, sem peso; nenhuma biblioteca tem o mapa de meses pronto |
| Imagem da Sessão dupla | Gerada no servidor (`next/og`) | A mesma rota serve download e prévia do WhatsApp |
| Onde fica o dashboard | Aba "Números" dentro de `/diario` | Diário vira a casa de Registros, Números e, depois, Comunidade |

## 3. Sessão dupla

### 3.1 Banco — `sessoes_duplas`

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | `default gen_random_uuid()`, chave; é o código do link |
| `usuario_id` | `uuid` | `references auth.users on delete cascade` |
| `titulo` | `text` | 1 a 60 caracteres, sem espaços nas pontas |
| `filme1_id`, `filme2_id` | `integer` | `> 0`, diferentes entre si |
| `filme1_titulo`, `filme2_titulo` | `text` | até 300 caracteres |
| `filme1_poster`, `filme2_poster` | `text` | pode ser nulo |
| `filme1_ano`, `filme2_ano` | `text` | pode ser nulo |
| `criado_em` | `timestamptz` | `default now()` |

- Índice `(usuario_id, criado_em desc)`.
- Permissões: `revoke all` de `anon` e `authenticated`; `authenticated` recebe `select, insert, delete`. Sem `update` (título não se edita).
- RLS: ler, inserir e apagar só as próprias.
- **A página pública lê pelo servidor com `criarClienteAdmin()`**, buscando um único `id`. Visitantes não têm acesso à tabela, então ninguém lista todas as sessões nem descobre `usuario_id`.
- **Os dados dos filmes vêm do servidor:** a Server Action recebe só os dois ids e o título, busca nome, pôster e ano no TMDB e grava. Se o TMDB falhar ou um id não existir, nada é gravado.

### 3.2 Telas

1. **Página do filme** — botão "Criar sessão dupla" junto a Favoritar e Salvar.
   - Sem conta: abre a `JanelaLogin` existente.
   - Com conta: janela com o filme atual à esquerda e uma busca à direita (usa `app/api/filmes/route.ts`). Escolhido o segundo filme, campo de título (contador até 60) e "Criar". Sucesso leva a `/sessao/[código]`.
   - Não deixa escolher o mesmo filme.
2. **`/sessao/[código]`** — pública.
   - Os dois pôsteres lado a lado, o título grande e os nomes e anos dos filmes; cada pôster leva à página do filme.
   - Botões "Baixar para Stories" e "Baixar quadrada".
   - Quem criou vê também "Copiar link".
   - `generateMetadata` aponta `openGraph.images` para a imagem 1200×630.
   - Código inválido ou sessão apagada: `notFound()`, com o texto "Sessão não encontrada".
3. **`/sessoes`** — "Minhas sessões duplas", no menu da conta (`MenuUsuario` e menu do celular na `Navbar`). Grade com miniatura dos dois pôsteres e título; ações Abrir, Copiar link e Apagar (com confirmação). Sem login, convida a entrar, como `/minha-lista`.

### 3.3 Imagens

Rotas de imagem com `ImageResponse` de `next/og` (ler `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md` antes):

- `/sessao/[código]/imagem/stories` — 1080×1920
- `/sessao/[código]/imagem/quadrada` — 1080×1080
- `/sessao/[código]/imagem/previa` — 1200×630 (também usada no `openGraph`)

Um único componente de desenho recebe o tamanho: fundo `#0B0B0F`, os dois pôsteres, o título em Manrope (arquivo da fonte carregado pela rota), "+" entre os filmes e o logo da CineTeca. Os botões de baixar usam `<a download>` apontando para a rota. Pôster nulo usa `/poster-padrao.svg`. Sessão inexistente responde 404.

### 3.4 Erros

- Falha ao criar: a janela fica aberta e mostra a mensagem.
- Falha ao apagar: a sessão volta para a lista e aparece o aviso.
- Falha ao ler `/sessoes`: erro com "Tentar de novo".
- Logs com `[CineTeca]` e só o código do erro.

## 4. Assisti (diário pessoal)

### 4.1 Banco — `assistidos`

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | `default gen_random_uuid()`, chave |
| `usuario_id` | `uuid` | `references auth.users on delete cascade` |
| `filme_id` | `integer` | `> 0` |
| `assistido_em` | `date` | entre `1895-01-01` e hoje |
| `anotacao` | `text` | pode ser nula; até 500 caracteres |
| `titulo` | `text` | até 300 caracteres |
| `poster_url`, `ano` | `text` | podem ser nulos |
| `diretores` | `jsonb` | lista de `{ id, nome, fotoUrl }`, até 3 itens; pode ser vazia |
| `criado_em` | `timestamptz` | `default now()` |

- Índices `(usuario_id, assistido_em desc)` e `(usuario_id, filme_id)`.
- Permissões: `revoke all`; `authenticated` recebe `select, insert, delete` e `update (assistido_em, anotacao)`. Filme e diretores não se alteram depois de gravados.
- RLS: ler, inserir, atualizar e apagar só os próprios.
- "Não no futuro" é conferido na validação do servidor (o fuso é `America/Sao_Paulo`); o banco só garante o limite de 1895 e um teto de amanhã, para não errar por fuso.
- **A Server Action recebe só `filmeId`, data e anotação.** O servidor busca nome, pôster, ano e diretores (`getMovieDetails`, quem tem a função "Direção" no `crew`) e grava. Se o TMDB falhar, nada é gravado e a pessoa recebe o aviso.
- A anotação é texto puro: espaços nas pontas são removidos e vazia vira nula.

### 4.2 Telas

1. **Página do filme** — botão "Assisti" junto aos outros.
   - Sem conta: `JanelaLogin`.
   - Com conta: janela pequena com data (hoje marcado; não aceita futuro) e anotação (contador até 500), botão "Registrar".
   - Abaixo dos botões, linha discreta: "Você viu 2 vezes · última em 14 set 2026". Some quando não há registro.
2. **`/diario`** — "Meu diário", no menu da conta. Duas abas: **Registros** e **Números** (seção 5). A aba ativa fica na URL (`?aba=numeros`) para poder ser aberta direto.
   - **Registros:** do mais recente para o mais antigo, agrupados por mês ("setembro de 2026"). Cada item mostra pôster pequeno, título (link para o filme), data e anotação, com Editar (data e anotação, na mesma janela do registro) e Apagar (com confirmação).
   - Vazio: convite para marcar o primeiro "Assisti" na página de um filme.
   - Sem login: convite para entrar, como `/minha-lista`.

### 4.3 Erros

- Falha ao registrar: a janela fica aberta com a mensagem.
- Falha ao editar ou apagar: a tela volta ao estado anterior e aparece o aviso.
- Falha ao ler o diário: erro com "Tentar de novo".

## 5. Números (dashboard)

### 5.1 Cálculo

Função pura `lib/diario/numeros.ts` recebe os registros da pessoa e a data de hoje e devolve:

- **Topo:** `sessoes` (todos os registros), `filmes` (ids distintos), `esteAno` (registros com `assistido_em` no ano corrente).
- **Mapa de calor:** para cada ano do primeiro registro até o ano corrente, 12 contagens de registros (revisões contam). Cada contagem recebe um nível de 0 a 4: 0 é vazio; 1 a 4 são faixas proporcionais ao maior mês.
- **Décadas:** contagem de **filmes distintos** por década do `ano` do filme, da mais antiga à mais nova, **incluindo décadas vazias no meio**. Filmes sem ano ficam de fora. A maior é marcada como campeã (em empate, a mais recente).
- **Diretores:** contagem de **filmes distintos** por diretor; os 5 primeiros. Desempate: o visto mais recentemente. Cada um leva a lista dos filmes vistos.

O servidor lê os registros e chama a função; nenhuma chamada ao TMDB.

### 5.2 Tela — aba Números

De cima para baixo:

1. Três números grandes: "sessões", "filmes diferentes", "em 2026".
2. **Mapa de calor:** colunas jan–dez, linhas por ano (mais recente em cima). Cinco tons, de uma superfície apagada até `destaque`. Meses vazios ficam visíveis. Tooltip ao passar o mouse, focar pelo teclado ou tocar: "março de 2026: 4 filmes".
3. **Décadas:** barras horizontais; a campeã em `destaque`, as outras em tom neutro; o número ao fim de cada barra.
4. **Diretores favoritos:** 5 linhas com foto redonda (`ImagemComReserva` com `/pessoa-padrao.svg`), nome e "4 filmes". Clicar abre a lista dos filmes dele que a pessoa viu.

- Gráficos em SVG/CSS, só com os tokens do site e Manrope. Seguir a skill `dataviz` ao construir.
- Cada gráfico tem um resumo em texto para leitor de tela (ex.: "Você assistiu mais em março de 2026, 4 filmes"); as células do mapa são focáveis com rótulo.
- Barras crescem ao aparecer; com `prefers-reduced-motion`, aparecem prontas.
- Celular: o mapa de 12 colunas cabe na largura (células de ~22 px); décadas e diretores em coluna.
- Sem registros: o mesmo convite da aba Registros, sem gráficos. Falha de leitura: erro com "Tentar de novo".

## 6. Organização do código

- `supabase/migrations/20261001000000_sessoes_duplas.sql` e `20261001010000_assistidos.sql` — aplicados à mão nos projetos `cineteca` e `cineteca-testes`.
- `lib/sessao-dupla/` — `validacao`, `banco`, `acoes` (Server Actions), `tipos`.
- `lib/diario/` — `validacao`, `banco`, `acoes`, `agrupar` (por mês), `numeros`, `tipos`.
- `components/` — um componente por arquivo (ex.: `BotaoSessaoDupla`, `JanelaSessaoDupla`, `DesenhoSessaoDupla`, `BotaoAssisti`, `JanelaAssisti`, `ListaDiario`, `MapaCalor`, `GraficoDecadas`, `DiretoresFavoritos`).
- `app/sessao/[codigo]/`, `app/sessoes/`, `app/diario/`.

## 7. Testes

- **Unitários (Vitest):** validação do título e dos dois filmes (iguais reprovam); validação da data (futuro, antes de 1895) e da anotação; agrupamento por mês; `numeros.ts` — revisões contam no mapa e não em décadas e diretores, décadas vazias no meio aparecem, desempate dos diretores, filme sem ano fora das décadas, níveis do mapa.
- **Banco (`test:supabase`):** um usuário não lê nem apaga a sessão ou o registro de outro; visitante não lê nada; não é possível alterar `filme_id` ou `diretores` de um registro; `check` de título e de anotação.
- **Ponta a ponta (Playwright, desktop e celular):**
  - Sessão dupla: criar pela página do filme, abrir o link sem login, a rota de imagem responde PNG, apagar em `/sessoes`.
  - Assisti: registrar, ver a linha "Você viu…", editar e apagar em `/diario`.
  - Números: com 3 registros, conferir os números do topo, uma célula do mapa e a década campeã.
  - Usar `esperarNaConta()` para provar gravação, nunca o toast.
