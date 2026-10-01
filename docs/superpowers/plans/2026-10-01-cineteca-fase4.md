# CineTeca Fase 4 (Olhar de cinéfilo) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A página do filme ganha a seção Visão & Construção e uma galeria de imagens em mosaico, e o site ganha o botão Fure a bolha, que sorteia um filme aclamado fora do eixo de Hollywood.

**Architecture:**

- **Dados do filme:** a consulta única que `getMovieDetails` já faz passa a pedir `images` e a ler `credits.crew`. A equipe é normalizada em `lib/tmdb/equipe.ts` (puro) e as imagens em `lib/tmdb/detalhes.ts`. Nenhuma chamada nova ao TMDB por página.
- **Telas do filme:** dois componentes cliente (`VisaoConstrucao`, `GaleriaImagens`) recebem dados prontos do servidor. O layout do mosaico sai de uma função pura (`lib/mosaico.ts`).
- **Fure a bolha:** `sortearJoia()` (servidor, `lib/tmdb/joia.ts`) atrás da rota `GET /api/fure-a-bolha`. Um `FureBolhaProvider` no layout guarda a janela; os botões da home e do menu só chamam `abrir()`.

**Tech Stack:** Next.js 16.3 (App Router) · React 19 · TypeScript 7 · Tailwind v4 · Vitest 5 · Playwright (TMDB simulado em `e2e/mock-tmdb/`).

**Spec:** `docs/superpowers/specs/2026-10-01-cineteca-fase4-olhar-de-cinefilo-design.md`. As restrições das Fases 1 a 3 continuam valendo.

## Global Constraints

- **Texto:** tudo na tela em português do Brasil. Os textos da spec §6 são copiados exatamente.
- **TMDB:** só `lib/tmdb/` fala com o TMDB, e só no servidor (`import 'server-only'` nos arquivos que chamam `tmdbFetch`). Chamadas com `language=pt-BR` (o `tmdbFetch` já põe). Só filmes.
- **Cores:** só tokens (`fundo`, `superficie`, `destaque`, `destaque-escuro`) e os estilos de `components/estilos.ts`. Texto preto sobre o verde.
- **Imagens:** `<img>` simples, nunca `next/image`.
- **Acessibilidade:** respeitar `prefers-reduced-motion` (sem animação nova fora de `motion-safe:`). Janelas com `role="dialog"`, `aria-modal="true"`, Esc fecha, foco preso dentro.
- **Erros:** nunca parecer sucesso ou lista vazia. Logs com prefixo `[CineTeca]` e só o código ou nome do erro.
- **Vitest:** todo hook (`beforeEach`/`afterEach`/…) com corpo em bloco `{ ... }`.
- **TypeScript 7:** a variável do `catch` é `unknown`.
- **Playwright:** mensagens com `getByText`; nomes que são prefixo de outro com `exact: true`; `expect.timeout` global é 15 s.
- **Heredoc:** arquivos com `\\` (regex) são criados com a ferramenta de escrita, não com heredoc.
- **Windows:** PowerShell 5.1 (sem `&&`) ou Git Bash; caminho do projeto tem espaço e acento, use aspas.
- **Commits:** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (segundo `-m`).
- **Limites (spec):** até 3 pessoas por função, 12 cartões; até 20 imagens, mosaico de 5; sorteio com nota ≥ 7,5, ≥ 200 votos, até 3 idiomas tentados, páginas até 500.

## Review Focus

1. **Imagem da equipe ou da galeria que não carrega** (404 do servidor de imagens): o cartão troca para as iniciais; a galeria não pode mostrar um quadro quebrado sem saída. Pinado na Task 3 (e2e com a foto da diretora simulada, que dá 404, virando iniciais).
2. **Mosaico com 1, 2, 3 ou 4 imagens:** nenhum buraco na grade, no computador e no celular. Pinado na Task 2 (`classesMosaico` para cada quantidade).
3. **Tela cheia aberta e o usuário aperta Tab repetidamente:** o foco não escapa para a página por trás. Pinado na Task 4 (e2e com Tab).
4. **Fure a bolha clicado duas vezes rápido / "Outra sugestão" com resposta lenta:** botões desabilitados enquanto carrega; nunca duas sugestões sobrepostas. Pinado na Task 6 (e2e: botões desabilitados durante o carregamento).
5. **Fure a bolha aberto pelo menu do celular:** o menu fecha e a janela continua aberta (o estado da janela não pode morar dentro do menu que desmonta). Pinado na Task 6 (e2e no projeto celular).

---

## Mapa de arquivos

```
lib/tmdb/tipos.ts                 + MembroEquipe, ImagemFilme, Joia; MovieDetails ganha crew e images
lib/tmdb/equipe.ts                normalizarEquipe (puro)
lib/tmdb/equipe.test.ts
lib/tmdb/detalhes.ts              pede images, normaliza crew e imagens
lib/tmdb/detalhes.test.ts
lib/tmdb/joia.ts                  sortearJoia, nomeIdioma, nomePais (server-only)
lib/tmdb/joia.test.ts
lib/formatar.ts                   + iniciais
lib/formatar.test.ts
lib/mosaico.ts                    classesMosaico (puro)
lib/mosaico.test.ts
components/VisaoConstrucao.tsx
components/GaleriaImagens.tsx
components/usePrenderFoco.ts
components/FureBolhaProvider.tsx
components/JanelaFureBolha.tsx
components/BotaoFureBolha.tsx
components/Icones.tsx             + IconeBolha
components/Navbar.tsx             item Fure a bolha (computador e celular)
app/layout.tsx                    FureBolhaProvider
app/(inicio)/page.tsx             chamada Fure a bolha abaixo do banner
app/filme/[id]/page.tsx           nova ordem das seções
app/api/fure-a-bolha/route.ts
e2e/mock-tmdb/dados.mjs           crew, images, origin_country, filme 1005 sem bastidores
e2e/mock-tmdb/servidor.mjs        discover por idioma
e2e/bastidores.spec.ts            Visão & Construção e galeria
e2e/fure-a-bolha.spec.ts
```

---

### Task 1: Equipe nos dados do filme

**Files:**
- Create: `lib/tmdb/equipe.ts`, `lib/tmdb/equipe.test.ts`
- Modify: `lib/tmdb/tipos.ts`, `lib/tmdb/detalhes.ts`, `lib/tmdb/detalhes.test.ts`, `lib/formatar.ts`, `lib/formatar.test.ts`, `e2e/mock-tmdb/dados.mjs`

**Interfaces:**
- Consumes: `imageUrl(caminho, 'w185')` (`lib/tmdb/imagens.ts`).
- Produces:
  - `type MembroEquipe = { id: number; name: string; profileUrl: string | null; funcoes: string[] }` em `lib/tmdb/tipos.ts`
  - `MovieDetails.crew: MembroEquipe[]`
  - `normalizarEquipe(crew: MembroEquipeBruto[]): MembroEquipe[]`, `FUNCOES_EQUIPE`, `MAX_POR_FUNCAO = 3`, `MAX_EQUIPE = 12` em `lib/tmdb/equipe.ts`
  - `iniciais(nome: string): string` em `lib/formatar.ts`
  - Mock: todo filme simulado tem equipe; o filme `1005` não tem equipe nem imagens.

- [ ] **Step 1: Escrever os testes da equipe (falhando)**

