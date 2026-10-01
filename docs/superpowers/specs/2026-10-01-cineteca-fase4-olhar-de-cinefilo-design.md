# CineTeca — Fase 4 (Olhar de cinéfilo) — Design

**Data:** 2026-10-01
**Status:** aguardando revisão do dono
**Depende de:** Fase 3 (`docs/superpowers/specs/2026-09-30-cineteca-fase3-avaliacoes-design.md`), no ar em https://cineteca-gules.vercel.app

## 1. Objetivo

Diferenciar a CineTeca dos sites que só listam, favoritam e dão nota. Esta fase valoriza quem faz o filme, mostra o filme como imagem e tira a pessoa da zona de conforto — tudo com dados do TMDB, sem banco novo.

**Sucesso da Fase 4:**

- A página do filme mostra a seção **Visão & Construção** com quem dirigiu, escreveu, fotografou, desenhou, musicou e montou o filme.
- A página do filme mostra uma **galeria de imagens** em mosaico, que abre cada cena em tela cheia.
- O botão **Fure a bolha** sugere um filme muito bem avaliado de um idioma fora do eixo de Hollywood, e a pessoa pode pedir outra sugestão sem sair da página.

**Fora de escopo nesta fase:**

- "Clipar" imagens para o perfil ou montar moodboards.
- Página de cada pessoa da equipe (cartões não são links).
- Histórico de sugestões do Fure a bolha.
- Sessão dupla, tags de vibe, diário e dashboard, paleta de cores. Sliders de atributos foram descartados: contradizem o joinha da Fase 3.

## 2. Decisões de produto

Tomadas com o dono em 2026-10-01.

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Funções na Visão & Construção | Direção, Roteiro, Fotografia, Design de produção, Música, Montagem | As que um cinéfilo reconhece; "Direção de arte" no TMDB traz nomes secundários |
| Posição | Acima do Elenco | Valoriza quem está nos bastidores |
| Visual dos cartões | Foto redonda; sem foto, as iniciais | Escolha do dono (opção B entre três maquetes) |
| Galeria | Mosaico: uma cena grande e quatro menores, a última com "+N" | Dá peso às imagens sem ocupar a página |
| Fure a bolha | Janela com a sugestão e "Outra sugestão" | A pessoa troca sem sair da página; idioma e país explicam a surpresa |
| Onde fica o botão | Abaixo do banner da home e no menu | À mão em qualquer página |
| Corte do sorteio | Nota ≥ 7,5 e ≥ 200 votos no TMDB | Evita filme obscuro com 4 votos e nota inflada |

## 3. Telas

### 3.1 Ordem na página do filme

Cabeçalho (como hoje) → Você já viu esse filme? → Onde assistir → **Visão & Construção** → Elenco → **Imagens** → Filmes semelhantes.

### 3.2 Visão & Construção

Título `Visão & Construção`, subtítulo `Quem fez o filme por trás das câmeras`.

Uma fileira de cartões no mesmo formato visual do Elenco, mas com foto **redonda**:

```
  (foto)          (foto)         (OP)              (foto)
 Lana Wachowski   Bill Pope      Owen Paterson      Don Davis
 Direção · Roteiro Fotografia    Design de produção  Música
```

- **Uma pessoa por cartão.** Quem tem mais de uma função aparece uma vez, com as funções juntas por ` · `, na ordem da tabela abaixo.
- **Ordem dos cartões:** pela primeira função de cada pessoa, na ordem da tabela; empate mantém a ordem do TMDB.
- **Foto:** `w185`. Sem `profile_path`, ou se a imagem falhar ao carregar, mostra as **iniciais** (primeira letra do primeiro e do último nome, maiúsculas) num círculo da cor `superficie`.
- **Limites:** até 3 pessoas por função e até 12 cartões no total.
- **Sem nenhuma das funções:** a seção não aparece.

| Função na tela | `job` no TMDB |
| --- | --- |
| Direção | `Director` |
| Roteiro | `Screenplay`, `Writer` |
| Fotografia | `Director of Photography` |
| Design de produção | `Production Design` |
| Música | `Original Music Composer` |
| Montagem | `Editor` |

### 3.3 Imagens

Título `Imagens`.

