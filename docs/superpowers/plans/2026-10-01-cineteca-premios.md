# Prêmios na página do filme — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seção "Prêmios" com abas na página do filme, alimentada pelo Wikidata, mostrando vitórias e indicações nos seis prêmios principais.

**Architecture:** `lib/premios/` tem um catálogo fixo (Q-id → prêmio, área, nome pt-BR), uma função pura que organiza as linhas e uma consulta SPARQL `server-only` com cache de 1 dia que devolve `null` em falha. Um componente de servidor dentro de `<Suspense fallback={null}>` busca e monta; um componente de cliente desenha as abas.

**Tech Stack:** Next.js 16 (App Router, `fetch` com `next.revalidate`), React 19, Tailwind v4, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-01-cineteca-premios-design.md`

## Global Constraints

- Texto na tela em pt-BR; prêmios só da lista: Oscar, BAFTA, Globo de Ouro, Festival de Cannes, Festival de Veneza, Festival de Berlim.
- Sem ano da cerimônia.
- Cores só por token: `destaque` para "Venceu" e aba ativa; `text-white/60` para indicações.
- Logs com prefixo `[CineTeca]` e só status ou mensagem do erro.
- Falha do Wikidata: a seção não aparece (exceção combinada à regra de erros).
- Cache de 86400 s, tempo limite de 8000 ms, `User-Agent: CineTeca/1.0 (https://cineteca-gules.vercel.app)`.
- Vitest: hooks com corpo em bloco. TypeScript 7: variável do `catch` é `unknown`. Arquivos com barra invertida em regex: criar com a ferramenta de escrita, não heredoc.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Pessoa sem rótulo no Wikidata (o serviço devolve o próprio Q-id como nome): não mostrar "Q12345" — teste em `montar`.
- Mesmo prêmio registrado em dois Q-ids com o mesmo nome (ex.: Fotografia e Fotografia, Cor): uma linha só — teste em `montar`.
- Mesma pessoa registrada duas vezes na mesma categoria: nome uma vez só — teste em `montar`.
- Resposta 200 com corpo fora do formato SPARQL: `null`, não exceção — teste em `wikidata`.
- Filme com prêmio só no nível do filme (sem pessoas, ex.: Palma de Ouro): vitória sem "— nome" — teste em `montar` e no e2e (filme 1002).

---

### Task 1: Catálogo, tipos e montagem

**Files:**
- Create: `lib/premios/tipos.ts`, `lib/premios/catalogo.ts`, `lib/premios/montar.ts`
- Test: `lib/premios/catalogo.test.ts`, `lib/premios/montar.test.ts`

**Interfaces:**
- Produces:
  - `type ChavePremio = 'oscar' | 'bafta' | 'globo' | 'cannes' | 'veneza' | 'berlim'`
  - `type LinhaPremio = { venceu: boolean; categoria: string; pessoa: string | null }` (`categoria` é o Q-id, ex. `'Q131520'`)
  - `type VitoriaPremio = { categoria: string; quem: string | null }`
  - `type PremioFilme = { chave: ChavePremio; nome: string; vitorias: VitoriaPremio[]; indicacoes: string[] }`
  - `PREMIOS: { chave: ChavePremio; nome: string }[]`, `AREAS: readonly string[]`, `CATEGORIAS: Record<string, { premio: ChavePremio; area: Area; nome: string }>`
  - `montarPremios(linhas: LinhaPremio[]): PremioFilme[]`
  - `textoPessoas(pessoas: string[]): string | null`
  - `resumoContagem(p: PremioFilme): string`

- [ ] **Step 1: Tipos e catálogo**

`lib/premios/tipos.ts`:

```ts
export type ChavePremio = 'oscar' | 'bafta' | 'globo' | 'cannes' | 'veneza' | 'berlim'

/** Uma linha da resposta do Wikidata. `categoria` é o Q-id da categoria. */
export type LinhaPremio = { venceu: boolean; categoria: string; pessoa: string | null }

export type VitoriaPremio = { categoria: string; quem: string | null }

export type PremioFilme = { chave: ChavePremio; nome: string; vitorias: VitoriaPremio[]; indicacoes: string[] }
```

`lib/premios/catalogo.ts`: `PREMIOS` na ordem da spec; `AREAS` com as técnicas primeiro (`fotografia`, `direcao-arte`, `efeitos`, `montagem`, `som`, `figurino`, `maquiagem`, `trilha`, `artistica`) e depois `filme`, `juri`, `direcao`, `roteiro`, `atuacao`, `cancao`, `animacao`, `internacional`, `documentario`; `CATEGORIAS` com os Q-ids levantados no Wikidata em 2026-10-01 (lista completa no arquivo).

- [ ] **Step 2: Teste do catálogo** — todo item aponta para prêmio e área conhecidos; nenhum nome vazio; cada prêmio tem ao menos uma categoria.

- [ ] **Step 3: Testes de `montar` (falham)**

```ts
import { describe, expect, it } from 'vitest'
import { montarPremios, resumoContagem, textoPessoas } from './montar'
import type { LinhaPremio } from './tipos'

const v = (categoria: string, pessoa: string | null = null): LinhaPremio => ({ venceu: true, categoria, pessoa })
const i = (categoria: string, pessoa: string | null = null): LinhaPremio => ({ venceu: false, categoria, pessoa })

// Linhas reais de Duna (TMDB 438631), consulta de 2026-10-01, só Oscar.
const DUNA_OSCAR: LinhaPremio[] = [
  i('Q102427'), i('Q102427', 'Cale Boyter'), i('Q102427', 'Denis Villeneuve'), i('Q102427', 'Mary Parent'),
  i('Q107258', 'Denis Villeneuve'), i('Q107258', 'Eric Roth'), i('Q107258', 'Jon Spaihts'),
  i('Q131520', 'Greig Fraser'), i('Q277536', 'Bob Morgan'), i('Q277536', 'Jacqueline West'),
  i('Q277751', 'Patrice Vermette'), i('Q277751', 'Zsuzsanna Sipos'), i('Q281939', 'Joe Walker'),
  i('Q393686', 'Brian Connor'), i('Q393686', 'Gerd Nefzer'), i('Q393686', 'Paul Lambert (efeitos visuais)'), i('Q393686', 'Tristan Myles'),
  i('Q487136', 'Donald Mowat'), i('Q487136', 'Eva von Bahr'), i('Q487136', 'Love Larson'),
  i('Q488651', 'Hans Zimmer'), i('Q830079', 'Doug Hemphill'), i('Q830079', 'Mac Ruth'),
  v('Q131520', 'Greig Fraser'), v('Q277751', 'Patrice Vermette'), v('Q277751', 'Zsuzsanna Sipos'),
  v('Q281939', 'Joe Walker'), v('Q393686', 'Brian Connor'), v('Q393686', 'Gerd Nefzer'),
  v('Q393686', 'Paul Lambert (efeitos visuais)'), v('Q393686', 'Tristan Myles'), v('Q488651', 'Hans Zimmer'),
  v('Q830079', 'Doug Hemphill'), v('Q830079', 'Mac Ruth'), v('Q830079', 'Mark Mangini'), v('Q830079', 'Ron Bartlett'), v('Q830079', 'Theo Green'),
]

describe('montarPremios', () => {
  it('Duna: 6 vitórias técnicas em ordem e 4 indicações, sem repetir quem venceu', () => {
    const [oscar] = montarPremios(DUNA_OSCAR)
    expect(oscar.chave).toBe('oscar')
    expect(oscar.vitorias).toEqual([
      { categoria: 'Melhor Fotografia', quem: 'Greig Fraser' },
      { categoria: 'Melhor Direção de Arte', quem: 'Patrice Vermette e Zsuzsanna Sipos' },
      { categoria: 'Melhores Efeitos Visuais', quem: 'Brian Connor e outros 3' },
      { categoria: 'Melhor Montagem', quem: 'Joe Walker' },
      { categoria: 'Melhor Som', quem: 'Doug Hemphill e outros 4' },
      { categoria: 'Melhor Trilha Sonora', quem: 'Hans Zimmer' },
    ])
    expect(oscar.indicacoes).toEqual(['Melhor Figurino', 'Melhor Maquiagem e Penteado', 'Melhor Filme', 'Melhor Roteiro Adaptado'])
    expect(resumoContagem(oscar)).toBe('6 vitórias · 4 indicações')
  })
  // + ordem dos prêmios, categoria fora do catálogo, Q-id como nome, pessoa repetida,
  //   dois Q-ids com o mesmo nome, vitória sem pessoa, lista vazia, singular da contagem.
})
```

- [ ] **Step 4: Rodar** `npx vitest run lib/premios` — FAIL (módulo não existe).

- [ ] **Step 5: Implementar `montar.ts`**

```ts
import { AREAS, CATEGORIAS, PREMIOS } from './catalogo'
import type { LinhaPremio, PremioFilme } from './tipos'

const ORDEM_AREA = new Map(AREAS.map((area, i) => [area, i]))

type Grupo = { area: number; nome: string; venceu: boolean; pessoas: Set<string> }

export function montarPremios(linhas: LinhaPremio[]): PremioFilme[] {
  const grupos = new Map<string, Map<string, Grupo>>()
  for (const linha of linhas) {
    const cat = CATEGORIAS[linha.categoria]
    if (!cat) continue
    const doPremio = grupos.get(cat.premio) ?? new Map<string, Grupo>()
    grupos.set(cat.premio, doPremio)
    // Agrupa pelo nome: o Wikidata separa categorias antigas ("Fotografia, Cor") que exibimos como uma só.
    const grupo = doPremio.get(cat.nome) ?? { area: ORDEM_AREA.get(cat.area)!, nome: cat.nome, venceu: false, pessoas: new Set<string>() }
    doPremio.set(cat.nome, grupo)
    if (linha.venceu) {
      grupo.venceu = true
      const pessoa = limparPessoa(linha.pessoa)
      if (pessoa) grupo.pessoas.add(pessoa)
    }
  }

  return PREMIOS.flatMap(({ chave, nome }) => {
    const doPremio = grupos.get(chave)
    if (!doPremio) return []
    const ordenados = [...doPremio.values()].sort((a, b) => a.area - b.area || a.nome.localeCompare(b.nome, 'pt-BR'))
    return [{
      chave,
      nome,
      vitorias: ordenados.filter((g) => g.venceu).map((g) => ({ categoria: g.nome, quem: textoPessoas([...g.pessoas]) })),
      indicacoes: ordenados.filter((g) => !g.venceu).map((g) => g.nome),
    }]
  })
}

function limparPessoa(pessoa: string | null): string | null {
  if (!pessoa) return null
  // Sem rótulo, o serviço do Wikidata devolve o próprio Q-id.
  if (/^Q\d+$/.test(pessoa)) return null
  // Tira a desambiguação: "Paul Lambert (efeitos visuais)".
  return pessoa.replace(/\s*\([^)]*\)$/, '').trim() || null
}

export function textoPessoas(pessoas: string[]): string | null {
  const nomes = [...pessoas].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  if (nomes.length === 0) return null
  if (nomes.length === 1) return nomes[0]
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`
  return `${nomes[0]} e outros ${nomes.length - 1}`
}

