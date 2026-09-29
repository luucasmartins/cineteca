# CineTeca Fase 1 — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o site CineTeca (catálogo de filmes em pt-BR alimentado pelo TMDB, visual escuro estilo streaming), com Favoritos e Salvos guardados no navegador.

**Architecture:** Next.js App Router renderizado no servidor (`force-dynamic`), com todas as chamadas ao TMDB concentradas em `lib/tmdb` (somente servidor, respostas cacheadas pelo data cache do Next). As listas do usuário ficam atrás da interface `ListaStore` em `lib/lista` (implementação `localStorage` agora, Supabase na Fase 2), expostas às telas por um React Context. A rolagem infinita e a busca no navegador passam pela rota interna `/api/filmes`.

**Tech Stack:** Next.js (última versão, App Router) · React · TypeScript · Tailwind CSS v4 · Vitest (unitários) · Playwright (ponta a ponta, com um TMDB simulado) · Vercel.

**Spec:** `docs/superpowers/specs/2026-09-29-catalogo-filmes-fase1-design.md`

## Global Constraints

- Todo texto visível em **português do Brasil**. Chamadas ao TMDB com `language=pt-BR`; região `BR`.
- Somente **filmes** (nada de séries).
- Cores exatas: fundo `#0B0B0F`, superfícies `#16161D`, destaque vermelho CineTeca `#D7263D` (hover `#B01E32`). Botão principal vermelho com texto branco; secundários cinza translúcido; foco com contorno branco; logo "CineTeca" em texto branco.
- Fonte **Manrope** (via `next/font/google`), fallback `system-ui, sans-serif`.
- Nunca usar o logo nem o nome da marca Netflix.
- O token do TMDB vem **somente** de `process.env.TMDB_READ_TOKEN` e **nunca** chega ao navegador (nada de `NEXT_PUBLIC_`). `process.env.TMDB_API_BASE` pode sobrescrever a URL da API (usado só nos testes ponta a ponta).
- Cache: listas e detalhes `revalidate: 21600` (6 h); gêneros `revalidate: 86400` (24 h). Tempo limite por chamada ao TMDB: 8000 ms.
- Chave do `localStorage`: `cineteca:listas:v1`. Tipos de lista: `"favoritos"` e `"salvos"`.
- Imagens com `<img>` simples (não usar `next/image`); URLs do CDN `https://image.tmdb.org/t/p`.
- Textos fixos exigidos pela spec (copiar exatamente): "Não foi possível carregar", "Tentar novamente", "Sinopse não disponível em português.", "Digite o nome de um filme", `Nenhum filme encontrado para "<termo>"`, "Não disponível em streaming no Brasil", "Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB".
- Ambiente: Windows 10, Node 24, **PowerShell 5.1** (sem `&&`; use `;` ou linhas separadas). O caminho do projeto tem espaço e acento: `C:\Users\Windows\Desktop\Projeto Catálogo de Filmes` — sempre entre aspas.
- Toda mensagem de commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (use um segundo `-m`).

## Review Focus

1. **Dados corrompidos ou de formato antigo no `localStorage`** (JSON inválido, itens sem `id`/`title`): o site deve abrir com listas vazias ou só com os itens válidos, sem quebrar. → testes na Task 4 (unitário) e Task 7 (ponta a ponta).
2. **Busca com acentos e símbolos** ("Amélie & cia", espaços, `?`): o termo deve chegar intacto ao TMDB e aparecer corretamente na página. → testes na Task 1 (codificação da URL) e Task 10 (ponta a ponta).
3. **Parâmetros inválidos na URL** (`/filme/abc`, `/genero/xyz`, `/api/filmes?pagina=abc` ou `pagina=501`): devem virar 404 ou 400, nunca erro 500. → testes na Task 5 (unitário), Task 9 e Task 11 (ponta a ponta).
4. **Filme com dados faltando** (sem vídeos, elenco, recomendações, provedores, pôster ou sinopse): a página de detalhes deve abrir com os blocos omitidos ou com textos e imagens padrão. → testes na Task 3 (unitário) e Task 7 (imagem padrão).
5. **Rolagem infinita recebendo filmes repetidos entre páginas** (o TMDB reordena por popularidade entre as páginas) e o fim das páginas: nada de cartões duplicados, e o carregamento para no fim. → testes na Task 9 (unitário `mesclarSemDuplicados` + ponta a ponta contando 59 cartões únicos).

---

## Mapa de arquivos

```
package.json, tsconfig.json, postcss.config.mjs, vitest.config.ts, playwright.config.ts
instrumentation.ts            aviso no log se TMDB_READ_TOKEN faltar
.env.local.example            modelo do arquivo de token
test/server-only-vazio.ts     substitui o pacote server-only nos testes unitários
lib/tmdb/config.ts            constantes (URLs, idioma, cache, tempo limite)
lib/tmdb/client.ts            tmdbFetch + TmdbError (único ponto que chama a API)
lib/tmdb/imagens.ts           imageUrl()
lib/tmdb/tipos.ts             tipos públicos (MovieSummary, MovieDetails...) e brutos do TMDB
lib/tmdb/normalizar.ts        conversão bruto → tipos públicos
lib/tmdb/filmes.ts            getGenres, getTrending, getPopular, getNowPlaying, getTopRated, discoverByGenre, searchMovies
lib/tmdb/detalhes.ts          getMovieDetails
lib/lista/tipos.ts            TipoLista, FilmeSalvo, ListaStore, paraFilmeSalvo
lib/lista/local.ts            criarListaLocal, obterArmazenamentoSeguro, CHAVE_LISTAS
lib/parametros.ts             lerIdPositivo, lerPagina
lib/mesclar.ts                mesclarSemDuplicados
lib/formatar.ts               formatarDuracao
app/api/filmes/route.ts       rota interna para rolagem infinita e busca
app/layout.tsx, globals.css, page.tsx, not-found.tsx, error.tsx
app/minha-lista/page.tsx
app/genero/[id]/page.tsx + loading.tsx
app/busca/page.tsx + loading.tsx
app/filme/[id]/page.tsx + loading.tsx
components/*                  componentes visuais (um por arquivo)
public/poster-padrao.svg, pessoa-padrao.svg, tmdb-logo.svg
e2e/mock-tmdb/dados.mjs, servidor.mjs   TMDB simulado
e2e/iniciar-servidor.mjs      sobe o TMDB simulado + next build + next start
e2e/ajudantes.ts, e2e/*.spec.ts
README.md
```

---

### Task 1: Base do projeto + cliente TMDB

**Files:**
- Create: `package.json`, `tsconfig.json`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.local.example`, `instrumentation.ts`, `test/server-only-vazio.ts`
- Create: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
- Create: `lib/tmdb/config.ts`, `lib/tmdb/client.ts`, `lib/tmdb/imagens.ts`
- Test: `lib/tmdb/client.test.ts`, `lib/tmdb/imagens.test.ts`
- Modify: `docs/superpowers/specs/2026-09-29-catalogo-filmes-fase1-design.md:4` (status)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `tmdbFetch<T>(caminho: string, params: ParametrosTmdb, revalidate: number): Promise<T>` — lança `TmdbError`.
  - `class TmdbError extends Error { status: number | null }`
  - `type ParametrosTmdb = Record<string, string | number | boolean | undefined>`
  - `imageUrl(caminho: string | null | undefined, tamanho: TamanhoImagem): string | null`
  - `type TamanhoImagem = 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'`
  - Constantes em `lib/tmdb/config.ts`: `TMDB_API_BASE_PADRAO`, `TMDB_IMAGE_BASE`, `IDIOMA`, `REGIAO`, `CACHE_LISTAS_SEGUNDOS`, `CACHE_GENEROS_SEGUNDOS`, `TEMPO_LIMITE_MS`.
  - Tokens Tailwind: `bg-fundo`, `bg-superficie`, `bg-destaque`, `bg-destaque-escuro`, `text-destaque`, `font-sans` (Manrope); classe utilitária `.sem-scrollbar`.

- [ ] **Step 1: Criar `package.json` e instalar dependências**

`package.json`:
```json
{
  "name": "cineteca",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "next typegen && tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

Run (PowerShell, na raiz do projeto):
```powershell
npm install next@latest react@latest react-dom@latest server-only
npm install -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss vitest
```
Expected: instala sem erros. Anote a versão do Next em `package.json` (deve ser ≥ 15.5 por causa de `next typegen` e dos `params` assíncronos).

- [ ] **Step 2: Configurações**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```
(Se o `next build` reescrever algum campo, como `jsx`, aceite a mudança.)

`postcss.config.mjs`:
```js
export default {
  plugins: { '@tailwindcss/postcss': {} },
}
```

`vitest.config.ts`:
```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const raiz = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': raiz,
      'server-only': fileURLToPath(new URL('./test/server-only-vazio.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
  },
})
```

`test/server-only-vazio.ts`:
```ts
// Nos testes unitários o pacote "server-only" é substituído por este arquivo vazio.
export {}
```

`.gitignore`:
```
node_modules/
.next/
out/
.env*.local
next-env.d.ts
*.tsbuildinfo
test-results/
playwright-report/
.vercel/
```

`.env.local.example`:
```
# Token de leitura da API do TMDB ("API Read Access Token", começa com eyJ...)
# Copie este arquivo para .env.local e cole o token depois do sinal de igual.
TMDB_READ_TOKEN=
```

`instrumentation.ts`:
```ts
export function register() {
  if (!process.env.TMDB_READ_TOKEN) {
    console.error(
      '[CineTeca] TMDB_READ_TOKEN não está configurado. Crie o arquivo .env.local (veja .env.local.example) ou configure a variável na Vercel.',
    )
  }
}
```

- [ ] **Step 3: Estilos globais, layout e página provisória**

`app/globals.css`:
```css
@import "tailwindcss";

@theme {
  --color-fundo: #0b0b0f;
  --color-superficie: #16161d;
  --color-destaque: #d7263d;
  --color-destaque-escuro: #b01e32;
  --font-sans: var(--font-manrope), system-ui, sans-serif;
}

html {
  background-color: var(--color-fundo);
  color: #fff;
  color-scheme: dark;
}

.sem-scrollbar {
  scrollbar-width: none;
}
.sem-scrollbar::-webkit-scrollbar {
  display: none;
}
```

`app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'CineTeca', template: '%s · CineTeca' },
  description: 'Descubra filmes, veja onde assistir e monte suas listas.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={manrope.variable}>
      <body className="min-h-screen bg-fundo font-sans text-white antialiased">{children}</body>
    </html>
  )
}
```

`app/page.tsx` (provisória; substituída na Task 8):
```tsx
export default function Inicio() {
  return (
    <div className="px-4 pt-24 md:px-10">
      <h1 className="text-3xl font-extrabold">CineTeca</h1>
    </div>
  )
}
```

- [ ] **Step 4: Escrever os testes do cliente TMDB (falhando)**

`lib/tmdb/imagens.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { imageUrl } from './imagens'

describe('imageUrl', () => {
  it('monta a URL completa do CDN do TMDB', () => {
    expect(imageUrl('/abc.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg')
  })

  it('devolve null quando não há imagem', () => {
    expect(imageUrl(null, 'w342')).toBeNull()
    expect(imageUrl(undefined, 'w500')).toBeNull()
    expect(imageUrl('', 'original')).toBeNull()
  })
})
```

`lib/tmdb/client.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tmdbFetch, TmdbError } from './client'

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('tmdbFetch', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('TMDB_READ_TOKEN', 'token-teste')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('chama o TMDB com token, idioma pt-BR, parâmetros, cache e tempo limite', async () => {
    fetchMock.mockResolvedValue(respostaJson({ ok: true }))

    const dados = await tmdbFetch<{ ok: boolean }>('/movie/popular', { page: 2, region: 'BR' }, 21600)

    expect(dados).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    const u = new URL(url)
    expect(u.origin + u.pathname).toBe('https://api.themoviedb.org/3/movie/popular')
    expect(u.searchParams.get('language')).toBe('pt-BR')
    expect(u.searchParams.get('page')).toBe('2')
    expect(u.searchParams.get('region')).toBe('BR')
    expect(init.headers.Authorization).toBe('Bearer token-teste')
    expect(init.next).toEqual({ revalidate: 21600 })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('ignora parâmetros undefined', async () => {
    fetchMock.mockResolvedValue(respostaJson({}))
    await tmdbFetch('/movie/popular', { page: undefined }, 60)
    const u = new URL(fetchMock.mock.calls[0][0])
    expect(u.searchParams.has('page')).toBe(false)
  })

  it('codifica acentos e símbolos da busca sem alterar o termo', async () => {
    fetchMock.mockResolvedValue(respostaJson({}))
    await tmdbFetch('/search/movie', { query: 'Amélie & cia?' }, 60)
    const url = fetchMock.mock.calls[0][0] as URL
    expect(url.toString()).toContain('Am%C3%A9lie')
    expect(url.searchParams.get('query')).toBe('Amélie & cia?')
  })

  it('usa TMDB_API_BASE quando definido', async () => {
    vi.stubEnv('TMDB_API_BASE', 'http://localhost:4010/3')
    fetchMock.mockResolvedValue(respostaJson({}))
    await tmdbFetch('/movie/popular', {}, 60)
    const u = new URL(fetchMock.mock.calls[0][0])
    expect(u.origin + u.pathname).toBe('http://localhost:4010/3/movie/popular')
  })

  it('lança TmdbError com o status quando a resposta não é ok', async () => {
    fetchMock.mockResolvedValue(respostaJson({ status_message: 'x' }, 404))
    await expect(tmdbFetch('/movie/1', {}, 60)).rejects.toMatchObject({ name: 'TmdbError', status: 404 })
  })

  it('lança TmdbError quando a rede falha ou o tempo esgota', async () => {
    fetchMock.mockRejectedValue(new DOMException('tempo esgotado', 'TimeoutError'))
    const erro = await tmdbFetch('/movie/1', {}, 60).catch((e) => e)
    expect(erro).toBeInstanceOf(TmdbError)
    expect(erro.status).toBeNull()
  })

  it('lança TmdbError sem chamar a API quando o token não está configurado', async () => {
    vi.stubEnv('TMDB_READ_TOKEN', '')
    await expect(tmdbFetch('/movie/1', {}, 60)).rejects.toThrow('TMDB_READ_TOKEN')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 5: Rodar os testes para ver falhar**

Run: `npx vitest run lib/tmdb`
Expected: FAIL — `Failed to resolve import "./client"` / `"./imagens"`.

- [ ] **Step 6: Implementar config, imagens e cliente**

`lib/tmdb/config.ts`:
```ts
export const TMDB_API_BASE_PADRAO = 'https://api.themoviedb.org/3'
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'
export const IDIOMA = 'pt-BR'
export const REGIAO = 'BR'
export const CACHE_LISTAS_SEGUNDOS = 21600
export const CACHE_GENEROS_SEGUNDOS = 86400
export const TEMPO_LIMITE_MS = 8000
```

`lib/tmdb/imagens.ts`:
```ts
import { TMDB_IMAGE_BASE } from './config'

export type TamanhoImagem = 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'

export function imageUrl(caminho: string | null | undefined, tamanho: TamanhoImagem): string | null {
  if (!caminho) return null
  return `${TMDB_IMAGE_BASE}/${tamanho}${caminho}`
}
```

`lib/tmdb/client.ts`:
```ts
import 'server-only'
import { IDIOMA, TEMPO_LIMITE_MS, TMDB_API_BASE_PADRAO } from './config'

export type ParametrosTmdb = Record<string, string | number | boolean | undefined>

export class TmdbError extends Error {
  readonly status: number | null

  constructor(mensagem: string, status: number | null = null) {
    super(mensagem)
    this.name = 'TmdbError'
    this.status = status
  }
}

export async function tmdbFetch<T>(caminho: string, params: ParametrosTmdb, revalidate: number): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN
  if (!token) throw new TmdbError('TMDB_READ_TOKEN não configurado')

  const url = new URL((process.env.TMDB_API_BASE || TMDB_API_BASE_PADRAO) + caminho)
  url.searchParams.set('language', IDIOMA)
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== undefined) url.searchParams.set(chave, String(valor))
  }

  let resposta: Response
  try {
    resposta = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      next: { revalidate },
    })
  } catch (erro) {
    throw new TmdbError(`Falha ao contatar o TMDB: ${(erro as Error).message}`)
  }

  if (!resposta.ok) {
    throw new TmdbError(`TMDB respondeu ${resposta.status} em ${caminho}`, resposta.status)
  }
  return (await resposta.json()) as T
}
```

- [ ] **Step 7: Rodar os testes para ver passar**

Run: `npx vitest run lib/tmdb`
Expected: PASS (9 testes).

- [ ] **Step 8: Conferir build e tipos**

Run:
```powershell
npm run build
npm run typecheck
```
Expected: os dois terminam sem erros. O build mostra o aviso `[CineTeca] TMDB_READ_TOKEN não está configurado` (esperado, ainda não há `.env.local`). Se o build falhar por causa do acento ou do espaço no caminho da pasta, **pare e reporte** (não renomeie a pasta por conta própria).

- [ ] **Step 9: Marcar a spec como aprovada**

Em `docs/superpowers/specs/2026-09-29-catalogo-filmes-fase1-design.md`, troque `**Status:** aguardando revisão` por `**Status:** aprovada`.

- [ ] **Step 10: Commit**

```powershell
git add package.json package-lock.json tsconfig.json postcss.config.mjs vitest.config.ts .gitignore .env.local.example instrumentation.ts test app lib docs
git commit -m "feat: base do projeto Next.js e cliente do TMDB" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Listas de filmes do TMDB (tipos, normalização, funções de lista)

**Files:**
- Create: `lib/tmdb/tipos.ts`, `lib/tmdb/normalizar.ts`, `lib/tmdb/filmes.ts`
- Test: `lib/tmdb/normalizar.test.ts`, `lib/tmdb/filmes.test.ts`

