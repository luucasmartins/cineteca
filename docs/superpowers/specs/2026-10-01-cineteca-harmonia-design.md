# CineTeca — Harmonia de cores — Design

**Data:** 2026-10-01
**Status:** aprovada pelo dono no chat, por partes ("Sim, bora")
**Roteiro:** item 2 de `docs/superpowers/roteiro-proximas-fases.md` (chamado de "Paleta de cores" / "Blind Watch" no roteiro)

## 1. Objetivo

A pessoa escolhe o que assistir pelo visual: vê só as cores principais das cenas de um filme e o ano, escolhe a paleta que mais a atrai e descobre qual é o filme. A página de cada filme também ganha a paleta dele.

**Sucesso:**

- `/harmonia` mostra 12 paletas de filmes bem avaliados; clicar num cartão revela título, ano e um link para o filme.
- "Outras paletas" sorteia 12 novos.
- A página do filme mostra a paleta no topo da seção Imagens.
- Nada de biblioteca nova nem mudança no Supabase.

**Fora de escopo:** filtro por gênero; esconder o título do código da página; guardar paletas; ordenar ou buscar por cor; compartilhar uma paleta.

## 2. Decisões do dono

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Onde aparece | Página própria + paleta pequena na página do filme | A página é a brincadeira; a página do filme deixa o recurso à vista |
| Mecânica | Grade de 12 cartões; clicar revela | Comparar paletas é o que torna a escolha divertida |
| De onde vêm os filmes | Sorteio entre os mais bem avaliados, com "Outras paletas" | Fotografia marcante; página nova a cada visita |
| Onde extrair as cores | No navegador | Sem dependência nova nem custo de servidor; o TMDB libera CORS (`Access-Control-Allow-Origin: *`, conferido em 2026-10-01) |
| Estilo | Faixas proporcionais (opção A da simulação) | Mostra o peso de cada cor |
| Nome | Página "Escolha pela harmonia de cores"; menu "Harmonia de cores"; endereço `/harmonia` | Pedido do dono; tudo em pt-BR |
| Título no código da página | Aceito | É uma brincadeira; esconder exigiria uma consulta a mais por revelação |

## 3. Telas

### 3.1 Página `/harmonia`

```
Escolha pela harmonia de cores
Só as cores e o ano. Escolha pelo visual e descubra o filme.

[ faixas ]  [ faixas ]  [ faixas ]  [ faixas ]   ← 12 cartões, grade responsiva
  1994        2003        1974        1999
 Revelar     Revelar     Revelar     Revelar

              [ Outras paletas ]
```

- **Cartão antes de revelar:** um `<button>` com as faixas (proporção 16:10), o ano e "Revelar". Nome acessível: "Revelar o filme de 1994".
- **Faixas:** horizontais, empilhadas de cima para baixo, da cor mais presente para a menos presente, cada uma com altura proporcional ao peso.
- **Enquanto a paleta é calculada:** a área das faixas pulsa (`motion-safe:animate-pulse`) em `bg-white/5`.
- **Paleta indisponível** (nenhuma cena carregou): a área mostra "Paleta indisponível"; o cartão ainda pode ser revelado.
- **Revelado:** o botão dá lugar ao título e ao ano e a um link "Ver filme" para `/filme/{id}`, com uma transição curta de opacidade só quando o movimento não é reduzido. O foco vai para o link.
- **Carregando a grade:** 12 cartões esqueleto.
- **Falha no sorteio:** "Não foi possível carregar as paletas." com "Tentar de novo".
- **Outras paletas:** botão secundário abaixo da grade; desabilitado enquanto carrega; troca a grade inteira.
- **Menu:** item "Harmonia de cores" depois de "Mais curtidos", no desktop e no celular.

### 3.2 Página do filme

- No topo da seção Imagens, entre o título "Imagens" e o mosaico: subtítulo "Paleta de cores", uma faixa horizontal (altura 28 px, cantos arredondados, largura máxima 360 px) com as cores lado a lado em proporção, e abaixo uma bolinha de cada cor com o código em maiúsculas (`#1B1009`).
- Usa as 3 primeiras cenas da galeria.
- Enquanto calcula: a faixa pulsa. Indisponível: "Paleta indisponível".