`lib/tmdb/equipe.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { MAX_EQUIPE, normalizarEquipe } from './equipe'

const pessoa = (id: number, job: string, extra: Partial<{ name: string; profile_path: string | null }> = {}) => ({
  id,
  name: extra.name ?? `Pessoa ${id}`,
  job,
  profile_path: extra.profile_path ?? null,
})

describe('normalizarEquipe', () => {
  it('fica só com as 6 funções e traduz os nomes', () => {
    const equipe = normalizarEquipe([
      pessoa(1, 'Director'),
      pessoa(2, 'Costume Design'),
      pessoa(3, 'Director of Photography'),
      pessoa(4, 'Production Design'),
      pessoa(5, 'Art Direction'),
      pessoa(6, 'Original Music Composer'),
      pessoa(7, 'Editor'),
    ])
    expect(equipe.map((p) => [p.id, p.funcoes])).toEqual([
      [1, ['Direção']],
      [3, ['Fotografia']],
      [4, ['Design de produção']],
      [6, ['Música']],
      [7, ['Montagem']],
    ])
  })

  it('Screenplay e Writer viram Roteiro, sem repetir a pessoa', () => {
    const equipe = normalizarEquipe([pessoa(1, 'Screenplay'), pessoa(1, 'Writer'), pessoa(2, 'Writer')])
    expect(equipe).toEqual([
      { id: 1, name: 'Pessoa 1', profileUrl: null, funcoes: ['Roteiro'] },
      { id: 2, name: 'Pessoa 2', profileUrl: null, funcoes: ['Roteiro'] },
    ])
  })

  it('junta as funções da mesma pessoa num cartão, na ordem da tabela', () => {
    const equipe = normalizarEquipe([pessoa(9, 'Editor'), pessoa(9, 'Screenplay'), pessoa(9, 'Director')])
    expect(equipe).toHaveLength(1)
    expect(equipe[0].funcoes).toEqual(['Direção', 'Roteiro', 'Montagem'])
  })

  it('ordena os cartões pela primeira função de cada pessoa, mantendo a ordem do TMDB no empate', () => {
    const equipe = normalizarEquipe([pessoa(3, 'Editor'), pessoa(2, 'Director'), pessoa(1, 'Director')])
    expect(equipe.map((p) => p.id)).toEqual([2, 1, 3])
  })

  it('limita a 3 pessoas por função', () => {
    const equipe = normalizarEquipe([1, 2, 3, 4, 5, 6].map((id) => pessoa(id, 'Writer')))
    expect(equipe.map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('limita a 12 cartões no total', () => {
    const jobs = ['Director', 'Writer', 'Director of Photography', 'Production Design', 'Original Music Composer', 'Editor']
    const crew = jobs.flatMap((job, j) => [1, 2, 3].map((k) => pessoa(j * 10 + k, job)))
    expect(normalizarEquipe(crew)).toHaveLength(MAX_EQUIPE)
  })

  it('monta a URL da foto em w185', () => {
    const [p] = normalizarEquipe([pessoa(1, 'Director', { profile_path: '/f.jpg' })])
    expect(p.profileUrl).toBe('https://image.tmdb.org/t/p/w185/f.jpg')
  })

  it('aceita lista vazia', () => {
    expect(normalizarEquipe([])).toEqual([])
  })
})
```

Acrescente ao fim de `lib/formatar.test.ts` (e `iniciais` ao import da linha 2: `import { formatarDuracao, iniciais } from './formatar'`):
```ts
describe('iniciais', () => {
  it('usa a primeira letra do primeiro e do último nome', () => {
    expect(iniciais('Lana Wachowski')).toBe('LW')
    expect(iniciais('Owen  de  Paterson ')).toBe('OP')
  })

  it('nome de uma palavra só tem uma inicial', () => {
    expect(iniciais('Vangelis')).toBe('V')
  })

  it('mantém o acento e põe em maiúscula', () => {
    expect(iniciais('érico ávila')).toBe('ÉÁ')
  })

  it('nome vazio devolve vazio', () => {
    expect(iniciais('   ')).toBe('')
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run lib/tmdb/equipe.test.ts lib/formatar.test.ts`
Expected: FAIL — `Cannot find module './equipe'` e `iniciais is not a function` (ou erro de import).

- [ ] **Step 3: Implementar tipos, equipe e iniciais**

Em `lib/tmdb/tipos.ts`, logo depois de `export type CastMember = ...`:
```ts
export type MembroEquipe = { id: number; name: string; profileUrl: string | null; funcoes: string[] }
```
E em `MovieDetails`, depois de `cast: CastMember[]`:
```ts
  /** Visão & Construção: já filtrada, agrupada por pessoa, ordenada e limitada. */
  crew: MembroEquipe[]
```

`lib/tmdb/equipe.ts`:
```ts
import { imageUrl } from './imagens'
import type { MembroEquipe } from './tipos'

export type MembroEquipeBruto = { id: number; name: string; job?: string; profile_path?: string | null }

// A ordem desta lista é a ordem dos cartões e das funções dentro de cada cartão.
export const FUNCOES_EQUIPE: { nome: string; jobs: string[] }[] = [
  { nome: 'Direção', jobs: ['Director'] },
  { nome: 'Roteiro', jobs: ['Screenplay', 'Writer'] },
  { nome: 'Fotografia', jobs: ['Director of Photography'] },
  { nome: 'Design de produção', jobs: ['Production Design'] },
  { nome: 'Música', jobs: ['Original Music Composer'] },
  { nome: 'Montagem', jobs: ['Editor'] },
]

export const MAX_POR_FUNCAO = 3
export const MAX_EQUIPE = 12

export function normalizarEquipe(crew: MembroEquipeBruto[]): MembroEquipe[] {
  // Map guarda a ordem de inserção: cada pessoa entra na posição da sua primeira função.
  const porPessoa = new Map<number, MembroEquipe>()
  for (const funcao of FUNCOES_EQUIPE) {
    const nestaFuncao = new Set<number>()
    for (const membro of crew) {
      if (!membro.job || !funcao.jobs.includes(membro.job) || nestaFuncao.has(membro.id)) continue
      if (nestaFuncao.size >= MAX_POR_FUNCAO) break
      nestaFuncao.add(membro.id)
      const existente = porPessoa.get(membro.id)
      if (existente) existente.funcoes.push(funcao.nome)
      else
        porPessoa.set(membro.id, {
          id: membro.id,
          name: membro.name,
          profileUrl: imageUrl(membro.profile_path, 'w185'),
          funcoes: [funcao.nome],
        })
    }
  }
  return [...porPessoa.values()].slice(0, MAX_EQUIPE)
}
```

Acrescente ao fim de `lib/formatar.ts`:
```ts
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (partes[0][0] + ultima).toLocaleUpperCase('pt-BR')
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run lib/tmdb/equipe.test.ts lib/formatar.test.ts`
Expected: PASS.

- [ ] **Step 5: Teste da equipe em `getMovieDetails` (falhando)**

Em `lib/tmdb/detalhes.test.ts`:

1. Em `COMPLETO.credits`, acrescente `crew` ao lado de `cast`:
```ts
    crew: [
      { id: 1, name: 'Lana Wachowski', job: 'Director', profile_path: '/lana.jpg' },
      { id: 1, name: 'Lana Wachowski', job: 'Writer', profile_path: '/lana.jpg' },
      { id: 2, name: 'Bill Pope', job: 'Director of Photography', profile_path: null },
      { id: 3, name: 'Kym Barrett', job: 'Costume Design', profile_path: null },
    ],
```
2. Acrescente o teste dentro de `describe('getMovieDetails', ...)`:
```ts
  it('normaliza a equipe da Visão & Construção', async () => {
    responderCom(COMPLETO)
    expect((await getMovieDetails(603))!.crew).toEqual([
      { id: 1, name: 'Lana Wachowski', profileUrl: 'https://image.tmdb.org/t/p/w185/lana.jpg', funcoes: ['Direção', 'Roteiro'] },
      { id: 2, name: 'Bill Pope', profileUrl: null, funcoes: ['Fotografia'] },
    ])
  })
```
3. No teste `'aceita filme sem vídeos, elenco, ...'`, acrescente `crew: [],` depois de `cast: [],`.

Run: `npx vitest run lib/tmdb/detalhes.test.ts`
Expected: FAIL — `crew` indefinido nos dois testes.

- [ ] **Step 6: Ligar a equipe em `getMovieDetails`**

Em `lib/tmdb/detalhes.ts`:
1. Import: `import { normalizarEquipe, type MembroEquipeBruto } from './equipe'`.
2. Em `TmdbDetalhesBruto`, troque `credits?: { cast?: AtorBruto[] }` por:
```ts
  credits?: { cast?: AtorBruto[]; crew?: MembroEquipeBruto[] }
```
3. No objeto devolvido, depois de `cast: ...`:
```ts
    crew: normalizarEquipe(bruto.credits?.crew ?? []),
```

Run: `npx vitest run lib/tmdb`
Expected: PASS.

- [ ] **Step 7: Equipe no TMDB simulado**

Em `e2e/mock-tmdb/dados.mjs`, dentro de `detalhes(id)`, troque o bloco `credits: { cast: ... }` por:
```js
    credits: {
      cast: Array.from({ length: 20 }, (_, i) => ({
        id: 500 + i,
        name: `Ator ${i + 1}`,
        character: `Personagem ${i + 1}`,
        profile_path: null,
        order: i,
      })),
      crew: semBastidores
        ? []
        : [
            // A foto não existe no servidor de imagens: o cartão tem de cair nas iniciais.
            { id: 900, name: 'Diretora Teste', job: 'Director', profile_path: '/diretora-inexistente.jpg' },
            { id: 900, name: 'Diretora Teste', job: 'Screenplay', profile_path: '/diretora-inexistente.jpg' },
            { id: 901, name: 'Roteirista Dois', job: 'Writer', profile_path: null },
            { id: 902, name: 'Fotógrafo Teste', job: 'Director of Photography', profile_path: null },
            { id: 903, name: 'Montador', job: 'Editor', profile_path: null },
            { id: 904, name: 'Figurinista Teste', job: 'Costume Design', profile_path: null },
          ],
    },
```
E no começo da função `detalhes(id)`, antes do `return`:
```js
  // Filme sem equipe nem imagens: as seções Visão & Construção e Imagens não aparecem.
  const semBastidores = id === 1005
```

- [ ] **Step 8: Conferir e commitar**