**Interfaces:**
- Consumes: `tmdbFetch`, `ParametrosTmdb`, `imageUrl`, constantes de `config.ts` (Task 1).
- Produces:
  - `type Genero = { id: number; name: string }`
  - `type OrdemGenero = 'popularidade' | 'nota' | 'lancamento'` e `const ORDENS_GENERO: OrdemGenero[]`
  - `type MovieSummary = { id: number; title: string; overview: string; posterUrl: string | null; backdropUrl: string | null; year: string | null; rating: number | null; genres: string[] }`
  - `type PaginaFilmes = { results: MovieSummary[]; page: number; totalPages: number }`
  - `type CastMember = { id: number; name: string; character: string | null; profileUrl: string | null }`
  - `type Provider = { id: number; name: string; logoUrl: string | null }`
  - `type WatchProviders = { link: string; streaming: Provider[]; rent: Provider[]; buy: Provider[] }`
  - `type MovieDetails = MovieSummary & { runtime: number | null; trailerKey: string | null; cast: CastMember[]; recommendations: MovieSummary[]; watchProviders: WatchProviders | null }`
  - Brutos: `TmdbFilmeBruto`, `TmdbPaginaBruta`.
  - `SINOPSE_INDISPONIVEL`, `normalizarAno`, `normalizarNota`, `normalizarSinopse`, `normalizarResumo(f: TmdbFilmeBruto, generos: Map<number, string>): MovieSummary`
  - `getGenres(): Promise<Genero[]>`, `getTrending(): Promise<PaginaFilmes>`, `getPopular(page?)`, `getNowPlaying(page?)`, `getTopRated(page?)`, `discoverByGenre(genreId: number, ordem: OrdemGenero, page?)`, `searchMovies(query: string, page?)` — todas `Promise<PaginaFilmes>` (exceto `getGenres`), com `page` padrão 1 e `totalPages` limitado a 500.

- [ ] **Step 1: Criar os tipos**

`lib/tmdb/tipos.ts`:
```ts
// Tipos públicos: o resto do site só conhece estes formatos.
export type Genero = { id: number; name: string }

export type OrdemGenero = 'popularidade' | 'nota' | 'lancamento'
export const ORDENS_GENERO: OrdemGenero[] = ['popularidade', 'nota', 'lancamento']

export type MovieSummary = {
  id: number
  title: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  year: string | null
  rating: number | null
  genres: string[]
}

export type PaginaFilmes = { results: MovieSummary[]; page: number; totalPages: number }

export type CastMember = { id: number; name: string; character: string | null; profileUrl: string | null }

export type Provider = { id: number; name: string; logoUrl: string | null }

export type WatchProviders = { link: string; streaming: Provider[]; rent: Provider[]; buy: Provider[] }

export type MovieDetails = MovieSummary & {
  runtime: number | null
  trailerKey: string | null
  cast: CastMember[]
  recommendations: MovieSummary[]
  watchProviders: WatchProviders | null
}

// Formatos brutos do TMDB (usados só dentro de lib/tmdb).
export type TmdbFilmeBruto = {
  id: number
  title?: string
  original_title?: string
  overview?: string | null
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string | null
  vote_average?: number
  vote_count?: number
  genre_ids?: number[]
}

export type TmdbPaginaBruta = {
  page: number
  results: TmdbFilmeBruto[]
  total_pages: number
  total_results: number
}
```

- [ ] **Step 2: Escrever os testes de normalização (falhando)**

`lib/tmdb/normalizar.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { normalizarAno, normalizarNota, normalizarResumo, normalizarSinopse, SINOPSE_INDISPONIVEL } from './normalizar'

const GENEROS = new Map([
  [28, 'Ação'],
  [18, 'Drama'],
])

describe('normalizarResumo', () => {
  it('converte um filme completo', () => {
    const filme = normalizarResumo(
      {
        id: 603,
        title: 'Matrix',
        overview: 'Um hacker descobre a verdade.',
        poster_path: '/p.jpg',
        backdrop_path: '/b.jpg',
        release_date: '1999-03-31',
        vote_average: 8.216,
        vote_count: 25000,
        genre_ids: [28, 18, 999],
      },
      GENEROS,
    )
    expect(filme).toEqual({
      id: 603,
      title: 'Matrix',
      overview: 'Um hacker descobre a verdade.',
      posterUrl: 'https://image.tmdb.org/t/p/w342/p.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/b.jpg',
      year: '1999',
      rating: 8.2,
      genres: ['Ação', 'Drama'],
    })
  })

  it('usa valores padrão quando faltam dados', () => {
    const filme = normalizarResumo({ id: 1, original_title: 'Original' }, GENEROS)
    expect(filme).toEqual({
      id: 1,
      title: 'Original',
      overview: SINOPSE_INDISPONIVEL,
      posterUrl: null,
      backdropUrl: null,
      year: null,
      rating: null,
      genres: [],
    })
  })

  it('usa "Sem título" quando não há título nenhum', () => {
    expect(normalizarResumo({ id: 2 }, GENEROS).title).toBe('Sem título')
  })
})

describe('auxiliares', () => {
  it('normalizarSinopse troca texto vazio pela mensagem padrão', () => {
    expect(SINOPSE_INDISPONIVEL).toBe('Sinopse não disponível em português.')
    expect(normalizarSinopse('   ')).toBe(SINOPSE_INDISPONIVEL)
    expect(normalizarSinopse(null)).toBe(SINOPSE_INDISPONIVEL)
    expect(normalizarSinopse(' Texto ')).toBe('Texto')
  })

  it('normalizarAno só aceita datas com ano', () => {
    expect(normalizarAno('2024-05-10')).toBe('2024')
    expect(normalizarAno('')).toBeNull()
    expect(normalizarAno(null)).toBeNull()
  })

  it('normalizarNota devolve null sem votos e arredonda para 1 casa', () => {
    expect(normalizarNota(7.86, 10)).toBe(7.9)
    expect(normalizarNota(0, 0)).toBeNull()
    expect(normalizarNota(undefined, 10)).toBeNull()
  })
})
```

- [ ] **Step 3: Rodar para ver falhar**

Run: `npx vitest run lib/tmdb/normalizar.test.ts`
Expected: FAIL — `Failed to resolve import "./normalizar"`.

- [ ] **Step 4: Implementar a normalização**

`lib/tmdb/normalizar.ts`:
```ts
import { imageUrl } from './imagens'
import type { MovieSummary, TmdbFilmeBruto } from './tipos'

export const SINOPSE_INDISPONIVEL = 'Sinopse não disponível em português.'

export function normalizarAno(data?: string | null): string | null {
  return data && /^\d{4}/.test(data) ? data.slice(0, 4) : null
}

export function normalizarNota(media?: number, votos?: number): number | null {
  if (!votos || media === undefined) return null
  return Math.round(media * 10) / 10
}

export function normalizarSinopse(texto?: string | null): string {
  const limpo = texto?.trim()
  return limpo ? limpo : SINOPSE_INDISPONIVEL
}

export function normalizarResumo(filme: TmdbFilmeBruto, generos: Map<number, string>): MovieSummary {
  return {
    id: filme.id,
    title: filme.title || filme.original_title || 'Sem título',
    overview: normalizarSinopse(filme.overview),
    posterUrl: imageUrl(filme.poster_path, 'w342'),
    backdropUrl: imageUrl(filme.backdrop_path, 'w1280'),
    year: normalizarAno(filme.release_date),
    rating: normalizarNota(filme.vote_average, filme.vote_count),
    genres: (filme.genre_ids ?? [])
      .map((id) => generos.get(id))
      .filter((nome): nome is string => Boolean(nome)),
  }
}
```

- [ ] **Step 5: Rodar para ver passar**

Run: `npx vitest run lib/tmdb/normalizar.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 6: Escrever os testes das funções de lista (falhando)**

`lib/tmdb/filmes.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', () => ({ tmdbFetch: vi.fn() }))

import { tmdbFetch } from './client'
import { discoverByGenre, getGenres, getNowPlaying, getPopular, getTopRated, getTrending, searchMovies } from './filmes'

const tmdbFetchMock = vi.mocked(tmdbFetch)

const GENEROS = { genres: [{ id: 28, name: 'Ação' }, { id: 35, name: 'Comédia' }] }

function paginaBruta(totalPaginas = 3) {
  return {
    page: 1,
    total_pages: totalPaginas,
    total_results: totalPaginas * 20,
    results: [{ id: 10, title: 'Filme A', genre_ids: [28, 35], vote_average: 7, vote_count: 5 }],
  }
}

function responderCom(rotas: Record<string, unknown>) {
  tmdbFetchMock.mockImplementation((async (caminho: string) => {
    if (caminho in rotas) {
      const valor = rotas[caminho]
      if (valor instanceof Error) throw valor
      return valor
    }
    throw new Error(`caminho inesperado: ${caminho}`)
  }) as typeof tmdbFetch)
}

function chamadaPara(caminho: string) {
  const chamada = tmdbFetchMock.mock.calls.find(([c]) => c === caminho)
  if (!chamada) throw new Error(`${caminho} não foi chamado`)
  return { params: chamada[1], revalidate: chamada[2] }
}

beforeEach(() => {
  tmdbFetchMock.mockReset()
})

describe('getGenres', () => {
  it('busca a lista de gêneros com cache de 24 h', async () => {
    responderCom({ '/genre/movie/list': GENEROS })
    expect(await getGenres()).toEqual(GENEROS.genres)
    expect(chamadaPara('/genre/movie/list').revalidate).toBe(86400)
  })
})

describe('listas', () => {
  it('getPopular pede a página e a região BR, com cache de 6 h, e traduz os gêneros', async () => {
    responderCom({ '/movie/popular': paginaBruta(), '/genre/movie/list': GENEROS })
    const pagina = await getPopular(2)
    expect(chamadaPara('/movie/popular')).toEqual({ params: { page: 2, region: 'BR' }, revalidate: 21600 })
    expect(pagina.page).toBe(1)
    expect(pagina.totalPages).toBe(3)
    expect(pagina.results[0]).toMatchObject({ id: 10, title: 'Filme A', genres: ['Ação', 'Comédia'] })
  })

  it('getTrending, getNowPlaying e getTopRated usam os endpoints certos', async () => {
    responderCom({
      '/trending/movie/day': paginaBruta(),
      '/movie/now_playing': paginaBruta(),
      '/movie/top_rated': paginaBruta(),
      '/genre/movie/list': GENEROS,
    })
    await getTrending()
    await getNowPlaying()
    await getTopRated()
    expect(chamadaPara('/trending/movie/day').params).toEqual({ page: 1 })
    expect(chamadaPara('/movie/now_playing').params).toEqual({ page: 1, region: 'BR' })
    expect(chamadaPara('/movie/top_rated').params).toEqual({ page: 1, region: 'BR' })
  })

  it('continua funcionando sem nomes de gênero quando a lista de gêneros falha', async () => {
    responderCom({ '/movie/popular': paginaBruta(), '/genre/movie/list': new Error('fora do ar') })
    const pagina = await getPopular()
    expect(pagina.results[0].genres).toEqual([])
  })

  it('limita totalPages a 500 (limite do TMDB)', async () => {
    responderCom({ '/movie/popular': paginaBruta(40000), '/genre/movie/list': GENEROS })
    expect((await getPopular()).totalPages).toBe(500)
  })

  it('propaga o erro quando a lista principal falha', async () => {
    responderCom({ '/movie/popular': new Error('TMDB fora do ar'), '/genre/movie/list': GENEROS })
    await expect(getPopular()).rejects.toThrow('TMDB fora do ar')
  })
})