- **Quais:** os `backdrops` do TMDB **sem texto** (`iso_639_1` nulo), na ordem do TMDB, até 20.
- **Mosaico (computador):** uma cena grande à esquerda ocupando duas linhas e quatro menores em grade 2×2 à direita. Se houver mais de 5, a quinta mostra `+N` (N = total − 4) por cima e abre a galeria a partir dela.
- **Mosaico (celular):** a cena grande ocupa a largura toda; as quatro menores ficam em grade 2×2 embaixo.
- **Poucas imagens:** 1 imagem ocupa a largura toda; de 2 a 4, a grande mais as que houver, sem espaço vazio.
- **Sem imagens:** a seção não aparece.
- **Tamanhos:** `w780` no mosaico, `w1280` na tela cheia.
- **Textos alternativos:** `Cena {n} de {título}`.

**Tela cheia:**

- Abre ao clicar em qualquer imagem do mosaico, na imagem clicada.
- Fundo preto translúcido, imagem centralizada, contador `{n} de {total}`, botões `Imagem anterior`, `Próxima imagem` e `Fechar`.
- Teclado: setas trocam, Esc fecha. Celular: deslizar para o lado troca.
- Ao fechar, o foco volta para a imagem que abriu a tela.
- Com `prefers-reduced-motion`, a troca é instantânea, sem animação.

### 3.4 Fure a bolha

**Botão:** `Fure a bolha`, com ícone de traço no estilo de `components/Icones.tsx`.

- Na home, logo abaixo do banner, antes das fileiras, com uma linha de apoio: `Um filme aclamado, longe do circuito de sempre.`
- No menu principal (computador e celular), depois de "Mais curtidos".

**Janela** (mesmo padrão de `JanelaLogin`: fundo escuro, Esc fecha, foco preso dentro):

```
 Fure a bolha                                   [X]
 [pôster]  O Hospedeiro · 2006
           Coreano · Coreia do Sul
           ★ 7,6
           Sinopse curta (até 4 linhas)…
 [ Ver filme ]  [ Outra sugestão ]
```

- `Ver filme` leva para `/filme/{id}` e fecha a janela.
- `Outra sugestão` sorteia de novo; a mesma sugestão não se repete na mesma janela.
- **Carregando:** o espaço da sugestão mostra um esqueleto; os botões ficam desabilitados.
- **Erro:** `Não foi possível sortear um filme agora.` e o botão `Tentar de novo`. Nunca uma janela vazia.
- Idioma e país em português, gerados com `Intl.DisplayNames('pt-BR')` a partir dos códigos do TMDB. Exceção: `cn` é um código só do TMDB (cantonês) e vira `Cantonês` por tabela. Sem país conhecido, a linha mostra só o idioma.

## 4. Dados

Nenhuma tabela nova, nenhuma mudança no Supabase.

### 4.1 Página do filme

A consulta que `getMovieDetails` já faz passa a pedir também as imagens:

- `append_to_response`: `videos,credits,recommendations,watch/providers,images`
- `include_image_language`: `null`

`credits.crew` e `images.backdrops`, que já chegam ou passam a chegar na mesma resposta, são normalizados em `lib/tmdb/detalhes.ts`:

- `MovieDetails.crew: MembroEquipe[]`, com `MembroEquipe = { id: number; name: string; profileUrl: string | null; funcoes: string[] }` — já filtrado, agrupado, ordenado e limitado como em §3.2.
- `MovieDetails.images: { media: string; grande: string }[]` — para cada cena sem texto, até 20, a URL `w780` (mosaico) e a `w1280` (tela cheia), ambas montadas por `imageUrl` a partir do mesmo `file_path`.

Uma chamada a mais ao TMDB por página: nenhuma. O cache continua o de `CACHE_LISTAS_SEGUNDOS`.

### 4.2 Sorteio do Fure a bolha

Função `sortearJoia()` em `lib/tmdb/filmes.ts` (servidor), exposta pela rota `GET /api/fure-a-bolha?evitar={id}`.

1. Sorteia um idioma da lista abaixo.
2. Consulta `/discover/movie` com `with_original_language`, `vote_average.gte=7.5`, `vote_count.gte=200`, `include_adult=false`, página 1, para saber `total_pages`.
3. Sorteia uma página entre 1 e `min(total_pages, 500)`; se não for a 1, consulta essa página.
4. Sorteia um filme da página, diferente de `evitar`.
5. Busca `/movie/{id}` para `origin_country` (com cache).
6. Se o idioma não render filme, tenta outro idioma ainda não tentado. Até 3 tentativas; depois, erro.