Run: `npx vitest run` e `npm run typecheck`
Expected: PASS nos dois.

```powershell
git add lib/tmdb/equipe.ts lib/tmdb/equipe.test.ts lib/tmdb/tipos.ts lib/tmdb/detalhes.ts lib/tmdb/detalhes.test.ts lib/formatar.ts lib/formatar.test.ts e2e/mock-tmdb/dados.mjs
git commit -m "feat: equipe da Visão & Construção nos dados do filme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Imagens nos dados do filme e layout do mosaico

**Files:**
- Create: `lib/mosaico.ts`, `lib/mosaico.test.ts`
- Modify: `lib/tmdb/tipos.ts`, `lib/tmdb/detalhes.ts`, `lib/tmdb/detalhes.test.ts`, `e2e/mock-tmdb/dados.mjs`

**Interfaces:**
- Consumes: `imageUrl` (`lib/tmdb/imagens.ts`); `semBastidores` em `detalhes(id)` do mock (Task 1).
- Produces:
  - `type ImagemFilme = { media: string; grande: string }` em `lib/tmdb/tipos.ts`
  - `MovieDetails.images: ImagemFilme[]`
  - `MAX_IMAGENS = 20` em `lib/tmdb/detalhes.ts`
  - `NO_MOSAICO = 5` e `classesMosaico(quantidade: number): { grade: string; itens: string[] }` em `lib/mosaico.ts`
  - Mock: todo filme (menos o 1005) tem 7 cenas sem texto e 1 com texto.

- [ ] **Step 1: Testes das imagens e do mosaico (falhando)**

Em `lib/tmdb/detalhes.test.ts`:

1. No teste `'pede tudo numa única chamada com append_to_response'`, troque o `toEqual` por:
```ts
    expect(chamada[1]).toEqual({
      append_to_response: 'videos,credits,recommendations,watch/providers,images',
      include_video_language: 'pt,en,null',
      include_image_language: 'null',
    })
```
2. Em `COMPLETO`, acrescente:
```ts
  images: {
    backdrops: [
      { file_path: '/c1.jpg', iso_639_1: null },
      { file_path: '/com-texto.jpg', iso_639_1: 'en' },
      { file_path: '/c2.jpg', iso_639_1: null },
      { file_path: null, iso_639_1: null },
    ],
  },
```
3. Novos testes dentro de `describe('getMovieDetails', ...)`:
```ts
  it('usa só as cenas sem texto, em w780 e w1280', async () => {
    responderCom(COMPLETO)
    expect((await getMovieDetails(603))!.images).toEqual([
      { media: 'https://image.tmdb.org/t/p/w780/c1.jpg', grande: 'https://image.tmdb.org/t/p/w1280/c1.jpg' },
      { media: 'https://image.tmdb.org/t/p/w780/c2.jpg', grande: 'https://image.tmdb.org/t/p/w1280/c2.jpg' },
    ])
  })

  it('limita a galeria a 20 imagens', async () => {
    const backdrops = Array.from({ length: 30 }, (_, i) => ({ file_path: `/c${i}.jpg`, iso_639_1: null }))
    responderCom({ ...COMPLETO, images: { backdrops } })
    expect((await getMovieDetails(603))!.images).toHaveLength(20)
  })
```
4. No teste `'aceita filme sem vídeos, elenco, ...'`, acrescente `images: [],` depois de `crew: [],`.

`lib/mosaico.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { classesMosaico, NO_MOSAICO } from './mosaico'