describe('discoverByGenre', () => {
  beforeEach(() => responderCom({ '/discover/movie': paginaBruta(), '/genre/movie/list': GENEROS }))

  it('ordena por popularidade', async () => {
    await discoverByGenre(28, 'popularidade', 3)
    expect(chamadaPara('/discover/movie').params).toMatchObject({
      with_genres: 28,
      page: 3,
      include_adult: false,
      sort_by: 'popularity.desc',
    })
  })

  it('ordena por nota exigindo um mínimo de votos', async () => {
    await discoverByGenre(28, 'nota')
    expect(chamadaPara('/discover/movie').params).toMatchObject({ sort_by: 'vote_average.desc', 'vote_count.gte': 300 })
  })

  it('ordena por lançamento sem incluir filmes futuros', async () => {
    await discoverByGenre(28, 'lancamento')
    const { params } = chamadaPara('/discover/movie')
    expect(params).toMatchObject({ sort_by: 'primary_release_date.desc', 'vote_count.gte': 10 })
    expect(params['primary_release_date.lte']).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('searchMovies', () => {
  it('envia o termo sem alterá-lo', async () => {
    responderCom({ '/search/movie': paginaBruta(), '/genre/movie/list': GENEROS })
    await searchMovies('Amélie & cia', 2)
    expect(chamadaPara('/search/movie').params).toEqual({ query: 'Amélie & cia', page: 2, include_adult: false })
  })
})
```

- [ ] **Step 7: Rodar para ver falhar**

Run: `npx vitest run lib/tmdb/filmes.test.ts`
Expected: FAIL — `Failed to resolve import "./filmes"`.

- [ ] **Step 8: Implementar as funções de lista**

`lib/tmdb/filmes.ts`:
```ts
import 'server-only'
import { tmdbFetch, type ParametrosTmdb } from './client'
import { CACHE_GENEROS_SEGUNDOS, CACHE_LISTAS_SEGUNDOS, REGIAO } from './config'
import { normalizarResumo } from './normalizar'
import type { Genero, OrdemGenero, PaginaFilmes, TmdbPaginaBruta } from './tipos'

const LIMITE_PAGINAS_TMDB = 500

export async function getGenres(): Promise<Genero[]> {
  const dados = await tmdbFetch<{ genres: Genero[] }>('/genre/movie/list', {}, CACHE_GENEROS_SEGUNDOS)
  return dados.genres
}

async function buscarPagina(caminho: string, params: ParametrosTmdb): Promise<PaginaFilmes> {
  const [dados, generos] = await Promise.all([
    tmdbFetch<TmdbPaginaBruta>(caminho, params, CACHE_LISTAS_SEGUNDOS),
    getGenres().catch((): Genero[] => []),
  ])
  const mapa = new Map(generos.map((g) => [g.id, g.name]))
  return {
    results: dados.results.map((filme) => normalizarResumo(filme, mapa)),
    page: dados.page,
    totalPages: Math.min(dados.total_pages, LIMITE_PAGINAS_TMDB),
  }
}

export function getTrending(): Promise<PaginaFilmes> {
  return buscarPagina('/trending/movie/day', { page: 1 })
}

export function getPopular(page = 1): Promise<PaginaFilmes> {
  return buscarPagina('/movie/popular', { page, region: REGIAO })
}

export function getNowPlaying(page = 1): Promise<PaginaFilmes> {
  return buscarPagina('/movie/now_playing', { page, region: REGIAO })
}

export function getTopRated(page = 1): Promise<PaginaFilmes> {
  return buscarPagina('/movie/top_rated', { page, region: REGIAO })
}

function parametrosDeOrdem(ordem: OrdemGenero): ParametrosTmdb {
  switch (ordem) {
    case 'nota':
      return { sort_by: 'vote_average.desc', 'vote_count.gte': 300 }
    case 'lancamento':
      return {
        sort_by: 'primary_release_date.desc',
        'vote_count.gte': 10,
        'primary_release_date.lte': new Date().toISOString().slice(0, 10),
      }
    default:
      return { sort_by: 'popularity.desc' }
  }
}

export function discoverByGenre(genreId: number, ordem: OrdemGenero, page = 1): Promise<PaginaFilmes> {
  return buscarPagina('/discover/movie', {
    with_genres: genreId,
    page,
    include_adult: false,
    ...parametrosDeOrdem(ordem),
  })
}

export function searchMovies(query: string, page = 1): Promise<PaginaFilmes> {
  return buscarPagina('/search/movie', { query, page, include_adult: false })
}
```

- [ ] **Step 9: Rodar todos os testes**

Run: `npx vitest run`
Expected: PASS (todos os testes das Tasks 1 e 2).

- [ ] **Step 10: Commit**

```powershell
git add lib/tmdb
git commit -m "feat: listas de filmes do TMDB normalizadas em pt-BR" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Detalhes do filme (`getMovieDetails`)

**Files:**
- Create: `lib/tmdb/detalhes.ts`
- Test: `lib/tmdb/detalhes.test.ts`

**Interfaces:**
- Consumes: `tmdbFetch`, `TmdbError`, `getGenres`, `imageUrl`, `normalizarResumo`, tipos (Tasks 1–2).
- Produces: `getMovieDetails(id: number): Promise<MovieDetails | null>` — `null` quando o TMDB responde 404; lança `TmdbError` nos demais erros. `MAX_ELENCO = 15`.

- [ ] **Step 1: Escrever os testes (falhando)**

`lib/tmdb/detalhes.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', async () => {
  const real = await vi.importActual<typeof import('./client')>('./client')
  return { TmdbError: real.TmdbError, tmdbFetch: vi.fn() }
})

import { tmdbFetch, TmdbError } from './client'
import { getMovieDetails } from './detalhes'
import { SINOPSE_INDISPONIVEL } from './normalizar'

const tmdbFetchMock = vi.mocked(tmdbFetch)
const GENEROS = { genres: [{ id: 28, name: 'Ação' }, { id: 878, name: 'Ficção científica' }] }

const COMPLETO = {
  id: 603,
  title: 'Matrix',
  overview: 'Um hacker descobre a verdade.',
  poster_path: '/p.jpg',
  backdrop_path: '/b.jpg',
  release_date: '1999-03-31',
  vote_average: 8.2,
  vote_count: 25000,
  runtime: 136,
  genres: [{ id: 28, name: 'Ação' }, { id: 878, name: 'Ficção científica' }],
  videos: {
    results: [
      { key: 'clip', site: 'YouTube', type: 'Clip', iso_639_1: 'pt' },
      { key: 'trailer-en', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'en' },
      { key: 'trailer-pt', site: 'YouTube', type: 'Trailer', official: false, iso_639_1: 'pt' },
      { key: 'vimeo', site: 'Vimeo', type: 'Trailer', iso_639_1: 'pt' },
    ],
  },
  credits: {
    cast: Array.from({ length: 20 }, (_, i) => ({
      id: 100 + i,
      name: `Ator ${i}`,
      character: i === 10 ? '' : `Personagem ${i}`,
      profile_path: i === 0 ? '/ator.jpg' : null,
      order: 19 - i,
    })),
  },
  recommendations: {
    page: 1,
    total_pages: 1,
    total_results: 1,
    results: [{ id: 604, title: 'Matrix Reloaded', genre_ids: [878] }],
  },
  'watch/providers': {
    results: {
      US: { link: 'https://us', flatrate: [{ provider_id: 1, provider_name: 'US Only' }] },
      BR: {
        link: 'https://www.themoviedb.org/movie/603/watch?locale=BR',
        flatrate: [
          { provider_id: 9, provider_name: 'Segundo', logo_path: '/l2.jpg', display_priority: 2 },
          { provider_id: 8, provider_name: 'Primeiro', logo_path: '/l1.jpg', display_priority: 1 },
        ],
        rent: [{ provider_id: 2, provider_name: 'Loja', logo_path: null }],
      },
    },
  },
}

function responderCom(detalhe: unknown) {
  tmdbFetchMock.mockImplementation((async (caminho: string) => {
    if (caminho === '/genre/movie/list') return GENEROS
    if (caminho.startsWith('/movie/')) {
      if (detalhe instanceof Error) throw detalhe
      return detalhe
    }
    throw new Error(`caminho inesperado: ${caminho}`)
  }) as typeof tmdbFetch)
}

beforeEach(() => {
  tmdbFetchMock.mockReset()
})

describe('getMovieDetails', () => {
  it('pede tudo numa única chamada com append_to_response', async () => {
    responderCom(COMPLETO)
    await getMovieDetails(603)
    const chamada = tmdbFetchMock.mock.calls.find(([c]) => c === '/movie/603')!
    expect(chamada[1]).toEqual({
      append_to_response: 'videos,credits,recommendations,watch/providers',
      include_video_language: 'pt,en,null',
    })
    expect(chamada[2]).toBe(21600)
  })

  it('converte um filme completo', async () => {
    responderCom(COMPLETO)
    const filme = (await getMovieDetails(603))!
    expect(filme).toMatchObject({
      id: 603,
      title: 'Matrix',
      overview: 'Um hacker descobre a verdade.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/p.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/b.jpg',
      year: '1999',
      runtime: 136,
      rating: 8.2,
      genres: ['Ação', 'Ficção científica'],
    })
  })

  it('prefere o trailer do YouTube em português', async () => {
    responderCom(COMPLETO)
    expect((await getMovieDetails(603))!.trailerKey).toBe('trailer-pt')
  })

  it('limita o elenco a 15 pessoas na ordem de créditos', async () => {
    responderCom(COMPLETO)
    const { cast } = (await getMovieDetails(603))!
    expect(cast).toHaveLength(15)
    expect(cast[0]).toEqual({ id: 119, name: 'Ator 19', character: 'Personagem 19', profileUrl: null })
    expect(cast.find((a) => a.id === 110)?.character).toBeNull()
    expect(cast.find((a) => a.id === 100)).toBeUndefined()
  })

  it('usa só os provedores do Brasil, na ordem de prioridade', async () => {
    responderCom(COMPLETO)
    expect((await getMovieDetails(603))!.watchProviders).toEqual({
      link: 'https://www.themoviedb.org/movie/603/watch?locale=BR',
      streaming: [
        { id: 8, name: 'Primeiro', logoUrl: 'https://image.tmdb.org/t/p/w92/l1.jpg' },
        { id: 9, name: 'Segundo', logoUrl: 'https://image.tmdb.org/t/p/w92/l2.jpg' },
      ],
      rent: [{ id: 2, name: 'Loja', logoUrl: null }],
      buy: [],
    })
  })

  it('traduz os gêneros das recomendações', async () => {
    responderCom(COMPLETO)
    const { recommendations } = (await getMovieDetails(603))!
    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]).toMatchObject({ id: 604, title: 'Matrix Reloaded', genres: ['Ficção científica'] })
  })

  it('aceita filme sem vídeos, elenco, recomendações, provedores, pôster nem sinopse', async () => {
    responderCom({ id: 1, title: 'Mínimo', runtime: 0 })
    expect(await getMovieDetails(1)).toEqual({
      id: 1,
      title: 'Mínimo',
      overview: SINOPSE_INDISPONIVEL,
      posterUrl: null,
      backdropUrl: null,
      year: null,
      rating: null,
      genres: [],
      runtime: null,
      trailerKey: null,
      cast: [],
      recommendations: [],
      watchProviders: null,
    })
  })

  it('devolve watchProviders null quando só há dados de outros países', async () => {
    responderCom({ ...COMPLETO, 'watch/providers': { results: { US: COMPLETO['watch/providers'].results.US } } })
    expect((await getMovieDetails(603))!.watchProviders).toBeNull()
  })

  it('devolve null quando o filme não existe (404)', async () => {
    responderCom(new TmdbError('não encontrado', 404))
    expect(await getMovieDetails(999999)).toBeNull()
  })

  it('propaga outros erros do TMDB', async () => {
    responderCom(new TmdbError('fora do ar', 500))
    await expect(getMovieDetails(603)).rejects.toMatchObject({ status: 500 })
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run lib/tmdb/detalhes.test.ts`
Expected: FAIL — `Failed to resolve import "./detalhes"`.

- [ ] **Step 3: Implementar**

`lib/tmdb/detalhes.ts`:
```ts
import 'server-only'
import { tmdbFetch, TmdbError } from './client'
import { CACHE_LISTAS_SEGUNDOS, REGIAO } from './config'
import { getGenres } from './filmes'
import { imageUrl } from './imagens'
import { normalizarResumo } from './normalizar'
import type { CastMember, Genero, MovieDetails, Provider, TmdbFilmeBruto, TmdbPaginaBruta, WatchProviders } from './tipos'

export const MAX_ELENCO = 15

type VideoBruto = { key: string; site: string; type: string; official?: boolean; iso_639_1?: string | null }
type AtorBruto = { id: number; name: string; character?: string | null; profile_path?: string | null; order?: number }
type ProvedorBruto = { provider_id: number; provider_name: string; logo_path?: string | null; display_priority?: number }
type OfertasBrutas = { link?: string; flatrate?: ProvedorBruto[]; rent?: ProvedorBruto[]; buy?: ProvedorBruto[] }

type TmdbDetalhesBruto = TmdbFilmeBruto & {
  runtime?: number | null
  genres?: Genero[]
  videos?: { results?: VideoBruto[] }
  credits?: { cast?: AtorBruto[] }
  recommendations?: Partial<TmdbPaginaBruta>
  'watch/providers'?: { results?: Record<string, OfertasBrutas> }
}

export async function getMovieDetails(id: number): Promise<MovieDetails | null> {
  let bruto: TmdbDetalhesBruto
  try {
    bruto = await tmdbFetch<TmdbDetalhesBruto>(
      `/movie/${id}`,
      {
        append_to_response: 'videos,credits,recommendations,watch/providers',
        include_video_language: 'pt,en,null',
      },
      CACHE_LISTAS_SEGUNDOS,
    )
  } catch (erro) {
    if (erro instanceof TmdbError && erro.status === 404) return null
    throw erro
  }

  const generos = await getGenres().catch((): Genero[] => [])
  const mapa = new Map(generos.map((g) => [g.id, g.name]))

  return {
    ...normalizarResumo(bruto, mapa),
    posterUrl: imageUrl(bruto.poster_path, 'w500'),
    genres: (bruto.genres ?? []).map((g) => g.name),
    runtime: bruto.runtime && bruto.runtime > 0 ? bruto.runtime : null,
    trailerKey: escolherTrailer(bruto.videos?.results ?? []),
    cast: normalizarElenco(bruto.credits?.cast ?? []),
    recommendations: (bruto.recommendations?.results ?? []).map((f) => normalizarResumo(f, mapa)),
    watchProviders: normalizarProvedores(bruto['watch/providers']?.results?.[REGIAO]),
  }
}

function escolherTrailer(videos: VideoBruto[]): string | null {
  const pontuar = (v: VideoBruto) =>
    (v.type === 'Trailer' ? 4 : v.type === 'Teaser' ? 2 : -100) +
    (v.iso_639_1 === 'pt' ? 1.5 : 0) +
    (v.official ? 0.5 : 0)
  const melhor = videos
    .filter((v) => v.site === 'YouTube' && v.key && pontuar(v) > 0)
    .sort((a, b) => pontuar(b) - pontuar(a))[0]
  return melhor?.key ?? null
}

function normalizarElenco(elenco: AtorBruto[]): CastMember[] {
  return [...elenco]
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, MAX_ELENCO)
    .map((ator) => ({
      id: ator.id,
      name: ator.name,
      character: ator.character?.trim() || null,
      profileUrl: imageUrl(ator.profile_path, 'w185'),
    }))
}

function normalizarProvedores(ofertas?: OfertasBrutas): WatchProviders | null {
  if (!ofertas) return null
  const converter = (lista?: ProvedorBruto[]): Provider[] =>
    [...(lista ?? [])]
      .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
      .map((p) => ({ id: p.provider_id, name: p.provider_name, logoUrl: imageUrl(p.logo_path, 'w92') }))
  const resultado: WatchProviders = {
    link: ofertas.link ?? '',
    streaming: converter(ofertas.flatrate),
    rent: converter(ofertas.rent),
    buy: converter(ofertas.buy),
  }
  const temAlgo = resultado.streaming.length + resultado.rent.length + resultado.buy.length > 0
  return temAlgo ? resultado : null
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run lib/tmdb`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```powershell
git add lib/tmdb
git commit -m "feat: detalhes do filme com trailer, elenco e onde assistir" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Camada Minha Lista (`localStorage`)

**Files:**
- Create: `lib/lista/tipos.ts`, `lib/lista/local.ts`
- Test: `lib/lista/local.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type TipoLista = 'favoritos' | 'salvos'`, `const TIPOS_LISTA: TipoLista[]`
  - `type FilmeSalvo = { id: number; title: string; posterUrl: string | null; year: string | null; rating: number | null }`
  - `type Listas = Record<TipoLista, FilmeSalvo[]>`
  - `interface ListaStore { listar(tipo): Promise<FilmeSalvo[]>; contem(tipo, id): Promise<boolean>; adicionar(tipo, filme): Promise<void>; remover(tipo, id): Promise<void> }` (assíncrona de propósito: a Fase 2 troca por Supabase sem mudar quem usa)
  - `paraFilmeSalvo(f: FilmeSalvo): FilmeSalvo` — copia só os 5 campos (aceita `MovieSummary`/`MovieDetails`)
  - `CHAVE_LISTAS = 'cineteca:listas:v1'`
  - `type ArmazenamentoSimples = Pick<Storage, 'getItem' | 'setItem'>`
  - `obterArmazenamentoSeguro(): ArmazenamentoSimples | null`
  - `criarListaLocal(armazenamento: ArmazenamentoSimples | null): ListaStore`

- [ ] **Step 1: Criar os tipos**

`lib/lista/tipos.ts`:
```ts
export type TipoLista = 'favoritos' | 'salvos'
export const TIPOS_LISTA: TipoLista[] = ['favoritos', 'salvos']

export type FilmeSalvo = {
  id: number
  title: string
  posterUrl: string | null
  year: string | null
  rating: number | null
}

export type Listas = Record<TipoLista, FilmeSalvo[]>

// Interface estável: na Fase 2 ganha uma implementação com Supabase.
export interface ListaStore {
  listar(tipo: TipoLista): Promise<FilmeSalvo[]>
  contem(tipo: TipoLista, id: number): Promise<boolean>
  adicionar(tipo: TipoLista, filme: FilmeSalvo): Promise<void>
  remover(tipo: TipoLista, id: number): Promise<void>
}

export function paraFilmeSalvo(filme: FilmeSalvo): FilmeSalvo {
  return {
    id: filme.id,
    title: filme.title,
    posterUrl: filme.posterUrl,
    year: filme.year,
    rating: filme.rating,
  }
}
```

- [ ] **Step 2: Escrever os testes (falhando)**

`lib/lista/local.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_LISTAS, criarListaLocal, obterArmazenamentoSeguro } from './local'
import { paraFilmeSalvo, type FilmeSalvo } from './tipos'

function armazenamentoFalso(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial))
  return {
    dados,
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => {
      dados.set(chave, valor)
    },
  }
}

const filme = (id: number): FilmeSalvo => ({ id, title: `Filme ${id}`, posterUrl: null, year: '2024', rating: 7.5 })

describe('criarListaLocal', () => {
  it('começa com as duas listas vazias', async () => {
    const loja = criarListaLocal(armazenamentoFalso())
    expect(await loja.listar('favoritos')).toEqual([])
    expect(await loja.listar('salvos')).toEqual([])
  })

  it('adiciona, persiste na chave certa e reabre com os mesmos dados', async () => {
    const armazenamento = armazenamentoFalso()
    await criarListaLocal(armazenamento).adicionar('favoritos', filme(1))

    expect(JSON.parse(armazenamento.dados.get(CHAVE_LISTAS)!)).toEqual({ favoritos: [filme(1)], salvos: [] })
    expect(await criarListaLocal(armazenamento).listar('favoritos')).toEqual([filme(1)])
  })

  it('coloca o mais recente primeiro e não duplica', async () => {
    const loja = criarListaLocal(armazenamentoFalso())
    await loja.adicionar('salvos', filme(1))
    await loja.adicionar('salvos', filme(2))
    await loja.adicionar('salvos', filme(1))
    expect((await loja.listar('salvos')).map((f) => f.id)).toEqual([1, 2])
  })

  it('remove e responde contem', async () => {
    const loja = criarListaLocal(armazenamentoFalso())
    await loja.adicionar('favoritos', filme(1))
    expect(await loja.contem('favoritos', 1)).toBe(true)
    await loja.remover('favoritos', 1)
    expect(await loja.contem('favoritos', 1)).toBe(false)
  })

  it('mantém favoritos e salvos independentes', async () => {
    const loja = criarListaLocal(armazenamentoFalso())
    await loja.adicionar('favoritos', filme(1))
    expect(await loja.contem('salvos', 1)).toBe(false)
  })

  it('enxerga mudanças gravadas por outra aba no mesmo armazenamento', async () => {
    const armazenamento = armazenamentoFalso()
    const abaA = criarListaLocal(armazenamento)
    const abaB = criarListaLocal(armazenamento)
    await abaB.adicionar('favoritos', filme(9))
    expect(await abaA.listar('favoritos')).toEqual([filme(9)])
  })

  it('funciona só em memória quando não há armazenamento', async () => {
    const loja = criarListaLocal(null)
    await loja.adicionar('favoritos', filme(1))
    expect(await loja.listar('favoritos')).toEqual([filme(1)])
  })

  it('não quebra quando gravar falha (armazenamento cheio ou bloqueado)', async () => {
    const armazenamento = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
    }
    const loja = criarListaLocal(armazenamento)
    await expect(loja.adicionar('favoritos', filme(1))).resolves.toBeUndefined()
    expect(await loja.listar('favoritos')).toEqual([filme(1)])
  })

  it('ignora JSON corrompido', async () => {
    const loja = criarListaLocal(armazenamentoFalso({ [CHAVE_LISTAS]: 'isso não é json' }))
    expect(await loja.listar('favoritos')).toEqual([])
  })

  it('descarta itens com formato inválido e mantém os válidos', async () => {
    const bruto = JSON.stringify({
      favoritos: [filme(1), { id: '2', title: 'id em texto' }, null, { title: 'sem id' }],
      salvos: 'não é lista',
    })
    const loja = criarListaLocal(armazenamentoFalso({ [CHAVE_LISTAS]: bruto }))
    expect(await loja.listar('favoritos')).toEqual([filme(1)])
    expect(await loja.listar('salvos')).toEqual([])
  })

  it('ignora JSON válido que não é objeto', async () => {
    const loja = criarListaLocal(armazenamentoFalso({ [CHAVE_LISTAS]: 'null' }))
    expect(await loja.listar('salvos')).toEqual([])
  })
})

describe('paraFilmeSalvo', () => {
  it('copia só os campos do resumo', () => {
    const completo = { ...filme(1), overview: 'x', genres: ['Ação'], backdropUrl: null }
    expect(paraFilmeSalvo(completo)).toEqual(filme(1))
  })
})

describe('obterArmazenamentoSeguro', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('devolve null fora do navegador', () => {
    expect(obterArmazenamentoSeguro()).toBeNull()
  })

  it('devolve null quando o navegador bloqueia o localStorage', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('bloqueado', 'SecurityError')
      },
    })
    expect(obterArmazenamentoSeguro()).toBeNull()
  })
})
```

- [ ] **Step 3: Rodar para ver falhar**

Run: `npx vitest run lib/lista`
Expected: FAIL — `Failed to resolve import "./local"`.

- [ ] **Step 4: Implementar**

`lib/lista/local.ts`:
```ts
import type { FilmeSalvo, ListaStore, Listas, TipoLista } from './tipos'

export const CHAVE_LISTAS = 'cineteca:listas:v1'

export type ArmazenamentoSimples = Pick<Storage, 'getItem' | 'setItem'>

export function obterArmazenamentoSeguro(): ArmazenamentoSimples | null {
  try {
    if (typeof window === 'undefined') return null
    const armazenamento = window.localStorage
    const teste = '__cineteca_teste__'
    armazenamento.setItem(teste, '1')
    armazenamento.removeItem(teste)
    return armazenamento
  } catch {
    return null
  }
}

function listasVazias(): Listas {
  return { favoritos: [], salvos: [] }
}

function ehFilmeSalvo(valor: unknown): valor is FilmeSalvo {
  if (!valor || typeof valor !== 'object') return false
  const f = valor as Record<string, unknown>
  return (
    typeof f.id === 'number' &&
    typeof f.title === 'string' &&
    (f.posterUrl === null || typeof f.posterUrl === 'string') &&
    (f.year === null || typeof f.year === 'string') &&
    (f.rating === null || typeof f.rating === 'number')
  )
}

function lerLista(valor: unknown): FilmeSalvo[] {
  return Array.isArray(valor) ? valor.filter(ehFilmeSalvo) : []
}

function lerListas(armazenamento: ArmazenamentoSimples): Listas {
  try {
    const bruto = armazenamento.getItem(CHAVE_LISTAS)
    if (!bruto) return listasVazias()
    const dados: unknown = JSON.parse(bruto)
    if (!dados || typeof dados !== 'object') return listasVazias()
    const d = dados as Record<string, unknown>
    return { favoritos: lerLista(d.favoritos), salvos: lerLista(d.salvos) }
  } catch {
    return listasVazias()
  }
}

