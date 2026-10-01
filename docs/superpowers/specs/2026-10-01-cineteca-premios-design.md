# CineTeca — Prêmios na página do filme — Design

**Data:** 2026-10-01
**Status:** decisões aprovadas pelo dono no chat; ele pediu para seguir sem revisar o texto ("prossiga de forma automática")
**Roteiro:** primeiro item de `docs/superpowers/roteiro-proximas-fases.md`

## 1. Objetivo

A página do filme mostra os prêmios principais que ele ganhou ou para os quais foi indicado, com destaque para as categorias técnicas (fotografia, direção de arte, efeitos visuais…). A seção conversa com a Visão & Construção, que vem logo abaixo.

**Sucesso:**

- Duna mostra uma aba "Oscar · 6 vitórias · 4 indicações", com Fotografia, Direção de Arte, Efeitos Visuais, Montagem, Som e Trilha Sonora como vitórias e os nomes de quem ganhou.
- Um filme sem nenhum dos prêmios principais não mostra a seção.
- Se o Wikidata falhar ou demorar, a página abre normalmente, sem a seção.

**Fora de escopo:**

- Prêmios fora da lista dos seis.
- O ano da cerimônia (o Wikidata mistura o ano da cerimônia com o da temporada e chega a repetir o mesmo prêmio com anos diferentes).
- Selo de troféu nos cartões da Visão & Construção.
- Página de prêmios ou ranking de premiados.

## 2. Decisões do dono

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Quais prêmios | Só os principais: Oscar, BAFTA, Globo de Ouro, Cannes, Veneza, Berlim | Reconhecíveis e com nome garantido em pt-BR |
| O que mostrar | Vitórias e indicações, vitórias em destaque | Muitos filmes bons só foram indicados |
| Onde | Logo antes da Visão & Construção | As duas falam de quem fez o filme |
| Visual | Resumo com abas (opção C da simulação) | Compacto e mostra a premiação de relance |
| Ano | Não mostrar | Dado inconsistente no Wikidata |
| Falha do Wikidata | A seção some | Exceção combinada à regra de erros do `CLAUDE.md`: é um extra de um serviço de fora, e "Tentar de novo" quase sempre falharia de novo |
| Dados incompletos | Aceitar | O Oscar vem completo; BAFTA e Globo vêm pela metade. Não há fonte gratuita melhor, e nada é inventado |

## 3. Tela

Seção "Prêmios" sem caixa de fundo (a Visão & Construção, logo abaixo, já é uma caixa).

```
Prêmios

[ Oscar              ]  [ BAFTA            ]  [ Globo de Ouro          ]
[ 6 vitórias · 4 ind.]  [ 1 vitória        ]  [ 1 vitória · 2 indic.   ]

Venceu    Melhor Fotografia — Greig Fraser
Venceu    Melhor Direção de Arte — Patrice Vermette e Zsuzsanna Sipos
Venceu    Melhores Efeitos Visuais — Brian Connor e outros 3
...
Indicado  Melhor Figurino
Indicado  Melhor Filme
```

- **Placar:** um botão por prêmio, na ordem Oscar, BAFTA, Globo de Ouro, Festival de Cannes, Festival de Veneza, Festival de Berlim. Só aparecem os que o filme tem. Abre na primeira aba.
- **Contagem:** "6 vitórias · 4 indicações", com singular ("1 vitória", "1 indicação"). Quando um dos lados é zero, ele não aparece.
- **Lista da aba:** todas as vitórias e depois todas as indicações. Em cada grupo, as categorias técnicas vêm primeiro (fotografia, direção de arte, efeitos visuais, montagem, som, figurino, maquiagem, trilha sonora), depois filme, direção, roteiro, atuação e as demais.
- **Nomes de quem ganhou:** só nas vitórias. Um nome: "Greig Fraser". Dois: "A e B". Três ou mais: "A e outros N", com A sendo o primeiro em ordem alfabética. O sufixo entre parênteses que o Wikidata usa para desambiguar ("Paul Lambert (efeitos visuais)") é removido.
- **Um único prêmio:** o placar mostra um bloco sem papel de aba (não há o que trocar).
- **Celular:** os blocos do placar quebram em duas colunas.
- **Acessibilidade:** `tablist`/`tab`/`tabpanel` com `aria-selected`, `aria-controls`, foco só na aba ativa (`tabIndex`) e troca com as setas esquerda e direita (circular).
- **Cores:** "Venceu" em `destaque`; "Indicado" e as indicações em branco apagado; aba ativa com borda `destaque`.