describe('classesMosaico', () => {
  it('nunca passa de 5 itens', () => {
    expect(classesMosaico(20).itens).toHaveLength(NO_MOSAICO)
  })

  it.each([1, 2, 3, 4, 5])('com %i imagem(ns) gera um item por imagem', (n) => {
    expect(classesMosaico(n).itens).toHaveLength(n)
  })

  it('no celular a primeira ocupa a largura toda', () => {
    for (const n of [1, 2, 3, 4, 5]) expect(classesMosaico(n).itens[0].split(' ')).toContain('col-span-2')
  })

  it('no celular, sobra ímpar depois da primeira: a última ocupa a largura toda (sem buraco)', () => {
    expect(classesMosaico(2).itens[1].split(' ')).toContain('col-span-2')
    expect(classesMosaico(4).itens[3].split(' ')).toContain('col-span-2')
    expect(classesMosaico(3).itens[2].split(' ')).not.toContain('col-span-2')
    expect(classesMosaico(5).itens[4].split(' ')).not.toContain('col-span-2')
  })

  it('no computador, com 3 ou 5 a primeira ocupa duas linhas; com 4 ela fica sozinha no alto', () => {
    expect(classesMosaico(3).itens[0]).toContain('md:row-span-2')
    expect(classesMosaico(5).itens[0]).toContain('md:row-span-2')
    expect(classesMosaico(4).itens[0]).toContain('md:col-span-3')
  })

  it('no computador, quem ocupa duas colunas no celular volta a uma (2 e 4 imagens)', () => {
    expect(classesMosaico(2).itens.every((c) => c.includes('md:col-span-1'))).toBe(true)
    expect(classesMosaico(4).itens[3]).toContain('md:col-span-1')
  })

  it('com zero imagens não gera itens', () => {
    expect(classesMosaico(0).itens).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run lib/tmdb/detalhes.test.ts lib/mosaico.test.ts`
Expected: FAIL — parâmetros sem `images`, `images` indefinido e `Cannot find module './mosaico'`.

- [ ] **Step 3: Implementar**

Em `lib/tmdb/tipos.ts`, depois de `MembroEquipe`:
```ts
export type ImagemFilme = { media: string; grande: string }
```
E em `MovieDetails`, depois de `crew`:
```ts
  /** Cenas sem texto para a galeria: w780 no mosaico, w1280 na tela cheia. */
  images: ImagemFilme[]
```

Em `lib/tmdb/detalhes.ts`:
1. Acrescente `ImagemFilme` ao import de tipos.
2. Depois de `export const MAX_ELENCO = 15`:
```ts
export const MAX_IMAGENS = 20
```
3. Novo tipo bruto, junto dos outros:
```ts
type ImagemBruta = { file_path?: string | null; iso_639_1?: string | null }
```
4. Em `TmdbDetalhesBruto`, acrescente:
```ts
  images?: { backdrops?: ImagemBruta[] }
```
5. Troque os parâmetros da chamada:
```ts
      {
        append_to_response: 'videos,credits,recommendations,watch/providers,images',
        include_video_language: 'pt,en,null',
        // Só cenas sem texto por cima (sem título, sem logo de estúdio).
        include_image_language: 'null',
      },
```
6. No objeto devolvido, depois de `crew`:
```ts
    images: normalizarImagens(bruto.images?.backdrops ?? []),
```
7. Nova função, depois de `normalizarElenco`:
```ts
function normalizarImagens(cenas: ImagemBruta[]): ImagemFilme[] {
  return cenas
    .filter((c): c is ImagemBruta & { file_path: string } => !c.iso_639_1 && Boolean(c.file_path))
    .slice(0, MAX_IMAGENS)
    .map((c) => ({ media: imageUrl(c.file_path, 'w780')!, grande: imageUrl(c.file_path, 'w1280')! }))
}
```

`lib/mosaico.ts`:
```ts
export const NO_MOSAICO = 5

// Classes completas escritas por extenso: o Tailwind só gera o que encontra no código.
const GRADE: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3 md:grid-rows-2',
  4: 'md:grid-cols-3',
  5: 'md:grid-cols-4 md:grid-rows-2',
}

const PRIMEIRA: Record<number, string> = {
  1: 'md:col-span-1 md:aspect-[21/9]',
  2: 'md:col-span-1',
  3: 'md:col-span-2 md:row-span-2 md:aspect-auto',
  4: 'md:col-span-3 md:aspect-[21/9]',
  5: 'md:col-span-2 md:row-span-2 md:aspect-auto',
}

/**
 * Celular: grade de 2 colunas, a primeira imagem na largura toda e, se sobrar uma ímpar no fim,
 * ela também. Computador: um arranjo por quantidade, sempre sem buraco.
 */
export function classesMosaico(quantidade: number): { grade: string; itens: string[] } {
  const n = Math.min(Math.max(quantidade, 0), NO_MOSAICO)
  if (n === 0) return { grade: '', itens: [] }
  const ultimaSobra = (n - 1) % 2 === 1
  const itens = Array.from({ length: n }, (_, i) => {
    if (i === 0) return `aspect-video col-span-2 ${PRIMEIRA[n]}`
    if (i === n - 1 && ultimaSobra) return 'aspect-video col-span-2 md:col-span-1'
    return 'aspect-video'
  })
  return { grade: `grid grid-cols-2 gap-2 ${GRADE[n]}`, itens }
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run lib`
Expected: PASS.

- [ ] **Step 5: Imagens no TMDB simulado**

Em `e2e/mock-tmdb/dados.mjs`, dentro do objeto devolvido por `detalhes(id)`, depois de `credits`:
```js
    images: {
      backdrops: semBastidores
        ? []
        : [
            ...Array.from({ length: 7 }, (_, i) => ({ file_path: `/cena-${id}-${i + 1}.jpg`, iso_639_1: null })),
            { file_path: `/cena-${id}-com-texto.jpg`, iso_639_1: 'pt' },
          ],
    },
```

- [ ] **Step 6: Conferir e commitar**

Run: `npx vitest run` e `npm run typecheck`
Expected: PASS.

```powershell
git add lib/mosaico.ts lib/mosaico.test.ts lib/tmdb/tipos.ts lib/tmdb/detalhes.ts lib/tmdb/detalhes.test.ts e2e/mock-tmdb/dados.mjs
git commit -m "feat: cenas do filme nos dados e layout do mosaico" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Seção Visão & Construção na página do filme

**Files:**
- Create: `components/VisaoConstrucao.tsx`, `e2e/bastidores.spec.ts`
- Modify: `app/filme/[id]/page.tsx`

**Interfaces:**
- Consumes: `MovieDetails.crew` (Task 1), `iniciais` (Task 1). Mock: filme `1001` com equipe; `1005` sem.
- Produces: `<VisaoConstrucao equipe={MembroEquipe[]} />` — região com nome acessível `Visão & Construção`; cada cartão é um `listitem`.

- [ ] **Step 1: Teste ponta a ponta (falhando)**

`e2e/bastidores.spec.ts`:
```ts
import { expect, test } from './conta/fixtures'

test.describe('Visão & Construção', () => {
  test('mostra a equipe acima do Elenco, juntando funções da mesma pessoa', async ({ page }) => {
    await page.goto('/filme/1001')
    const secao = page.getByRole('region', { name: 'Visão & Construção' })
    await expect(secao.getByText('Quem fez o filme por trás das câmeras')).toBeVisible()

    const diretora = secao.getByRole('listitem').filter({ hasText: 'Diretora Teste' })
    await expect(diretora.getByText('Direção · Roteiro')).toBeVisible()
    await expect(secao.getByRole('listitem')).toHaveCount(4)
    await expect(secao.getByText('Figurinista Teste')).toHaveCount(0)

    const elenco = page.getByRole('region', { name: 'Elenco principal' })
    const topoSecao = (await secao.boundingBox())!.y
    const topoElenco = (await elenco.boundingBox())!.y
    expect(topoSecao).toBeLessThan(topoElenco)
  })

  test('sem foto, ou com foto que não carrega, mostra as iniciais', async ({ page }) => {
    await page.goto('/filme/1001')
    const secao = page.getByRole('region', { name: 'Visão & Construção' })
    await expect(secao.getByRole('listitem').filter({ hasText: 'Fotógrafo Teste' }).getByText('FT', { exact: true })).toBeVisible()
    // A foto simulada da diretora dá 404: o cartão troca para as iniciais.
    await expect(secao.getByRole('listitem').filter({ hasText: 'Diretora Teste' }).getByText('DT', { exact: true })).toBeVisible()
  })

  test('filme sem equipe não mostra a seção', async ({ page }) => {
    await page.goto('/filme/1005')
    await expect(page.getByRole('region', { name: 'Elenco principal' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Visão & Construção' })).toHaveCount(0)
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx playwright test e2e/bastidores.spec.ts --project=desktop`
Expected: FAIL — a região "Visão & Construção" não existe (o terceiro teste já passa, e isso é esperado).

- [ ] **Step 3: Implementar o componente**

`components/VisaoConstrucao.tsx`:
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { iniciais } from '@/lib/formatar'
import type { MembroEquipe } from '@/lib/tmdb/tipos'

export function VisaoConstrucao({ equipe }: { equipe: MembroEquipe[] }) {
  return (
    <section aria-labelledby="visao-titulo" className="space-y-4">
      <div>
        <h2 id="visao-titulo" className="text-xl font-bold md:text-2xl">
          Visão &amp; Construção
        </h2>
        <p className="mt-1 text-sm text-white/60">Quem fez o filme por trás das câmeras</p>
      </div>
      <ul className="sem-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        {equipe.map((pessoa) => (
          <li key={pessoa.id} className="w-28 shrink-0 text-center md:w-32">
            <FotoOuIniciais nome={pessoa.name} src={pessoa.profileUrl} />
            <p className="mt-2 line-clamp-2 text-sm font-semibold">{pessoa.name}</p>
            <p className="line-clamp-2 text-xs text-white/60">{pessoa.funcoes.join(' · ')}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

const CIRCULO = 'mx-auto aspect-square w-20 rounded-full bg-superficie ring-1 ring-white/10 md:w-24'

function FotoOuIniciais({ nome, src }: { nome: string; src: string | null }) {
  const [falhou, setFalhou] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Uma foto que falhou antes da hidratação não dispara o onError: confere na montagem.
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) setFalhou(true)
  }, [])

  if (!src || falhou) {
    return (
      <div aria-hidden="true" className={`${CIRCULO} flex items-center justify-center text-xl font-extrabold text-white/60`}>
        {iniciais(nome)}
      </div>
    )
  }
  // alt vazio: o nome já está escrito logo abaixo. Sem loading="lazy": imagem adiada também tem
  // naturalWidth 0, e a conferência acima a confundiria com uma foto quebrada. São no máximo 12.
  return <img ref={imgRef} src={src} alt="" onError={() => setFalhou(true)} className={`${CIRCULO} object-cover`} />
}
```

- [ ] **Step 4: Ligar na página, na ordem da spec**

Em `app/filme/[id]/page.tsx`:
1. Import: `import { VisaoConstrucao } from '@/components/VisaoConstrucao'`.
2. Troque o conteúdo da `<div className={`${CONTEUDO} space-y-12 pb-8`}>` por:
```tsx
        <BlocoAvaliacao filme={salvo} inicial={avaliacao} />
        <OndeAssistir provedores={filme.watchProviders} />
        {filme.crew.length > 0 && <VisaoConstrucao equipe={filme.crew} />}
        {filme.cast.length > 0 && <Elenco elenco={filme.cast} />}
```

- [ ] **Step 5: Rodar para ver passar**

Run: `npm run typecheck` e `npx playwright test e2e/bastidores.spec.ts e2e/filme.spec.ts`
Expected: PASS no desktop e no celular.

- [ ] **Step 6: Commit**

```powershell
git add components/VisaoConstrucao.tsx "app/filme" e2e/bastidores.spec.ts
git commit -m "feat: seção Visão & Construção na página do filme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Galeria de imagens com tela cheia

**Files:**
- Create: `components/usePrenderFoco.ts`, `components/GaleriaImagens.tsx`
- Modify: `app/filme/[id]/page.tsx`, `e2e/bastidores.spec.ts`

**Interfaces:**
- Consumes: `MovieDetails.images`, `classesMosaico`, `NO_MOSAICO` (Task 2); `IconeFechar`, `IconeSetaEsquerda`, `IconeSetaDireita` (`components/Icones.tsx`). Mock: 7 cenas no `1001`, nenhuma no `1005`.
- Produces:
  - `usePrenderFoco(ref: RefObject<HTMLElement | null>): void` — prende o Tab dentro do elemento enquanto montado. Usado também na Task 6.
  - `<GaleriaImagens imagens={ImagemFilme[]} titulo={string} />` — região `Imagens`; botões `Cena {n} de {título}`; tela cheia `role="dialog"` com nome `Imagens de {título}`.

- [ ] **Step 1: Testes ponta a ponta (falhando)**

Acrescente ao fim de `e2e/bastidores.spec.ts`:
```ts
test.describe('Galeria de imagens', () => {
  const galeria = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Imagens', exact: true })
  const telaCheia = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Imagens de Filme Teste 1001' })

  test('mosaico com 5 quadros e "+3" no último', async ({ page }) => {
    await page.goto('/filme/1001')
    await expect(galeria(page).getByRole('button')).toHaveCount(5)
    await expect(galeria(page).getByText('+3')).toBeVisible()
    await expect(page.getByAltText('Cena 1 de Filme Teste 1001')).toBeVisible()
  })

  test('abre na imagem clicada, troca com setas e teclado, volta ao início e fecha com Esc', async ({ page }) => {
    await page.goto('/filme/1001')
    const segunda = galeria(page).getByRole('button', { name: 'Cena 2 de Filme Teste 1001' })
    await segunda.click()
    await expect(telaCheia(page).getByText('2 de 7')).toBeVisible()

    await page.keyboard.press('ArrowRight')
    await expect(telaCheia(page).getByText('3 de 7')).toBeVisible()
    await telaCheia(page).getByRole('button', { name: 'Imagem anterior' }).click()
    await expect(telaCheia(page).getByText('2 de 7')).toBeVisible()

    for (let i = 0; i < 6; i++) await telaCheia(page).getByRole('button', { name: 'Próxima imagem' }).click()
    await expect(telaCheia(page).getByText('1 de 7')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(telaCheia(page)).toHaveCount(0)
    await expect(segunda).toBeFocused()
  })

  test('o "+3" abre a galeria a partir da quinta imagem', async ({ page }) => {
    await page.goto('/filme/1001')
    await galeria(page).getByRole('button', { name: /Cena 5 de Filme Teste 1001/ }).click()
    await expect(telaCheia(page).getByText('5 de 7')).toBeVisible()
    await telaCheia(page).getByRole('button', { name: 'Fechar' }).click()
    await expect(telaCheia(page)).toHaveCount(0)
  })

  test('Tab não escapa da tela cheia', async ({ page }) => {
    await page.goto('/filme/1001')
    await galeria(page).getByRole('button', { name: 'Cena 1 de Filme Teste 1001' }).click()
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      const dentro = await telaCheia(page).evaluate((el) => el.contains(document.activeElement))
      expect(dentro).toBe(true)
    }
  })

  test('filme sem imagens não mostra a galeria', async ({ page }) => {
    await page.goto('/filme/1005')
    await expect(page.getByRole('region', { name: 'Elenco principal' })).toBeVisible()
    await expect(galeria(page)).toHaveCount(0)
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx playwright test e2e/bastidores.spec.ts --project=desktop -g "Galeria"`
Expected: FAIL — a região "Imagens" não existe (o teste do filme 1005 já passa).

- [ ] **Step 3: Implementar o foco preso**

`components/usePrenderFoco.ts`:
```ts
'use client'

import { useEffect, type RefObject } from 'react'

const FOCAVEIS = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Enquanto a janela está montada, Tab e Shift+Tab circulam só pelos controles dela.
export function usePrenderFoco(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return
      const focaveis = [...ref.current.querySelectorAll<HTMLElement>(FOCAVEIS)]
      if (focaveis.length === 0) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      const dentro = ref.current.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === primeiro || !dentro)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (document.activeElement === ultimo || !dentro)) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [ref])
}
```

- [ ] **Step 4: Implementar a galeria**

`components/GaleriaImagens.tsx`:
```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { classesMosaico, NO_MOSAICO } from '@/lib/mosaico'
import type { ImagemFilme } from '@/lib/tmdb/tipos'
import { IconeFechar, IconeSetaDireita, IconeSetaEsquerda } from './Icones'
import { usePrenderFoco } from './usePrenderFoco'

export function GaleriaImagens({ imagens, titulo }: { imagens: ImagemFilme[]; titulo: string }) {
  const [aberta, setAberta] = useState<number | null>(null)
  const origemRef = useRef<HTMLButtonElement | null>(null)
  const { grade, itens } = classesMosaico(imagens.length)
  const escondidas = imagens.length - (NO_MOSAICO - 1)

  const abrir = (indice: number, botao: HTMLButtonElement) => {
    origemRef.current = botao
    setAberta(indice)
  }
  const fechar = useCallback(() => {
    setAberta(null)
    origemRef.current?.focus()
  }, [])

  return (
    <section aria-labelledby="imagens-titulo" className="space-y-4">
      <h2 id="imagens-titulo" className="text-xl font-bold md:text-2xl">
        Imagens
      </h2>
      <div className={grade}>
        {itens.map((classe, i) => {
          const comMais = i === NO_MOSAICO - 1 && imagens.length > NO_MOSAICO
          return (
            <button
              key={imagens[i].media}
              type="button"
              onClick={(e) => abrir(i, e.currentTarget)}
              className={`${classe} relative overflow-hidden rounded-lg bg-superficie focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
            >
              <img src={imagens[i].media} alt={`Cena ${i + 1} de ${titulo}`} loading="lazy" className="h-full w-full object-cover" />
              {comMais && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-extrabold">
                  +{escondidas}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {aberta !== null && (
        <TelaCheia imagens={imagens} titulo={titulo} indice={aberta} aoMudar={setAberta} aoFechar={fechar} />
      )}
    </section>
  )
}

type PropsTelaCheia = {
  imagens: ImagemFilme[]
  titulo: string
  indice: number
  aoMudar: (indice: number) => void
  aoFechar: () => void
}

function TelaCheia({ imagens, titulo, indice, aoMudar, aoFechar }: PropsTelaCheia) {
  const caixaRef = useRef<HTMLDivElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const toqueRef = useRef<number | null>(null)
  usePrenderFoco(caixaRef)

  const total = imagens.length
  const anterior = useCallback(() => aoMudar((indice - 1 + total) % total), [aoMudar, indice, total])
  const proxima = useCallback(() => aoMudar((indice + 1) % total), [aoMudar, indice, total])

  useEffect(() => {
    fecharRef.current?.focus()
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowAnterior
    }
  }, [])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
      else if (e.key === 'ArrowLeft') anterior()
      else if (e.key === 'ArrowRight') proxima()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aoFechar, anterior, proxima])

  const botao = 'rounded-full bg-black/60 p-2 text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

  return (
    <div
      ref={caixaRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Imagens de ${titulo}`}
      onClick={aoFechar}
      onTouchStart={(e) => {
        toqueRef.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (toqueRef.current === null) return
        const deslocamento = e.changedTouches[0].clientX - toqueRef.current
        toqueRef.current = null
        if (deslocamento > 50) anterior()
        else if (deslocamento < -50) proxima()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
    >
      <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <img src={imagens[indice].grande} alt={`Cena ${indice + 1} de ${titulo}`} className="max-h-[80vh] w-full rounded-lg object-contain" />
        <p className="mt-3 text-center text-sm text-white/70">
          {indice + 1} de {total}
        </p>
        <button ref={fecharRef} type="button" aria-label="Fechar" onClick={aoFechar} className={`${botao} absolute -top-12 right-0`}>
          <IconeFechar className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Imagem anterior" onClick={anterior} className={`${botao} absolute left-2 top-1/2 -translate-y-1/2`}>
          <IconeSetaEsquerda className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Próxima imagem" onClick={proxima} className={`${botao} absolute right-2 top-1/2 -translate-y-1/2`}>
          <IconeSetaDireita className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
```

> O selo `+N` segue a spec: N = total − 4, porque a quinta imagem fica escondida atrás dele. Com 7 imagens, `+3`. Só aparece com 6 ou mais imagens.

- [ ] **Step 5: Ligar na página**

Em `app/filme/[id]/page.tsx`:
1. Import: `import { GaleriaImagens } from '@/components/GaleriaImagens'`.
2. Depois da linha do `<Elenco ...>`, dentro da mesma `<div>`:
```tsx
        {filme.images.length > 0 && <GaleriaImagens imagens={filme.images} titulo={filme.title} />}
```

- [ ] **Step 6: Rodar para ver passar**

Run: `npm run typecheck` e `npx playwright test e2e/bastidores.spec.ts e2e/filme.spec.ts`
Expected: PASS no desktop e no celular.

- [ ] **Step 7: Commit**

```powershell
git add components/usePrenderFoco.ts components/GaleriaImagens.tsx "app/filme" e2e/bastidores.spec.ts
git commit -m "feat: galeria de imagens em mosaico com tela cheia" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Sorteio do Fure a bolha

**Files:**
- Create: `lib/tmdb/joia.ts`, `lib/tmdb/joia.test.ts`
- Modify: `lib/tmdb/tipos.ts`

**Interfaces:**
- Consumes: `tmdbFetch`, `TmdbError` (`lib/tmdb/client.ts`); `normalizarResumo` (`lib/tmdb/normalizar.ts`); `CACHE_LISTAS_SEGUNDOS` (`lib/tmdb/config.ts`).
- Produces:
  - `type Joia = { id: number; title: string; year: string | null; posterUrl: string | null; overview: string; rating: number | null; idioma: string; pais: string | null }` em `lib/tmdb/tipos.ts`
  - `sortearJoia(evitar: number | null, aleatorio?: () => number): Promise<Joia>` — lança `TmdbError` se 3 idiomas não renderem filme; propaga erros do TMDB.
  - `IDIOMAS_JOIA`, `NOTA_MINIMA_JOIA = 7.5`, `VOTOS_MINIMOS_JOIA = 200`, `nomeIdioma(codigo: string): string`, `nomePais(codigo: string | undefined): string | null`

- [ ] **Step 1: Testes (falhando)**

`lib/tmdb/joia.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', async () => {
  const real = await vi.importActual<typeof import('./client')>('./client')
  return { TmdbError: real.TmdbError, tmdbFetch: vi.fn() }
})

