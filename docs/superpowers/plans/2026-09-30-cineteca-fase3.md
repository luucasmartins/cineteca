# CineTeca Fase 3 (Avaliações e ranking) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quem tem conta diz se curtiu ou não os filmes que viu, e o site mostra um ranking dos filmes mais aprovados pelo público da CineTeca.

**Architecture:**

- **Voto:** passa por uma Server Action (`avaliar`), não pelo navegador. O servidor confere o filme no TMDB, grava o título verdadeiro em `filmes_avaliados` com a chave secreta e grava o voto em `avaliacoes` como a própria pessoa (RLS valendo).
- **Ranking:** uma visão `ranking_filmes` agrega os votos de todo mundo e devolve só números. Ela usa `security_invoker = false` de propósito, para poder somar votos protegidos por RLS sem nunca expor quem votou.
- **Telas:** um bloco cliente na página do filme, uma página `/mais-curtidos` e uma fileira na home. Nenhuma delas conhece o Supabase: recebem dados prontos do servidor.

**Tech Stack:** Next.js 16.3 (App Router, Server Actions) · React 19 · TypeScript 7 · Tailwind v4 · `@supabase/supabase-js` + `@supabase/ssr` · Vitest 5 · Playwright (TMDB simulado + projeto Supabase de testes).

**Spec:** `docs/superpowers/specs/2026-09-30-cineteca-fase3-avaliacoes-design.md`. As restrições das Fases 1 e 2 continuam valendo.

## Global Constraints

- **Texto:** tudo na tela em português do Brasil. Os textos da spec §7 são copiados exatamente.
- **Cores:** nenhuma tela desta fase escreve cor à mão. Use os tokens `destaque`, `destaque-escuro`, `fundo`, `superficie` e os estilos de `components/estilos.ts`. A cor de destaque vai mudar de vermelho para verde numa tarefa separada, e nada aqui pode quebrar com isso.
- **Imagens:** `<img>` simples, nunca `next/image`. Se a imagem pode faltar, use `ImagemComReserva`.
- **Privacidade:** nenhuma consulta, log ou resposta pode devolver `usuario_id` de quem votou. Só números agregados.
- **Logs:** prefixo `[CineTeca]`. Nunca registrar tokens, chaves, senhas, cabeçalhos nem identificadores de usuário.
- **Mínimo de votos:** `3`. Está em `MINIMO_DE_VOTOS` e no `having` da visão. Os dois valores têm de concordar.
- **Vitest:** todo hook (`beforeEach`/`afterEach`/`beforeAll`/`afterAll`) usa corpo em bloco `{ ... }`. Um valor retornado vira teardown.
- **Next 16:** `params` e `searchParams` são `Promise`. O arquivo de interceptação é `proxy.ts`.
- **Playwright:** para mensagens na tela use `getByText`; o Next injeta um anunciador de rota com `role="alert"`. Quando um nome é prefixo de outro, use `exact: true`. Para esperar uma gravação, confira o banco com `expect.poll`, nunca o toast — ele some em 3 s.
- **Ambiente:** Windows 10, Node 24, PowerShell 5.1 (sem `&&`). O caminho do projeto tem espaço e acento: use aspas.
- **Heredoc:** o shell colapsa `\\` em `\`. Arquivos com barras invertidas (regex) devem ser criados com a ferramenta de escrita, não com heredoc.
- **Commits:** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (use um segundo `-m`).

## Review Focus

1. **Filme com zero votos, ou com votos que somem** (a última pessoa desfaz o voto, ou exclui a conta): o cálculo não pode dividir por zero nem deixar o filme no ranking com `NaN%`. Testado na Task 1 (unitário) e na Task 3 (banco).
2. **Voto forjado pelo navegador** — `filme_id` negativo, zero, fracionário, gigante, ou um id que não existe no TMDB: a ação recusa e nada é gravado, nem em `avaliacoes` nem em `filmes_avaliados`. Testado na Task 1 (validação) e na Task 4 (ação).
3. **Escrita direta em `filmes_avaliados` por quem está logado:** tem de ser recusada pelo banco, senão qualquer pessoa inventa um título no ranking. Testado na Task 3.
4. **Duas pessoas votando no mesmo filme ao mesmo tempo, e a mesma pessoa clicando duas vezes:** um voto por pessoa por filme, e o agregado bate com o banco. Testado na Task 3 (chave primária) e na Task 5 (`dblclick`).
5. **Sessão expirada, ou gravação recusada, com a página aberta:** a tela desfaz o voto e explica — reabre a janela de login ou mostra o erro —, nunca falha em silêncio. Testado na Task 4 (código do erro) e na Task 5 (ponta a ponta com a conta apagada no meio).

---

## Mapa de arquivos

```
lib/avaliacoes/tipos.ts            tipos compartilhados
lib/avaliacoes/calculo.ts          percentual, mínimo, ordem, textos (puro)
lib/avaliacoes/validacao.ts        validação do filme e do voto (puro)
lib/avaliacoes/banco.ts            leitura do Supabase (server-only)
lib/avaliacoes/acoes.ts            Server Action avaliar()
supabase/migrations/20260930000000_avaliacoes.sql
testes-integracao/avaliacoes.test.ts
components/BlocoAvaliacao.tsx      bloco cliente na página do filme
components/FileiraRanking.tsx      fileira da home
app/mais-curtidos/page.tsx         página do ranking
e2e/avaliacao.spec.ts
e2e/ranking.spec.ts
```

---

### Task 1: Cálculo e validação (lógica pura)

**Files:**
- Create: `lib/avaliacoes/tipos.ts`, `lib/avaliacoes/calculo.ts`, `lib/avaliacoes/validacao.ts`
- Test: `lib/avaliacoes/calculo.test.ts`, `lib/avaliacoes/validacao.test.ts`

**Interfaces:**
- Consumes: `Resultado<T>` de `lib/auth/validacao.ts`.
- Produces:
  - `type Voto = boolean | null` — `true` curti, `false` não curti, `null` sem voto
  - `type Agregado = { votos: number; curtidas: number; aprovacao: number }`
  - `type ItemRanking = Agregado & { filmeId: number; titulo: string; posterUrl: string | null; ano: string | null }`
  - `type AvaliacaoDoFilme = { meuVoto: Voto; agregado: Agregado | null }`
  - `MINIMO_DE_VOTOS = 3`
  - `calcularAprovacao(curtidas: number, votos: number): number`
  - `qualificado(votos: number): boolean`
  - `ordenarRanking(itens: ItemRanking[]): ItemRanking[]`
  - `textoVotos(votos: number): string`
  - `textoAgregado(a: Agregado): string`
  - `validarFilmeId(bruto: unknown): Resultado<number>`
  - `validarVoto(bruto: unknown): Resultado<Voto>`

- [ ] **Step 1: Escrever os testes (falhando)**

`lib/avaliacoes/calculo.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import {
  calcularAprovacao,
  MINIMO_DE_VOTOS,
  ordenarRanking,
  qualificado,
  textoAgregado,
  textoVotos,
} from './calculo'
import type { ItemRanking } from './tipos'