## 4. Dados e cálculo

### 4.1 Sorteio (servidor)

`sortearHarmonia()` em `lib/tmdb/harmonia.ts`:

1. `/discover/movie` com `sort_by=vote_average.desc`, `vote_count.gte=1000`, `include_adult=false`; a primeira página informa o total de páginas (no máximo 500).
2. Sorteia uma página, embaralha os resultados.
3. Para todos os da página, em paralelo, `/movie/{id}/images` com `include_image_language=null` (cenas sem texto), cache de 1 dia.
4. Fica com os filmes que têm ao menos uma cena, até 12, cada um com as 3 primeiras cenas em `w300`.
5. Nenhum filme com cena: erro (`TmdbError`).

Rota `GET /api/harmonia` → `{ filmes: FilmeHarmonia[] }` com `Cache-Control: no-store`; falha → 502 `{ erro: true }` e log `[CineTeca]` com o nome do erro.

`FilmeHarmonia = { id: number; title: string; year: string | null; cenas: string[] }`.

### 4.2 Extração (navegador)

- `lib/paleta/extrair.ts` — função pura `extrairPaleta(pixels: Uint8ClampedArray, quantidade = 5): CorPaleta[]`, com `CorPaleta = { hex: string; peso: number }`:
  - ignora pixels com alfa < 128;
  - k-means com início determinístico (pixels ordenados por luminância, sementes nos quantis), 10 iterações;
  - descarta grupos vazios; pesos somam 1; ordena por peso, do maior para o menor;
  - sem pixels: lista vazia.
- `lib/paleta/navegador.ts` — `lerPixels(urls)`: carrega cada cena com `crossOrigin = 'anonymous'`, desenha num canvas de 48×27 e junta os pixels; cena que falha é pulada; nenhuma: `null`.
- `components/usePaleta.ts` — hook `usePaleta(cenas)` → `{ estado: 'carregando' | 'pronta' | 'indisponivel'; cores: CorPaleta[] }`.

### 4.3 Imagens

- `TamanhoImagem` ganha `'w300'`.
- `ImagemFilme` ganha `pequena` (`w300`), usada pela paleta na página do filme.

## 5. Código

- `lib/tmdb/harmonia.ts` (+ teste), `app/api/harmonia/route.ts` (+ teste)
- `lib/paleta/extrair.ts` (+ teste), `lib/paleta/navegador.ts`
- `components/usePaleta.ts`, `components/FaixaPaleta.tsx`, `components/CartaoHarmonia.tsx`, `components/GradeHarmonia.tsx`, `components/PaletaFilme.tsx`
- `app/harmonia/page.tsx`
- `components/GaleriaImagens.tsx` (paleta no topo), `components/Navbar.tsx` (item do menu), `lib/tmdb/detalhes.ts` (`pequena`), `lib/tmdb/imagens.ts` (`w300`), `lib/tmdb/tipos.ts`

## 6. Testes

- **Unitários:** `extrairPaleta` (uma cor, duas cores 1/3 e 2/3, alfa ignorado, máximo de 5, vazio, determinismo); `sortearHarmonia` (parâmetros, página sorteada, filtra filmes sem cena, até 12 com 3 cenas `w300`, erro sem nenhum); rota (200 com `no-store`, 502 na falha); `detalhes` com `pequena`.
- **Ponta a ponta (desktop e celular):** o simulador do TMDB ganha `/movie/{id}/images` e uma lista para o sorteio; o teste intercepta `https://image.tmdb.org/t/p/w300/**` e responde imagens BMP de cor sólida com CORS.
  - grade com 12 cartões, faixa na cor certa, revelar mostra título e link;
  - "Outras paletas" troca os filmes;
  - falha da rota mostra o aviso e "Tentar de novo" recupera;
  - cenas que não carregam mostram "Paleta indisponível";
  - item do menu leva à página;
  - página do filme 1001 mostra a paleta com os códigos de cor.
- **No site publicado:** `/harmonia` com paletas e a paleta de um filme.