export function criarListaLocal(armazenamento: ArmazenamentoSimples | null): ListaStore {
  let listas = armazenamento ? lerListas(armazenamento) : listasVazias()
  // Fica false se a última gravação falhou: aí a memória é a fonte mais atual.
  let sincronizado = true

  function atualizar(): Listas {
    if (armazenamento && sincronizado) listas = lerListas(armazenamento)
    return listas
  }

  function gravar(novas: Listas) {
    listas = novas
    if (!armazenamento) return
    try {
      armazenamento.setItem(CHAVE_LISTAS, JSON.stringify(novas))
      sincronizado = true
    } catch {
      sincronizado = false
    }
  }

  return {
    async listar(tipo: TipoLista) {
      return [...atualizar()[tipo]]
    },
    async contem(tipo: TipoLista, id: number) {
      return atualizar()[tipo].some((f) => f.id === id)
    },
    async adicionar(tipo: TipoLista, filme: FilmeSalvo) {
      const atuais = atualizar()
      gravar({ ...atuais, [tipo]: [filme, ...atuais[tipo].filter((f) => f.id !== filme.id)] })
    },
    async remover(tipo: TipoLista, id: number) {
      const atuais = atualizar()
      gravar({ ...atuais, [tipo]: atuais[tipo].filter((f) => f.id !== id) })
    },
  }
}
```

- [ ] **Step 5: Rodar para ver passar**

Run: `npx vitest run lib/lista`
Expected: PASS (15 testes).

- [ ] **Step 6: Commit**

```powershell
git add lib/lista
git commit -m "feat: camada Minha Lista com localStorage e tolerante a falhas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Leitura de parâmetros + rota interna `/api/filmes`

**Files:**
- Create: `lib/parametros.ts`, `app/api/filmes/route.ts`
- Test: `lib/parametros.test.ts`, `app/api/filmes/route.test.ts`

**Interfaces:**
- Consumes: `discoverByGenre`, `searchMovies`, `ORDENS_GENERO`, `OrdemGenero` (Task 2).
- Produces:
  - `lerIdPositivo(valor: string | null | undefined): number | null` — só dígitos (até 9), maior que zero.
  - `lerPagina(valor: string | null | undefined): number | null` — vazio → 1; válido de 1 a 500; senão `null`.
  - `GET /api/filmes?tipo=genero&id=<id>&ordem=<popularidade|nota|lancamento>&pagina=<n>` e `GET /api/filmes?tipo=busca&q=<termo>&pagina=<n>` → `200` com `PaginaFilmes`; `400` com `{ erro }` para parâmetros inválidos; `502` com `{ erro: 'Não foi possível carregar' }` quando o TMDB falha.

- [ ] **Step 1: Escrever os testes (falhando)**

`lib/parametros.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { lerIdPositivo, lerPagina } from './parametros'

describe('lerIdPositivo', () => {
  it('aceita números inteiros positivos', () => {
    expect(lerIdPositivo('28')).toBe(28)
    expect(lerIdPositivo('999999')).toBe(999999)
  })

  it('recusa qualquer outra coisa', () => {
    for (const valor of ['0', '-1', 'abc', '1.5', '1e3', ' 2', '', '9999999999', null, undefined]) {
      expect(lerIdPositivo(valor)).toBeNull()
    }
  })
})

describe('lerPagina', () => {
  it('usa 1 quando não há página', () => {
    expect(lerPagina(null)).toBe(1)
    expect(lerPagina(undefined)).toBe(1)
    expect(lerPagina('')).toBe(1)
  })

  it('aceita de 1 a 500', () => {
    expect(lerPagina('2')).toBe(2)
    expect(lerPagina('500')).toBe(500)
  })

  it('recusa páginas inválidas ou acima do limite do TMDB', () => {
    expect(lerPagina('0')).toBeNull()
    expect(lerPagina('501')).toBeNull()
    expect(lerPagina('abc')).toBeNull()
  })
})
```

`app/api/filmes/route.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/tmdb/filmes', () => ({ discoverByGenre: vi.fn(), searchMovies: vi.fn() }))

import { discoverByGenre, searchMovies } from '@/lib/tmdb/filmes'
import { GET } from './route'

const PAGINA = { results: [], page: 2, totalPages: 5 }
const chamar = (consulta: string) => GET(new Request(`http://localhost/api/filmes?${consulta}`))

beforeEach(() => {
  vi.mocked(discoverByGenre).mockReset().mockResolvedValue(PAGINA)
  vi.mocked(searchMovies).mockReset().mockResolvedValue(PAGINA)
})

describe('GET /api/filmes', () => {
  it('devolve a página de um gênero', async () => {
    const resposta = await chamar('tipo=genero&id=28&ordem=nota&pagina=2')
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual(PAGINA)
    expect(discoverByGenre).toHaveBeenCalledWith(28, 'nota', 2)
  })

  it('usa popularidade quando a ordem não é informada', async () => {
    await chamar('tipo=genero&id=28&pagina=2')
    expect(discoverByGenre).toHaveBeenCalledWith(28, 'popularidade', 2)
  })

  it('devolve a página de uma busca com o termo intacto', async () => {
    const resposta = await chamar(`tipo=busca&q=${encodeURIComponent(' Amélie & cia ')}&pagina=3`)
    expect(resposta.status).toBe(200)
    expect(searchMovies).toHaveBeenCalledWith('Amélie & cia', 3)
  })

  it.each([
    ['tipo=genero&id=abc'],
    ['tipo=genero&id=28&ordem=aleatoria'],
    ['tipo=genero&id=28&pagina=501'],
    ['tipo=genero&id=28&pagina=abc'],
    ['tipo=busca&q=%20%20'],
    ['tipo=series'],
    [''],
  ])('responde 400 para parâmetros inválidos: "%s"', async (consulta) => {
    const resposta = await chamar(consulta)
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toHaveProperty('erro')
    expect(discoverByGenre).not.toHaveBeenCalled()
    expect(searchMovies).not.toHaveBeenCalled()
  })

  it('responde 502 quando o TMDB falha', async () => {
    vi.mocked(searchMovies).mockRejectedValue(new Error('fora do ar'))
    const resposta = await chamar('tipo=busca&q=matrix')
    expect(resposta.status).toBe(502)
    expect(await resposta.json()).toEqual({ erro: 'Não foi possível carregar' })
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run lib/parametros.test.ts app/api`
Expected: FAIL — `Failed to resolve import "./parametros"` / `"./route"`.

- [ ] **Step 3: Implementar**

`lib/parametros.ts`:
```ts
const LIMITE_PAGINAS_TMDB = 500

export function lerIdPositivo(valor: string | null | undefined): number | null {
  if (!valor || !/^\d{1,9}$/.test(valor)) return null
  const numero = Number(valor)
  return numero > 0 ? numero : null
}

export function lerPagina(valor: string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return 1
  const numero = lerIdPositivo(valor)
  return numero !== null && numero <= LIMITE_PAGINAS_TMDB ? numero : null
}
```

`app/api/filmes/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { lerIdPositivo, lerPagina } from '@/lib/parametros'
import { discoverByGenre, searchMovies } from '@/lib/tmdb/filmes'
import { ORDENS_GENERO, type OrdemGenero, type PaginaFilmes } from '@/lib/tmdb/tipos'

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status })
}

function sucesso(pagina: PaginaFilmes) {
  return NextResponse.json(pagina, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const pagina = lerPagina(params.get('pagina'))
  if (pagina === null) return erro('Página inválida', 400)

  const tipo = params.get('tipo')
  let carregar: () => Promise<PaginaFilmes>

  if (tipo === 'genero') {
    const id = lerIdPositivo(params.get('id'))
    if (id === null) return erro('Gênero inválido', 400)
    const ordem = (params.get('ordem') ?? 'popularidade') as OrdemGenero
    if (!ORDENS_GENERO.includes(ordem)) return erro('Ordem inválida', 400)
    carregar = () => discoverByGenre(id, ordem, pagina)
  } else if (tipo === 'busca') {
    const termo = (params.get('q') ?? '').trim()
    if (!termo) return erro('Busca vazia', 400)
    carregar = () => searchMovies(termo, pagina)
  } else {
    return erro('Tipo inválido', 400)
  }

  try {
    return sucesso(await carregar())
  } catch {
    return erro('Não foi possível carregar', 502)
  }
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```powershell
git add lib/parametros.ts lib/parametros.test.ts app/api
git commit -m "feat: rota interna /api/filmes com validação de parâmetros" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Estrutura do site (barra superior, rodapé, 404, erro) + testes ponta a ponta com TMDB simulado

**Files:**
- Create: `components/estilos.ts`, `components/Icones.tsx`, `components/Navbar.tsx`, `components/Rodape.tsx`, `components/MensagemErro.tsx`
- Create: `app/not-found.tsx`, `app/error.tsx`, `public/tmdb-logo.svg`
- Modify: `app/layout.tsx` (substituir por completo)
- Create: `e2e/mock-tmdb/dados.mjs`, `e2e/mock-tmdb/servidor.mjs`, `e2e/iniciar-servidor.mjs`, `e2e/ajudantes.ts`, `playwright.config.ts`
- Test: `e2e/estrutura.spec.ts`

**Interfaces:**
- Consumes: `getGenres`, `Genero` (Task 2).
- Produces:
  - `BOTAO_PRIMARIO`, `BOTAO_SECUNDARIO`, `CONTEUDO` (strings de classes Tailwind) em `components/estilos.ts`
  - Ícones (todos com `className?: string`): `IconeBusca`, `IconeMenu`, `IconeFechar`, `IconeSetaEsquerda`, `IconeSetaDireita`, `IconeInfo`, `IconePlay`, `IconeMais`, `IconeCheck`, `IconeChevronBaixo`, `IconeCoracao({ className, preenchido })`
  - `<Navbar generos={Genero[]} />` — `<nav aria-label="Principal">`; botão "Abrir menu"/"Fechar menu" no celular; botão "Gêneros" no desktop
  - `<MensagemErro texto? aoTentar? />` — `role="alert"`, texto padrão "Não foi possível carregar", botão "Tentar novamente" (padrão: `router.refresh()`)
  - Layout raiz com `export const dynamic = 'force-dynamic'`
  - TMDB simulado: porta 4010, token `token-e2e`; app de teste na porta 3100. Dados: tendências = ids 1001–1020 ("Filme Teste 1001"...), populares 2001+, em cartaz 3001+, mais bem avaliados 4001+; gênero `G` = ids `G*1000+100001`+ (3 páginas; a página 2 repete o primeiro filme da página 1); gênero 878 sempre responde 500; busca contendo "matrix" → 3 filmes (7001 "Matrix", 7002 "Matrix Reloaded", 7003 "Matrix Revolutions"), qualquer outra → vazio; `/movie/999999` → 404.
  - `irPeloMenu(page, isMobile, nomeLink)` em `e2e/ajudantes.ts`

- [ ] **Step 1: Instalar o Playwright**

Run:
```powershell
npm install -D @playwright/test
npx playwright install chromium
```
Expected: instala o Chromium sem erros.

- [ ] **Step 2: Criar o TMDB simulado e o iniciador**

`e2e/mock-tmdb/dados.mjs`:
```js
export const GENEROS = [
  { id: 28, name: 'Ação' },
  { id: 35, name: 'Comédia' },
  { id: 27, name: 'Terror' },
  { id: 16, name: 'Animação' },
  { id: 878, name: 'Ficção científica' },
  { id: 18, name: 'Drama' },
]

export function filme(id, titulo = `Filme Teste ${id}`) {
  return {
    id,
    title: titulo,
    original_title: titulo,
    overview: `Sinopse do ${titulo}.`,
    poster_path: `/poster-${id}.jpg`,
    backdrop_path: `/fundo-${id}.jpg`,
    release_date: '2024-05-10',
    vote_average: 7.8,
    vote_count: 1200,
    genre_ids: [28, 18],
  }
}

export function pagina(base, numero, totalPaginas) {
  const results = Array.from({ length: 20 }, (_, i) => filme(base + (numero - 1) * 20 + i + 1))
  return { page: numero, results, total_pages: totalPaginas, total_results: totalPaginas * 20 }
}

export function detalhes(id) {
  return {
    ...filme(id),
    runtime: 136,
    genres: [
      { id: 28, name: 'Ação' },
      { id: 18, name: 'Drama' },
    ],
    videos: { results: [{ key: 'trailer-teste', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'pt' }] },
    credits: {
      cast: Array.from({ length: 20 }, (_, i) => ({
        id: 500 + i,
        name: `Ator ${i + 1}`,
        character: `Personagem ${i + 1}`,
        profile_path: null,
        order: i,
      })),
    },
    recommendations: pagina(id * 100, 1, 1),
    'watch/providers': {
      results: {
        BR: {
          link: `https://www.themoviedb.org/movie/${id}/watch?locale=BR`,
          flatrate: [{ provider_id: 8, provider_name: 'Serviço de Streaming', logo_path: '/logo.jpg', display_priority: 1 }],
        },
      },
    },
  }
}
```

`e2e/mock-tmdb/servidor.mjs`:
```js
import http from 'node:http'
import { detalhes, filme, GENEROS, pagina } from './dados.mjs'

export const TOKEN_E2E = 'token-e2e'

export function iniciarMockTmdb(porta) {
  const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${porta}`)
    const responder = (status, corpo) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(corpo))
    }

    if (req.headers.authorization !== `Bearer ${TOKEN_E2E}`) return responder(401, { status_message: 'token inválido' })

    const caminho = url.pathname.replace(/^\/3/, '')
    const numero = Number(url.searchParams.get('page') ?? '1')

    if (caminho === '/genre/movie/list') return responder(200, { genres: GENEROS })
    if (caminho === '/trending/movie/day') return responder(200, pagina(1000, 1, 1))
    if (caminho === '/movie/popular') return responder(200, pagina(2000, numero, 5))
    if (caminho === '/movie/now_playing') return responder(200, pagina(3000, numero, 5))
    if (caminho === '/movie/top_rated') return responder(200, pagina(4000, numero, 5))

    if (caminho === '/discover/movie') {
      const genero = Number(url.searchParams.get('with_genres'))
      if (genero === 878) return responder(500, { status_message: 'falha simulada' })
      const base = genero * 1000 + 100000
      const dados = pagina(base, numero, 3)
      // Simula o TMDB repetindo um filme entre páginas.
      if (numero === 2) dados.results[0] = filme(base + 1)
      return responder(200, dados)
    }

    if (caminho === '/search/movie') {
      const termo = (url.searchParams.get('query') ?? '').toLowerCase()
      if (!termo.includes('matrix')) return responder(200, { page: 1, results: [], total_pages: 0, total_results: 0 })
      return responder(200, {
        page: 1,
        results: [filme(7001, 'Matrix'), filme(7002, 'Matrix Reloaded'), filme(7003, 'Matrix Revolutions')],
        total_pages: 1,
        total_results: 3,
      })
    }

    const detalhe = caminho.match(/^\/movie\/(\d+)$/)
    if (detalhe) {
      const id = Number(detalhe[1])
      if (id === 999999) return responder(404, { status_message: 'não encontrado' })
      return responder(200, detalhes(id))
    }

    return responder(404, { status_message: `rota não simulada: ${caminho}` })
  })

  return new Promise((resolve) => servidor.listen(porta, () => resolve(servidor)))
}
```

`e2e/iniciar-servidor.mjs`:
```js
// Sobe o TMDB simulado, compila o site e o inicia apontando para o simulador.
import { spawn, spawnSync } from 'node:child_process'
import { iniciarMockTmdb, TOKEN_E2E } from './mock-tmdb/servidor.mjs'

const PORTA_MOCK = 4010
const PORTA_APP = 3100

await iniciarMockTmdb(PORTA_MOCK)

const env = {
  ...process.env,
  TMDB_API_BASE: `http://localhost:${PORTA_MOCK}/3`,
  TMDB_READ_TOKEN: TOKEN_E2E,
}

const build = spawnSync('npx', ['next', 'build'], { stdio: 'inherit', env, shell: true })
if (build.status !== 0) process.exit(build.status ?? 1)

const app = spawn('npx', ['next', 'start', '-p', String(PORTA_APP)], { stdio: 'inherit', env, shell: true })
app.on('exit', (codigo) => process.exit(codigo ?? 0))
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node e2e/iniciar-servidor.mjs',
    url: 'http://localhost:3100',
    timeout: 300_000,
    reuseExistingServer: false,
  },
})
```

`e2e/ajudantes.ts`:
```ts
import type { Page } from '@playwright/test'

export async function irPeloMenu(page: Page, isMobile: boolean, nomeLink: string) {
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: nomeLink, exact: true }).click()
}
```

- [ ] **Step 3: Escrever o teste ponta a ponta (falhando)**

`e2e/estrutura.spec.ts`:
```ts
import { expect, test } from '@playwright/test'
import { irPeloMenu } from './ajudantes'

test('página inexistente mostra o 404 no estilo do site', async ({ page }) => {
  await page.goto('/pagina-que-nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('rodapé mostra a atribuição do TMDB', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByText('Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB'),
  ).toBeVisible()
  await expect(page.getByRole('img', { name: 'TMDB' })).toBeVisible()
})

test('menu principal leva à Minha lista', async ({ page, isMobile }) => {
  await page.goto('/')
  await irPeloMenu(page, isMobile, 'Minha lista')
  await expect(page).toHaveURL(/\/minha-lista$/)
})

test('menu mostra os gêneros vindos do TMDB', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  else await page.getByRole('button', { name: 'Gêneros' }).click()
  const link = page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Comédia' })
  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('href', '/genero/35')
})
```

- [ ] **Step 4: Rodar para ver falhar**

Run: `npx playwright test e2e/estrutura.spec.ts`
Expected: FAIL — não há "Página não encontrada", rodapé nem menu.

- [ ] **Step 5: Estilos compartilhados e ícones**

`components/estilos.ts`:
```ts
export const CONTEUDO = 'mx-auto w-full max-w-[1600px] px-4 md:px-10'

const BOTAO_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60 md:text-base'

export const BOTAO_PRIMARIO = `${BOTAO_BASE} bg-destaque text-white hover:bg-destaque-escuro`
export const BOTAO_SECUNDARIO = `${BOTAO_BASE} bg-white/20 text-white backdrop-blur hover:bg-white/30`
```

`components/Icones.tsx`:
```tsx
type Props = { className?: string }

function base(className?: string) {
  return {
    className: className ?? 'h-5 w-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
}

export const IconeBusca = ({ className }: Props) => (
  <svg {...base(className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const IconeMenu = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

export const IconeFechar = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const IconeSetaEsquerda = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
)

export const IconeSetaDireita = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)

export const IconeChevronBaixo = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const IconeInfo = ({ className }: Props) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
)

export const IconeMais = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconeCheck = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

export const IconePlay = ({ className }: Props) => (
  <svg {...base(className)} fill="currentColor" stroke="none">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
)

export const IconeCoracao = ({ className, preenchido = false }: Props & { preenchido?: boolean }) => (
  <svg {...base(className)} fill={preenchido ? 'currentColor' : 'none'}>
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.4 1 4.8 2.7 1.4-1.7 2.8-2.7 4.8-2.7 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
  </svg>
)
```

- [ ] **Step 6: Mensagem de erro, barra superior e rodapé**

`components/MensagemErro.tsx`:
```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { BOTAO_SECUNDARIO } from './estilos'

type Props = { texto?: string; aoTentar?: () => void }

export function MensagemErro({ texto = 'Não foi possível carregar', aoTentar }: Props) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()

  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md bg-superficie p-6 text-white/80 sm:flex-row sm:items-center">
      <p>{texto}</p>
      <button
        type="button"
        disabled={pendente}
        onClick={() => (aoTentar ? aoTentar() : iniciar(() => router.refresh()))}
        className={BOTAO_SECUNDARIO}
      >
        {pendente ? 'Tentando…' : 'Tentar novamente'}
      </button>
    </div>
  )
}
```

`components/Navbar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Genero } from '@/lib/tmdb/tipos'
import { CONTEUDO } from './estilos'
import { IconeChevronBaixo, IconeFechar, IconeMenu } from './Icones'