describe('calcularAprovacao', () => {
  it('devolve a porcentagem arredondada', () => {
    expect(calcularAprovacao(41, 50)).toBe(82)
    expect(calcularAprovacao(1, 3)).toBe(33)
    expect(calcularAprovacao(2, 3)).toBe(67)
  })

  it('casos extremos: tudo curtido e nada curtido', () => {
    expect(calcularAprovacao(5, 5)).toBe(100)
    expect(calcularAprovacao(0, 5)).toBe(0)
  })

  it('sem votos devolve 0, nunca NaN', () => {
    expect(calcularAprovacao(0, 0)).toBe(0)
    expect(Number.isNaN(calcularAprovacao(0, 0))).toBe(false)
  })
})

describe('qualificado', () => {
  it('o mínimo é 3 votos', () => {
    expect(MINIMO_DE_VOTOS).toBe(3)
    expect(qualificado(2)).toBe(false)
    expect(qualificado(3)).toBe(true)
    expect(qualificado(0)).toBe(false)
  })
})

const item = (filmeId: number, curtidas: number, votos: number): ItemRanking => ({
  filmeId,
  titulo: `Filme ${filmeId}`,
  posterUrl: null,
  ano: '2024',
  votos,
  curtidas,
  aprovacao: calcularAprovacao(curtidas, votos),
})

describe('ordenarRanking', () => {
  it('maior aprovação primeiro', () => {
    const ordem = ordenarRanking([item(1, 5, 10), item(2, 9, 10)]).map((i) => i.filmeId)
    expect(ordem).toEqual([2, 1])
  })

  it('empate na aprovação: mais votos primeiro', () => {
    const ordem = ordenarRanking([item(1, 3, 3), item(2, 20, 20)]).map((i) => i.filmeId)
    expect(ordem).toEqual([2, 1])
  })

  it('empate total: ordem estável pelo id', () => {
    const ordem = ordenarRanking([item(7, 3, 3), item(2, 3, 3)]).map((i) => i.filmeId)
    expect(ordem).toEqual([2, 7])
  })

  it('não altera a lista recebida', () => {
    const entrada = [item(1, 5, 10), item(2, 9, 10)]
    ordenarRanking(entrada)
    expect(entrada.map((i) => i.filmeId)).toEqual([1, 2])
  })
})

describe('textoVotos', () => {
  it('singular e plural', () => {
    expect(textoVotos(1)).toBe('1 voto')
    expect(textoVotos(0)).toBe('0 votos')
    expect(textoVotos(41)).toBe('41 votos')
  })
})

describe('textoAgregado', () => {
  it('monta a frase do público', () => {
    expect(textoAgregado({ curtidas: 41, votos: 50, aprovacao: 82 })).toBe(
      '82% das pessoas curtiram · 50 votos',
    )
  })

  it('usa o singular quando há um voto só', () => {
    expect(textoAgregado({ curtidas: 1, votos: 1, aprovacao: 100 })).toBe(
      '100% das pessoas curtiram · 1 voto',
    )
  })
})
```

`lib/avaliacoes/validacao.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { validarFilmeId, validarVoto } from './validacao'

describe('validarFilmeId', () => {
  it('aceita inteiro positivo, como número ou texto', () => {
    expect(validarFilmeId(603)).toEqual({ ok: true, valor: 603 })
    expect(validarFilmeId('603')).toEqual({ ok: true, valor: 603 })
  })

  it('recusa qualquer coisa que não seja inteiro positivo', () => {
    for (const valor of [0, -1, 1.5, '1.5', 'abc', '', null, undefined, Number.NaN, Infinity, 1e12, {}]) {
      expect(validarFilmeId(valor)).toEqual({ ok: false, erro: 'Filme inválido' })
    }
  })
})