export function resumoContagem(p: PremioFilme): string {
  const partes: string[] = []
  const v = p.vitorias.length
  const i = p.indicacoes.length
  if (v > 0) partes.push(`${v} ${v === 1 ? 'vitória' : 'vitórias'}`)
  if (i > 0) partes.push(`${i} ${i === 1 ? 'indicação' : 'indicações'}`)
  return partes.join(' · ')
}
```

- [ ] **Step 6: Rodar** `npx vitest run lib/premios` — PASS.
- [ ] **Step 7: Commit** `feat: catálogo e montagem dos prêmios`.

### Task 2: Consulta ao Wikidata

**Files:**
- Create: `lib/premios/wikidata.ts`
- Test: `lib/premios/wikidata.test.ts`

**Interfaces:**
- Consumes: `CATEGORIAS`, `LinhaPremio`.
- Produces: `buscarLinhasPremios(tmdbId: number): Promise<LinhaPremio[] | null>`; `montarConsulta(tmdbId: number): string`.

- [ ] **Step 1: Testes (falham)** — com `fetch` simulado como em `lib/tmdb/client.test.ts`:
  - chama `https://query.wikidata.org/sparql` com `query` contendo `wdt:P4947 "438631"` e `VALUES ?categoria`, `Accept: application/sparql-results+json`, `User-Agent` do site, `next: { revalidate: 86400 }` e `signal`;
  - usa `WIKIDATA_SPARQL_URL` quando definido;
  - converte `bindings` em `{ venceu, categoria: 'Q…', pessoa }` (pessoa `null` sem `pessoaLabel`);
  - devolve `null` e loga `[CineTeca]` com status 500, com `fetch` rejeitando e com JSON sem `results.bindings`.