import { tmdbFetch, TmdbError } from './client'
import { IDIOMAS_JOIA, nomeIdioma, nomePais, sortearJoia } from './joia'

const tmdbFetchMock = vi.mocked(tmdbFetch)

const filme = (id: number) => ({
  id,
  title: `Joia ${id}`,
  overview: `Sinopse ${id}.`,
  poster_path: `/p${id}.jpg`,
  release_date: '2006-07-27',
  vote_average: 7.62,
  vote_count: 900,
})

// Sequência fixa de "sorteios": cada chamada devolve o próximo número.
function sequencia(...valores: number[]) {
  let i = 0
  return () => valores[Math.min(i++, valores.length - 1)]
}

type Discover = (idioma: string, pagina: number) => { results: ReturnType<typeof filme>[]; total_pages: number }

function responder(discover: Discover, pais: string[] = ['KR']) {
  tmdbFetchMock.mockImplementation((async (caminho: string, params: Record<string, unknown>) => {
    if (caminho === '/discover/movie') {
      const { results, total_pages } = discover(String(params.with_original_language), Number(params.page))
      return { page: Number(params.page), results, total_pages, total_results: results.length * total_pages }
    }
    if (caminho.startsWith('/movie/')) return { origin_country: pais }
    throw new Error(`caminho inesperado: ${caminho}`)
  }) as typeof tmdbFetch)
}