## 4. Dados

### 4.1 Fonte

Wikidata, endpoint SPARQL público (`https://query.wikidata.org/sparql`), sem chave. O filme é achado pela propriedade P4947 (id do TMDB). A consulta junta:

- prêmios no filme: P166 (venceu) e P1411 (indicado);
- prêmios nas pessoas cujo qualificador P1686 ("pelo trabalho") aponta para o filme, trazendo o nome da pessoa.

A consulta já filtra pelas categorias do catálogo (`VALUES`), o que deixa a resposta pequena.

### 4.2 Catálogo de categorias

Tabela fixa em código: Q-id da categoria → prêmio, nome em pt-BR e área (que define a ordem e o que é técnico). Só o que está no catálogo aparece; isso garante ao mesmo tempo "só os seis prêmios" e "nome sempre certo". Categorias antigas que o Wikidata separa (ex.: "Fotografia, Cor" e "Fotografia, Preto e Branco") entram com o nome da categoria atual.

### 4.3 Montagem

Função pura, testável sem rede:

1. Agrupa as linhas por categoria, ignorando o ano.
2. Uma categoria com qualquer linha "venceu" é vitória; as linhas "indicado" dela são descartadas (quem venceu também aparece como indicado).
3. Junta as pessoas das linhas "venceu", sem repetir.
4. Agrupa por prêmio, ordena por área e descarta prêmios vazios.

### 4.4 Cache, tempo e erro

- `fetch` no servidor com `next: { revalidate: 86400 }` (1 dia) e `AbortSignal.timeout(8000)`.
- Cabeçalho `User-Agent` identificando o site, como pede a política do Wikidata.
- URL configurável por `WIKIDATA_SPARQL_URL` (os testes ponta a ponta apontam para um simulador); sem a variável, usa o endpoint público. Não precisa entrar na Vercel.
- Qualquer falha (rede, tempo, status diferente de 200, JSON inesperado): `console.error('[CineTeca] ...')` com o status ou a mensagem do erro e a seção não aparece.

## 5. Código

- `lib/premios/catalogo.ts` — prêmios, áreas e categorias.
- `lib/premios/montar.ts` — função pura da seção 4.3 e o texto dos nomes.
- `lib/premios/wikidata.ts` — consulta (`server-only`), devolve as linhas ou `null` em falha.
- `lib/premios/tipos.ts` — tipos compartilhados.
- `components/Premios.tsx` — componente de servidor: busca, monta e devolve o embrulho da seção ou `null`.
- `components/PlacarPremios.tsx` — componente de cliente com as abas.
- `app/filme/[id]/page.tsx` — `<Suspense fallback={null}><Premios id={id} /></Suspense>` entre "Onde assistir" e a Visão & Construção. O componente devolve o próprio `<div>` de embrulho, para não sobrar espaço nem linha divisória quando não há prêmios.

Nenhuma mudança no Supabase, nenhuma variável nova na Vercel.

## 6. Testes

- **Unitários (Vitest):**
  - `montar`: com linhas reais de Duna, 6 vitórias e 4 indicações no Oscar, ordem técnica, deduplicação, nomes, prêmio vazio descartado, categoria fora do catálogo ignorada.
  - `catalogo`: nenhum Q-id repetido, todo item aponta para um prêmio e uma área conhecidos.
  - `wikidata`: monta a URL com o id, cache de 1 dia, `User-Agent`; devolve `null` com status 500, com erro de rede e com JSON fora do formato.
- **Ponta a ponta (Playwright, desktop e celular):** o simulador do TMDB também responde em `/sparql`.
  - Filme 1001: abas Oscar, BAFTA e Globo de Ouro; troca por clique e por setas; "Venceu Melhor Fotografia — …".
  - Filme com um só prêmio: bloco sem abas.
  - Filme 1005 (sem prêmios) e um filme cuja consulta dá 500: sem a seção e com o resto da página normal.
  - A seção fica acima da Visão & Construção.
- **No site publicado:** Duna (438631) com a seção e um filme sem prêmios sem ela.