**Idiomas** (código TMDB — filmes que passavam no corte em 2026-10-01): `ja` (181), `fr` (115), `it` (92), `es` (86), `ko` (64), `zh` (32), `de` (31), `pt` (30), `ru` (24), `sv` (20), `hi` (19), `cn` (13), `da` (12), `pl` (7), `tr` (6), `fa` (5). Ficaram de fora os que rendiam menos de 5. O inglês nunca entra.

**Resposta da rota:** `{ id, title, year, posterUrl, overview, rating, idioma, pais }` com `idioma` e `pais` já em português; `pais` pode ser `null`. Em falha, status 502 e `{ erro: true }`.

Sorteio uniforme por idioma, de propósito: idiomas com poucos filmes aparecem tanto quanto japonês. É isso que fura a bolha.

## 5. Casos de borda

| Caso | Comportamento |
| --- | --- |
| Filme sem equipe nas funções | Seção Visão & Construção não aparece |
| Pessoa em 3 funções (dirige, escreve, monta) | Um cartão: `Direção · Roteiro · Montagem` |
| 6 roteiristas | Só os 3 primeiros na ordem do TMDB |
| Foto da equipe falha ao carregar | Troca para as iniciais |
| Nome de uma palavra só ("Vangelis") | Inicial única: `V` |
| Filme sem cenas sem texto | Seção Imagens não aparece |
| Filme com 3 imagens | Grande + 2 menores, sem buraco |
| Tela cheia na última imagem, seta para frente | Volta para a primeira |
| Idioma sorteado sem nenhum filme | Tenta outro idioma (até 3) |
| TMDB fora do ar no sorteio | Mensagem de erro e `Tentar de novo` |
| Sugestão repetida | `evitar` impede repetir a anterior imediata |
| `prefers-reduced-motion` | Sem animação na galeria nem na janela |

## 6. Mensagens na tela

Todas em português do Brasil, copiadas exatamente na implementação.

| Onde | Texto |
| --- | --- |
| Título da seção | `Visão & Construção` |
| Subtítulo da seção | `Quem fez o filme por trás das câmeras` |
| Funções | `Direção`, `Roteiro`, `Fotografia`, `Design de produção`, `Música`, `Montagem` |
| Título da galeria | `Imagens` |
| Texto alternativo da cena | `Cena {n} de {título}` |
| Contador na tela cheia | `{n} de {total}` |
| Botões da tela cheia | `Imagem anterior`, `Próxima imagem`, `Fechar` |
| Botão e item do menu | `Fure a bolha` |
| Linha de apoio na home | `Um filme aclamado, longe do circuito de sempre.` |
| Título da janela | `Fure a bolha` |
| Botões da janela | `Ver filme`, `Outra sugestão` |
| Erro do sorteio | `Não foi possível sortear um filme agora.` |
| Botão do erro | `Tentar de novo` |

## 7. Testes

**Unitários (Vitest):**

- Normalização da equipe: filtro pelas 6 funções, `Screenplay` e `Writer` viram `Roteiro`, junção de funções da mesma pessoa, ordem, limites de 3 por função e 12 no total.
- Iniciais: nome composto, nome único, nome com acento.
- Imagens: só as sem texto, limite de 20.
- Sorteio: página sorteada dentro de `total_pages`, `evitar` respeitado, idioma vazio leva a outro, 3 falhas levam a erro, inglês nunca sorteado.

**Ponta a ponta (Playwright, desktop e celular, TMDB simulado):**

- Visão & Construção aparece acima do Elenco, com cartão juntando funções e iniciais para quem não tem foto.
- Filme simulado sem equipe e sem imagens: as duas seções não aparecem.
- Galeria: clicar abre a tela cheia na imagem certa, setas e Esc funcionam, o foco volta.
- Fure a bolha: o botão da home e o do menu abrem a janela; `Outra sugestão` troca o filme; `Ver filme` navega; com o TMDB simulado respondendo erro, aparecem a mensagem e `Tentar de novo`.

O TMDB simulado (`e2e/mock-tmdb/`) ganha `crew`, `images` e respostas de `/discover/movie` por idioma.

## 8. Restrições que continuam valendo

- Tudo na tela em pt-BR; chamadas ao TMDB com `language=pt-BR` e `region=BR`. Só filmes.
- Cores só pelos tokens; texto preto sobre o verde `destaque`.
- `<img>` simples, nunca `next/image`.
- `lib/tmdb/` é o único ponto que fala com o TMDB, só no servidor.
- Respeito a `prefers-reduced-motion`.
- Erros nunca parecem sucesso ou lista vazia; logs com prefixo `[CineTeca]` e só o código do erro.
- Atribuição do TMDB no rodapé continua.