const chamadasDiscover = () => tmdbFetchMock.mock.calls.filter(([c]) => c === '/discover/movie').map(([, p]) => p as Record<string, unknown>)

beforeEach(() => {
  tmdbFetchMock.mockReset()
})

describe('sortearJoia', () => {
  it('consulta um idioma da lista com o corte de nota e votos, e nunca inglês', async () => {
    responder(() => ({ results: [filme(1)], total_pages: 1 }))
    await sortearJoia(null, sequencia(0))
    const [params] = chamadasDiscover()
    expect(IDIOMAS_JOIA).toContain(params.with_original_language)
    expect(IDIOMAS_JOIA).not.toContain('en')
    expect(params).toMatchObject({ 'vote_average.gte': 7.5, 'vote_count.gte': 200, include_adult: false, page: 1 })
  })

  it('devolve a sugestão pronta, com idioma e país em português', async () => {
    responder(() => ({ results: [filme(7)], total_pages: 1 }))
    const joia = await sortearJoia(null, sequencia(IDIOMAS_JOIA.indexOf('ko') / IDIOMAS_JOIA.length, 0, 0))
    expect(joia).toEqual({
      id: 7,
      title: 'Joia 7',
      year: '2006',
      posterUrl: 'https://image.tmdb.org/t/p/w342/p7.jpg',
      overview: 'Sinopse 7.',
      rating: 7.6,
      idioma: 'Coreano',
      pais: 'Coreia do Sul',
    })
  })

  it('sorteia a página dentro de total_pages', async () => {
    responder((_, pagina) => ({ results: [filme(100 + pagina)], total_pages: 4 }))
    const joia = await sortearJoia(null, sequencia(0, 0.99, 0))
    expect(chamadasDiscover().map((p) => p.page)).toEqual([1, 4])
    expect(joia.id).toBe(104)
  })

  it('limita a página sorteada a 500', async () => {
    responder((_, pagina) => ({ results: [filme(pagina)], total_pages: 9000 }))
    await sortearJoia(null, sequencia(0, 0.999999, 0))
    expect(chamadasDiscover()[1].page).toBe(500)
  })

  it('não repete o filme de evitar', async () => {
    responder(() => ({ results: [filme(10), filme(11)], total_pages: 1 }))
    expect((await sortearJoia(10, sequencia(0, 0, 0))).id).toBe(11)
  })

  it('idioma sem filmes leva a outro idioma', async () => {
    responder((idioma) => (idioma === IDIOMAS_JOIA[0] ? { results: [], total_pages: 0 } : { results: [filme(5)], total_pages: 1 }))
    const joia = await sortearJoia(null, sequencia(0, 0, 0, 0))
    const idiomas = chamadasDiscover().map((p) => p.with_original_language)
    expect(idiomas[0]).toBe(IDIOMAS_JOIA[0])
    expect(new Set(idiomas).size).toBe(2)
    expect(joia.id).toBe(5)
  })

  it('depois de 3 idiomas sem filme, falha com TmdbError', async () => {
    responder(() => ({ results: [], total_pages: 0 }))
    await expect(sortearJoia(null, sequencia(0))).rejects.toBeInstanceOf(TmdbError)
    expect(chamadasDiscover()).toHaveLength(3)
  })

  it('propaga a falha do TMDB', async () => {
    tmdbFetchMock.mockRejectedValue(new TmdbError('fora do ar', 500))
    await expect(sortearJoia(null)).rejects.toMatchObject({ status: 500 })
  })

  it('sem país conhecido, pais fica null', async () => {
    responder(() => ({ results: [filme(1)], total_pages: 1 }), [])
    expect((await sortearJoia(null, sequencia(0))).pais).toBeNull()
  })
})