export function Navbar({ generos }: { generos: Genero[] }) {
  const pathname = usePathname()
  const [rolou, setRolou] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [generosAberto, setGenerosAberto] = useState(false)
  const generosRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 16)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  useEffect(() => {
    setMenuAberto(false)
    setGenerosAberto(false)
  }, [pathname])

  useEffect(() => {
    if (!generosAberto) return
    const aoClicarFora = (e: MouseEvent) => {
      if (!generosRef.current?.contains(e.target as Node)) setGenerosAberto(false)
    }
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGenerosAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [generosAberto])

  const solida = rolou || menuAberto
  const fecharMenu = () => setMenuAberto(false)

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-200 ${
        solida ? 'bg-fundo/95 shadow-lg shadow-black/40 backdrop-blur' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <nav aria-label="Principal">
        <div className={`${CONTEUDO} flex h-16 items-center gap-6`}>
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            CineTeca
          </Link>

          <ul className="hidden items-center gap-6 text-sm font-semibold md:flex">
            <li>
              <LinkNav href="/" ativo={pathname === '/'}>
                Início
              </LinkNav>
            </li>
            {generos.length > 0 && (
              <li ref={generosRef} className="relative">
                <button
                  type="button"
                  aria-expanded={generosAberto}
                  aria-controls="menu-generos"
                  onClick={() => setGenerosAberto((v) => !v)}
                  className="flex items-center gap-1 text-white/80 transition-colors hover:text-white"
                >
                  Gêneros <IconeChevronBaixo className="h-4 w-4" />
                </button>
                {generosAberto && (
                  <ul
                    id="menu-generos"
                    className="absolute left-0 top-full mt-3 grid w-[28rem] grid-cols-2 gap-1 rounded-md bg-superficie/95 p-3 shadow-xl ring-1 ring-white/10 backdrop-blur"
                  >
                    {generos.map((g) => (
                      <li key={g.id}>
                        <Link
                          href={`/genero/${g.id}`}
                          className="block rounded px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white"
                        >
                          {g.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}
            <li>
              <LinkNav href="/minha-lista" ativo={pathname === '/minha-lista'}>
                Minha lista
              </LinkNav>
            </li>
          </ul>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="rounded p-2 md:hidden"
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuAberto}
              aria-controls="menu-celular"
              onClick={() => setMenuAberto((v) => !v)}
            >
              {menuAberto ? <IconeFechar className="h-6 w-6" /> : <IconeMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuAberto && (
          <div id="menu-celular" className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-white/10 bg-fundo px-4 pb-6 md:hidden">
            <ul className="flex flex-col py-2 text-lg font-semibold">
              <li>
                <Link href="/" onClick={fecharMenu} className="block py-3">
                  Início
                </Link>
              </li>
              <li>
                <Link href="/minha-lista" onClick={fecharMenu} className="block py-3">
                  Minha lista
                </Link>
              </li>
            </ul>
            {generos.length > 0 && (
              <>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/50">Gêneros</p>
                <ul className="mt-2 grid grid-cols-2 gap-1">
                  {generos.map((g) => (
                    <li key={g.id}>
                      <Link href={`/genero/${g.id}`} onClick={fecharMenu} className="block rounded py-2 text-white/80">
                        {g.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}

function LinkNav({ href, ativo, children }: { href: string; ativo: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? 'page' : undefined}
      className={`transition-colors hover:text-white ${ativo ? 'text-white' : 'text-white/80'}`}
    >
      {children}
    </Link>
  )
}
```

Baixar o logo oficial do TMDB para `public/tmdb-logo.svg`:
```powershell
New-Item -ItemType Directory -Force public | Out-Null
Invoke-WebRequest -Uri "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" -OutFile public/tmdb-logo.svg
Get-Content public/tmdb-logo.svg -TotalCount 1
```
Expected: a primeira linha começa com `<svg` (ou `<?xml`). Se a URL der 404, abra https://www.themoviedb.org/about/logos-attribution, pegue o link do logo "blue_short" em SVG e repita.

`components/Rodape.tsx`:
```tsx
import { CONTEUDO } from './estilos'

export function Rodape() {
  return (
    <footer className="mt-16 border-t border-white/10 py-10 text-sm text-white/60">
      <div className={`${CONTEUDO} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
        <p className="text-lg font-extrabold text-white">CineTeca</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="shrink-0">
            <img src="/tmdb-logo.svg" alt="TMDB" className="h-4 w-auto" />
          </a>
          <p>Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.</p>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 7: Layout, 404 e página de erro**

`app/layout.tsx` (substitui o arquivo inteiro):
```tsx
import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
import { Rodape } from '@/components/Rodape'
import { getGenres } from '@/lib/tmdb/filmes'
import type { Genero } from '@/lib/tmdb/tipos'
import './globals.css'

// Renderiza no servidor a cada visita; as respostas do TMDB ficam no cache de dados do Next.
export const dynamic = 'force-dynamic'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'CineTeca', template: '%s · CineTeca' },
  description: 'Descubra filmes, veja onde assistir e monte suas listas.',
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const generos = await getGenres().catch((): Genero[] => [])

  return (
    <html lang="pt-BR" className={manrope.variable}>
      <body className="min-h-screen bg-fundo font-sans text-white antialiased">
        <Navbar generos={generos} />
        <main className="min-h-screen">{children}</main>
        <Rodape />
      </body>
    </html>
  )
}
```

`app/not-found.tsx`:
```tsx
import Link from 'next/link'
import { BOTAO_PRIMARIO } from '@/components/estilos'

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 pt-16 text-center">
      <p className="text-7xl font-extrabold text-destaque">404</p>
      <h1 className="text-3xl font-extrabold">Página não encontrada</h1>
      <p className="max-w-md text-white/70">O filme ou a página que você procura não existe ou saiu de cartaz.</p>
      <Link href="/" className={BOTAO_PRIMARIO}>
        Voltar ao início
      </Link>
    </div>
  )
}
```

`app/error.tsx`:
```tsx
'use client'

import { CONTEUDO } from '@/components/estilos'
import { MensagemErro } from '@/components/MensagemErro'

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={`${CONTEUDO} pt-28`}>
      <MensagemErro texto="Algo deu errado ao carregar esta página." aoTentar={reset} />
    </div>
  )
}
```

- [ ] **Step 8: Rodar para ver passar**

Run: `npx playwright test e2e/estrutura.spec.ts`
Expected: PASS (8 testes: 4 no desktop e 4 no celular). A primeira execução demora porque faz o `next build`.

- [ ] **Step 9: Conferir que nada quebrou**

Run:
```powershell
npm test
npm run typecheck
```
Expected: tudo PASS e sem erros de tipo.

- [ ] **Step 10: Commit**

```powershell
git add components app public e2e playwright.config.ts package.json package-lock.json
git commit -m "feat: estrutura do site e testes ponta a ponta com TMDB simulado" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Listas compartilhadas, cartão de filme e página Minha lista

**Files:**
- Create: `components/ListasProvider.tsx`, `components/BotaoLista.tsx`, `components/ImagemComReserva.tsx`, `components/MovieCard.tsx`, `components/GradeFilmes.tsx`, `components/Esqueletos.tsx`, `components/MinhaLista.tsx`
- Create: `app/minha-lista/page.tsx`, `public/poster-padrao.svg`
- Modify: `app/layout.tsx` (envolver com `<ListasProvider>`)
- Test: `e2e/minha-lista.spec.ts`

**Interfaces:**
- Consumes: `criarListaLocal`, `obterArmazenamentoSeguro`, `CHAVE_LISTAS`, `paraFilmeSalvo`, tipos de lista (Task 4); `BOTAO_SECUNDARIO`, `BOTAO_PRIMARIO`, `CONTEUDO`, ícones (Task 6).
- Produces:
  - `<ListasProvider>` e `useListas(): { carregado: boolean; listas: Listas; contem(tipo: TipoLista, id: number): boolean; alternar(tipo: TipoLista, filme: FilmeSalvo): void }`
  - `<BotaoLista tipo filme comTexto? textos? />` — `aria-label` fixo: "Favoritar" (favoritos) ou "Salvar para assistir" (salvos); `aria-pressed` indica se está marcado
  - `<ImagemComReserva src reserva alt className? />` — troca pela imagem padrão se `src` for null ou falhar
  - `type CartaoFilme = FilmeSalvo & { genres?: string[] }`; `<MovieCard filme={CartaoFilme} />` — `data-testid="movie-card"`; link para `/filme/<id>` com nome acessível igual ao título
  - `<GradeFilmes filmes={CartaoFilme[]} />`
  - `<CartaoEsqueleto />`, `<FileiraEsqueleto titulo />`, `<GradeEsqueleto quantidade? />`

- [ ] **Step 1: Escrever o teste ponta a ponta (falhando)**

`e2e/minha-lista.spec.ts`:
```ts
import { expect, test, type Page } from '@playwright/test'

const CHAVE = 'cineteca:listas:v1'
const filme = (id: number) => ({ id, title: `Filme Teste ${id}`, posterUrl: null, year: '2024', rating: 7.8 })

async function gravarListas(page: Page, valor: string) {
  await page.evaluate(([chave, v]) => localStorage.setItem(chave, v), [CHAVE, valor] as const)
}

test('lista vazia convida a explorar', async ({ page }) => {
  await page.goto('/minha-lista')
  await expect(page.getByRole('heading', { name: 'Minha lista' })).toBeVisible()
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
  await page.getByRole('link', { name: 'Explorar filmes' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('mostra favoritos e salvos em abas separadas', async ({ page }) => {
  await page.goto('/minha-lista')
  await gravarListas(page, JSON.stringify({ favoritos: [filme(1001)], salvos: [filme(2001), filme(2002)] }))
  await page.reload()

  await expect(page.getByRole('tab', { name: 'Favoritos (1)' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('movie-card')).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Filme Teste 1001' })).toBeVisible()

  await page.getByRole('tab', { name: 'Salvos para assistir (2)' }).click()
  await expect(page.getByTestId('movie-card')).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'Filme Teste 2002' })).toBeVisible()
})

test('filme sem pôster usa a imagem padrão', async ({ page }) => {
  await page.goto('/minha-lista')
  await gravarListas(page, JSON.stringify({ favoritos: [filme(1001)], salvos: [] }))
  await page.reload()
  await expect(page.getByTestId('movie-card').locator('img')).toHaveAttribute('src', '/poster-padrao.svg')
})

test('remover um favorito pelo cartão', async ({ page, isMobile }) => {
  test.skip(isMobile, 'os botões do cartão aparecem ao passar o mouse, só no desktop')
  await page.goto('/minha-lista')
  await gravarListas(page, JSON.stringify({ favoritos: [filme(1001)], salvos: [] }))
  await page.reload()

  const cartao = page.getByTestId('movie-card')
  await cartao.hover()
  const botao = cartao.getByRole('button', { name: 'Favoritar' })
  await expect(botao).toHaveAttribute('aria-pressed', 'true')
  await botao.click()
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
})

test('sincroniza com outra aba aberta', async ({ page, context }) => {
  await page.goto('/minha-lista')
  const outraAba = await context.newPage()
  await outraAba.goto('/minha-lista')
  await gravarListas(outraAba, JSON.stringify({ favoritos: [filme(4242)], salvos: [] }))
  await expect(page.getByRole('link', { name: 'Filme Teste 4242' })).toBeVisible()
})

test('dados corrompidos no navegador não quebram a página', async ({ page }) => {
  await page.goto('/minha-lista')
  await gravarListas(page, 'isso não é json')
  await page.reload()
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx playwright test e2e/minha-lista.spec.ts`
Expected: FAIL — `/minha-lista` mostra o 404.

- [ ] **Step 3: Contexto das listas**

`components/ListasProvider.tsx`:
```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CHAVE_LISTAS, criarListaLocal, obterArmazenamentoSeguro } from '@/lib/lista/local'
import type { FilmeSalvo, ListaStore, Listas, TipoLista } from '@/lib/lista/tipos'

type ValorListas = {
  carregado: boolean
  listas: Listas
  contem(tipo: TipoLista, id: number): boolean
  alternar(tipo: TipoLista, filme: FilmeSalvo): void
}

const ContextoListas = createContext<ValorListas | null>(null)

export function ListasProvider({ children }: { children: ReactNode }) {
  const lojaRef = useRef<ListaStore | null>(null)
  const [listas, setListas] = useState<Listas>({ favoritos: [], salvos: [] })
  const [carregado, setCarregado] = useState(false)

  const recarregar = useCallback(async () => {
    const loja = lojaRef.current
    if (!loja) return
    const [favoritos, salvos] = await Promise.all([loja.listar('favoritos'), loja.listar('salvos')])
    setListas({ favoritos, salvos })
    setCarregado(true)
  }, [])

  useEffect(() => {
    lojaRef.current = criarListaLocal(obterArmazenamentoSeguro())
    void recarregar()
    const aoMudarEmOutraAba = (e: StorageEvent) => {
      if (e.key === CHAVE_LISTAS) void recarregar()
    }
    window.addEventListener('storage', aoMudarEmOutraAba)
    return () => window.removeEventListener('storage', aoMudarEmOutraAba)
  }, [recarregar])

  const contem = useCallback((tipo: TipoLista, id: number) => listas[tipo].some((f) => f.id === id), [listas])

  const alternar = useCallback(
    (tipo: TipoLista, filme: FilmeSalvo) => {
      const loja = lojaRef.current
      if (!loja) return
      const jaEsta = listas[tipo].some((f) => f.id === filme.id)
      setListas((atuais) => ({
        ...atuais,
        [tipo]: jaEsta
          ? atuais[tipo].filter((f) => f.id !== filme.id)
          : [filme, ...atuais[tipo].filter((f) => f.id !== filme.id)],
      }))
      void (jaEsta ? loja.remover(tipo, filme.id) : loja.adicionar(tipo, filme))
    },
    [listas],
  )

  const valor = useMemo(() => ({ carregado, listas, contem, alternar }), [carregado, listas, contem, alternar])

  return <ContextoListas.Provider value={valor}>{children}</ContextoListas.Provider>
}

export function useListas(): ValorListas {
  const valor = useContext(ContextoListas)
  if (!valor) throw new Error('useListas precisa estar dentro de <ListasProvider>')
  return valor
}
```

Em `app/layout.tsx`, adicione o import e envolva o conteúdo do `<body>`:
```tsx
import { ListasProvider } from '@/components/ListasProvider'
```
```tsx
      <body className="min-h-screen bg-fundo font-sans text-white antialiased">
        <ListasProvider>
          <Navbar generos={generos} />
          <main className="min-h-screen">{children}</main>
          <Rodape />
        </ListasProvider>
      </body>
```

- [ ] **Step 4: Botão de lista, imagem com reserva, cartão, grade e esqueletos**

`public/poster-padrao.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513" viewBox="0 0 342 513">
  <rect width="342" height="513" fill="#16161D"/>
  <rect x="121" y="196" width="100" height="80" rx="10" fill="none" stroke="#3a3a46" stroke-width="8"/>
  <path d="M151 216v40l34-20z" fill="#3a3a46"/>
  <text x="171" y="330" fill="#6b6b78" font-family="system-ui, sans-serif" font-size="26" font-weight="800" text-anchor="middle">CineTeca</text>
</svg>
```

`components/ImagemComReserva.tsx`:
```tsx
'use client'

type Props = { src: string | null; reserva: string; alt: string; className?: string }

export function ImagemComReserva({ src, reserva, alt, className }: Props) {
  return (
    <img
      src={src ?? reserva}
      alt={alt}
      loading="lazy"
      className={className}
      onError={(e) => {
        const img = e.currentTarget
        if (!img.src.endsWith(reserva)) img.src = reserva
      }}
    />
  )
}
```

`components/BotaoLista.tsx`:
```tsx
'use client'

import type { FilmeSalvo, TipoLista } from '@/lib/lista/tipos'
import { BOTAO_SECUNDARIO } from './estilos'
import { IconeCheck, IconeCoracao, IconeMais } from './Icones'
import { useListas } from './ListasProvider'

const ROTULOS: Record<TipoLista, string> = { favoritos: 'Favoritar', salvos: 'Salvar para assistir' }
const TEXTOS_PADRAO: Record<TipoLista, { inativo: string; ativo: string }> = {
  favoritos: { inativo: 'Favoritar', ativo: 'Favoritado' },
  salvos: { inativo: 'Salvar', ativo: 'Salvo' },
}

type Props = {
  tipo: TipoLista
  filme: FilmeSalvo
  comTexto?: boolean
  textos?: { inativo: string; ativo: string }
}

export function BotaoLista({ tipo, filme, comTexto = false, textos = TEXTOS_PADRAO[tipo] }: Props) {
  const { contem, alternar } = useListas()
  const ativo = contem(tipo, filme.id)

  const icone =
    tipo === 'favoritos' ? (
      <IconeCoracao preenchido={ativo} className={`h-5 w-5 ${ativo ? 'text-destaque' : ''}`} />
    ) : ativo ? (
      <IconeCheck />
    ) : (
      <IconeMais />
    )

  const classes = comTexto
    ? BOTAO_SECUNDARIO
    : 'flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-black/50 transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

  return (
    <button
      type="button"
      aria-label={ROTULOS[tipo]}
      aria-pressed={ativo}
      title={ativo ? textos.ativo : textos.inativo}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        alternar(tipo, filme)
      }}
      className={classes}
    >
      {icone}
      {comTexto && <span>{ativo ? textos.ativo : textos.inativo}</span>}
    </button>
  )
}
```

`components/MovieCard.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { paraFilmeSalvo, type FilmeSalvo } from '@/lib/lista/tipos'
import { BotaoLista } from './BotaoLista'
import { ImagemComReserva } from './ImagemComReserva'

export type CartaoFilme = FilmeSalvo & { genres?: string[] }

export function MovieCard({ filme }: { filme: CartaoFilme }) {
  const salvo = paraFilmeSalvo(filme)
  const detalhes = [filme.year, filme.rating !== null ? `★ ${filme.rating.toFixed(1)}` : null].filter(Boolean).join(' · ')

  return (
    <article
      data-testid="movie-card"
      className="group/cartao relative w-full transition-transform duration-200 hover:z-10 hover:scale-105 focus-within:z-10"
    >
      <Link
        href={`/filme/${filme.id}`}
        className="block overflow-hidden rounded-md bg-superficie focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ImagemComReserva src={filme.posterUrl} reserva="/poster-padrao.svg" alt="" className="aspect-[2/3] w-full object-cover" />
        <span className="sr-only">{filme.title}</span>
      </Link>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 rounded-b-md bg-gradient-to-t from-black via-black/90 to-transparent p-3 pt-12 opacity-0 transition duration-200 group-hover/cartao:pointer-events-auto group-hover/cartao:translate-y-0 group-hover/cartao:opacity-100 group-focus-within/cartao:pointer-events-auto group-focus-within/cartao:translate-y-0 group-focus-within/cartao:opacity-100">
        <p className="line-clamp-2 text-sm font-bold">{filme.title}</p>
        {detalhes && <p className="mt-1 text-xs text-white/70">{detalhes}</p>}
        {filme.genres && filme.genres.length > 0 && (
          <p className="mt-0.5 line-clamp-1 text-xs text-white/60">{filme.genres.slice(0, 3).join(' · ')}</p>
        )}
        <div className="mt-2 flex gap-2">
          <BotaoLista tipo="favoritos" filme={salvo} />
          <BotaoLista tipo="salvos" filme={salvo} />
        </div>
      </div>
    </article>
  )
}
```

`components/GradeFilmes.tsx`:
```tsx
import { MovieCard, type CartaoFilme } from './MovieCard'

export function GradeFilmes({ filmes }: { filmes: CartaoFilme[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {filmes.map((filme) => (
        <li key={filme.id}>
          <MovieCard filme={filme} />
        </li>
      ))}
    </ul>
  )
}
```

`components/Esqueletos.tsx`:
```tsx
import { CONTEUDO } from './estilos'

export function CartaoEsqueleto() {
  return <div className="aspect-[2/3] w-full animate-pulse rounded-md bg-white/10" />
}

export function FileiraEsqueleto({ titulo }: { titulo: string }) {
  return (
    <div aria-hidden>
      <div className={CONTEUDO}>
        <p className="text-lg font-bold text-white/40 md:text-2xl">{titulo}</p>
      </div>
      <div className="flex gap-2 overflow-hidden px-4 py-4 md:px-10">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="w-[38%] shrink-0 sm:w-[27%] md:w-[19%] lg:w-[15.5%] xl:w-[12.5%]">
            <CartaoEsqueleto />
          </div>
        ))}
      </div>
    </div>
  )
}

export function GradeEsqueleto({ quantidade = 12 }: { quantidade?: number }) {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: quantidade }, (_, i) => (
        <CartaoEsqueleto key={i} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Página Minha lista**

`components/MinhaLista.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { TIPOS_LISTA, type TipoLista } from '@/lib/lista/tipos'
import { GradeEsqueleto } from './Esqueletos'
import { BOTAO_PRIMARIO } from './estilos'
import { GradeFilmes } from './GradeFilmes'
import { useListas } from './ListasProvider'

const NOMES: Record<TipoLista, string> = { favoritos: 'Favoritos', salvos: 'Salvos para assistir' }
const VAZIO: Record<TipoLista, string> = {
  favoritos: 'Sua lista de favoritos está vazia.',
  salvos: 'Você ainda não salvou nenhum filme para assistir.',
}

export function MinhaLista() {
  const { carregado, listas } = useListas()
  const [aba, setAba] = useState<TipoLista>('favoritos')
  const filmes = listas[aba]

  return (
    <>
      <div role="tablist" aria-label="Listas" className="mb-8 flex gap-2 border-b border-white/10">
        {TIPOS_LISTA.map((tipo) => (
          <button
            key={tipo}
            type="button"
            role="tab"
            id={`aba-${tipo}`}
            aria-selected={aba === tipo}
            aria-controls="painel-lista"
            onClick={() => setAba(tipo)}
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-bold transition-colors md:text-base ${
              aba === tipo ? 'border-destaque text-white' : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            {NOMES[tipo]} ({listas[tipo].length})
          </button>
        ))}
      </div>

      <div role="tabpanel" id="painel-lista" aria-labelledby={`aba-${aba}`}>
        {!carregado ? (
          <GradeEsqueleto quantidade={6} />
        ) : filmes.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-10">
            <p className="text-lg text-white/70">{VAZIO[aba]}</p>
            <Link href="/" className={BOTAO_PRIMARIO}>
              Explorar filmes
            </Link>
          </div>
        ) : (
          <GradeFilmes filmes={filmes} />
        )}
      </div>
    </>
  )
}
```

`app/minha-lista/page.tsx`:
```tsx
import type { Metadata } from 'next'
import { CONTEUDO } from '@/components/estilos'
import { MinhaLista } from '@/components/MinhaLista'

export const metadata: Metadata = { title: 'Minha lista' }

export default function PaginaMinhaLista() {
  return (
    <div className={`${CONTEUDO} pb-16 pt-24`}>
      <h1 className="mb-6 text-3xl font-extrabold md:text-4xl">Minha lista</h1>
      <MinhaLista />
    </div>
  )
}
```

- [ ] **Step 6: Rodar para ver passar**

Run: `npx playwright test e2e/minha-lista.spec.ts e2e/estrutura.spec.ts`
Expected: PASS (o teste "remover um favorito pelo cartão" aparece como *skipped* no celular).

- [ ] **Step 7: Commit**

```powershell
git add components app public e2e
git commit -m "feat: listas compartilhadas, cartão de filme e página Minha lista" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Página inicial (banner destaque + fileiras)

**Files:**
- Create: `components/SecaoFileira.tsx`, `components/Carrossel.tsx`, `components/FileiraAssincrona.tsx`, `components/BannerDestaque.tsx`
- Modify: `app/page.tsx` (substituir por completo)
- Test: `e2e/inicio.spec.ts`

**Interfaces:**
- Consumes: `getTrending`, `getPopular`, `getNowPlaying`, `getTopRated`, `discoverByGenre`, `SINOPSE_INDISPONIVEL`, `MovieSummary`, `PaginaFilmes` (Task 2); `MovieCard`, `BotaoLista`, `FileiraEsqueleto`, `paraFilmeSalvo` (Task 7); `MensagemErro`, estilos, ícones (Task 6).
- Produces:
  - `<SecaoFileira titulo verMaisHref? children />` — `<section>` com nome acessível igual ao título (região)
  - `<Carrossel titulo filmes={MovieSummary[]} verMaisHref? />` (cliente)
  - `<FileiraAssincrona titulo carregar={() => Promise<PaginaFilmes>} verMaisHref? />` (servidor; em erro mostra `MensagemErro` dentro da seção; lista vazia → não renderiza)
  - `<BannerDestaque filme={MovieSummary} />` — `<section aria-label="Destaque">`

- [ ] **Step 1: Escrever o teste ponta a ponta (falhando)**

`e2e/inicio.spec.ts`:
```ts
import { expect, test } from '@playwright/test'
import { irPeloMenu } from './ajudantes'

test('mostra o banner destaque com um filme em alta', async ({ page }) => {
  await page.goto('/')
  const destaque = page.getByRole('region', { name: 'Destaque' })
  await expect(destaque.getByRole('heading', { level: 1, name: 'Filme Teste 1001' })).toBeVisible()
  await expect(destaque.getByText('Sinopse do Filme Teste 1001.')).toBeVisible()
  await expect(destaque.getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute('href', '/filme/1001')
})

test('mostra as fileiras da página inicial', async ({ page }) => {
  await page.goto('/')
  for (const titulo of ['Em alta hoje', 'Populares', 'Em cartaz nos cinemas', 'Mais bem avaliados', 'Ação', 'Comédia', 'Terror', 'Animação']) {
    await expect(page.getByRole('heading', { level: 2, name: titulo, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('region', { name: 'Populares' }).getByTestId('movie-card')).toHaveCount(20)
  // exact: sem ele, "Ação" também casaria com "Animação".
  await expect(page.getByRole('region', { name: 'Ação', exact: true }).getByRole('link', { name: /Ver tudo/ })).toHaveAttribute('href', '/genero/28')
})

test('uma fileira com erro não derruba as outras', async ({ page }) => {
  await page.goto('/')
  const fileira = page.getByRole('region', { name: 'Ficção científica' })
  await expect(fileira.getByText('Não foi possível carregar')).toBeVisible()
  await expect(fileira.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Terror' }).getByTestId('movie-card').first()).toBeVisible()
})

test('+ Minha lista do banner salva o filme', async ({ page, isMobile }) => {
  await page.goto('/')
  const botao = page.getByRole('region', { name: 'Destaque' }).getByRole('button', { name: 'Salvar para assistir' })
  await botao.click()
  await expect(botao).toHaveAttribute('aria-pressed', 'true')

  await irPeloMenu(page, isMobile, 'Minha lista')
  await page.getByRole('tab', { name: /Salvos para assistir/ }).click()
  await expect(page.getByRole('link', { name: 'Filme Teste 1001' })).toBeVisible()
})

test('favoritar pelo cartão ao passar o mouse', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover só existe no desktop')
  await page.goto('/')
  const cartao = page.getByRole('region', { name: 'Populares' }).getByTestId('movie-card').first()
  await cartao.hover()
  await expect(cartao.getByText('2024 · ★ 7.8')).toBeVisible()
  const botao = cartao.getByRole('button', { name: 'Favoritar' })
  await botao.click()
  await expect(botao).toHaveAttribute('aria-pressed', 'true')

  await irPeloMenu(page, false, 'Minha lista')
  await expect(page.getByRole('link', { name: 'Filme Teste 2001' })).toBeVisible()
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx playwright test e2e/inicio.spec.ts`
Expected: FAIL — a página inicial ainda é a provisória.

- [ ] **Step 3: Seção, carrossel e fileira assíncrona**

`components/SecaoFileira.tsx`:
```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { CONTEUDO } from './estilos'

function slug(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

type Props = { titulo: string; verMaisHref?: string; children: ReactNode }

export function SecaoFileira({ titulo, verMaisHref, children }: Props) {
  const id = `fileira-${slug(titulo)}`
  return (
    <section aria-labelledby={id}>
      <div className={`${CONTEUDO} flex items-baseline gap-4`}>
        <h2 id={id} className="text-lg font-bold md:text-2xl">
          {titulo}
        </h2>
        {verMaisHref && (
          <Link href={verMaisHref} className="text-sm font-semibold text-white/60 transition-colors hover:text-white">
            Ver tudo ›
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
```

`components/Carrossel.tsx`:
```tsx
'use client'

import { useRef } from 'react'
import type { MovieSummary } from '@/lib/tmdb/tipos'
import { IconeSetaDireita, IconeSetaEsquerda } from './Icones'
import { MovieCard } from './MovieCard'
import { SecaoFileira } from './SecaoFileira'

type Props = { titulo: string; filmes: MovieSummary[]; verMaisHref?: string }

export function Carrossel({ titulo, filmes, verMaisHref }: Props) {
  const trilhoRef = useRef<HTMLUListElement>(null)

  const rolar = (direcao: 1 | -1) => {
    const trilho = trilhoRef.current
    if (trilho) trilho.scrollBy({ left: direcao * trilho.clientWidth * 0.9, behavior: 'smooth' })
  }

  const seta = 'absolute inset-y-0 z-20 hidden w-12 items-center justify-center opacity-0 transition-opacity duration-200 group-hover/fileira:opacity-100 focus-visible:opacity-100 md:flex'

  return (
    <SecaoFileira titulo={titulo} verMaisHref={verMaisHref}>
      <div className="group/fileira relative">
        <button
          type="button"
          aria-label={`Voltar em ${titulo}`}
          onClick={() => rolar(-1)}
          className={`${seta} left-0 bg-gradient-to-r from-fundo to-transparent`}
        >
          <IconeSetaEsquerda className="h-8 w-8" />
        </button>
        <ul
          ref={trilhoRef}
          className="sem-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 py-4 md:scroll-px-10 md:px-10"
        >
          {filmes.map((filme) => (
            <li key={filme.id} className="w-[38%] shrink-0 snap-start sm:w-[27%] md:w-[19%] lg:w-[15.5%] xl:w-[12.5%]">
              <MovieCard filme={filme} />
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-label={`Avançar em ${titulo}`}
          onClick={() => rolar(1)}
          className={`${seta} right-0 bg-gradient-to-l from-fundo to-transparent`}
        >
          <IconeSetaDireita className="h-8 w-8" />
        </button>
      </div>
    </SecaoFileira>
  )
}
```

`components/FileiraAssincrona.tsx`:
```tsx
import type { MovieSummary, PaginaFilmes } from '@/lib/tmdb/tipos'
import { Carrossel } from './Carrossel'
import { CONTEUDO } from './estilos'
import { MensagemErro } from './MensagemErro'
import { SecaoFileira } from './SecaoFileira'

type Props = { titulo: string; carregar: () => Promise<PaginaFilmes>; verMaisHref?: string }

export async function FileiraAssincrona({ titulo, carregar, verMaisHref }: Props) {
  let filmes: MovieSummary[]
  try {
    filmes = (await carregar()).results
  } catch {
    return (
      <SecaoFileira titulo={titulo}>
        <div className={`${CONTEUDO} py-4`}>
          <MensagemErro />
        </div>
      </SecaoFileira>
    )
  }
  if (filmes.length === 0) return null
  return <Carrossel titulo={titulo} filmes={filmes} verMaisHref={verMaisHref} />
}
```

- [ ] **Step 4: Banner destaque e página inicial**

`components/BannerDestaque.tsx`:
```tsx
import Link from 'next/link'
import { paraFilmeSalvo } from '@/lib/lista/tipos'
import type { MovieSummary } from '@/lib/tmdb/tipos'
import { BotaoLista } from './BotaoLista'
import { BOTAO_PRIMARIO, CONTEUDO } from './estilos'
import { IconeInfo } from './Icones'

export function BannerDestaque({ filme }: { filme: MovieSummary }) {
  return (
    <section aria-label="Destaque" className="relative h-[68vh] min-h-[420px] w-full md:h-[85vh]">
      {filme.backdropUrl && <img src={filme.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-fundo via-fundo/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-fundo via-transparent to-transparent" />
      <div className={`${CONTEUDO} relative flex h-full flex-col justify-end pb-32 md:pb-48`}>
        <div className="max-w-xl space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight drop-shadow md:text-6xl">{filme.title}</h1>
          <p className="line-clamp-3 text-sm text-white/85 md:text-lg">{filme.overview}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/filme/${filme.id}`} className={BOTAO_PRIMARIO}>
              <IconeInfo /> Ver detalhes
            </Link>
            <BotaoLista
              tipo="salvos"
              filme={paraFilmeSalvo(filme)}
              comTexto
              textos={{ inativo: 'Minha lista', ativo: 'Na minha lista' }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
```

`app/page.tsx` (substitui o arquivo inteiro):
```tsx
import { Suspense } from 'react'
import { BannerDestaque } from '@/components/BannerDestaque'
import { FileiraEsqueleto } from '@/components/Esqueletos'
import { FileiraAssincrona } from '@/components/FileiraAssincrona'
import { discoverByGenre, getNowPlaying, getPopular, getTopRated, getTrending } from '@/lib/tmdb/filmes'
import { SINOPSE_INDISPONIVEL } from '@/lib/tmdb/normalizar'
import type { PaginaFilmes } from '@/lib/tmdb/tipos'

const GENEROS_INICIO = [
  { id: 28, nome: 'Ação' },
  { id: 35, nome: 'Comédia' },
  { id: 27, nome: 'Terror' },
  { id: 16, nome: 'Animação' },
  { id: 878, nome: 'Ficção científica' },
]

const FILEIRAS: { titulo: string; carregar: () => Promise<PaginaFilmes>; verMaisHref?: string }[] = [
  { titulo: 'Em alta hoje', carregar: () => getTrending() },
  { titulo: 'Populares', carregar: () => getPopular() },
  { titulo: 'Em cartaz nos cinemas', carregar: () => getNowPlaying() },
  { titulo: 'Mais bem avaliados', carregar: () => getTopRated() },
  ...GENEROS_INICIO.map((g) => ({
    titulo: g.nome,
    carregar: () => discoverByGenre(g.id, 'popularidade'),
    verMaisHref: `/genero/${g.id}`,
  })),
]

export default async function Inicio() {
  const destaque = await getTrending()
    .then((p) => p.results.find((f) => f.backdropUrl && f.overview !== SINOPSE_INDISPONIVEL) ?? null)
    .catch(() => null)

  return (
    <>
      {destaque ? <BannerDestaque filme={destaque} /> : <div className="h-24" />}
      <div className={`relative z-10 space-y-6 pb-8 md:space-y-10 ${destaque ? '-mt-24 md:-mt-40' : ''}`}>
        {FILEIRAS.map((fileira) => (
          <Suspense key={fileira.titulo} fallback={<FileiraEsqueleto titulo={fileira.titulo} />}>
            <FileiraAssincrona titulo={fileira.titulo} carregar={fileira.carregar} verMaisHref={fileira.verMaisHref} />
          </Suspense>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 5: Rodar para ver passar**

Run: `npx playwright test`
Expected: PASS em todas as specs (os testes de hover aparecem como *skipped* no celular).

- [ ] **Step 6: Commit**

```powershell
git add components app e2e
git commit -m "feat: página inicial com banner destaque e fileiras" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Rolagem infinita + página de gênero

**Files:**
- Create: `lib/mesclar.ts`, `components/GradeInfinita.tsx`, `components/SeletorOrdem.tsx`, `app/genero/[id]/page.tsx`, `app/genero/[id]/loading.tsx`
- Test: `lib/mesclar.test.ts`, `e2e/genero.spec.ts`

**Interfaces:**
- Consumes: `/api/filmes` (Task 5); `lerIdPositivo` (Task 5); `getGenres`, `discoverByGenre`, `ORDENS_GENERO`, `OrdemGenero`, `PaginaFilmes`, `MovieSummary` (Task 2); `GradeFilmes`, `GradeEsqueleto` (Task 7); `MensagemErro`, `CONTEUDO` (Task 6).
- Produces:
  - `mesclarSemDuplicados<T extends { id: number }>(atuais: T[], novos: T[]): T[]`
  - `<GradeInfinita inicial={PaginaFilmes} endpoint={string} />` — `endpoint` já com a consulta (ex.: `/api/filmes?tipo=genero&id=28&ordem=nota`); a grade acrescenta `&pagina=N`. Use `key` para reiniciar quando a consulta muda.
  - `<SeletorOrdem caminhoBase={string} atual={OrdemGenero} />` — `<nav aria-label="Ordenar por">` com links "Popularidade", "Nota", "Lançamento" (`<caminhoBase>?ordem=...`)

- [ ] **Step 1: Escrever o teste unitário (falhando)**

`lib/mesclar.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { mesclarSemDuplicados } from './mesclar'

describe('mesclarSemDuplicados', () => {
  it('acrescenta os novos no fim, mantendo a ordem', () => {
    expect(mesclarSemDuplicados([{ id: 1 }, { id: 2 }], [{ id: 3 }]).map((f) => f.id)).toEqual([1, 2, 3])
  })

  it('descarta filmes que já estão na grade', () => {
    expect(mesclarSemDuplicados([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }]).map((f) => f.id)).toEqual([1, 2, 3])
  })

  it('descarta repetidos dentro da própria página nova', () => {
    expect(mesclarSemDuplicados([], [{ id: 5 }, { id: 5 }]).map((f) => f.id)).toEqual([5])
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run lib/mesclar.test.ts`
Expected: FAIL — `Failed to resolve import "./mesclar"`.

- [ ] **Step 3: Implementar**

`lib/mesclar.ts`:
```ts
export function mesclarSemDuplicados<T extends { id: number }>(atuais: T[], novos: T[]): T[] {
  const vistos = new Set(atuais.map((item) => item.id))
  const resultado = [...atuais]
  for (const item of novos) {
    if (vistos.has(item.id)) continue
    vistos.add(item.id)
    resultado.push(item)
  }
  return resultado
}
```

Run: `npx vitest run lib/mesclar.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 4: Escrever o teste ponta a ponta (falhando)**

`e2e/genero.spec.ts`:
```ts
import { expect, test } from '@playwright/test'

test('página de gênero carrega mais filmes ao rolar, sem repetidos, até acabar', async ({ page }) => {
  await page.goto('/genero/28')
  await expect(page.getByRole('heading', { level: 1, name: 'Ação', exact: true })).toBeVisible()
  const cartoes = page.getByTestId('movie-card')
  await expect(cartoes.first()).toBeVisible()

  // O simulador tem 3 páginas de 20, e a página 2 repete um filme: 59 filmes únicos.
  await expect(async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    expect(await cartoes.count()).toBe(59)
  }).toPass({ timeout: 15_000 })

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)
  await expect(cartoes).toHaveCount(59)
})

test('troca a ordenação', async ({ page }) => {
  await page.goto('/genero/28')
  const ordem = page.getByRole('navigation', { name: 'Ordenar por' })
  await expect(ordem.getByRole('link', { name: 'Popularidade' })).toHaveAttribute('aria-current', 'page')
  await ordem.getByRole('link', { name: 'Nota' }).click()
  await expect(page).toHaveURL(/\/genero\/28\?ordem=nota$/)
  await expect(ordem.getByRole('link', { name: 'Nota' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('movie-card').first()).toBeVisible()
})

test('ordem desconhecida volta para popularidade', async ({ page }) => {
  await page.goto('/genero/28?ordem=aleatoria')
  await expect(page.getByRole('navigation', { name: 'Ordenar por' }).getByRole('link', { name: 'Popularidade' })).toHaveAttribute('aria-current', 'page')
})

test('gênero com falha no TMDB mostra mensagem de erro', async ({ page }) => {
  await page.goto('/genero/878')
  await expect(page.getByRole('heading', { level: 1, name: 'Ficção científica' })).toBeVisible()
  await expect(page.getByText('Não foi possível carregar')).toBeVisible()
})

for (const rota of ['/genero/abc', '/genero/424242']) {
  test(`gênero inválido ou inexistente mostra 404: ${rota}`, async ({ page }) => {
    await page.goto(rota)
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
}

test('menu de gêneros leva à página do gênero', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  else await page.getByRole('button', { name: 'Gêneros' }).click()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Comédia' }).click()
  await expect(page).toHaveURL(/\/genero\/35$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Comédia' })).toBeVisible()
})
```

- [ ] **Step 5: Rodar para ver falhar**

Run: `npx playwright test e2e/genero.spec.ts`
Expected: FAIL — `/genero/28` mostra o 404.

- [ ] **Step 6: Grade infinita e seletor de ordem**

`components/GradeInfinita.tsx`:
```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { mesclarSemDuplicados } from '@/lib/mesclar'
import type { MovieSummary, PaginaFilmes } from '@/lib/tmdb/tipos'
import { GradeEsqueleto } from './Esqueletos'
import { GradeFilmes } from './GradeFilmes'
import { MensagemErro } from './MensagemErro'

type Estado = 'ocioso' | 'carregando' | 'erro'

export function GradeInfinita({ inicial, endpoint }: { inicial: PaginaFilmes; endpoint: string }) {
  const [filmes, setFilmes] = useState<MovieSummary[]>(() => mesclarSemDuplicados([], inicial.results))
  const [pagina, setPagina] = useState(inicial.page)
  const [estado, setEstado] = useState<Estado>('ocioso')
  const sentinelaRef = useRef<HTMLDivElement>(null)
  const temMais = pagina < inicial.totalPages

  const carregarMais = useCallback(async () => {
    if (estado !== 'ocioso' || !temMais) return
    setEstado('carregando')
    try {
      const resposta = await fetch(`${endpoint}&pagina=${pagina + 1}`)
      if (!resposta.ok) throw new Error(`status ${resposta.status}`)
      const dados = (await resposta.json()) as PaginaFilmes
      setFilmes((atuais) => mesclarSemDuplicados(atuais, dados.results))
      setPagina(pagina + 1)
      setEstado('ocioso')
    } catch {
      setEstado('erro')
    }
  }, [endpoint, estado, pagina, temMais])

  useEffect(() => {
    const sentinela = sentinelaRef.current
    if (!sentinela || estado !== 'ocioso' || !temMais) return
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) void carregarMais()
      },
      { rootMargin: '600px' },
    )
    observador.observe(sentinela)
    return () => observador.disconnect()
  }, [carregarMais, estado, temMais])

  return (
    <div className="space-y-5">
      <GradeFilmes filmes={filmes} />
      <div ref={sentinelaRef} aria-hidden className="h-px" />
      {estado === 'carregando' && <GradeEsqueleto quantidade={6} />}
      {estado === 'erro' && <MensagemErro aoTentar={() => setEstado('ocioso')} />}
    </div>
  )
}
```

`components/SeletorOrdem.tsx`:
```tsx
import Link from 'next/link'
import { ORDENS_GENERO, type OrdemGenero } from '@/lib/tmdb/tipos'

const NOMES: Record<OrdemGenero, string> = { popularidade: 'Popularidade', nota: 'Nota', lancamento: 'Lançamento' }

export function SeletorOrdem({ caminhoBase, atual }: { caminhoBase: string; atual: OrdemGenero }) {
  return (
    <nav aria-label="Ordenar por" className="flex rounded-md bg-superficie p-1 text-sm font-semibold">
      {ORDENS_GENERO.map((ordem) => (
        <Link
          key={ordem}
          href={`${caminhoBase}?ordem=${ordem}`}
          aria-current={ordem === atual ? 'page' : undefined}
          className={`rounded px-3 py-1.5 transition-colors ${
            ordem === atual ? 'bg-white text-black' : 'text-white/70 hover:text-white'
          }`}
        >
          {NOMES[ordem]}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 7: Página de gênero**

`app/genero/[id]/page.tsx`:
```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CONTEUDO } from '@/components/estilos'
import { GradeInfinita } from '@/components/GradeInfinita'
import { MensagemErro } from '@/components/MensagemErro'
import { SeletorOrdem } from '@/components/SeletorOrdem'
import { lerIdPositivo } from '@/lib/parametros'
import { discoverByGenre, getGenres } from '@/lib/tmdb/filmes'
import { ORDENS_GENERO, type Genero, type OrdemGenero, type PaginaFilmes } from '@/lib/tmdb/tipos'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ordem?: string | string[] }>
}

async function carregarGenero(idTexto: string): Promise<{ id: number; nome: string }> {
  const id = lerIdPositivo(idTexto)
  if (id === null) notFound()
  const generos = await getGenres().catch((): Genero[] | null => null)
  const genero = generos?.find((g) => g.id === id)
  if (generos && !genero) notFound()
  return { id, nome: genero?.name ?? 'Filmes' }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nome } = await carregarGenero((await params).id)
  return { title: nome }
}

export default async function PaginaGenero({ params, searchParams }: Props) {
  const { id, nome } = await carregarGenero((await params).id)
  const { ordem: ordemBruta } = await searchParams
  const ordem: OrdemGenero =
    typeof ordemBruta === 'string' && ORDENS_GENERO.includes(ordemBruta as OrdemGenero) ? (ordemBruta as OrdemGenero) : 'popularidade'

  let inicial: PaginaFilmes | null = null
  try {
    inicial = await discoverByGenre(id, ordem, 1)
  } catch {
    inicial = null
  }

  return (
    <div className={`${CONTEUDO} pb-8 pt-24`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold md:text-4xl">{nome}</h1>
        <SeletorOrdem caminhoBase={`/genero/${id}`} atual={ordem} />
      </div>
      {!inicial ? (
        <MensagemErro />
      ) : inicial.results.length === 0 ? (
        <p className="text-lg text-white/70">Nenhum filme encontrado.</p>
      ) : (
        <GradeInfinita key={ordem} inicial={inicial} endpoint={`/api/filmes?tipo=genero&id=${id}&ordem=${ordem}`} />
      )}
    </div>
  )
}
```

`app/genero/[id]/loading.tsx`:
```tsx
import { GradeEsqueleto } from '@/components/Esqueletos'
import { CONTEUDO } from '@/components/estilos'

export default function Carregando() {
  return (
    <div className={`${CONTEUDO} pb-8 pt-24`}>
      <div className="mb-6 h-10 w-48 animate-pulse rounded bg-white/10" />
      <GradeEsqueleto />
    </div>
  )
}
```

- [ ] **Step 8: Rodar para ver passar**

Run:
```powershell
npm test
npx playwright test e2e/genero.spec.ts
```
Expected: PASS nos dois.

- [ ] **Step 9: Commit**

```powershell
git add lib/mesclar.ts lib/mesclar.test.ts components app e2e
git commit -m "feat: página de gênero com ordenação e rolagem infinita" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Busca (campo na barra superior + página `/busca`)

**Files:**
- Create: `components/CampoBusca.tsx`, `app/busca/page.tsx`, `app/busca/loading.tsx`
- Modify: `components/Navbar.tsx` (inserir o campo de busca)
- Test: `e2e/busca.spec.ts`

**Interfaces:**
- Consumes: `searchMovies`, `PaginaFilmes` (Task 2); `GradeInfinita` (Task 9); `GradeEsqueleto` (Task 7); `MensagemErro`, `CONTEUDO`, `IconeBusca` (Task 6).
- Produces: `<CampoBusca />` — botão "Buscar" abre o campo "Buscar filmes"; 400 ms depois da última tecla vai para `/busca?q=<termo>` (`push` fora da busca, `replace` dentro); Enter vai na hora; sair da página de busca limpa e fecha o campo.

- [ ] **Step 1: Escrever o teste ponta a ponta (falhando)**

`e2e/busca.spec.ts`:
```ts
import { expect, test } from '@playwright/test'
import { irPeloMenu } from './ajudantes'

test('buscar mostra resultados enquanto digita', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('searchbox', { name: 'Buscar filmes' }).fill('matrix')
  await expect(page).toHaveURL(/\/busca\?q=matrix$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Resultados para "matrix"' })).toBeVisible()
  await expect(page.getByTestId('movie-card')).toHaveCount(3)
  await expect(page.getByRole('link', { name: 'Matrix Reloaded' })).toBeVisible()
})

test('busca sem resultados', async ({ page }) => {
  await page.goto('/busca?q=xyz')
  await expect(page.getByText('Nenhum filme encontrado para "xyz"')).toBeVisible()
})

test('busca vazia pede um termo', async ({ page }) => {
  await page.goto('/busca')
  await expect(page.getByText('Digite o nome de um filme')).toBeVisible()
})

test('acentos e símbolos chegam intactos', async ({ page }) => {
  await page.goto(`/busca?q=${encodeURIComponent('Amélie & cia?')}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Resultados para "Amélie & cia?"' })).toBeVisible()
  await expect(page.getByText('Nenhum filme encontrado para "Amélie & cia?"')).toBeVisible()
})

test('o campo reabre com o termo atual na página de busca', async ({ page }) => {
  await page.goto('/busca?q=matrix')
  await expect(page.getByRole('searchbox', { name: 'Buscar filmes' })).toHaveValue('matrix')
})

test('sair da busca não volta sozinho para ela', async ({ page, isMobile }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('searchbox', { name: 'Buscar filmes' }).fill('matrix')
  await expect(page).toHaveURL(/\/busca\?q=matrix$/)
  await irPeloMenu(page, isMobile, 'Início')
  await expect(page).toHaveURL(/\/$/)
  await page.waitForTimeout(800)
  await expect(page).toHaveURL(/\/$/)
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx playwright test e2e/busca.spec.ts`
Expected: FAIL — não existe botão "Buscar".

- [ ] **Step 3: Campo de busca**

`components/CampoBusca.tsx`:
```tsx
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IconeBusca } from './Icones'

const ESPERA_MS = 400

export function CampoBusca() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const naBusca = pathname === '/busca'
  const termoDaUrl = naBusca ? (searchParams.get('q') ?? '') : ''

  const [aberto, setAberto] = useState(naBusca)
  const [texto, setTexto] = useState(termoDaUrl)
  const [pendente, setPendente] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const navegar = useCallback(
    (valor: string) => {
      setPendente(false)
      const termo = valor.trim()
      const destino = termo ? `/busca?q=${encodeURIComponent(termo)}` : '/busca'
      if (naBusca) router.replace(destino)
      else router.push(destino)
    },
    [naBusca, router],
  )

  useEffect(() => {
    if (!pendente) return
    const espera = setTimeout(() => navegar(texto), ESPERA_MS)
    return () => clearTimeout(espera)
  }, [texto, pendente, navegar])

  useEffect(() => {
    if (!naBusca) {
      setTexto('')
      setAberto(false)
      setPendente(false)
    }
  }, [naBusca])

  useEffect(() => {
    if (aberto && !naBusca) inputRef.current?.focus()
  }, [aberto, naBusca])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        navegar(texto)
      }}
      className={`flex items-center rounded-md transition-colors ${aberto ? 'border border-white/40 bg-black/70' : ''}`}
    >
      <button
        type="button"
        aria-label="Buscar"
        onClick={() => (aberto && texto ? navegar(texto) : setAberto((v) => !v))}
        className="p-2"
      >
        <IconeBusca className="h-5 w-5" />
      </button>
      {aberto && (
        <input
          ref={inputRef}
          type="search"
          aria-label="Buscar filmes"
          placeholder="Títulos de filmes"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setPendente(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !texto) setAberto(false)
          }}
          className="w-36 bg-transparent py-1.5 pr-3 text-sm text-white outline-none placeholder:text-white/50 sm:w-56"
        />
      )}
    </form>
  )
}
```

Em `components/Navbar.tsx`, troque o import de React e acrescente o do campo:
```tsx
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { CampoBusca } from './CampoBusca'
```
E dentro de `<div className="ml-auto flex items-center gap-2">`, antes do botão do menu do celular, insira:
```tsx
            <Suspense fallback={null}>
              <CampoBusca />
            </Suspense>
```

- [ ] **Step 4: Página de busca**

`app/busca/page.tsx`:
```tsx
import type { Metadata } from 'next'
import { CONTEUDO } from '@/components/estilos'
import { GradeInfinita } from '@/components/GradeInfinita'
import { MensagemErro } from '@/components/MensagemErro'
import { searchMovies } from '@/lib/tmdb/filmes'
import type { PaginaFilmes } from '@/lib/tmdb/tipos'

type Props = { searchParams: Promise<{ q?: string | string[] }> }

async function lerTermo(searchParams: Props['searchParams']) {
  const { q } = await searchParams
  return (typeof q === 'string' ? q : '').trim()
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const termo = await lerTermo(searchParams)
  return { title: termo ? `Busca: ${termo}` : 'Busca' }
}

export default async function PaginaBusca({ searchParams }: Props) {
  const termo = await lerTermo(searchParams)

  if (!termo) {
    return (
      <div className={`${CONTEUDO} pb-8 pt-24`}>
        <h1 className="mb-6 text-3xl font-extrabold md:text-4xl">Busca</h1>
        <p className="text-lg text-white/70">Digite o nome de um filme</p>
      </div>
    )
  }

  let inicial: PaginaFilmes | null = null
  try {
    inicial = await searchMovies(termo, 1)
  } catch {
    inicial = null
  }

  return (
    <div className={`${CONTEUDO} pb-8 pt-24`}>
      <h1 className="mb-6 text-2xl font-extrabold md:text-3xl">Resultados para &quot;{termo}&quot;</h1>
      {!inicial ? (
        <MensagemErro />
      ) : inicial.results.length === 0 ? (
        <p className="text-lg text-white/70">Nenhum filme encontrado para &quot;{termo}&quot;</p>
      ) : (
        <GradeInfinita key={termo} inicial={inicial} endpoint={`/api/filmes?tipo=busca&q=${encodeURIComponent(termo)}`} />
      )}
    </div>
  )
}
```

`app/busca/loading.tsx`:
```tsx
import { GradeEsqueleto } from '@/components/Esqueletos'
import { CONTEUDO } from '@/components/estilos'

export default function Carregando() {
  return (
    <div className={`${CONTEUDO} pb-8 pt-24`}>
      <div className="mb-6 h-9 w-72 max-w-full animate-pulse rounded bg-white/10" />
      <GradeEsqueleto />
    </div>
  )
}
```

- [ ] **Step 5: Rodar para ver passar**

Run: `npx playwright test`
Expected: PASS em todas as specs.

- [ ] **Step 6: Commit**

```powershell
git add components app e2e
git commit -m "feat: busca de filmes na barra superior" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Página de detalhes do filme

**Files:**
- Create: `lib/formatar.ts`, `components/BotaoTrailer.tsx`, `components/OndeAssistir.tsx`, `components/Elenco.tsx`, `app/filme/[id]/page.tsx`, `app/filme/[id]/loading.tsx`, `public/pessoa-padrao.svg`
- Test: `lib/formatar.test.ts`, `e2e/filme.spec.ts`

**Interfaces:**
- Consumes: `getMovieDetails`, `MovieDetails`, `WatchProviders`, `CastMember` (Tasks 2–3); `lerIdPositivo` (Task 5); `BotaoLista`, `ImagemComReserva`, `paraFilmeSalvo` (Task 7); `Carrossel` (Task 8); `MensagemErro`, estilos, ícones (Task 6).
- Produces:
  - `formatarDuracao(minutos: number): string` — `136 → "2h 16min"`, `45 → "45min"`, `120 → "2h"`
  - `<BotaoTrailer chave titulo />` — botão "Trailer"; modal `role="dialog"` com nome "Trailer de <título>"; fecha com Esc, clique fora ou botão "Fechar trailer"
  - `<OndeAssistir provedores={WatchProviders | null} />` — região "Onde assistir"
  - `<Elenco elenco={CastMember[]} />` — região "Elenco principal"

- [ ] **Step 1: Escrever o teste unitário (falhando)**

`lib/formatar.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { formatarDuracao } from './formatar'

describe('formatarDuracao', () => {
  it('formata horas e minutos', () => {
    expect(formatarDuracao(136)).toBe('2h 16min')
  })

  it('omite as horas quando é menos de uma hora', () => {
    expect(formatarDuracao(45)).toBe('45min')
  })

  it('omite os minutos quando é hora cheia', () => {
    expect(formatarDuracao(120)).toBe('2h')
  })
})
```

Run: `npx vitest run lib/formatar.test.ts`
Expected: FAIL — `Failed to resolve import "./formatar"`.

- [ ] **Step 2: Implementar**

`lib/formatar.ts`:
```ts
export function formatarDuracao(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return `${resto}min`
  if (resto === 0) return `${horas}h`
  return `${horas}h ${resto}min`
}
```

Run: `npx vitest run lib/formatar.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 3: Escrever o teste ponta a ponta (falhando)**

`e2e/filme.spec.ts`:
```ts
import { expect, test } from '@playwright/test'
import { irPeloMenu } from './ajudantes'

test('mostra os detalhes completos do filme', async ({ page }) => {
  await page.goto('/filme/1001')
  const cabecalho = page.getByRole('region', { name: 'Filme Teste 1001' })
  await expect(cabecalho.getByRole('heading', { level: 1, name: 'Filme Teste 1001' })).toBeVisible()
  await expect(cabecalho.getByText('Sinopse do Filme Teste 1001.')).toBeVisible()
  await expect(cabecalho.getByText('2024 · 2h 16min · ★ 7.8')).toBeVisible()
  await expect(cabecalho.getByText('Ação', { exact: true })).toBeVisible()

  const ondeAssistir = page.getByRole('region', { name: 'Onde assistir' })
  await expect(ondeAssistir.getByRole('img', { name: 'Serviço de Streaming' })).toBeVisible()
  await expect(ondeAssistir.getByRole('link', { name: 'JustWatch' })).toBeVisible()

  await expect(page.getByRole('region', { name: 'Elenco principal' }).getByRole('listitem')).toHaveCount(15)
  await expect(page.getByRole('region', { name: 'Filmes semelhantes' }).getByTestId('movie-card')).toHaveCount(20)
})

test('abre e fecha o trailer', async ({ page }) => {
  await page.goto('/filme/1001')
  await page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Trailer' }).click()
  const modal = page.getByRole('dialog', { name: 'Trailer de Filme Teste 1001' })
  await expect(modal).toBeVisible()
  await expect(modal.locator('iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/trailer-teste/)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()

  await page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Trailer' }).click()
  await page.getByRole('button', { name: 'Fechar trailer' }).click()
  await expect(modal).toBeHidden()
})

test('fluxo completo: início → filme → favoritar e salvar → Minha lista → recarregar', async ({ page, isMobile }) => {
  await page.goto('/')
  await page.getByRole('region', { name: 'Em alta hoje' }).getByRole('link', { name: 'Filme Teste 1002' }).click()
  await expect(page).toHaveURL(/\/filme\/1002$/)

  const cabecalho = page.getByRole('region', { name: 'Filme Teste 1002' })
  const favoritar = cabecalho.getByRole('button', { name: 'Favoritar' })
  const salvar = cabecalho.getByRole('button', { name: 'Salvar para assistir' })
  await favoritar.click()
  await salvar.click()
  await expect(favoritar).toHaveAttribute('aria-pressed', 'true')
  await expect(salvar).toHaveAttribute('aria-pressed', 'true')

  await irPeloMenu(page, isMobile, 'Minha lista')
  await expect(page.getByRole('link', { name: 'Filme Teste 1002' })).toBeVisible()
  await page.getByRole('tab', { name: /Salvos para assistir/ }).click()
  await expect(page.getByRole('link', { name: 'Filme Teste 1002' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('tab', { name: 'Favoritos (1)' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Filme Teste 1002' })).toBeVisible()
})

for (const rota of ['/filme/999999', '/filme/abc', '/filme/0']) {
  test(`filme inexistente ou inválido mostra 404: ${rota}`, async ({ page }) => {
    await page.goto(rota)
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
}
```

- [ ] **Step 4: Rodar para ver falhar**

Run: `npx playwright test e2e/filme.spec.ts`
Expected: FAIL — `/filme/1001` mostra o 404.

- [ ] **Step 5: Trailer, onde assistir e elenco**

`components/BotaoTrailer.tsx`:
```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BOTAO_PRIMARIO } from './estilos'
import { IconeFechar, IconePlay } from './Icones'

export function BotaoTrailer({ chave, titulo }: { chave: string; titulo: string }) {
  const [aberto, setAberto] = useState(false)
  const fechar = useCallback(() => setAberto(false), [])

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={BOTAO_PRIMARIO}>
        <IconePlay /> Trailer
      </button>
      {aberto && <ModalTrailer chave={chave} titulo={titulo} aoFechar={fechar} />}
    </>
  )
}

function ModalTrailer({ chave, titulo, aoFechar }: { chave: string; titulo: string; aoFechar: () => void }) {
  const fecharRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fecharRef.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
    }
  }, [aoFechar])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer de ${titulo}`}
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
    >
      <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <button
          ref={fecharRef}
          type="button"
          aria-label="Fechar trailer"
          onClick={aoFechar}
          className="absolute -top-12 right-0 rounded-full p-2 text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <IconeFechar className="h-7 w-7" />
        </button>
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(chave)}?autoplay=1&rel=0`}
            title={`Trailer de ${titulo}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  )
}
```

`components/OndeAssistir.tsx`:
```tsx
import type { Provider, WatchProviders } from '@/lib/tmdb/tipos'

export function OndeAssistir({ provedores }: { provedores: WatchProviders | null }) {
  const grupos: [string, Provider[]][] = provedores
    ? [
        ['Streaming', provedores.streaming],
        ['Alugar', provedores.rent],
        ['Comprar', provedores.buy],
      ]
    : []

  return (
    <section aria-labelledby="onde-assistir-titulo" className="space-y-4">
      <h2 id="onde-assistir-titulo" className="text-xl font-bold md:text-2xl">
        Onde assistir
      </h2>
      {!provedores ? (
        <p className="text-white/70">Não disponível em streaming no Brasil</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-8">
            {grupos
              .filter(([, lista]) => lista.length > 0)
              .map(([nome, lista]) => (
                <div key={nome}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/50">{nome}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {lista.map((p) => (
                      <li key={p.id} title={p.name}>
                        {p.logoUrl ? (
                          <img src={p.logoUrl} alt={p.name} className="h-12 w-12 rounded-lg" loading="lazy" />
                        ) : (
                          <span className="flex h-12 items-center rounded-lg bg-superficie px-3 text-sm">{p.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
          <p className="text-xs text-white/50">
            Dados de disponibilidade fornecidos pela{' '}
            <a href="https://www.justwatch.com/br" target="_blank" rel="noreferrer" className="underline hover:text-white">
              JustWatch
            </a>
            .
            {provedores.link && (
              <>
                {' '}
                <a href={provedores.link} target="_blank" rel="noreferrer" className="underline hover:text-white">
                  Ver todas as opções
                </a>
              </>
            )}
          </p>
        </>
      )}
    </section>
  )
}
```

`public/pessoa-padrao.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="185" height="278" viewBox="0 0 185 278">
  <rect width="185" height="278" fill="#16161D"/>
  <circle cx="92.5" cy="105" r="36" fill="#3a3a46"/>
  <path d="M30 230c0-40 28-62 62.5-62S155 190 155 230z" fill="#3a3a46"/>
</svg>
```

`components/Elenco.tsx`:
```tsx
import type { CastMember } from '@/lib/tmdb/tipos'
import { ImagemComReserva } from './ImagemComReserva'

export function Elenco({ elenco }: { elenco: CastMember[] }) {
  return (
    <section aria-labelledby="elenco-titulo" className="space-y-4">
      <h2 id="elenco-titulo" className="text-xl font-bold md:text-2xl">
        Elenco principal
      </h2>
      <ul className="sem-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:px-0">
        {elenco.map((ator) => (
          <li key={ator.id} className="w-28 shrink-0 md:w-32">
            <ImagemComReserva
              src={ator.profileUrl}
              reserva="/pessoa-padrao.svg"
              alt={ator.name}
              className="aspect-[2/3] w-full rounded-md bg-superficie object-cover"
            />
            <p className="mt-2 line-clamp-2 text-sm font-semibold">{ator.name}</p>
            {ator.character && <p className="line-clamp-2 text-xs text-white/60">{ator.character}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 6: Página do filme**

`app/filme/[id]/page.tsx`:
```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BotaoLista } from '@/components/BotaoLista'
import { BotaoTrailer } from '@/components/BotaoTrailer'
import { Carrossel } from '@/components/Carrossel'
import { Elenco } from '@/components/Elenco'
import { CONTEUDO } from '@/components/estilos'
import { ImagemComReserva } from '@/components/ImagemComReserva'
import { MensagemErro } from '@/components/MensagemErro'
import { OndeAssistir } from '@/components/OndeAssistir'
import { formatarDuracao } from '@/lib/formatar'
import { paraFilmeSalvo } from '@/lib/lista/tipos'
import { lerIdPositivo } from '@/lib/parametros'
import { getMovieDetails } from '@/lib/tmdb/detalhes'
import type { MovieDetails } from '@/lib/tmdb/tipos'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = lerIdPositivo((await params).id)
  if (id === null) return {}
  const filme = await getMovieDetails(id).catch(() => null)
  return filme ? { title: filme.title, description: filme.overview } : {}
}

export default async function PaginaFilme({ params }: Props) {
  const id = lerIdPositivo((await params).id)
  if (id === null) notFound()

  let filme: MovieDetails | null
  try {
    filme = await getMovieDetails(id)
  } catch {
    return (
      <div className={`${CONTEUDO} pt-28`}>
        <MensagemErro />
      </div>
    )
  }
  if (!filme) notFound()

  const salvo = paraFilmeSalvo(filme)
  const detalhes = [
    filme.year,
    filme.runtime !== null ? formatarDuracao(filme.runtime) : null,
    filme.rating !== null ? `★ ${filme.rating.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article>
      <section aria-labelledby="titulo-filme" className="relative min-h-[70vh]">
        {filme.backdropUrl && <img src={filme.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-fundo via-fundo/80 to-fundo/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-fundo via-transparent to-transparent" />
        <div className={`${CONTEUDO} relative flex flex-col gap-8 pb-12 pt-28 md:flex-row md:items-end`}>
          <ImagemComReserva
            src={filme.posterUrl}
            reserva="/poster-padrao.svg"
            alt={`Pôster de ${filme.title}`}
            className="w-40 shrink-0 rounded-lg shadow-2xl shadow-black/60 md:w-64"
          />
          <div className="max-w-3xl space-y-4">
            <h1 id="titulo-filme" className="text-3xl font-extrabold leading-tight md:text-5xl">
              {filme.title}
            </h1>
            {detalhes && <p className="text-white/80">{detalhes}</p>}
            {filme.genres.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {filme.genres.map((g) => (
                  <li key={g} className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold">
                    {g}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-white/85 md:text-lg">{filme.overview}</p>
            <div className="flex flex-wrap gap-3">
              {filme.trailerKey && <BotaoTrailer chave={filme.trailerKey} titulo={filme.title} />}
              <BotaoLista tipo="favoritos" filme={salvo} comTexto />
              <BotaoLista tipo="salvos" filme={salvo} comTexto />
            </div>
          </div>
        </div>
      </section>

      <div className={`${CONTEUDO} space-y-12 pb-8`}>
        <OndeAssistir provedores={filme.watchProviders} />
        {filme.cast.length > 0 && <Elenco elenco={filme.cast} />}
      </div>

      {filme.recommendations.length > 0 && (
        <div className="mt-12">
          <Carrossel titulo="Filmes semelhantes" filmes={filme.recommendations} />
        </div>
      )}
    </article>
  )
}
```

`app/filme/[id]/loading.tsx`:
```tsx
import { CONTEUDO } from '@/components/estilos'

export default function Carregando() {
  return (
    <div aria-hidden className={`${CONTEUDO} flex min-h-[70vh] flex-col gap-8 pb-12 pt-28 md:flex-row md:items-end`}>
      <div className="aspect-[2/3] w-40 shrink-0 animate-pulse rounded-lg bg-white/10 md:w-64" />
      <div className="w-full max-w-3xl space-y-4">
        <div className="h-12 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="h-24 w-full animate-pulse rounded bg-white/10" />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Rodar tudo**

Run:
```powershell
npm test
npm run typecheck
npx playwright test
```
Expected: todos PASS, sem erros de tipo.

- [ ] **Step 8: Commit**

```powershell
git add lib/formatar.ts lib/formatar.test.ts components app public e2e
git commit -m "feat: página de detalhes com trailer, onde assistir, elenco e semelhantes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Conferência com dados reais, README e publicação na Vercel

**Files:**
- Create: `README.md`
- Create (fora do git): `.env.local`

**Interfaces:**
- Consumes: o site completo (Tasks 1–11).
- Produces: README em português para o dono do produto; site publicado na Vercel.

> Esta task depende do dono do produto (colar o token, criar contas). **Pare e peça cada ação a ele**, uma por vez, explicando em linguagem simples. Não crie contas, repositórios públicos nem publique nada sem confirmação explícita.

- [ ] **Step 1: Criar o `.env.local` e pedir o token**

Run:
```powershell
Copy-Item .env.local.example .env.local
code .env.local
```
Peça ao dono: "Abri o arquivo `.env.local` no VS Code. Cole o seu token do TMDB logo depois de `TMDB_READ_TOKEN=` (sem espaços nem aspas), salve com Ctrl+S e me avise." **Não peça para colar o token no chat.**

Depois confirme sem mostrar o valor:
```powershell
(Get-Content .env.local | Select-String '^TMDB_READ_TOKEN=eyJ') -ne $null
```
Expected: `True`.

- [ ] **Step 2: Conferir com dados reais**

Run (em segundo plano): `npm run dev`
Depois:
```powershell
$html = (Invoke-WebRequest -UseBasicParsing http://localhost:3000).Content
$html.Contains('Em alta hoje'); $html.Contains('Não foi possível carregar')
(Invoke-WebRequest -UseBasicParsing http://localhost:3000/filme/603).StatusCode
(Invoke-WebRequest -UseBasicParsing "http://localhost:3000/api/filmes?tipo=busca&q=matrix").Content.Substring(0, 200)
```
Expected: `True`, `False`, `200` e um JSON com "Matrix". Peça ao dono que abra http://localhost:3000 no navegador e confira o visual no computador e no celular (DevTools → modo dispositivo). Pare o servidor de desenvolvimento no fim.

- [ ] **Step 3: Escrever o README**

`README.md`:
````markdown
# CineTeca

Catálogo de filmes em português: descubra filmes, veja trailers e onde assistir no Brasil, e monte suas listas de Favoritos e Salvos.

Os dados de filmes vêm do [TMDB](https://www.themoviedb.org). Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.

## Rodar no seu computador

1. Instale o [Node.js](https://nodejs.org) (versão 20 ou mais nova).
2. Na pasta do projeto, rode `npm install`.
3. Copie `.env.local.example` para `.env.local` e cole o seu token do TMDB depois de `TMDB_READ_TOKEN=`.
4. Rode `npm run dev` e abra http://localhost:3000.

## Testes

- `npm test` — testes unitários.
- `npm run test:e2e` — testes no navegador (desktop e celular) com um TMDB simulado; não precisa de token.
- `npm run typecheck` — confere os tipos do TypeScript.

## Publicar na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Em https://vercel.com, clique em **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, crie `TMDB_READ_TOKEN` com o seu token.
4. Clique em **Deploy**. A cada novo commit no GitHub, a Vercel publica sozinha.

## Onde fica cada coisa

- `lib/tmdb/` — tudo o que fala com o TMDB (roda só no servidor).
- `lib/lista/` — Favoritos e Salvos. Hoje guarda no navegador; na Fase 2 vai guardar na conta do usuário.
- `components/` — peças visuais do site.
- `app/` — páginas.
````

- [ ] **Step 4: Commit**

```powershell
git add README.md
git commit -m "docs: README com instruções de uso e publicação" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Publicar (com o dono do produto, passo a passo)**

Pergunte antes de cada ação externa:
1. "Você já tem conta no GitHub? Quer que o repositório seja **privado**?" (recomende privado). Com o `gh` autenticado e a confirmação dele: `gh repo create cineteca --private --source . --push`. Sem `gh`, guie o dono a criar o repositório pelo site e rode os comandos `git remote add origin <url>` e `git push -u origin master` que o GitHub mostrar.
2. Guie o dono pela Vercel (seção "Publicar na Vercel" do README): importar o repositório e criar a variável `TMDB_READ_TOKEN`. O dono cola o token direto no painel da Vercel.
3. Quando a Vercel mostrar o endereço (ex.: `https://cineteca-xxxx.vercel.app`), confira:
```powershell
(Invoke-WebRequest -UseBasicParsing https://<endereço>/).Content.Contains('Em alta hoje')
```
Expected: `True`. Passe o endereço final ao dono.