describe('validarVoto', () => {
  it('aceita curti, não curti e desfazer', () => {
    expect(validarVoto(true)).toEqual({ ok: true, valor: true })
    expect(validarVoto(false)).toEqual({ ok: true, valor: false })
    expect(validarVoto(null)).toEqual({ ok: true, valor: null })
  })

  it('recusa qualquer outro valor', () => {
    for (const valor of ['true', 1, 0, undefined, {}, []]) {
      expect(validarVoto(valor)).toEqual({ ok: false, erro: 'Voto inválido' })
    }
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run lib/avaliacoes`
Expected: FAIL — `Cannot find module './calculo'` / `'./validacao'`.

- [ ] **Step 3: Implementar**

`lib/avaliacoes/tipos.ts`:
```ts
// true = curti, false = não curti, null = sem voto
export type Voto = boolean | null

export type Agregado = { votos: number; curtidas: number; aprovacao: number }

export type ItemRanking = Agregado & {
  filmeId: number
  titulo: string
  posterUrl: string | null
  ano: string | null
}

// agregado é null quando o filme ainda não atingiu o mínimo de votos.
export type AvaliacaoDoFilme = { meuVoto: Voto; agregado: Agregado | null }
```

`lib/avaliacoes/calculo.ts`:
```ts
import type { Agregado, ItemRanking } from './tipos'

export const MINIMO_DE_VOTOS = 3

export function calcularAprovacao(curtidas: number, votos: number): number {
  if (votos <= 0) return 0
  return Math.round((curtidas * 100) / votos)
}

export function qualificado(votos: number): boolean {
  return votos >= MINIMO_DE_VOTOS
}

// Mais aprovados primeiro; empate vai para quem tem mais votos; o id mantém a ordem estável.
export function ordenarRanking(itens: ItemRanking[]): ItemRanking[] {
  return [...itens].sort(
    (a, b) => b.aprovacao - a.aprovacao || b.votos - a.votos || a.filmeId - b.filmeId,
  )
}

export function textoVotos(votos: number): string {
  return `${votos} ${votos === 1 ? 'voto' : 'votos'}`
}

export function textoAgregado(a: Agregado): string {
  return `${a.aprovacao}% das pessoas curtiram · ${textoVotos(a.votos)}`
}
```

`lib/avaliacoes/validacao.ts`:
```ts
import type { Resultado } from '@/lib/auth/validacao'
import type { Voto } from './tipos'

// O TMDB não tem id acima disso; recusar cedo evita consulta inútil.
const ID_MAXIMO = 100_000_000

export function validarFilmeId(bruto: unknown): Resultado<number> {
  const numero = typeof bruto === 'number' ? bruto : typeof bruto === 'string' ? Number(bruto) : Number.NaN
  const valido = Number.isInteger(numero) && numero > 0 && numero <= ID_MAXIMO
  if (!valido) return { ok: false, erro: 'Filme inválido' }
  return { ok: true, valor: numero }
}

export function validarVoto(bruto: unknown): Resultado<Voto> {
  if (bruto === true || bruto === false || bruto === null) return { ok: true, valor: bruto }
  return { ok: false, erro: 'Voto inválido' }
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run lib/avaliacoes`
Expected: PASS.

- [ ] **Step 5: Conferir a suíte inteira e commitar**

Run: `npx vitest run` e `npm run typecheck` — sem erros.
```powershell
git add lib/avaliacoes
git commit -m "feat: cálculo e validação das avaliações" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Banco — migração e teste de integração

**Files:**
- Create: `supabase/migrations/20260930000000_avaliacoes.sql`
- Create: `testes-integracao/avaliacoes.test.ts`

**Interfaces:**
- Consumes: `MINIMO_DE_VOTOS` (Task 1), para conferir que o SQL e o código concordam.
- Produces: tabelas `public.avaliacoes` e `public.filmes_avaliados`, visão `public.ranking_filmes` com as colunas `filme_id, titulo, poster_url, ano, votos, curtidas, aprovacao`.

> O teste de integração **não roda nesta task** — ele depende da Task 3, que é feita com o dono. Escreva e commite.

- [ ] **Step 1: Escrever a migração**

`supabase/migrations/20260930000000_avaliacoes.sql`:
```sql
-- CineTeca Fase 3: avaliações (curti / não curti) e ranking.
-- Aplicar no SQL Editor do Supabase, nos projetos "cineteca" e "cineteca-testes".

create table public.avaliacoes (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  filme_id integer not null check (filme_id > 0),
  curtiu boolean not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, filme_id)
);

create index avaliacoes_por_filme on public.avaliacoes (filme_id);

-- Cópia dos dados de exibição dos filmes votados. Só o servidor escreve aqui.
create table public.filmes_avaliados (
  filme_id integer primary key check (filme_id > 0),
  titulo text not null check (char_length(titulo) <= 300),
  poster_url text,
  ano text,
  atualizado_em timestamptz not null default now()
);

revoke all on public.avaliacoes from anon, authenticated;
revoke all on public.filmes_avaliados from anon, authenticated;
grant select, insert, delete on public.avaliacoes to authenticated;
grant update (curtiu, atualizado_em) on public.avaliacoes to authenticated;
grant select on public.filmes_avaliados to anon, authenticated;

alter table public.avaliacoes enable row level security;
alter table public.filmes_avaliados enable row level security;

create policy "avaliacoes: ler as próprias" on public.avaliacoes
  for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "avaliacoes: inserir as próprias" on public.avaliacoes
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "avaliacoes: atualizar as próprias" on public.avaliacoes
  for update to authenticated using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);
create policy "avaliacoes: apagar as próprias" on public.avaliacoes
  for delete to authenticated using ((select auth.uid()) = usuario_id);

create policy "filmes_avaliados: qualquer um lê" on public.filmes_avaliados
  for select to anon, authenticated using (true);

-- security_invoker = false é proposital: a visão precisa somar votos de todo mundo,
-- que a RLS esconde. Ela devolve só números agregados, nunca quem votou.
create view public.ranking_filmes with (security_invoker = false) as
  select
    f.filme_id,
    f.titulo,
    f.poster_url,
    f.ano,
    count(*)::int as votos,
    count(*) filter (where a.curtiu)::int as curtidas,
    round(count(*) filter (where a.curtiu) * 100.0 / count(*))::int as aprovacao
  from public.avaliacoes a
  join public.filmes_avaliados f on f.filme_id = a.filme_id
  group by f.filme_id, f.titulo, f.poster_url, f.ano
  having count(*) >= 3
  order by aprovacao desc, votos desc, f.filme_id;

grant select on public.ranking_filmes to anon, authenticated;
```

- [ ] **Step 2: Escrever o teste de integração**

`testes-integracao/avaliacoes.test.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
const chaveSecreta = process.env.SUPABASE_SECRET_KEY ?? ''
const semSessao = { auth: { persistSession: false, autoRefreshToken: false } }
const SENHA = 'senha-de-integracao-123'
const FILME = 90001

type Conta = { id: string; email: string }

const admin = () => createClient(url, chaveSecreta, semSessao)
const novoEmail = (rotulo: string) =>
  `avaliacoes+${rotulo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@cineteca.test`

async function criarConta(nome: string): Promise<Conta> {
  const email = novoEmail(nome.toLowerCase())
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
    user_metadata: { nome },
  })
  if (error) throw error
  return { id: data.user.id, email }
}

async function clienteDe(conta: Conta): Promise<SupabaseClient> {
  const cliente = createClient(url, chavePublica, semSessao)
  const { error } = await cliente.auth.signInWithPassword({ email: conta.email, password: SENHA })
  if (error) throw error
  return cliente
}

const linhaDoRanking = async (filmeId: number) =>
  (await admin().from('ranking_filmes').select('*').eq('filme_id', filmeId).maybeSingle()).data as
    | { votos: number; curtidas: number; aprovacao: number; titulo: string }
    | null

describe('avaliações no banco (projeto de testes)', () => {
  const contas: Conta[] = []
  let ana: Conta
  let bia: Conta
  let caio: Conta
  let clienteAna: SupabaseClient
  let clienteBia: SupabaseClient

  beforeAll(async () => {
    if (!url || !chavePublica || !chaveSecreta) {
      throw new Error('Falta .env.test.local com as chaves do projeto cineteca-testes')
    }
    await admin().from('filmes_avaliados').upsert({
      filme_id: FILME,
      titulo: 'Filme de Integração',
      poster_url: null,
      ano: '2024',
    })
    ana = await criarConta('Ana')
    bia = await criarConta('Bia')
    caio = await criarConta('Caio')
    contas.push(ana, bia, caio)
    clienteAna = await clienteDe(ana)
    clienteBia = await clienteDe(bia)
  })

  afterAll(async () => {
    for (const conta of contas) await admin().auth.admin.deleteUser(conta.id)
    await admin().from('filmes_avaliados').delete().eq('filme_id', FILME)
  })

  it('a pessoa grava e lê o próprio voto', async () => {
    const { error } = await clienteAna.from('avaliacoes').insert({
      usuario_id: ana.id,
      filme_id: FILME,
      curtiu: true,
    })
    expect(error).toBeNull()
    const { data } = await clienteAna.from('avaliacoes').select('curtiu').eq('filme_id', FILME)
    expect(data).toEqual([{ curtiu: true }])
  })

  it('não enxerga o voto de outra pessoa', async () => {
    const { data } = await clienteBia.from('avaliacoes').select('curtiu').eq('usuario_id', ana.id)
    expect(data).toEqual([])
  })

  it('recusa votar em nome de outra pessoa', async () => {
    const { error } = await clienteBia.from('avaliacoes').insert({
      usuario_id: ana.id,
      filme_id: FILME + 1,
      curtiu: true,
    })
    expect(error?.code).toBe('42501')
  })

  it('recusa um segundo voto da mesma pessoa no mesmo filme', async () => {
    const { error } = await clienteAna.from('avaliacoes').insert({
      usuario_id: ana.id,
      filme_id: FILME,
      curtiu: false,
    })
    expect(error?.code).toBe('23505')
  })

  it('a pessoa muda o próprio voto', async () => {
    await clienteAna.from('avaliacoes').update({ curtiu: false }).eq('filme_id', FILME)
    const { data } = await clienteAna.from('avaliacoes').select('curtiu').eq('filme_id', FILME)
    expect(data).toEqual([{ curtiu: false }])
    await clienteAna.from('avaliacoes').update({ curtiu: true }).eq('filme_id', FILME)
  })

  it('ninguém logado escreve em filmes_avaliados', async () => {
    const insercao = await clienteAna
      .from('filmes_avaliados')
      .insert({ filme_id: FILME + 2, titulo: 'Título Forjado' })
    expect(insercao.error).not.toBeNull()
    const alteracao = await clienteAna
      .from('filmes_avaliados')
      .update({ titulo: 'Título Forjado' })
      .eq('filme_id', FILME)
    expect(alteracao.error).not.toBeNull()
    const { data } = await admin().from('filmes_avaliados').select('titulo').eq('filme_id', FILME).single()
    expect(data?.titulo).toBe('Filme de Integração')
  })

  it('o filme só entra no ranking a partir de 3 votos', async () => {
    expect(await linhaDoRanking(FILME)).toBeNull()

    await clienteBia.from('avaliacoes').insert({ usuario_id: bia.id, filme_id: FILME, curtiu: true })
    expect(await linhaDoRanking(FILME)).toBeNull()

    const clienteCaio = await clienteDe(caio)
    await clienteCaio.from('avaliacoes').insert({ usuario_id: caio.id, filme_id: FILME, curtiu: false })

    const linha = await linhaDoRanking(FILME)
    expect(linha).toMatchObject({ votos: 3, curtidas: 2, aprovacao: 67 })
  })

  it('o ranking não devolve nenhuma coluna que identifique quem votou', async () => {
    const { data } = await admin().from('ranking_filmes').select('*').eq('filme_id', FILME).single()
    expect(Object.keys(data ?? {}).sort()).toEqual(
      ['ano', 'aprovacao', 'curtidas', 'filme_id', 'poster_url', 'titulo', 'votos'].sort(),
    )
  })

  it('visitante sem login lê o ranking, mas não os votos', async () => {
    const visitante = createClient(url, chavePublica, semSessao)
    const ranking = await visitante.from('ranking_filmes').select('filme_id').eq('filme_id', FILME)
    expect(ranking.error).toBeNull()
    expect(ranking.data).toHaveLength(1)

    const votos = await visitante.from('avaliacoes').select('curtiu')
    expect(votos.error !== null || (votos.data ?? []).length === 0).toBe(true)
  })

  it('excluir a conta apaga o voto e o filme sai do ranking', async () => {
    expect((await admin().auth.admin.deleteUser(caio.id)).error).toBeNull()
    contas.splice(contas.indexOf(caio), 1)
    const votosRestantes = await admin().from('avaliacoes').select('usuario_id').eq('filme_id', FILME)
    expect(votosRestantes.data).toHaveLength(2)
    expect(await linhaDoRanking(FILME)).toBeNull()
  })

  it('recusa filme_id inválido', async () => {
    const { error } = await clienteBia.from('avaliacoes').insert({
      usuario_id: bia.id,
      filme_id: 0,
      curtiu: true,
    })
    expect(error?.code).toBe('23514')
  })
})
```

- [ ] **Step 3: Conferir que nada quebrou e commitar**

Run: `npx vitest run` e `npm run typecheck`.
Expected: os unitários passam (o teste de integração é excluído de `vitest.config.mts`); typecheck limpo. **Não** rode `npm run test:supabase` ainda — depende da Task 3.

```powershell
git add supabase testes-integracao
git commit -m "feat: banco das avaliações, com RLS e visão de ranking" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Aplicar a migração no Supabase (com o dono do produto)

> **Execução pelo controlador, junto com o dono.** Não despache para um subagente: depende de painel web. Peça **uma ação por vez**. Nenhuma chave no chat.

**Files:** nenhum.

**Interfaces:**
- Consumes: o SQL da Task 2.
- Produces: tabelas e visão aplicadas nos projetos `cineteca` e `cineteca-testes`.

- [ ] **Step 1: Aplicar o SQL nos dois projetos**

Peça ao dono, um projeto de cada vez:

1. Abrir https://supabase.com/dashboard e **conferir no topo** qual projeto está selecionado.
2. **SQL Editor → New query**.
3. Colar o conteúdo de `supabase/migrations/20260930000000_avaliacoes.sql` e clicar em **Run**.
4. Resultado esperado: "Success. No rows returned".
5. Repetir no outro projeto.

Comece pelo `cineteca-testes`, para um erro de SQL não bater primeiro em produção.

- [ ] **Step 2: Rodar o teste de integração**

Run: `npm run test:supabase`
Expected: PASS — os 11 testes da Fase 2 mais os 10 desta fase.

- Se falhar com `42501` onde se esperava sucesso, o SQL não foi aplicado inteiro no projeto de testes.
- Se a visão não existir, confira se o bloco `create view` foi colado junto.

- [ ] **Step 3: Commit (só se algo mudou no repositório)**

```powershell
git status --short
```

---

### Task 4: Leitura do banco e Server Action do voto

**Files:**
- Create: `lib/avaliacoes/banco.ts`, `lib/avaliacoes/acoes.ts`
- Test: `lib/avaliacoes/banco.test.ts`

**Interfaces:**
- Consumes: `criarClienteServidor` (`lib/supabase/servidor.ts`), `criarClienteAdmin` (`lib/supabase/admin.ts`), `getMovieDetails` (`lib/tmdb/detalhes.ts`), tipos e funções da Task 1.
- Produces:
  - `type RespostaAvaliacao = { ok: true; estado: AvaliacaoDoFilme } | { ok: false; erro: string; sessaoExpirada: boolean }`
  - `lerAvaliacaoDoFilme(cliente, filmeId: number, usuarioId: string | null): Promise<AvaliacaoDoFilme>`
  - `lerRanking(cliente, limite: number): Promise<ItemRanking[]>`
  - `obterAvaliacaoDoFilme(filmeId: number): Promise<AvaliacaoDoFilme>` (server-only)
  - `obterRanking(limite?: number): Promise<ItemRanking[]>` (server-only)
  - Server Action `avaliar(filmeId: unknown, curtiu: unknown): Promise<RespostaAvaliacao>`
  - `MENSAGEM_ERRO_VOTO = 'Não foi possível salvar. Tente de novo.'`

- [ ] **Step 1: Escrever o teste (falhando)**

`lib/avaliacoes/banco.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { lerAvaliacaoDoFilme, lerRanking } from './banco'

type Resposta = { data: unknown; error: { code?: string; message?: string } | null; status?: number }

// Devolve uma resposta diferente por tabela consultada.
function clienteFalso(porTabela: Record<string, Resposta>) {
  const chamadas: { metodo: string; args: unknown[] }[] = []
  const criarConsulta = (tabela: string) => {
    const resposta = porTabela[tabela] ?? { data: [], error: null, status: 200 }
    const consulta: Record<string, unknown> = {}
    for (const metodo of ['select', 'eq', 'order', 'limit', 'maybeSingle']) {
      consulta[metodo] = (...args: unknown[]) => {
        chamadas.push({ metodo, args })
        return metodo === 'maybeSingle' ? Promise.resolve(resposta) : consulta
      }
    }
    consulta.then = (aoResolver: (r: Resposta) => unknown, aoRejeitar?: (e: unknown) => unknown) =>
      Promise.resolve(resposta).then(aoResolver, aoRejeitar)
    return consulta
  }
  const cliente = {
    from: (tabela: string) => {
      chamadas.push({ metodo: 'from', args: [tabela] })
      return criarConsulta(tabela)
    },
  }
  return { cliente: cliente as never, chamadas }
}

describe('lerAvaliacaoDoFilme', () => {
  it('devolve o voto da pessoa e o agregado', async () => {
    const { cliente } = clienteFalso({
      avaliacoes: { data: { curtiu: true }, error: null, status: 200 },
      ranking_filmes: { data: { votos: 50, curtidas: 41, aprovacao: 82 }, error: null, status: 200 },
    })
    expect(await lerAvaliacaoDoFilme(cliente, 603, 'u1')).toEqual({
      meuVoto: true,
      agregado: { votos: 50, curtidas: 41, aprovacao: 82 },
    })
  })

  it('sem usuário, não consulta o voto e devolve meuVoto nulo', async () => {
    const { cliente, chamadas } = clienteFalso({
      ranking_filmes: { data: { votos: 3, curtidas: 3, aprovacao: 100 }, error: null, status: 200 },
    })
    const estado = await lerAvaliacaoDoFilme(cliente, 603, null)
    expect(estado.meuVoto).toBeNull()
    expect(chamadas.some((c) => c.args[0] === 'avaliacoes')).toBe(false)
  })

  it('filme fora do ranking devolve agregado nulo', async () => {
    const { cliente } = clienteFalso({
      avaliacoes: { data: null, error: null, status: 200 },
      ranking_filmes: { data: null, error: null, status: 200 },
    })
    expect(await lerAvaliacaoDoFilme(cliente, 603, 'u1')).toEqual({ meuVoto: null, agregado: null })
  })

  it('erro na leitura não derruba a página: devolve o estado vazio', async () => {
    const { cliente } = clienteFalso({
      avaliacoes: { data: null, error: { code: 'PGRST301' }, status: 401 },
      ranking_filmes: { data: null, error: { code: '500' }, status: 500 },
    })
    expect(await lerAvaliacaoDoFilme(cliente, 603, 'u1')).toEqual({ meuVoto: null, agregado: null })
  })
})

describe('lerRanking', () => {
  it('converte as linhas do banco e respeita o limite', async () => {
    const { cliente, chamadas } = clienteFalso({
      ranking_filmes: {
        data: [
          { filme_id: 603, titulo: 'Matrix', poster_url: 'https://img/p.jpg', ano: '1999', votos: 50, curtidas: 41, aprovacao: 82 },
        ],
        error: null,
        status: 200,
      },
    })
    expect(await lerRanking(cliente, 20)).toEqual([
      { filmeId: 603, titulo: 'Matrix', posterUrl: 'https://img/p.jpg', ano: '1999', votos: 50, curtidas: 41, aprovacao: 82 },
    ])
    expect(chamadas.some((c) => c.metodo === 'limit' && c.args[0] === 20)).toBe(true)
  })

  it('erro devolve lista vazia em vez de quebrar', async () => {
    const { cliente } = clienteFalso({
      ranking_filmes: { data: null, error: { code: '500' }, status: 500 },
    })
    expect(await lerRanking(cliente, 20)).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run lib/avaliacoes/banco.test.ts`
Expected: FAIL — `Cannot find module './banco'`.

- [ ] **Step 3: Implementar a leitura**

`lib/avaliacoes/banco.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import type { AvaliacaoDoFilme, ItemRanking } from './tipos'

type Cliente = Pick<SupabaseClient, 'from'>

type LinhaRanking = {
  filme_id: number
  titulo: string
  poster_url: string | null
  ano: string | null
  votos: number
  curtidas: number
  aprovacao: number
}

function paraItem(linha: LinhaRanking): ItemRanking {
  return {
    filmeId: linha.filme_id,
    titulo: linha.titulo,
    posterUrl: linha.poster_url,
    ano: linha.ano,
    votos: linha.votos,
    curtidas: linha.curtidas,
    aprovacao: linha.aprovacao,
  }
}

// Falha de leitura nunca derruba a página: o bloco some e a pessoa pode votar de novo.
export async function lerAvaliacaoDoFilme(
  cliente: Cliente,
  filmeId: number,
  usuarioId: string | null,
): Promise<AvaliacaoDoFilme> {
  const consultaAgregado = cliente
    .from('ranking_filmes')
    .select('votos, curtidas, aprovacao')
    .eq('filme_id', filmeId)
    .maybeSingle()

  const consultaVoto = usuarioId
    ? cliente.from('avaliacoes').select('curtiu').eq('filme_id', filmeId).maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [agregado, voto] = await Promise.all([consultaAgregado, consultaVoto])

  if (agregado.error) console.error('[CineTeca] Falha ao ler o agregado:', agregado.error.code)
  if (voto.error) console.error('[CineTeca] Falha ao ler o voto:', voto.error.code)

  const dadosAgregado = agregado.error ? null : (agregado.data as Omit<ItemRanking, 'filmeId' | 'titulo' | 'posterUrl' | 'ano'> | null)
  const dadosVoto = voto.error ? null : (voto.data as { curtiu: boolean } | null)

  return {
    meuVoto: dadosVoto ? dadosVoto.curtiu : null,
    agregado: dadosAgregado
      ? { votos: dadosAgregado.votos, curtidas: dadosAgregado.curtidas, aprovacao: dadosAgregado.aprovacao }
      : null,
  }
}

export async function lerRanking(cliente: Cliente, limite: number): Promise<ItemRanking[]> {
  const { data, error } = await cliente
    .from('ranking_filmes')
    .select('filme_id, titulo, poster_url, ano, votos, curtidas, aprovacao')
    .limit(limite)
  if (error) {
    console.error('[CineTeca] Falha ao ler o ranking:', error.code)
    return []
  }
  return ((data ?? []) as LinhaRanking[]).map(paraItem)
}

export async function obterAvaliacaoDoFilme(filmeId: number): Promise<AvaliacaoDoFilme> {
  try {
    const supabase = await criarClienteServidor()
    const { data } = await supabase.auth.getUser()
    return await lerAvaliacaoDoFilme(supabase, filmeId, data.user?.id ?? null)
  } catch {
    return { meuVoto: null, agregado: null }
  }
}

export async function obterRanking(limite = 50): Promise<ItemRanking[]> {
  try {
    const supabase = await criarClienteServidor()
    return await lerRanking(supabase, limite)
  } catch {
    return []
  }
}
```

> A visão já vem ordenada do banco, então `lerRanking` não reordena. `ordenarRanking` (Task 1) existe para os testes e para quem precisar reordenar em memória.

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run lib/avaliacoes`
Expected: PASS.

- [ ] **Step 5: Implementar a Server Action**

`lib/avaliacoes/acoes.ts`:
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { getMovieDetails } from '@/lib/tmdb/detalhes'
import { lerAvaliacaoDoFilme } from './banco'
import type { AvaliacaoDoFilme } from './tipos'
import { validarFilmeId, validarVoto } from './validacao'

export const MENSAGEM_ERRO_VOTO = 'Não foi possível salvar. Tente de novo.'

export type RespostaAvaliacao =
  | { ok: true; estado: AvaliacaoDoFilme }
  | { ok: false; erro: string; sessaoExpirada: boolean }

const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])

function falhou(codigo: string | undefined, acao: string): { ok: false; erro: string; sessaoExpirada: boolean } {
  console.error(`[CineTeca] ${acao} falhou:`, codigo ?? 'sem código')
  return { ok: false, erro: MENSAGEM_ERRO_VOTO, sessaoExpirada: CODIGOS_DE_SESSAO.has(codigo ?? '') }
}

export async function avaliar(filmeId: unknown, curtiu: unknown): Promise<RespostaAvaliacao> {
  const id = validarFilmeId(filmeId)
  if (!id.ok) return { ok: false, erro: id.erro, sessaoExpirada: false }
  const voto = validarVoto(curtiu)
  if (!voto.ok) return { ok: false, erro: voto.erro, sessaoExpirada: false }

  const supabase = await criarClienteServidor()
  const { data: sessao } = await supabase.auth.getUser()
  if (!sessao.user) return { ok: false, erro: MENSAGEM_ERRO_VOTO, sessaoExpirada: true }
  const usuarioId = sessao.user.id

  if (voto.valor === null) {
    const { error } = await supabase.from('avaliacoes').delete().eq('usuario_id', usuarioId).eq('filme_id', id.valor)
    if (error) return falhou(error.code, 'desfazer voto')
  } else {
    // O título vem do TMDB, nunca do navegador: é o que impede um filme forjado no ranking.
    const filme = await getMovieDetails(id.valor).catch(() => null)
    if (!filme) return { ok: false, erro: 'Filme inválido', sessaoExpirada: false }

    const cadastro = await criarClienteAdmin()
      .from('filmes_avaliados')
      .upsert(
        {
          filme_id: id.valor,
          titulo: filme.title.slice(0, 300),
          poster_url: filme.posterUrl,
          ano: filme.year,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'filme_id' },
      )
    if (cadastro.error) return falhou(cadastro.error.code, 'cadastrar filme avaliado')

    const { error } = await supabase.from('avaliacoes').upsert(
      { usuario_id: usuarioId, filme_id: id.valor, curtiu: voto.valor, atualizado_em: new Date().toISOString() },
      { onConflict: 'usuario_id,filme_id' },
    )
    if (error) return falhou(error.code, 'avaliar')
  }

  revalidatePath('/mais-curtidos')
  revalidatePath('/')
  return { ok: true, estado: await lerAvaliacaoDoFilme(supabase, id.valor, usuarioId) }
}
```

- [ ] **Step 6: Conferir e commitar**

Run: `npx vitest run`, `npm run typecheck` e `npm run build`.
Expected: todos passam. O build não exige Supabase configurado.

```powershell
git add lib/avaliacoes
git commit -m "feat: leitura das avaliações e ação de votar pelo servidor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Bloco de avaliação na página do filme

**Files:**
- Create: `components/BlocoAvaliacao.tsx`
- Modify: `app/filme/[id]/page.tsx`
- Test: `e2e/avaliacao.spec.ts`

**Interfaces:**
- Consumes: `avaliar`, `MENSAGEM_ERRO_VOTO`, `RespostaAvaliacao` (Task 4); `obterAvaliacaoDoFilme` (Task 4); `textoAgregado` (Task 1); `useUsuario` (`components/SessaoProvider.tsx`); `useAvisos` (`components/AvisosProvider.tsx`); `JanelaLogin` (`components/JanelaLogin.tsx`); `paraFilmeSalvo` (`lib/lista/tipos.ts`).
- Produces: `<BlocoAvaliacao filme={FilmeSalvo} inicial={AvaliacaoDoFilme} />`.

> `JanelaLogin` espera `pendente={{ tipo, filme }}`. Aqui o voto **não** fica pendente: passe `tipo="favoritos"` apenas para satisfazer o tipo e **não** chame `guardarAcaoPendente`. Se isso exigir mudar `JanelaLogin`, torne `pendente` opcional — nesse caso o componente não guarda ação nenhuma. Registre a escolha no relatório.

- [ ] **Step 1: Escrever o teste ponta a ponta (falhando)**

`e2e/avaliacao.spec.ts`:
```ts
import { clienteAdmin, apagarUsuarioTeste } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

const FILME = 1001
const bloco = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Você já viu esse filme?' })

test('sem conta, votar abre a janela de login', async ({ page }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti' }).click()
  await expect(page.getByRole('dialog', { name: 'Entre para salvar seus filmes' })).toBeVisible()
})

test('votar, ver o próprio voto e desfazer', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti' }).click()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()

  await expect
    .poll(async () => {
      const { data } = await clienteAdmin()
        .from('avaliacoes')
        .select('curtiu')
        .eq('usuario_id', logado.id)
        .eq('filme_id', FILME)
      return data?.length ?? 0
    })
    .toBe(1)

  await bloco(page).getByRole('button', { name: 'Mudar meu voto' }).click()
  await bloco(page).getByRole('button', { name: 'Curti' }).click()
  await expect(bloco(page).getByRole('button', { name: 'Não curti' })).toBeVisible()
  await expect(bloco(page).getByText('Você curtiu.')).toHaveCount(0)
})

test('mudar de curti para não curti', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti' }).click()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()
  await bloco(page).getByRole('button', { name: 'Mudar meu voto' }).click()
  await bloco(page).getByRole('button', { name: 'Não curti' }).click()
  await expect(bloco(page).getByText('Você não curtiu.')).toBeVisible()
})

test('o voto continua lá depois de recarregar', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti' }).click()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()
  await page.reload()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()
})

test('clique duplo rápido gera um voto só', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti' }).dblclick()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()
  const { data } = await clienteAdmin()
    .from('avaliacoes')
    .select('filme_id')
    .eq('usuario_id', logado.id)
  expect(data).toHaveLength(1)
})

test('se a gravação for recusada, a tela desfaz e avisa', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await apagarUsuarioTeste(logado) // a conta some com a página aberta
  await bloco(page).getByRole('button', { name: 'Curti' }).click()
  await expect(
    page
      .getByText('Não foi possível salvar. Tente de novo.')
      .or(page.getByRole('dialog', { name: 'Entre para salvar seus filmes' })),
  ).toBeVisible()
  await expect(bloco(page).getByText('Você curtiu.')).toHaveCount(0)
})

test('o bloco não mostra percentual enquanto o filme tem poucos votos', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti' }).click()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()
  await expect(bloco(page).getByText(/das pessoas curtiram/)).toHaveCount(0)
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx playwright test e2e/avaliacao.spec.ts --project=desktop`
Expected: FAIL — a região "Você já viu esse filme?" não existe.

- [ ] **Step 3: Implementar o bloco**

`components/BlocoAvaliacao.tsx`:
```tsx
'use client'

import { useState, useTransition } from 'react'
import { avaliar, MENSAGEM_ERRO_VOTO } from '@/lib/avaliacoes/acoes'
import { textoAgregado } from '@/lib/avaliacoes/calculo'
import type { AvaliacaoDoFilme, Voto } from '@/lib/avaliacoes/tipos'
import type { FilmeSalvo } from '@/lib/lista/tipos'
import { useAvisos } from './AvisosProvider'
import { BOTAO_SECUNDARIO } from './estilos'
import { JanelaLogin } from './JanelaLogin'
import { useUsuario } from './SessaoProvider'

const TITULO = 'Você já viu esse filme?'

export function BlocoAvaliacao({ filme, inicial }: { filme: FilmeSalvo; inicial: AvaliacaoDoFilme }) {
  const usuario = useUsuario()
  const { mostrar } = useAvisos()
  const [estado, setEstado] = useState<AvaliacaoDoFilme>(inicial)
  const [editando, setEditando] = useState(false)
  const [janela, setJanela] = useState(false)
  const [enviando, iniciar] = useTransition()

  const votar = (novo: Voto) => {
    if (!usuario) {
      setJanela(true)
      return
    }
    if (enviando) return
    const alvo = estado.meuVoto === novo ? null : novo
    iniciar(async () => {
      const resposta = await avaliar(filme.id, alvo)
      if (resposta.ok) {
        setEstado(resposta.estado)
        setEditando(false)
        return
      }
      if (resposta.sessaoExpirada) setJanela(true)
      else mostrar(resposta.erro || MENSAGEM_ERRO_VOTO)
    })
  }

  const votou = estado.meuVoto !== null
  const mostrarBotoes = !votou || editando

  return (
    <section aria-labelledby="titulo-avaliacao" className="rounded-xl bg-superficie/60 p-5 ring-1 ring-white/10">
      <h2 id="titulo-avaliacao" className="text-lg font-bold">
        {TITULO}
      </h2>

      {mostrarBotoes ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            aria-pressed={estado.meuVoto === true}
            disabled={enviando}
            onClick={() => votar(true)}
            className={`${BOTAO_SECUNDARIO} ${estado.meuVoto === true ? 'ring-2 ring-white' : ''}`}
          >
            👍 Curti
          </button>
          <button
            type="button"
            aria-pressed={estado.meuVoto === false}
            disabled={enviando}
            onClick={() => votar(false)}
            className={`${BOTAO_SECUNDARIO} ${estado.meuVoto === false ? 'ring-2 ring-white' : ''}`}
          >
            👎 Não curti
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-1">
          <p className="font-semibold text-white">{estado.meuVoto ? 'Você curtiu.' : 'Você não curtiu.'}</p>
          {estado.agregado && <p className="text-sm text-white/70">{textoAgregado(estado.agregado)}</p>}
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-sm text-white/60 underline hover:text-white"
          >
            Mudar meu voto
          </button>
        </div>
      )}

      {janela && (
        <JanelaLogin pendente={{ tipo: 'favoritos', filme }} aoFechar={() => setJanela(false)} />
      )}
    </section>
  )
}
```

- [ ] **Step 4: Ligar na página do filme**

Em `app/filme/[id]/page.tsx`:

1. Acrescente os imports:
```tsx
import { BlocoAvaliacao } from '@/components/BlocoAvaliacao'
import { obterAvaliacaoDoFilme } from '@/lib/avaliacoes/banco'
```
2. Logo depois de obter `filme` com sucesso, carregue a avaliação:
```tsx
  const avaliacao = await obterAvaliacaoDoFilme(id)
```
3. Dentro do `<div className={`${CONTEUDO} space-y-12 pb-8`}>`, **antes** de `<OndeAssistir …>`, insira:
```tsx
        <BlocoAvaliacao filme={salvo} inicial={avaliacao} />
```

- [ ] **Step 5: Rodar para ver passar**

Run:
```powershell
npm run typecheck
npx playwright test e2e/avaliacao.spec.ts
```
Expected: PASS no desktop e no celular.

- [ ] **Step 6: Commit**

```powershell
git add components/BlocoAvaliacao.tsx components/JanelaLogin.tsx "app/filme" e2e/avaliacao.spec.ts
git commit -m "feat: bloco de avaliação na página do filme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Página /mais-curtidos e item no menu

**Files:**
- Create: `app/mais-curtidos/page.tsx`
- Modify: `components/Navbar.tsx`
- Test: `e2e/ranking.spec.ts`

**Interfaces:**
- Consumes: `obterRanking` (Task 4), `textoVotos` (Task 1), `ImagemComReserva`, `CONTEUDO`, `BOTAO_PRIMARIO`, `inserirFilmes`/`clienteAdmin` (`e2e/conta/ajudantes.ts`).
- Produces: rota `/mais-curtidos`; item "Mais curtidos" no menu principal (computador e celular).

- [ ] **Step 1: Escrever o teste ponta a ponta (falhando)**

`e2e/ranking.spec.ts`:
```ts
import { clienteAdmin, criarUsuarioTeste, apagarUsuarioTeste, type UsuarioTeste } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

const FILME = 1001

async function votarNoBanco(usuarios: UsuarioTeste[], curtidas: number) {
  await clienteAdmin().from('filmes_avaliados').upsert({
    filme_id: FILME,
    titulo: 'Filme Teste 1001',
    poster_url: null,
    ano: '2024',
  })
  const linhas = usuarios.map((u, i) => ({ usuario_id: u.id, filme_id: FILME, curtiu: i < curtidas }))
  const { error } = await clienteAdmin().from('avaliacoes').insert(linhas)
  if (error) throw error
}

test('sem filmes qualificados, a página convida a avaliar', async ({ page }) => {
  await page.goto('/mais-curtidos')
  await expect(page.getByRole('heading', { level: 1, name: 'Mais curtidos na CineTeca' })).toBeVisible()
  await expect(page.getByText('Ainda não há filmes avaliados o suficiente.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explorar filmes' })).toBeVisible()
})

test('com 3 votos o filme entra no ranking, com posição e porcentagem', async ({ page }) => {
  const usuarios = [await criarUsuarioTeste(), await criarUsuarioTeste(), await criarUsuarioTeste()]
  try {
    await votarNoBanco(usuarios, 2)
    await page.goto('/mais-curtidos')
    const linha = page.getByRole('listitem').filter({ hasText: 'Filme Teste 1001' })
    await expect(linha).toBeVisible()
    await expect(linha.getByText('67% curtiram')).toBeVisible()
    await expect(linha.getByText('3 votos')).toBeVisible()
    await expect(page.getByText('Ainda não há filmes avaliados o suficiente.')).toHaveCount(0)
  } finally {
    for (const u of usuarios) await apagarUsuarioTeste(u)
  }
})

test('o menu leva para a página de ranking', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Mais curtidos', exact: true })
    .click()
  await expect(page).toHaveURL(/\/mais-curtidos$/)
})

test('visitante sem conta vê o ranking', async ({ page }) => {
  const usuarios = [await criarUsuarioTeste(), await criarUsuarioTeste(), await criarUsuarioTeste()]
  try {
    await votarNoBanco(usuarios, 3)
    await page.goto('/mais-curtidos')
    await expect(page.getByText('Filme Teste 1001')).toBeVisible()
    await expect(page.getByText('100% curtiram')).toBeVisible()
  } finally {
    for (const u of usuarios) await apagarUsuarioTeste(u)
  }
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx playwright test e2e/ranking.spec.ts --project=desktop`
Expected: FAIL — `/mais-curtidos` devolve 404.

- [ ] **Step 3: Implementar a página**

`app/mais-curtidos/page.tsx`:
```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ImagemComReserva } from '@/components/ImagemComReserva'
import { CONTEUDO, BOTAO_PRIMARIO } from '@/components/estilos'
import { obterRanking } from '@/lib/avaliacoes/banco'
import { textoVotos } from '@/lib/avaliacoes/calculo'

export const metadata: Metadata = { title: 'Mais curtidos' }

export default async function PaginaMaisCurtidos() {
  const filmes = await obterRanking(50)

  return (
    <div className={`${CONTEUDO} pb-16 pt-24`}>
      <h1 className="mb-2 text-3xl font-extrabold md:text-4xl">Mais curtidos na CineTeca</h1>
      <p className="mb-8 text-white/60">Ordenado pela aprovação de quem já viu. Mínimo de 3 votos.</p>

      {filmes.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-10">
          <p className="text-lg text-white/70">Ainda não há filmes avaliados o suficiente.</p>
          <p className="text-white/60">Avalie os filmes que você já viu e ajude a montar o ranking.</p>
          <Link href="/" className={BOTAO_PRIMARIO}>
            Explorar filmes
          </Link>
        </div>
      ) : (
        <ol className="space-y-3">
          {filmes.map((filme, indice) => (
            <li
              key={filme.filmeId}
              className="flex items-center gap-4 rounded-lg bg-superficie/60 p-3 ring-1 ring-white/10"
            >
              <span className="w-8 shrink-0 text-center text-xl font-extrabold text-white/40">{indice + 1}</span>
              <Link href={`/filme/${filme.filmeId}`} className="flex min-w-0 flex-1 items-center gap-4">
                <ImagemComReserva
                  src={filme.posterUrl}
                  reserva="/poster-padrao.svg"
                  alt=""
                  className="h-20 w-[3.33rem] shrink-0 rounded object-cover"
                />
                <span className="min-w-0">
                  <span className="block truncate font-bold">{filme.titulo}</span>
                  {filme.ano && <span className="block text-sm text-white/60">{filme.ano}</span>}
                </span>
              </Link>
              <span className="shrink-0 text-right">
                <span className="block font-extrabold text-destaque">{filme.aprovacao}% curtiram</span>
                <span className="block text-sm text-white/60">{textoVotos(filme.votos)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
```

> `ImagemComReserva` exige `reserva`. O arquivo padrão do projeto é `/poster-padrao.svg`, em `public/`.

- [ ] **Step 4: Acrescentar o item no menu**

Em `components/Navbar.tsx`:

1. No menu do computador, depois do `<li>` de "Minha lista":
```tsx
            <li>
              <LinkNav href="/mais-curtidos" ativo={pathname === '/mais-curtidos'}>
                Mais curtidos
              </LinkNav>
            </li>
```
2. No menu do celular, depois do `<li>` de "Minha lista":
```tsx
              <li>
                <Link href="/mais-curtidos" onClick={fecharMenu} className="block py-3">
                  Mais curtidos
                </Link>
              </li>
```

- [ ] **Step 5: Rodar para ver passar**

Run:
```powershell
npm run typecheck
npx playwright test e2e/ranking.spec.ts
```
Expected: PASS no desktop e no celular.

- [ ] **Step 6: Commit**

```powershell
git add "app/mais-curtidos" components/Navbar.tsx e2e/ranking.spec.ts
git commit -m "feat: página Mais curtidos e item no menu" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Fileira "Mais curtidos" na página inicial

**Files:**
- Create: `components/FileiraRanking.tsx`
- Modify: `app/(inicio)/page.tsx`
- Test: `e2e/ranking.spec.ts` (acrescentar dois testes)

**Interfaces:**
- Consumes: `obterRanking` (Task 4) e `Carrossel` (`components/Carrossel.tsx`), que é o que a home usa para uma fileira com "Ver tudo". `Carrossel` recebe `{ titulo, filmes: MovieSummary[], verMaisHref?, automatico? }` e já envolve tudo num `SecaoFileira`, cuja `<section aria-labelledby>` dá o nome acessível igual ao título.
- Produces: `<FileiraRanking />`, componente de servidor que não renderiza nada quando há menos de 3 filmes qualificados.

- [ ] **Step 1: Escrever os testes (falhando)**

Acrescente ao fim de `e2e/ranking.spec.ts`:
```ts
test('a home não mostra a fileira quando há poucos filmes qualificados', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Mais curtidos na CineTeca' })).toHaveCount(0)
})

test('a home mostra a fileira com 3 filmes qualificados', async ({ page }) => {
  const usuarios = [await criarUsuarioTeste(), await criarUsuarioTeste(), await criarUsuarioTeste()]
  const filmes = [1001, 1002, 2001]
  try {
    for (const filmeId of filmes) {
      await clienteAdmin()
        .from('filmes_avaliados')
        .upsert({ filme_id: filmeId, titulo: `Filme Teste ${filmeId}`, poster_url: null, ano: '2024' })
      const { error } = await clienteAdmin()
        .from('avaliacoes')
        .insert(usuarios.map((u) => ({ usuario_id: u.id, filme_id: filmeId, curtiu: true })))
      if (error) throw error
    }
    await page.goto('/')
    const fileira = page.getByRole('region', { name: 'Mais curtidos na CineTeca' })
    await expect(fileira).toBeVisible()
    await expect(fileira.getByRole('link', { name: /Ver tudo/ })).toHaveAttribute('href', '/mais-curtidos')
  } finally {
    for (const u of usuarios) await apagarUsuarioTeste(u)
  }
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx playwright test e2e/ranking.spec.ts --project=desktop -g "home"`
Expected: FAIL no segundo teste — a região não existe. O primeiro já passa, e isso é esperado.

- [ ] **Step 3: Implementar a fileira**

`components/FileiraRanking.tsx`:
```tsx
import { obterRanking } from '@/lib/avaliacoes/banco'
import type { MovieSummary } from '@/lib/tmdb/tipos'
import { Carrossel } from './Carrossel'

const TITULO = 'Mais curtidos na CineTeca'
// Com menos de 3 filmes qualificados a fileira ficaria pela metade: melhor não aparecer.
const MINIMO_DE_FILMES = 3

export async function FileiraRanking() {
  const itens = await obterRanking(20)
  if (itens.length < MINIMO_DE_FILMES) return null

  // O ranking guarda só o necessário para exibir; o resto do MovieSummary fica vazio.
  const filmes: MovieSummary[] = itens.map((i) => ({
    id: i.filmeId,
    title: i.titulo,
    overview: '',
    posterUrl: i.posterUrl,
    backdropUrl: null,
    year: i.ano,
    rating: null,
    genres: [],
  }))

  return <Carrossel titulo={TITULO} filmes={filmes} verMaisHref="/mais-curtidos" />
}
```

- [ ] **Step 4: Ligar na home**

Em `app/(inicio)/page.tsx`:

1. Acrescente o import:
```tsx
import { FileiraRanking } from '@/components/FileiraRanking'
```
2. Dentro da `<div>` que envolve as fileiras, **antes** do `{FILEIRAS.map(...)}`, insira:
```tsx
        <Suspense fallback={null}>
          <FileiraRanking />
        </Suspense>
```

- [ ] **Step 5: Rodar tudo**

Run:
```powershell
npx vitest run
npm run typecheck
npx playwright test
```
Expected: todos PASS, no desktop e no celular.

- [ ] **Step 6: Commit**

```powershell
git add components/FileiraRanking.tsx "app/(inicio)" e2e/ranking.spec.ts
git commit -m "feat: fileira Mais curtidos na página inicial" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: README e conferência final (com o dono do produto)

> **Execução pelo controlador, junto com o dono.**

**Files:**
- Modify: `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: tudo o que foi feito.
- Produces: Fase 3 publicada e conferida em produção.

- [ ] **Step 1: Documentação**

Em `README.md`, na seção "Onde fica cada coisa", acrescente:
```markdown
- `lib/avaliacoes/` — curtidas dos usuários e o ranking dos mais curtidos.
```

Em `CLAUDE.md`, na seção "Fases", marque a Fase 2 como concluída e acrescente a Fase 3 com o caminho da spec e deste plano.

```powershell
git add README.md CLAUDE.md
git commit -m "docs: README e CLAUDE.md com a Fase 3" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Publicar**

O dono envia pelo VS Code (**Controle do Código-Fonte → Sincronizar Alterações**) e a Vercel publica sozinha. Lembre-o de que a migração da Task 3 já precisa estar aplicada no projeto `cineteca`, senão a página do filme e o ranking falham em produção.

- [ ] **Step 3: Conferência com o dono**

Em `https://cineteca-gules.vercel.app`:

1. Abrir um filme e votar "Curti". A confirmação aparece.
2. Recarregar: o voto continua lá.
3. Mudar o voto para "Não curti".
4. Desfazer o voto: os dois botões voltam.
5. Sair da conta e abrir a página do filme: os botões aparecem e levam ao login.
6. Abrir `/mais-curtidos` sem conta.

Depois, confira os **Logs** da Vercel: nenhuma linha `[CineTeca] ... falhou` inesperada.