describe('nomes em português', () => {
  it('idioma com maiúscula inicial', () => {
    expect(nomeIdioma('ja')).toBe('Japonês')
    expect(nomeIdioma('fa')).toBe('Persa')
  })

  it('cn é código só do TMDB: Cantonês', () => {
    expect(nomeIdioma('cn')).toBe('Cantonês')
  })

  it('país conhecido, desconhecido e ausente', () => {
    expect(nomePais('KR')).toBe('Coreia do Sul')
    expect(nomePais('XX')).toBeNull()
    expect(nomePais(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run lib/tmdb/joia.test.ts`
Expected: FAIL — `Cannot find module './joia'`.

- [ ] **Step 3: Implementar**

Em `lib/tmdb/tipos.ts`, depois de `ImagemFilme`:
```ts
export type Joia = {
  id: number
  title: string
  year: string | null
  posterUrl: string | null
  overview: string
  rating: number | null
  /** Já em português, ex.: "Coreano". */
  idioma: string
  /** Já em português, ex.: "Coreia do Sul"; null quando o TMDB não informa. */
  pais: string | null
}
```

`lib/tmdb/joia.ts`:
```ts
import 'server-only'
import { tmdbFetch, TmdbError } from './client'
import { CACHE_LISTAS_SEGUNDOS } from './config'
import { normalizarResumo } from './normalizar'
import type { Joia, TmdbPaginaBruta } from './tipos'

// Idiomas que rendiam ao menos 5 filmes no corte em 2026-10-01. Inglês fica de fora de propósito.
export const IDIOMAS_JOIA = ['ja', 'fr', 'it', 'es', 'ko', 'zh', 'de', 'pt', 'ru', 'sv', 'hi', 'cn', 'da', 'pl', 'tr', 'fa']
export const NOTA_MINIMA_JOIA = 7.5
export const VOTOS_MINIMOS_JOIA = 200
const TENTATIVAS = 3
const LIMITE_PAGINAS = 500

const IDIOMAS_SO_DO_TMDB: Record<string, string> = { cn: 'Cantonês' }

const maiuscula = (texto: string) => texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)

export function nomeIdioma(codigo: string): string {
  if (IDIOMAS_SO_DO_TMDB[codigo]) return IDIOMAS_SO_DO_TMDB[codigo]
  try {
    return maiuscula(new Intl.DisplayNames('pt-BR', { type: 'language' }).of(codigo) ?? codigo)
  } catch {
    return codigo
  }
}

export function nomePais(codigo: string | undefined): string | null {
  if (!codigo) return null
  try {
    const nome = new Intl.DisplayNames('pt-BR', { type: 'region' }).of(codigo)
    // Código desconhecido volta igual: não é um nome.
    return nome && nome !== codigo ? nome : null
  } catch {
    return null
  }
}

const indice = (tamanho: number, aleatorio: () => number) => Math.min(Math.floor(aleatorio() * tamanho), tamanho - 1)

export async function sortearJoia(evitar: number | null, aleatorio: () => number = Math.random): Promise<Joia> {
  const restantes = [...IDIOMAS_JOIA]
  for (let tentativa = 0; tentativa < TENTATIVAS && restantes.length > 0; tentativa++) {
    const idioma = restantes.splice(indice(restantes.length, aleatorio), 1)[0]
    const params = {
      with_original_language: idioma,
      'vote_average.gte': NOTA_MINIMA_JOIA,
      'vote_count.gte': VOTOS_MINIMOS_JOIA,
      include_adult: false,
      sort_by: 'vote_average.desc',
    }
    const primeira = await tmdbFetch<TmdbPaginaBruta>('/discover/movie', { ...params, page: 1 }, CACHE_LISTAS_SEGUNDOS)
    const paginas = Math.min(primeira.total_pages, LIMITE_PAGINAS)
    if (paginas < 1) continue

    const numero = 1 + indice(paginas, aleatorio)
    const pagina =
      numero === 1 ? primeira : await tmdbFetch<TmdbPaginaBruta>('/discover/movie', { ...params, page: numero }, CACHE_LISTAS_SEGUNDOS)
    const candidatos = pagina.results.filter((f) => f.id !== evitar)
    if (candidatos.length === 0) continue

    const escolhido = candidatos[indice(candidatos.length, aleatorio)]
    const detalhe = await tmdbFetch<{ origin_country?: string[] }>(`/movie/${escolhido.id}`, {}, CACHE_LISTAS_SEGUNDOS)
    const resumo = normalizarResumo(escolhido, new Map())
    return {
      id: resumo.id,
      title: resumo.title,
      year: resumo.year,
      posterUrl: resumo.posterUrl,
      overview: resumo.overview,
      rating: resumo.rating,
      idioma: nomeIdioma(idioma),
      pais: nomePais(detalhe.origin_country?.[0]),
    }
  }
  throw new TmdbError('Nenhum filme encontrado para sortear')
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run lib/tmdb/joia.test.ts`
Expected: PASS.

> O teste `'devolve a sugestão pronta…'` escolhe o coreano passando `indexOf('ko') / IDIOMAS_JOIA.length` como primeiro sorteio. Se a lista mudar de ordem, ele continua certo; se falhar, confira `indice()`.

- [ ] **Step 5: Conferir e commitar**

Run: `npx vitest run` e `npm run typecheck`
Expected: PASS.

```powershell
git add lib/tmdb/joia.ts lib/tmdb/joia.test.ts lib/tmdb/tipos.ts
git commit -m "feat: sorteio do Fure a bolha" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Fure a bolha na tela

**Files:**
- Create: `app/api/fure-a-bolha/route.ts`, `components/FureBolhaProvider.tsx`, `components/JanelaFureBolha.tsx`, `components/BotaoFureBolha.tsx`, `e2e/fure-a-bolha.spec.ts`
- Modify: `components/Icones.tsx`, `components/Navbar.tsx`, `app/layout.tsx`, `app/(inicio)/page.tsx`, `e2e/mock-tmdb/servidor.mjs`, `e2e/mock-tmdb/dados.mjs`

**Interfaces:**
- Consumes: `sortearJoia`, `Joia` (Task 5); `usePrenderFoco` (Task 4); `lerIdPositivo` (`lib/parametros.ts`); `BOTAO_PRIMARIO`, `BOTAO_SECUNDARIO`, `CONTEUDO` (`components/estilos.ts`); `ImagemComReserva`.
- Produces:
  - Rota `GET /api/fure-a-bolha?evitar={id}` → `200 Joia` ou `502 { erro: true }`.
  - `FureBolhaProvider` e `useFureBolha(): { abrir(): void }`.
  - `<BotaoFureBolha className={string} aoClicar?={() => void} />`.
  - `IconeBolha` em `components/Icones.tsx`.

- [ ] **Step 1: TMDB simulado com discover por idioma**

Em `e2e/mock-tmdb/servidor.mjs`, no começo do bloco `if (caminho === '/discover/movie') {`, antes de `const genero = ...`:
```js
      // Fure a bolha: qualquer idioma devolve 2 páginas de filmes.
      if (url.searchParams.has('with_original_language')) return responder(200, pagina(800000, numero, 2))
```
Em `e2e/mock-tmdb/dados.mjs`, no objeto devolvido por `detalhes(id)`, acrescente:
```js
    origin_country: ['KR'],
```

- [ ] **Step 2: Testes ponta a ponta (falhando)**

`e2e/fure-a-bolha.spec.ts`:
```ts
import { expect, test } from './conta/fixtures'

const janela = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Fure a bolha' })
const tituloSugerido = (page: import('@playwright/test').Page) => janela(page).getByRole('heading', { level: 3 })

test('o botão da home abre uma sugestão com idioma e país', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Um filme aclamado, longe do circuito de sempre.')).toBeVisible()
  await page.getByRole('main').getByRole('button', { name: 'Fure a bolha' }).click()
  await expect(tituloSugerido(page)).toHaveText(/Filme Teste 8000\d\d/)
  await expect(janela(page).getByText(/· Coreia do Sul/)).toBeVisible()
})

test('"Outra sugestão" troca o filme e "Ver filme" leva à página dele', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('main').getByRole('button', { name: 'Fure a bolha' }).click()
  await expect(tituloSugerido(page)).toHaveText(/Filme Teste/)
  const primeiro = await tituloSugerido(page).textContent()

  await janela(page).getByRole('button', { name: 'Outra sugestão' }).click()
  await expect(tituloSugerido(page)).not.toHaveText(primeiro!)
  // O título traz " · {ano}"; o h1 da página do filme é só o nome.
  const segundo = (await tituloSugerido(page).textContent())!.split(' · ')[0]

  await janela(page).getByRole('link', { name: 'Ver filme' }).click()
  await expect(page.getByRole('heading', { level: 1, name: segundo })).toBeVisible()
  await expect(janela(page)).toHaveCount(0)
})

test('enquanto carrega, os botões ficam desabilitados', async ({ page }) => {
  await page.route('**/api/fure-a-bolha**', async (rota) => {
    await new Promise((r) => setTimeout(r, 1500))
    await rota.continue()
  })
  await page.goto('/')
  await page.getByRole('main').getByRole('button', { name: 'Fure a bolha' }).click()
  await expect(janela(page).getByRole('button', { name: 'Outra sugestão' })).toBeDisabled()
  await expect(tituloSugerido(page)).toHaveText(/Filme Teste/)
  await expect(janela(page).getByRole('button', { name: 'Outra sugestão' })).toBeEnabled()
})

test('falha no sorteio mostra o erro e "Tentar de novo" recupera', async ({ page }) => {
  await page.route('**/api/fure-a-bolha**', (rota) => rota.fulfill({ status: 502, contentType: 'application/json', body: '{"erro":true}' }))
  await page.goto('/')
  await page.getByRole('main').getByRole('button', { name: 'Fure a bolha' }).click()
  await expect(janela(page).getByText('Não foi possível sortear um filme agora.')).toBeVisible()

  await page.unroute('**/api/fure-a-bolha**')
  await janela(page).getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(tituloSugerido(page)).toHaveText(/Filme Teste/)
})

test('o menu abre a janela, inclusive no celular, e Esc fecha', async ({ page, isMobile }) => {
  await page.goto('/filme/1001')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Fure a bolha' }).click()
  await expect(janela(page)).toBeVisible()
  await expect(tituloSugerido(page)).toHaveText(/Filme Teste/)
  await page.keyboard.press('Escape')
  await expect(janela(page)).toHaveCount(0)
})
```

- [ ] **Step 3: Rodar para ver falhar**

Run: `npx playwright test e2e/fure-a-bolha.spec.ts --project=desktop`
Expected: FAIL — não há botão "Fure a bolha".

- [ ] **Step 4: Implementar a rota**

`app/api/fure-a-bolha/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { lerIdPositivo } from '@/lib/parametros'
import { sortearJoia } from '@/lib/tmdb/joia'

export async function GET(request: Request) {
  const evitar = lerIdPositivo(new URL(request.url).searchParams.get('evitar'))
  try {
    // Cada pedido é um sorteio novo: nada de cache na resposta.
    return NextResponse.json(await sortearJoia(evitar), { headers: { 'Cache-Control': 'no-store' } })
  } catch (falha) {
    console.error('[CineTeca] /api/fure-a-bolha falhou:', falha instanceof Error ? falha.name : 'desconhecido')
    return NextResponse.json({ erro: true }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
```

- [ ] **Step 5: Ícone, provider, janela e botão**

Em `components/Icones.tsx`, depois de `IconeNaoCurti`:
```tsx
export const IconeBolha = ({ className }: Props) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="8" />
    <path d="M8.5 10a4 4 0 0 1 3-3" />
    <path d="M19 5l2-2M21 7h-1.5M17 3V1.5" />
  </svg>
)
```

`components/FureBolhaProvider.tsx`:
```tsx
'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { JanelaFureBolha } from './JanelaFureBolha'

type ValorFureBolha = { abrir(): void }

const ContextoFureBolha = createContext<ValorFureBolha | null>(null)

// A janela mora aqui, e não no botão: o menu do celular desmonta ao fechar e levaria a janela junto.
export function FureBolhaProvider({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState(false)
  const fechar = useCallback(() => setAberta(false), [])
  const valor = useMemo(() => ({ abrir: () => setAberta(true) }), [])
  return (
    <ContextoFureBolha.Provider value={valor}>
      {children}
      {aberta && <JanelaFureBolha aoFechar={fechar} />}
    </ContextoFureBolha.Provider>
  )
}

export function useFureBolha(): ValorFureBolha {
  const valor = useContext(ContextoFureBolha)
  if (!valor) throw new Error('useFureBolha precisa do FureBolhaProvider')
  return valor
}
```

`components/JanelaFureBolha.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Joia } from '@/lib/tmdb/tipos'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos'
import { IconeFechar } from './Icones'
import { ImagemComReserva } from './ImagemComReserva'
import { usePrenderFoco } from './usePrenderFoco'

type Estado = { tipo: 'carregando' } | { tipo: 'pronto'; joia: Joia } | { tipo: 'erro' }

export function JanelaFureBolha({ aoFechar }: { aoFechar: () => void }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const ultimaRef = useRef<number | null>(null)
  const caixaRef = useRef<HTMLDivElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  usePrenderFoco(caixaRef)

  const buscar = useCallback(async () => {
    try {
      const evitar = ultimaRef.current ? `?evitar=${ultimaRef.current}` : ''
      const resposta = await fetch(`/api/fure-a-bolha${evitar}`, { cache: 'no-store' })
      if (!resposta.ok) throw new Error(String(resposta.status))
      const joia = (await resposta.json()) as Joia
      ultimaRef.current = joia.id
      setEstado({ tipo: 'pronto', joia })
    } catch {
      setEstado({ tipo: 'erro' })
    }
  }, [])

  const sortearDeNovo = () => {
    setEstado({ tipo: 'carregando' })
    void buscar()
  }

  useEffect(() => {
    void buscar()
  }, [buscar])

  useEffect(() => {
    fecharRef.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aoFechar])

  const carregando = estado.tipo === 'carregando'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-fure-bolha"
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        ref={caixaRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-xl bg-superficie p-6 shadow-2xl ring-1 ring-white/10"
      >
        <button
          ref={fecharRef}
          type="button"
          aria-label="Fechar"
          onClick={aoFechar}
          className="absolute right-3 top-3 rounded p-1 text-white/60 hover:text-white"
        >
          <IconeFechar />
        </button>
        <h2 id="titulo-fure-bolha" className="pr-6 text-xl font-extrabold">
          Fure a bolha
        </h2>

        {estado.tipo === 'erro' ? (
          <div className="mt-6 space-y-4">
            <p className="text-white/80">Não foi possível sortear um filme agora.</p>
            <button type="button" onClick={sortearDeNovo} className={BOTAO_PRIMARIO}>
              Tentar de novo
            </button>
          </div>
        ) : (
          <>
            {estado.tipo === 'pronto' ? (
              <Sugestao joia={estado.joia} />
            ) : (
              <div aria-hidden="true" className="mt-5 flex gap-4">
                <div className="aspect-[2/3] w-28 shrink-0 rounded-md bg-white/10 motion-safe:animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-3/4 rounded bg-white/10 motion-safe:animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-white/10 motion-safe:animate-pulse" />
                  <div className="h-16 rounded bg-white/10 motion-safe:animate-pulse" />
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {estado.tipo === 'pronto' ? (
                <Link href={`/filme/${estado.joia.id}`} onClick={aoFechar} className={BOTAO_PRIMARIO}>
                  Ver filme
                </Link>
              ) : (
                <button type="button" disabled className={`${BOTAO_PRIMARIO} opacity-60`}>
                  Ver filme
                </button>
              )}
              <button type="button" onClick={sortearDeNovo} disabled={carregando} className={`${BOTAO_SECUNDARIO} disabled:opacity-60`}>
                Outra sugestão
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Sugestao({ joia }: { joia: Joia }) {
  const origem = [joia.idioma, joia.pais].filter(Boolean).join(' · ')
  return (
    <div className="mt-5 flex gap-4">
      <ImagemComReserva src={joia.posterUrl} reserva="/poster-padrao.svg" alt={`Pôster de ${joia.title}`} className="aspect-[2/3] w-28 shrink-0 rounded-md object-cover" />
      <div className="min-w-0 space-y-1">
        <h3 className="text-lg font-bold leading-tight">
          {joia.title}
          {joia.year && <span className="font-normal text-white/60"> · {joia.year}</span>}
        </h3>
        <p className="text-sm text-white/80">{origem}</p>
        {joia.rating !== null && <p className="text-sm text-white/80">★ {joia.rating.toFixed(1).replace('.', ',')}</p>}
        <p className="line-clamp-4 text-sm text-white/70">{joia.overview}</p>
      </div>
    </div>
  )
}
```

`components/BotaoFureBolha.tsx`:
```tsx
'use client'

import { useFureBolha } from './FureBolhaProvider'
import { IconeBolha } from './Icones'

export function BotaoFureBolha({ className, aoClicar }: { className: string; aoClicar?: () => void }) {
  const { abrir } = useFureBolha()
  return (
    <button
      type="button"
      onClick={() => {
        aoClicar?.()
        abrir()
      }}
      className={className}
    >
      <IconeBolha className="h-5 w-5" /> Fure a bolha
    </button>
  )
}
```

- [ ] **Step 6: Ligar no layout, no menu e na home**

`app/layout.tsx`:
1. Import: `import { FureBolhaProvider } from '@/components/FureBolhaProvider'`.
2. Envolva `Navbar`, `main` e `Rodape`:
```tsx
              <TrilhaSonoraProvider>
                <FureBolhaProvider>
                  <Navbar generos={generos} usuario={usuario} />
                  <main className="min-h-screen">{children}</main>
                  <Rodape />
                </FureBolhaProvider>
              </TrilhaSonoraProvider>
```

`components/Navbar.tsx`:
1. Import: `import { BotaoFureBolha } from './BotaoFureBolha'`.
2. No menu do computador, depois do `<li>` de "Mais curtidos":
```tsx
            <li>
              <BotaoFureBolha className="flex items-center gap-1.5 text-white/80 transition-colors hover:text-white" />
            </li>
```
3. No menu do celular, depois do `<li>` de "Mais curtidos":
```tsx
              <li>
                <BotaoFureBolha className="flex w-full items-center gap-2 py-3 text-left" aoClicar={fecharMenu} />
              </li>
```

`app/(inicio)/page.tsx`:
1. Imports: `import { BotaoFureBolha } from '@/components/BotaoFureBolha'` e `import { BOTAO_PRIMARIO, CONTEUDO } from '@/components/estilos'`.
2. Dentro da `<div>` das fileiras, **antes** do `<Suspense>` da `FileiraRanking`:
```tsx
        <div className={`${CONTEUDO} flex flex-wrap items-center gap-x-4 gap-y-2`}>
          <BotaoFureBolha className={BOTAO_PRIMARIO} />
          <p className="text-sm text-white/70">Um filme aclamado, longe do circuito de sempre.</p>
        </div>
```

- [ ] **Step 7: Rodar para ver passar**

Run: `npm run typecheck` e `npx playwright test e2e/fure-a-bolha.spec.ts`
Expected: PASS no desktop e no celular.

- [ ] **Step 8: Commit**

```powershell
git add app/api/fure-a-bolha components/FureBolhaProvider.tsx components/JanelaFureBolha.tsx components/BotaoFureBolha.tsx components/Icones.tsx components/Navbar.tsx app/layout.tsx "app/(inicio)" e2e/mock-tmdb e2e/fure-a-bolha.spec.ts
git commit -m "feat: botão Fure a bolha na home e no menu" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Documentação, suíte completa e publicação (com o dono)

> **Execução pelo controlador, junto com o dono.** Publicar e conferir no site dependem dele.

**Files:**
- Modify: `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: tudo o que foi feito.
- Produces: Fase 4 publicada e conferida em produção.

- [ ] **Step 1: Suíte completa**

Run: `npx vitest run`, `npm run typecheck`, `npx playwright test`
Expected: tudo PASS, desktop e celular.

- [ ] **Step 2: Documentação**

Em `README.md`, seção "Onde fica cada coisa", depois da linha de `lib/avaliacoes/`:
```markdown
- `lib/tmdb/equipe.ts` e `lib/tmdb/joia.ts` — equipe da Visão & Construção e o sorteio do Fure a bolha.
```
Em `CLAUDE.md`, na seção "Fases", troque o bloco da Fase 4 por:
```markdown
- **Fase 4 — concluída.** Visão & Construção, galeria de imagens em mosaico e Fure a bolha (home e menu).
  - Spec: `docs/superpowers/specs/2026-10-01-cineteca-fase4-olhar-de-cinefilo-design.md`
  - Plano: `docs/superpowers/plans/2026-10-01-cineteca-fase4.md`
  - Ficaram para depois: sessão dupla, tags de vibe, diário/dashboard, paleta de cores, "clipar" imagens.
```

```powershell
git add README.md CLAUDE.md
git commit -m "docs: README e CLAUDE.md com a Fase 4" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Publicar**

`git push -u origin fase-4` (com `GIT_TERMINAL_PROMPT=0`). O dono abre o link do Pull Request, clica em **Create pull request**, **Merge pull request** e **Confirm merge**. Nenhuma variável nova na Vercel.

- [ ] **Step 4: Conferir em produção**

Daqui: `curl` em `https://cineteca-gules.vercel.app/filme/603` deve conter `Visão &amp; Construção` e `Imagens`; `curl https://cineteca-gules.vercel.app/api/fure-a-bolha` deve devolver JSON com `idioma`.

Com o dono, no site: abrir um filme e ver a seção e a galeria; ampliar uma imagem e passar com as setas; clicar em Fure a bolha na home e no menu do celular; pedir outra sugestão; clicar em Ver filme.
