# Harmonia de cores — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/harmonia` com 12 paletas de filmes bem avaliados para revelar, e a paleta de cada filme no topo da seção Imagens.

**Architecture:** O servidor sorteia os filmes e as cenas (`lib/tmdb/harmonia.ts` + `/api/harmonia`). O navegador baixa as cenas em `w300`, reduz a 48×27 num canvas e uma função pura (`lib/paleta/extrair.ts`, k-means) devolve 5 cores com peso. Componentes de cliente desenham as faixas.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-01-cineteca-harmonia-design.md`

## Global Constraints

- Texto em pt-BR: "Escolha pela harmonia de cores", menu "Harmonia de cores", endereço `/harmonia`.
- Nenhuma dependência nova; nenhuma mudança no Supabase.
- Cores da interface só por token; as cores das paletas são dados (estilo inline).
- Falha de leitura da grade: aviso + "Tentar de novo". Logs `[CineTeca]` só com nome/código do erro.
- `prefers-reduced-motion`: animações só com `motion-safe:`.
- Vitest: hooks em bloco; `catch` com `unknown`; regex com barra invertida só pela ferramenta de escrita.
- Commits com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Cena com transparência ou imagem minúscula: pixels com alfa < 128 ignorados; menos pixels que cores não quebra — teste em `extrair`.
- Página do sorteio com menos de 12 filmes com cena: devolve os que houver — teste em `harmonia`.
- Duplo clique rápido em "Outras paletas": botão desabilitado durante a carga; resposta antiga não sobrescreve a nova — guarda por contador no componente.
- Imagem que falha no meio (1 de 3): a paleta usa as outras — e2e (cenas `-falha` respondem 404 no teste).
- Cartão revelado perde o foco: foco vai para o link "Ver filme" — e2e.

---

### Task 1: Extração de cores

**Files:** Create `lib/paleta/extrair.ts`, `lib/paleta/extrair.test.ts`

**Produces:** `type CorPaleta = { hex: string; peso: number }`; `extrairPaleta(pixels: Uint8ClampedArray, quantidade?: number): CorPaleta[]`.

- [ ] Testes (falham): uma cor sólida → `[{ hex: '#ff0000', peso: 1 }]`; 1/3 vermelho + 2/3 azul → azul primeiro com peso ≈ 0,667; pixels com alfa 0 ignorados; 7 cores distintas → no máximo 5 grupos, pesos somam 1; vazio → `[]`; mesma entrada → mesma saída.
- [ ] Implementar k-means com sementes nos quantis de luminância, 10 iterações, grupos vazios descartados, ordenação por peso.
- [ ] `npx vitest run lib/paleta` → PASS. Commit `feat: extração de paleta de cores`.

### Task 2: Sorteio no servidor e rota

**Files:** Create `lib/tmdb/harmonia.ts`, `lib/tmdb/harmonia.test.ts`, `app/api/harmonia/route.ts`, `app/api/harmonia/route.test.ts`; Modify `lib/tmdb/imagens.ts` (`'w300'`), `lib/tmdb/tipos.ts` (`FilmeHarmonia`, `ImagemFilme.pequena`), `lib/tmdb/detalhes.ts` + teste (`pequena`).

**Produces:** `type FilmeHarmonia = { id: number; title: string; year: string | null; cenas: string[] }`; `sortearHarmonia(aleatorio?: () => number): Promise<FilmeHarmonia[]>`; `GET /api/harmonia` → `{ filmes }`.

- [ ] Testes (falham), com `tmdbFetch` simulado como em `joia.test.ts`: parâmetros do discover (`vote_count.gte: 1000`, `sort_by: 'vote_average.desc'`, `include_adult: false`); página sorteada; `/movie/{id}/images` com `include_image_language: 'null'`; filmes sem cena fora; no máximo 12; 3 cenas `https://image.tmdb.org/t/p/w300/...`; `TmdbError` sem nenhum. Rota: 200 + `no-store`; 502 + log na falha. `detalhes`: `pequena` em `w300`.
- [ ] Implementar. `npm test` → PASS. Commit `feat: sorteio de filmes para a harmonia de cores`.

### Task 3: Página, paleta do filme, menu e e2e

**Files:** Create `lib/paleta/navegador.ts`, `components/usePaleta.ts`, `components/FaixaPaleta.tsx`, `components/CartaoHarmonia.tsx`, `components/GradeHarmonia.tsx`, `components/PaletaFilme.tsx`, `app/harmonia/page.tsx`, `e2e/harmonia.spec.ts`; Modify `components/GaleriaImagens.tsx`, `components/Navbar.tsx`, `e2e/mock-tmdb/servidor.mjs`, `e2e/mock-tmdb/dados.mjs`.

**Consumes:** `extrairPaleta`, `CorPaleta`, `FilmeHarmonia`, `ImagemFilme.pequena`.

- [ ] Simulador: discover com `vote_count.gte=1000` → 2 páginas de filmes (base 900000); `/movie/{id}/images` → 3 cenas `/harmonia-{id}-{n}.jpg` (ids terminados em 5 sem cenas).
- [ ] e2e (falha): ajudante que responde BMP sólido com `Access-Control-Allow-Origin: *` para `**/t/p/w300/**` (cor escolhida pelo nome do arquivo; `-falha` → 404); grade de 12; faixa vermelha num cartão; revelar mostra título e foca "Ver filme"; "Outras paletas" troca; rota 500 → aviso → "Tentar de novo" recupera; todas as cenas 404 → "Paleta indisponível"; menu leva à página; filme 1001 com "Paleta de cores" e código `#FF0000`.
- [ ] Componentes e página; `npm test`, `npm run typecheck`, `npm run test:e2e` → PASS. Commit `feat: página Harmonia de cores e paleta na página do filme`.

### Task 4: Documentação e publicação

- [ ] `CLAUDE.md` (fase concluída, estrutura `lib/paleta/`), `README.md`, roteiro. Commit `docs: ...`. `git push -u origin harmonia`; dono faz o merge; conferir no site publicado.