- [ ] **Step 2: Rodar** — FAIL.
- [ ] **Step 3: Implementar**

```ts
import 'server-only'
import { CATEGORIAS } from './catalogo'
import type { LinhaPremio } from './tipos'

const ENDPOINT_PADRAO = 'https://query.wikidata.org/sparql'
const CACHE_SEGUNDOS = 86400
const TEMPO_LIMITE_MS = 8000
const USER_AGENT = 'CineTeca/1.0 (https://cineteca-gules.vercel.app)'
const PREFIXO_ENTIDADE = 'http://www.wikidata.org/entity/'

type Binding = { venceu?: { value: string }; categoria?: { value: string }; pessoaLabel?: { value: string } }

export function montarConsulta(tmdbId: number): string {
  const valores = Object.keys(CATEGORIAS).map((q) => `wd:${q}`).join(' ')
  // Prêmios no filme e nas pessoas premiadas "pelo trabalho" (P1686) neste filme.
  return `SELECT ?venceu ?categoria ?pessoaLabel WHERE {
  VALUES ?categoria { ${valores} }
  ?filme wdt:P4947 "${tmdbId}" .
  { ?filme p:P166/ps:P166 ?categoria . BIND(true AS ?venceu) }
  UNION { ?filme p:P1411/ps:P1411 ?categoria . BIND(false AS ?venceu) }
  UNION { ?pessoa p:P166 ?st . ?st ps:P166 ?categoria ; pq:P1686 ?filme . BIND(true AS ?venceu) }
  UNION { ?pessoa p:P1411 ?st . ?st ps:P1411 ?categoria ; pq:P1686 ?filme . BIND(false AS ?venceu) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". }
}`
}

export async function buscarLinhasPremios(tmdbId: number): Promise<LinhaPremio[] | null> {
  const url = new URL(process.env.WIKIDATA_SPARQL_URL || ENDPOINT_PADRAO)
  url.searchParams.set('query', montarConsulta(tmdbId))
  try {
    const resposta = await fetch(url, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      next: { revalidate: CACHE_SEGUNDOS },
    })
    if (!resposta.ok) {
      console.error('[CineTeca] Wikidata respondeu', resposta.status)
      return null
    }
    const corpo = (await resposta.json()) as { results?: { bindings?: Binding[] } }
    const bindings = corpo.results?.bindings
    if (!Array.isArray(bindings)) {
      console.error('[CineTeca] Resposta do Wikidata fora do formato')
      return null
    }
    return bindings.flatMap((b) => {
      const categoria = b.categoria?.value.replace(PREFIXO_ENTIDADE, '')
      if (!categoria) return []
      return [{ venceu: b.venceu?.value === 'true', categoria, pessoa: b.pessoaLabel?.value ?? null }]
    })
  } catch (erro) {
    console.error('[CineTeca] Falha ao consultar o Wikidata -', erro instanceof Error ? erro.message : String(erro))
    return null
  }
}
```

- [ ] **Step 4: Rodar** — PASS. Conferir a consulta real com Duna (curl no endpoint público com a mesma consulta) e o tempo de resposta.
- [ ] **Step 5: Commit** `feat: consulta dos prêmios no Wikidata`.

### Task 3: Seção na página, simulador e e2e

**Files:**
- Create: `components/Premios.tsx`, `components/PlacarPremios.tsx`, `e2e/premios.spec.ts`
- Modify: `app/filme/[id]/page.tsx` (entre "Onde assistir" e Visão & Construção), `e2e/mock-tmdb/servidor.mjs` (rota `/sparql` antes da checagem do token), `e2e/iniciar-servidor.mjs` (`WIKIDATA_SPARQL_URL`)

**Interfaces:**
- Consumes: `buscarLinhasPremios`, `montarPremios`, `resumoContagem`, `PremioFilme`.
- Produces: `<Premios filmeId={number} />` (servidor, devolve `<div>` de embrulho ou `null`); `<PlacarPremios premios={PremioFilme[]} />` (cliente).

- [ ] **Step 1: Simulador** — `/sparql` lê `wdt:P4947 "(\d+)"` da `query`:
  - 1001: Oscar (Fotografia venceu com "Fotógrafo Teste" e também indicado; Direção de Arte venceu com duas pessoas; Melhor Filme indicado), BAFTA (Fotografia venceu), Globo (Trilha venceu, Filme – Drama indicado);
  - 1002: só Palma de Ouro, sem pessoa;
  - 1003: status 500;
  - demais: `bindings` vazio.
- [ ] **Step 2: e2e (falha)** — `e2e/premios.spec.ts`:
  - 1001: região "Prêmios" acima de "Visão & Construção"; abas Oscar/BAFTA/Globo de Ouro; Oscar selecionada com "1 vitória · 1 indicação"… (conforme dados); "Melhor Fotografia" e "— Fotógrafo Teste"; clique em BAFTA troca; seta direita leva ao Globo e põe o foco nele;
  - 1002: sem `tablist`, "Festival de Cannes" e "Palma de Ouro";
  - 1005 e 1003: sem a região "Prêmios" e com "Elenco principal" visível.
- [ ] **Step 3: Componentes**

`components/Premios.tsx`:

```tsx
import { PlacarPremios } from '@/components/PlacarPremios'
import { montarPremios } from '@/lib/premios/montar'
import { buscarLinhasPremios } from '@/lib/premios/wikidata'

/** Devolve o próprio embrulho: sem prêmios, não sobra espaço nem linha divisória na página. */
export async function Premios({ filmeId }: { filmeId: number }) {
  const linhas = await buscarLinhasPremios(filmeId)
  const premios = linhas ? montarPremios(linhas) : []
  if (premios.length === 0) return null
  return (
    <div>
      <PlacarPremios premios={premios} />
    </div>
  )
}
```

`components/PlacarPremios.tsx`: abas `role="tablist"` (`grid grid-cols-2 gap-2 sm:flex sm:flex-wrap`), cada aba `bg-superficie rounded-lg px-4 py-3 text-left ring-1`, ativa com `ring-destaque`, inativa `ring-transparent`; `tabIndex` só na ativa; setas circulares movem seleção e foco. Com um prêmio, bloco igual sem `role`. Painel `role="tabpanel"` com `<ul className="divide-y divide-white/10">`: "Venceu" em `text-destaque font-bold`, indicações em `text-white/60`.

Na página: `<Suspense fallback={null}><Premios filmeId={id} /></Suspense>` entre o `<div>` de `OndeAssistir` e o de `VisaoConstrucao`.

- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run test:e2e` — tudo PASS.
- [ ] **Step 5: Commit** `feat: seção Prêmios na página do filme`.

### Task 4: Documentação e publicação

- [ ] `CLAUDE.md`: fase "Prêmios — concluída", a exceção da regra de erros e `WIKIDATA_SPARQL_URL` só nos testes. `README.md` se listar funcionalidades. Roteiro: Prêmios concluído.
- [ ] Commit `docs: Prêmios no CLAUDE.md e no roteiro`; `git push -u origin premios` com `GIT_TERMINAL_PROMPT=0`; o dono abre o PR e faz o merge.
- [ ] Depois do merge: conferir no site publicado Duna (`/filme/438631`) com a seção e um filme sem prêmios sem ela.
