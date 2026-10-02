# Moodboard de Cenas — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pessoa salva cenas (backdrops) de filmes em coleções temáticas, os moodboards, que só ela edita e que qualquer um vê por link.

**Architecture:** Duas tabelas no Supabase (`moodboards`, `moodboard_cenas`) com RLS só para o dono, como a Sessão dupla. Todas as gravações passam por Server Actions, que conferem a cena no TMDB antes de gravar. A página pública `/moodboard/[id]` lê pelo servidor com `criarClienteAdmin()`. A tela cheia da galeria vira um componente próprio (`TelaCheia`) e é reaproveitada na página do moodboard.

**Tech Stack:** Next.js 16.3 (App Router), React 19, TypeScript 7, Tailwind v4, Supabase (`@supabase/supabase-js` 2.117), Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-02-cineteca-moodboard-cenas-design.md`

## Global Constraints

- Todo texto na tela em pt-BR.
- Cores só por token: `destaque` sempre com texto preto; `perigo` só para erro e exclusão.
- `<img>` simples, nunca `next/image`.
- Logs com prefixo `[CineTeca]` e só o código do erro. Nunca id de usuário, token ou chave.
- Next 16: `params` é `Promise`. TypeScript 7: a variável do `catch` é `unknown`.
- Hooks do Vitest com corpo em bloco `{ ... }`.
- Arquivos com barra invertida (regex) são criados com a ferramenta de escrita, nunca com heredoc.
- Falha de gravação desfaz na tela e avisa. Falha de leitura mostra `MensagemErro`, nunca lista vazia.
- O site respeita `prefers-reduced-motion`: transições com `motion-reduce:transition-none`.
- Nenhum nome de usuário nem `usuario_id` chega à página pública.
- Git: trabalhar no branch `moodboard-cenas`, um commit por task, `git add` com os arquivos nomeados (nunca `-A`). Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Publicação por Pull Request: o dono clica em "Merge pull request". Nunca push no `master`.

## Review Focus

1. **Sem conta**, "Salvar no moodboard" abre a `JanelaLogin`; o Esc fecha só ela e a tela cheia continua aberta, com o foco de volta no botão. Teste: Task 8, "sem conta".
2. **Janela do moodboard por cima da tela cheia**: o Tab não sai da janela e o Esc fecha só a janela. Teste: Task 8, "Tab fica na janela".
3. **A mesma cena duas vezes** no mesmo moodboard mostra "Essa cena já está neste moodboard", não erro genérico. Testes: Task 2 (`23505`) e Task 8.
4. **O 21º moodboard** mostra "Você atingiu o limite de 20 moodboards". Teste: Task 8, "limite".
5. **Endereço inválido ou moodboard apagado** dá 404, não erro 500. Teste: Task 8, "404".

---

### Task 0: Branch

- [ ] **Step 1: Criar o branch a partir do master atual**

```bash
git status --short
git switch -c moodboard-cenas
```

O `master` local tem dois commits de documentação (spec e plano) que ainda não foram ao GitHub; eles entram no mesmo Pull Request. A pasta `.impeccable/` não é nossa: não adicione.

---

### Task 1: Migration, tipos e validação

**Files:**
- Create: `supabase/migrations/20261002000000_moodboards.sql`
- Create: `lib/moodboard/tipos.ts`
- Create: `lib/moodboard/validacao.ts`
- Test: `lib/moodboard/validacao.test.ts`

**Interfaces:**
- Consumes: `Resultado<T>` de `lib/auth/validacao` (`{ ok: true; valor: T } | { ok: false; erro: string }`); `ImagemFilme` de `lib/tmdb/tipos` (na Task 3 ganha `caminho`).
- Produces:
  - Tipos `CenaMoodboard`, `Moodboard`, `ResumoMoodboard`, `Resposta<T>`
  - `TITULO_MAXIMO = 60`, `DESCRICAO_MAXIMA = 200`, `MAXIMO_MOODBOARDS = 20`, `MENSAGEM_ERRO`, `MENSAGEM_SESSAO`
  - `validarTituloMoodboard(bruto: unknown): Resultado<string>`
  - `validarDescricaoMoodboard(bruto: unknown): Resultado<string | null>`
  - `validarCaminhoCena(bruto: unknown): Resultado<string>`
  - `ehIdMoodboard(bruto: unknown): bruto is string`

- [ ] **Step 1: Escrever os testes de validação**

```ts
// lib/moodboard/validacao.test.ts
import { describe, expect, it } from 'vitest'
import {
  DESCRICAO_MAXIMA,
  ehIdMoodboard,
  TITULO_MAXIMO,
  validarCaminhoCena,
  validarDescricaoMoodboard,
  validarTituloMoodboard,
} from './validacao'

describe('validarTituloMoodboard', () => {
  it('aceita e corta espaços', () => {
    expect(validarTituloMoodboard('  Neons  ')).toEqual({ ok: true, valor: 'Neons' })
  })

  it('recusa vazio, só espaços e não-texto', () => {
    for (const bruto of ['', '   ', 42, null, undefined]) {
      expect(validarTituloMoodboard(bruto)).toEqual({ ok: false, erro: 'Digite um título' })
    }
  })

  it('aceita no limite e recusa um a mais', () => {
    expect(validarTituloMoodboard('a'.repeat(TITULO_MAXIMO)).ok).toBe(true)
    expect(validarTituloMoodboard('a'.repeat(TITULO_MAXIMO + 1))).toEqual({
      ok: false,
      erro: 'O título pode ter no máximo 60 caracteres',
    })
  })
})

describe('validarDescricaoMoodboard', () => {
  it('trata ausência e texto vazio como null', () => {
    for (const bruto of [undefined, null, '', '   ']) {
      expect(validarDescricaoMoodboard(bruto)).toEqual({ ok: true, valor: null })
    }
  })

  it('aceita texto e corta espaços', () => {
    expect(validarDescricaoMoodboard(' Luz de neon ')).toEqual({ ok: true, valor: 'Luz de neon' })
  })

  it('recusa não-texto e texto longo demais', () => {
    expect(validarDescricaoMoodboard(5)).toEqual({ ok: false, erro: 'Descrição inválida' })
    expect(validarDescricaoMoodboard('a'.repeat(DESCRICAO_MAXIMA + 1))).toEqual({
      ok: false,
      erro: 'A descrição pode ter no máximo 200 caracteres',
    })
  })
})

describe('validarCaminhoCena', () => {
  it('aceita caminhos do TMDB', () => {
    expect(validarCaminhoCena('/abc123.jpg')).toEqual({ ok: true, valor: '/abc123.jpg' })
    expect(validarCaminhoCena('/cena-1001-1.jpg')).toEqual({ ok: true, valor: '/cena-1001-1.jpg' })
  })

  it('recusa URLs, subpastas, extensões estranhas e não-texto', () => {
    for (const bruto of ['', 'abc.jpg', 'https://x.com/a.jpg', '/a/b.jpg', '/a.svg', '/../a.jpg', '/a.jpg?x=1', 7]) {
      expect(validarCaminhoCena(bruto)).toEqual({ ok: false, erro: 'Cena inválida' })
    }
  })
})

describe('ehIdMoodboard', () => {
  it('aceita uuid e recusa o resto', () => {
    expect(ehIdMoodboard('3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c')).toBe(true)
    expect(ehIdMoodboard('nao-e-um-id')).toBe(false)
    expect(ehIdMoodboard('')).toBe(false)
    expect(ehIdMoodboard(123)).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/moodboard/validacao.test.ts`
Expected: FAIL, módulo `./validacao` não encontrado.

- [ ] **Step 3: Escrever os tipos**

```ts
// lib/moodboard/tipos.ts
import type { ImagemFilme } from '@/lib/tmdb/tipos'

export type CenaMoodboard = {
  filmeId: number
  caminho: string
  tituloFilme: string
  imagem: ImagemFilme
}

export type Moodboard = {
  id: string
  titulo: string
  descricao: string | null
  meu: boolean
  cenas: CenaMoodboard[]
}

export type ResumoMoodboard = {
  id: string
  titulo: string
  quantidadeCenas: number
  /** URLs w300 das primeiras 4 cenas. */
  capas: string[]
}

export type Resposta<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; erro: string; sessaoExpirada: boolean }
```

- [ ] **Step 4: Escrever a validação (com a ferramenta de escrita: tem barra invertida)**

```ts
// lib/moodboard/validacao.ts
import type { Resultado } from '@/lib/auth/validacao'

export const TITULO_MAXIMO = 60
export const DESCRICAO_MAXIMA = 200
export const MAXIMO_MOODBOARDS = 20
export const MENSAGEM_ERRO = 'Não foi possível salvar. Tente de novo.'
export const MENSAGEM_SESSAO = 'Sua sessão expirou. Entre de novo para continuar.'

const CAMINHO_CENA = /^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validarTituloMoodboard(bruto: unknown): Resultado<string> {
  const titulo = typeof bruto === 'string' ? bruto.trim() : ''
  if (!titulo) return { ok: false, erro: 'Digite um título' }
  if (titulo.length > TITULO_MAXIMO) return { ok: false, erro: 'O título pode ter no máximo 60 caracteres' }
  return { ok: true, valor: titulo }
}

export function validarDescricaoMoodboard(bruto: unknown): Resultado<string | null> {
  if (bruto === undefined || bruto === null) return { ok: true, valor: null }
  if (typeof bruto !== 'string') return { ok: false, erro: 'Descrição inválida' }
  const descricao = bruto.trim()
  if (descricao.length > DESCRICAO_MAXIMA) return { ok: false, erro: 'A descrição pode ter no máximo 200 caracteres' }
  return { ok: true, valor: descricao || null }
}

export function validarCaminhoCena(bruto: unknown): Resultado<string> {
  if (typeof bruto === 'string' && CAMINHO_CENA.test(bruto)) return { ok: true, valor: bruto }
  return { ok: false, erro: 'Cena inválida' }
}

export function ehIdMoodboard(bruto: unknown): bruto is string {
  return typeof bruto === 'string' && ID.test(bruto)
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run lib/moodboard/validacao.test.ts`
Expected: PASS

- [ ] **Step 6: Escrever a migration (com a ferramenta de escrita: tem barra invertida)**

```sql
-- supabase/migrations/20261002000000_moodboards.sql
-- CineTeca: Moodboards de cenas. Só o dono acessa pelo banco; a página pública lê pelo servidor.
-- Aplicar no SQL Editor do Supabase, nos projetos "cineteca-testes" e "cineteca".

create table public.moodboards (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null check (char_length(trim(titulo)) between 1 and 60),
  descricao text check (descricao is null or char_length(descricao) <= 200),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index moodboards_por_usuario on public.moodboards (usuario_id, criado_em desc);

revoke all on public.moodboards from anon, authenticated;
grant select, insert, delete on public.moodboards to authenticated;
grant update (titulo, descricao, atualizado_em) on public.moodboards to authenticated;

alter table public.moodboards enable row level security;

create policy "moodboards: ler os próprios" on public.moodboards
  for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "moodboards: inserir os próprios" on public.moodboards
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "moodboards: alterar os próprios" on public.moodboards
  for update to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);
create policy "moodboards: apagar os próprios" on public.moodboards
  for delete to authenticated using ((select auth.uid()) = usuario_id);

create table public.moodboard_cenas (
  moodboard_id uuid not null references public.moodboards (id) on delete cascade,
  filme_id integer not null check (filme_id > 0),
  caminho_imagem text not null check (caminho_imagem ~ '^/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$'),
  titulo_filme text not null check (char_length(titulo_filme) <= 300),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  primary key (moodboard_id, filme_id, caminho_imagem)
);

revoke all on public.moodboard_cenas from anon, authenticated;
grant select, insert, delete on public.moodboard_cenas to authenticated;

alter table public.moodboard_cenas enable row level security;

create policy "moodboard_cenas: ler as do próprio moodboard" on public.moodboard_cenas
  for select to authenticated using (
    exists (select 1 from public.moodboards m
            where m.id = moodboard_cenas.moodboard_id and m.usuario_id = (select auth.uid()))
  );
create policy "moodboard_cenas: inserir no próprio moodboard" on public.moodboard_cenas
  for insert to authenticated with check (
    exists (select 1 from public.moodboards m
            where m.id = moodboard_cenas.moodboard_id and m.usuario_id = (select auth.uid()))
  );
create policy "moodboard_cenas: apagar do próprio moodboard" on public.moodboard_cenas
  for delete to authenticated using (
    exists (select 1 from public.moodboards m
            where m.id = moodboard_cenas.moodboard_id and m.usuario_id = (select auth.uid()))
  );
```

O `update` só libera título, descrição e data: ninguém consegue trocar o dono de um moodboard. Nenhum código faz `upsert` nessas tabelas (o `upsert` levaria 42501 por causa disso).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261002000000_moodboards.sql lib/moodboard/tipos.ts lib/moodboard/validacao.ts lib/moodboard/validacao.test.ts
git commit -m "feat(moodboard): migration, tipos e validação

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Aplicar a migration (dono) e testar o banco

**Files:**
- Test: `testes-integracao/moodboards.test.ts`

**Interfaces:**
- Consumes: as tabelas da Task 1, já aplicadas no projeto `cineteca-testes`.

- [ ] **Step 1: Pedir ao dono que aplique o SQL no projeto de testes (um passo de cada vez, com print)**

Mensagem ao dono, em pt-BR:
1. Abra https://supabase.com/dashboard e entre no projeto **cineteca-testes**.
2. No menu da esquerda, clique em **SQL Editor** e depois em **New query**.
3. Abra no VS Code o arquivo `supabase/migrations/20261002000000_moodboards.sql`, selecione tudo (Ctrl+A), copie (Ctrl+C) e cole no editor do Supabase.
4. Clique em **Run** e mande o print do resultado ("Success. No rows returned").

Espere o print antes de continuar. O projeto de produção (`cineteca`) fica para a Task 9, quando o código estiver pronto.

- [ ] **Step 2: Escrever os testes de banco**

```ts
// testes-integracao/moodboards.test.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
const chaveSecreta = process.env.SUPABASE_SECRET_KEY ?? ''
const semSessao = { auth: { persistSession: false, autoRefreshToken: false } }
const SENHA = 'senha-de-integracao-123'

type Conta = { id: string; email: string }

const admin = () => createClient(url, chaveSecreta, semSessao)
const novoEmail = (rotulo: string) =>
  `moodboards+${rotulo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@cineteca.test`

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

const cena = (moodboardId: string, caminho = '/cena-1.jpg') => ({
  moodboard_id: moodboardId,
  filme_id: 90001,
  caminho_imagem: caminho,
  titulo_filme: 'Filme de Integração',
})

describe('moodboards no banco (projeto de testes)', () => {
  const contas: Conta[] = []
  let ana: Conta
  let bia: Conta
  let clienteAna: SupabaseClient
  let clienteBia: SupabaseClient
  let moodboardDaAna = ''

  beforeAll(async () => {
    if (!url || !chavePublica || !chaveSecreta) {
      throw new Error('Falta .env.test.local com as chaves do projeto cineteca-testes')
    }
    ana = await criarConta('Ana')
    bia = await criarConta('Bia')
    contas.push(ana, bia)
    clienteAna = await clienteDe(ana)
    clienteBia = await clienteDe(bia)
  })

  afterAll(async () => {
    for (const conta of contas) await admin().auth.admin.deleteUser(conta.id)
  })

  it('a dona cria, lê e põe uma cena no próprio moodboard', async () => {
    const { data, error } = await clienteAna
      .from('moodboards')
      .insert({ usuario_id: ana.id, titulo: 'Neons' })
      .select('id')
      .single()
    expect(error).toBeNull()
    moodboardDaAna = (data as { id: string }).id

    expect((await clienteAna.from('moodboard_cenas').insert(cena(moodboardDaAna))).error).toBeNull()
    const lidas = await clienteAna.from('moodboard_cenas').select('caminho_imagem').eq('moodboard_id', moodboardDaAna)
    expect(lidas.data).toEqual([{ caminho_imagem: '/cena-1.jpg' }])
  })

  it('recusa a mesma cena duas vezes no mesmo moodboard', async () => {
    const { error } = await clienteAna.from('moodboard_cenas').insert(cena(moodboardDaAna))
    expect(error?.code).toBe('23505')
  })

  it('recusa caminho de imagem fora do formato do TMDB', async () => {
    const { error } = await clienteAna.from('moodboard_cenas').insert(cena(moodboardDaAna, 'https://x.com/a.jpg'))
    expect(error?.code).toBe('23514')
  })

  it('outra pessoa não lê o moodboard nem as cenas', async () => {
    const moodboards = await clienteBia.from('moodboards').select('id').eq('id', moodboardDaAna)
    const cenas = await clienteBia.from('moodboard_cenas').select('filme_id').eq('moodboard_id', moodboardDaAna)
    expect(moodboards.data).toEqual([])
    expect(cenas.data).toEqual([])
  })

  it('outra pessoa não põe cena no moodboard alheio', async () => {
    const { error } = await clienteBia.from('moodboard_cenas').insert(cena(moodboardDaAna, '/invasora.jpg'))
    expect(error?.code).toBe('42501')
  })

  it('outra pessoa não altera nem apaga o moodboard alheio', async () => {
    const alterado = await clienteBia.from('moodboards').update({ titulo: 'Invadido' }).eq('id', moodboardDaAna).select('id')
    const apagado = await clienteBia.from('moodboards').delete().eq('id', moodboardDaAna).select('id')
    expect(alterado.data ?? []).toEqual([])
    expect(apagado.data ?? []).toEqual([])
    const { data } = await admin().from('moodboards').select('titulo').eq('id', moodboardDaAna).single()
    expect(data?.titulo).toBe('Neons')
  })

  it('a dona não consegue passar o moodboard para outra pessoa', async () => {
    const { error } = await clienteAna.from('moodboards').update({ usuario_id: bia.id }).eq('id', moodboardDaAna)
    expect(error?.code).toBe('42501')
  })

  it('visitante sem login não lê nada', async () => {
    const visitante = createClient(url, chavePublica, semSessao)
    const moodboards = await visitante.from('moodboards').select('id')
    const cenas = await visitante.from('moodboard_cenas').select('filme_id')
    expect(moodboards.error !== null || (moodboards.data ?? []).length === 0).toBe(true)
    expect(cenas.error !== null || (cenas.data ?? []).length === 0).toBe(true)
  })

  it('apagar o moodboard apaga as cenas', async () => {
    const apagado = await clienteAna.from('moodboards').delete().eq('id', moodboardDaAna).select('id')
    expect(apagado.data).toHaveLength(1)
    const { data } = await admin().from('moodboard_cenas').select('filme_id').eq('moodboard_id', moodboardDaAna)
    expect(data).toEqual([])
  })
})
```

- [ ] **Step 3: Rodar**

Run: `npm run test:supabase -- moodboards`
Expected: PASS (9 testes). Se falhar com "relation does not exist", a migration não foi aplicada no `cineteca-testes`: volte ao Step 1.

- [ ] **Step 4: Commit**

```bash
git add testes-integracao/moodboards.test.ts
git commit -m "test(moodboard): RLS e restrições das tabelas de moodboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Preparar a galeria (caminho da imagem, TelaCheia própria, trava de foco pausável)

Refatoração sem mudança visível. A galeria atual precisa continuar igual.

**Files:**
- Modify: `lib/tmdb/tipos.ts:24` — `ImagemFilme` ganha `caminho`
- Modify: `lib/tmdb/detalhes.ts:94` — `normalizarImagens` preenche `caminho`
- Modify: `lib/tmdb/detalhes.test.ts:170-171` — expectativa com `caminho`
- Modify: `lib/tmdb/imagens.ts` — `imagemFilme`
- Test: `lib/tmdb/imagens.test.ts`
- Modify: `components/usePrenderFoco.ts` — parâmetro `ativo`
- Create: `components/TelaCheia.tsx` — extraída de `GaleriaImagens`, com `pausada` e `acoes`
- Modify: `components/GaleriaImagens.tsx` — usa a `TelaCheia` nova

**Interfaces:**
- Produces:
  - `ImagemFilme = { caminho: string; pequena: string; media: string; grande: string }`
  - `imagemFilme(caminho: string): ImagemFilme` em `lib/tmdb/imagens.ts`
  - `usePrenderFoco(ref, ativo = true)`
  - `TelaCheia` com props `{ imagens: ImagemFilme[]; titulo: string; indice: number; aoMudar(i: number): void; aoFechar(): void; pausada?: boolean; acoes?: ReactNode }`
  - `BOTAO_TELA_CHEIA` (classe dos botões redondos da tela cheia)

- [ ] **Step 1: Teste do `imagemFilme`**

No fim de `lib/tmdb/imagens.test.ts`, troque o import por `import { imageUrl, imagemFilme } from './imagens'` e acrescente:

```ts
describe('imagemFilme', () => {
  it('monta os três tamanhos usados pela galeria e guarda o caminho', () => {
    expect(imagemFilme('/abc.jpg')).toEqual({
      caminho: '/abc.jpg',
      pequena: 'https://image.tmdb.org/t/p/w300/abc.jpg',
      media: 'https://image.tmdb.org/t/p/w780/abc.jpg',
      grande: 'https://image.tmdb.org/t/p/w1280/abc.jpg',
    })
  })
})
```

Run: `npx vitest run lib/tmdb/imagens.test.ts` → FAIL (`imagemFilme` não existe).

- [ ] **Step 2: `ImagemFilme` com caminho e o `imagemFilme`**

Em `lib/tmdb/tipos.ts`, troque a linha 24 por:

```ts
export type ImagemFilme = { caminho: string; pequena: string; media: string; grande: string }
```

No fim de `lib/tmdb/imagens.ts` (que só monta texto, sem `server-only`, e por isso pode ser usado em qualquer lugar):

```ts
export function imagemFilme(caminho: string): ImagemFilme {
  return {
    caminho,
    pequena: imageUrl(caminho, 'w300')!,
    media: imageUrl(caminho, 'w780')!,
    grande: imageUrl(caminho, 'w1280')!,
  }
}
```

com `import type { ImagemFilme } from './tipos'` no topo.

Em `lib/tmdb/detalhes.ts`, troque o `.map` de `normalizarImagens` (linha 94) por:

```ts
    .map((c) => imagemFilme(c.file_path))
```

e troque o import da linha 6 por `import { imageUrl, imagemFilme } from './imagens'`.

Em `lib/tmdb/detalhes.test.ts`, linhas 170-171, acrescente `caminho: '/c1.jpg'` e `caminho: '/c2.jpg'` no começo de cada objeto.

- [ ] **Step 3: Rodar os testes unitários**

Run: `npm test`
Expected: PASS (inclui `imagens.test.ts` e `detalhes.test.ts`).

- [ ] **Step 4: `usePrenderFoco` com `ativo`**

Em `components/usePrenderFoco.ts`, troque a assinatura e o começo do efeito:

```ts
// Enquanto a janela está montada (e ativa), Tab e Shift+Tab circulam só pelos controles dela.
export function usePrenderFoco(ref: RefObject<HTMLElement | null>, ativo = true): void {
  useEffect(() => {
    if (!ativo) return
    const aoTeclar = (e: KeyboardEvent) => {
```

e a lista de dependências do `useEffect` vira `[ref, ativo]`. O resto fica igual.

- [ ] **Step 5: Criar `components/TelaCheia.tsx`**

É a função `TelaCheia` que hoje está em `GaleriaImagens.tsx` (linhas 58-135), com três mudanças: exporta, aceita `pausada` (desliga teclado e trava de foco) e aceita `acoes` (botões extras ao lado do Fechar).

```tsx
'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { ImagemFilme } from '@/lib/tmdb/tipos'
import { IconeFechar, IconeSetaDireita, IconeSetaEsquerda } from './Icones'
import { usePrenderFoco } from './usePrenderFoco'

export const BOTAO_TELA_CHEIA =
  'rounded-full bg-black/60 p-2 text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

type Props = {
  imagens: ImagemFilme[]
  titulo: string
  indice: number
  aoMudar: (indice: number) => void
  aoFechar: () => void
  /** Outra janela está por cima: teclado e trava de foco ficam com ela. */
  pausada?: boolean
  acoes?: ReactNode
}

export function TelaCheia({ imagens, titulo, indice, aoMudar, aoFechar, pausada = false, acoes }: Props) {
  const caixaRef = useRef<HTMLDivElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const toqueRef = useRef<number | null>(null)
  usePrenderFoco(caixaRef, !pausada)

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
    if (pausada) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
      else if (e.key === 'ArrowLeft') anterior()
      else if (e.key === 'ArrowRight') proxima()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [pausada, aoFechar, anterior, proxima])

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
        <div className="fixed right-4 top-4 z-10 flex gap-2">
          {acoes}
          <button ref={fecharRef} type="button" aria-label="Fechar" onClick={aoFechar} className={BOTAO_TELA_CHEIA}>
            <IconeFechar className="h-6 w-6" />
          </button>
        </div>
        <button type="button" aria-label="Imagem anterior" onClick={anterior} className={`${BOTAO_TELA_CHEIA} absolute left-2 top-1/2 -translate-y-1/2`}>
          <IconeSetaEsquerda className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Próxima imagem" onClick={proxima} className={`${BOTAO_TELA_CHEIA} absolute right-2 top-1/2 -translate-y-1/2`}>
          <IconeSetaDireita className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: `GaleriaImagens` usa a `TelaCheia` nova**

Em `components/GaleriaImagens.tsx`: apague a função `TelaCheia` e o tipo `PropsTelaCheia` (linhas 58-135). Troque os imports por:

```tsx
import { useCallback, useRef, useState } from 'react'
import { classesMosaico, NO_MOSAICO } from '@/lib/mosaico'
import type { ImagemFilme } from '@/lib/tmdb/tipos'
import { PaletaFilme } from './PaletaFilme'
import { TelaCheia } from './TelaCheia'
```

O uso de `<TelaCheia ... />` na linha 52 continua igual.

- [ ] **Step 7: Conferir tipos, testes e a galeria**

Run: `npm run typecheck` → PASS
Run: `npm test` → PASS
Run: `npx playwright test e2e/bastidores.spec.ts` → PASS. Esses testes já cobrem setas, Esc, foco de volta e Tab preso na galeria; a refatoração não pode quebrar nenhum.

- [ ] **Step 8: Commit**

```bash
git add lib/tmdb/tipos.ts lib/tmdb/imagens.ts lib/tmdb/imagens.test.ts lib/tmdb/detalhes.ts lib/tmdb/detalhes.test.ts components/usePrenderFoco.ts components/TelaCheia.tsx components/GaleriaImagens.tsx
git commit -m "refactor(galeria): TelaCheia própria, pausável, e caminho da cena

Prepara a galeria para abrir uma janela por cima da tela cheia sem
disputar teclado e foco.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Banco e Server Actions

**Files:**
- Create: `lib/moodboard/banco.ts`
- Create: `lib/moodboard/acoes.ts`

**Interfaces:**
- Consumes: tipos e validação da Task 1; `imagemFilme` de `lib/tmdb/imagens` (Task 3); `ImagemFilme.caminho`; `getMovieDetails` de `lib/tmdb/detalhes`; `validarFilmeId` de `lib/avaliacoes/validacao`; `criarClienteServidor` de `lib/supabase/servidor`.
- Produces (`banco.ts`, server-only, todas recebem `cliente: Pick<SupabaseClient, 'from'>`):
  - `ResultadoBanco<T> = { ok: true; valor: T } | { ok: false; codigo: string }`
  - `listarResumos(cliente, usuarioId): Promise<ResultadoBanco<ResumoMoodboard[]>>`
  - `lerMoodboard(cliente, id, usuarioIdAtual: string | null): Promise<ResultadoBanco<Moodboard | null>>`
  - `contarMoodboards(cliente, usuarioId): Promise<ResultadoBanco<number>>`
  - `inserirMoodboard(cliente, usuarioId, titulo, descricao): Promise<ResultadoBanco<string>>`
  - `atualizarMoodboard(cliente, id, titulo, descricao): Promise<ResultadoBanco<void>>`
  - `apagarMoodboard(cliente, id): Promise<ResultadoBanco<void>>`
  - `inserirCena(cliente, moodboardId, cena: { filmeId: number; caminho: string; tituloFilme: string }): Promise<ResultadoBanco<void>>`
  - `apagarCena(cliente, moodboardId, filmeId, caminho): Promise<ResultadoBanco<void>>`
- Produces (`acoes.ts`, `'use server'`):
  - `listarMeusMoodboardsAction(): Promise<Resposta<{ moodboards: ResumoMoodboard[] }>>`
  - `criarMoodboardAction(titulo: unknown, descricao: unknown, cena?: unknown): Promise<Resposta<{ id: string }>>` — `cena` é `{ filmeId, caminho }`
  - `adicionarCenaAction(moodboardId: unknown, filmeId: unknown, caminho: unknown): Promise<Resposta>`
  - `removerCenaAction(moodboardId: unknown, filmeId: unknown, caminho: unknown): Promise<Resposta>`
  - `editarMoodboardAction(id: unknown, titulo: unknown, descricao: unknown): Promise<Resposta>`
  - `excluirMoodboardAction(id: unknown): Promise<Resposta>`

- [ ] **Step 1: Escrever `lib/moodboard/banco.ts`**

```ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { imagemFilme } from '@/lib/tmdb/imagens'
import type { CenaMoodboard, Moodboard, ResumoMoodboard } from './tipos'

type Cliente = Pick<SupabaseClient, 'from'>
type ErroBanco = { code?: string } | null

export type ResultadoBanco<T> = { ok: true; valor: T } | { ok: false; codigo: string }

type LinhaCena = { filme_id: number; caminho_imagem: string; titulo_filme: string; ordem: number; criado_em: string }
type LinhaMoodboard = {
  id: string
  titulo: string
  descricao: string | null
  usuario_id: string
  moodboard_cenas: LinhaCena[]
}

const COLUNAS_CENA = 'filme_id, caminho_imagem, titulo_filme, ordem, criado_em'

const falha = (erro: ErroBanco): { ok: false; codigo: string } => ({ ok: false, codigo: erro?.code ?? 'sem-codigo' })
// Sem o select, alterar ou apagar zero linhas não dá erro e pareceria sucesso.
const NENHUMA_LINHA = { ok: false, codigo: 'nenhuma-linha' } as const

function ordenar(cenas: LinhaCena[]): LinhaCena[] {
  return [...cenas].sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em))
}

function paraCena(linha: LinhaCena): CenaMoodboard {
  return {
    filmeId: linha.filme_id,
    caminho: linha.caminho_imagem,
    tituloFilme: linha.titulo_filme,
    imagem: imagemFilme(linha.caminho_imagem),
  }
}

export async function listarResumos(cliente: Cliente, usuarioId: string): Promise<ResultadoBanco<ResumoMoodboard[]>> {
  const { data, error } = await cliente
    .from('moodboards')
    .select(`id, titulo, moodboard_cenas(${COLUNAS_CENA})`)
    .eq('usuario_id', usuarioId)
    .order('criado_em', { ascending: false })
  if (error) return falha(error)
  const linhas = (data ?? []) as Pick<LinhaMoodboard, 'id' | 'titulo' | 'moodboard_cenas'>[]
  return {
    ok: true,
    valor: linhas.map((l) => {
      const cenas = ordenar(l.moodboard_cenas)
      return {
        id: l.id,
        titulo: l.titulo,
        quantidadeCenas: cenas.length,
        capas: cenas.slice(0, 4).map((c) => imagemFilme(c.caminho_imagem).pequena),
      }
    }),
  }
}

export async function lerMoodboard(
  cliente: Cliente,
  id: string,
  usuarioIdAtual: string | null,
): Promise<ResultadoBanco<Moodboard | null>> {
  const { data, error } = await cliente
    .from('moodboards')
    .select(`id, titulo, descricao, usuario_id, moodboard_cenas(${COLUNAS_CENA})`)
    .eq('id', id)
    .maybeSingle()
  if (error) return falha(error)
  if (!data) return { ok: true, valor: null }
  const linha = data as LinhaMoodboard
  return {
    ok: true,
    valor: {
      id: linha.id,
      titulo: linha.titulo,
      descricao: linha.descricao,
      meu: usuarioIdAtual !== null && linha.usuario_id === usuarioIdAtual,
      cenas: ordenar(linha.moodboard_cenas).map(paraCena),
    },
  }
}

export async function contarMoodboards(cliente: Cliente, usuarioId: string): Promise<ResultadoBanco<number>> {
  const { count, error } = await cliente
    .from('moodboards')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
  if (error) return falha(error)
  return { ok: true, valor: count ?? 0 }
}

export async function inserirMoodboard(
  cliente: Cliente,
  usuarioId: string,
  titulo: string,
  descricao: string | null,
): Promise<ResultadoBanco<string>> {
  const { data, error } = await cliente
    .from('moodboards')
    .insert({ usuario_id: usuarioId, titulo, descricao })
    .select('id')
    .single()
  if (error || !data) return falha(error)
  return { ok: true, valor: (data as { id: string }).id }
}

export async function atualizarMoodboard(
  cliente: Cliente,
  id: string,
  titulo: string,
  descricao: string | null,
): Promise<ResultadoBanco<void>> {
  const { data, error } = await cliente
    .from('moodboards')
    .update({ titulo, descricao, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) return falha(error)
  if ((data ?? []).length === 0) return NENHUMA_LINHA
  return { ok: true, valor: undefined }
}

export async function apagarMoodboard(cliente: Cliente, id: string): Promise<ResultadoBanco<void>> {
  const { data, error } = await cliente.from('moodboards').delete().eq('id', id).select('id')
  if (error) return falha(error)
  if ((data ?? []).length === 0) return NENHUMA_LINHA
  return { ok: true, valor: undefined }
}

export async function inserirCena(
  cliente: Cliente,
  moodboardId: string,
  cena: { filmeId: number; caminho: string; tituloFilme: string },
): Promise<ResultadoBanco<void>> {
  const { error } = await cliente.from('moodboard_cenas').insert({
    moodboard_id: moodboardId,
    filme_id: cena.filmeId,
    caminho_imagem: cena.caminho,
    titulo_filme: cena.tituloFilme,
  })
  if (error) return falha(error)
  return { ok: true, valor: undefined }
}

export async function apagarCena(
  cliente: Cliente,
  moodboardId: string,
  filmeId: number,
  caminho: string,
): Promise<ResultadoBanco<void>> {
  const { data, error } = await cliente
    .from('moodboard_cenas')
    .delete()
    .eq('moodboard_id', moodboardId)
    .eq('filme_id', filmeId)
    .eq('caminho_imagem', caminho)
    .select('filme_id')
  if (error) return falha(error)
  if ((data ?? []).length === 0) return NENHUMA_LINHA
  return { ok: true, valor: undefined }
}
```

- [ ] **Step 2: Escrever `lib/moodboard/acoes.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { validarFilmeId } from '@/lib/avaliacoes/validacao'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { getMovieDetails } from '@/lib/tmdb/detalhes'
import type { MovieDetails } from '@/lib/tmdb/tipos'
import {
  apagarCena,
  apagarMoodboard,
  atualizarMoodboard,
  contarMoodboards,
  inserirCena,
  inserirMoodboard,
  listarResumos,
} from './banco'
import type { Resposta, ResumoMoodboard } from './tipos'
import {
  ehIdMoodboard,
  MAXIMO_MOODBOARDS,
  MENSAGEM_ERRO,
  MENSAGEM_SESSAO,
  validarCaminhoCena,
  validarDescricaoMoodboard,
  validarTituloMoodboard,
} from './validacao'

type Falha = { ok: false; erro: string; sessaoExpirada: boolean }
type CenaConferida = { filmeId: number; caminho: string; tituloFilme: string }

// 42501 = recusado pela RLS; PGRST301/PGRST303 = token inválido ou expirado.
const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])
const SEM_SESSAO: Falha = { ok: false, erro: MENSAGEM_SESSAO, sessaoExpirada: true }
const recusar = (erro: string): Falha => ({ ok: false, erro, sessaoExpirada: false })

function falhou(codigo: string, acao: string): Falha {
  if (codigo === '23505') return recusar('Essa cena já está neste moodboard')
  console.error(`[CineTeca] ${acao} falhou:`, codigo)
  return CODIGOS_DE_SESSAO.has(codigo) ? SEM_SESSAO : recusar(MENSAGEM_ERRO)
}

async function obterUsuario() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  return { supabase, usuario: data.user }
}

function revalidar(id: string) {
  revalidatePath('/moodboards')
  revalidatePath(`/moodboard/${id}`)
}

// A página é pública: o título vem do TMDB e o caminho tem de ser uma cena do próprio filme.
async function conferirCena(filmeIdBruto: unknown, caminhoBruto: unknown): Promise<{ ok: true; cena: CenaConferida } | Falha> {
  const filmeId = validarFilmeId(filmeIdBruto)
  if (!filmeId.ok) return recusar(filmeId.erro)
  const caminho = validarCaminhoCena(caminhoBruto)
  if (!caminho.ok) return recusar(caminho.erro)
  let filme: MovieDetails | null
  try {
    filme = await getMovieDetails(filmeId.valor)
  } catch {
    return recusar(MENSAGEM_ERRO)
  }
  if (!filme || !filme.images.some((i) => i.caminho === caminho.valor)) return recusar('Cena não encontrada')
  return { ok: true, cena: { filmeId: filmeId.valor, caminho: caminho.valor, tituloFilme: filme.title.slice(0, 300) } }
}

export async function listarMeusMoodboardsAction(): Promise<Resposta<{ moodboards: ResumoMoodboard[] }>> {
  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO
  const r = await listarResumos(supabase, usuario.id)
  return r.ok ? { ok: true, moodboards: r.valor } : falhou(r.codigo, 'listar moodboards')
}

export async function criarMoodboardAction(
  tituloBruto: unknown,
  descricaoBruta: unknown,
  cenaBruta?: unknown,
): Promise<Resposta<{ id: string }>> {
  const titulo = validarTituloMoodboard(tituloBruto)
  if (!titulo.ok) return recusar(titulo.erro)
  const descricao = validarDescricaoMoodboard(descricaoBruta)
  if (!descricao.ok) return recusar(descricao.erro)

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO

  let cena: CenaConferida | null = null
  if (cenaBruta !== undefined && cenaBruta !== null) {
    const { filmeId, caminho } = (typeof cenaBruta === 'object' ? cenaBruta : {}) as { filmeId?: unknown; caminho?: unknown }
    const conferida = await conferirCena(filmeId, caminho)
    if (!conferida.ok) return conferida
    cena = conferida.cena
  }

  const total = await contarMoodboards(supabase, usuario.id)
  if (!total.ok) return falhou(total.codigo, 'contar moodboards')
  if (total.valor >= MAXIMO_MOODBOARDS) return recusar(`Você atingiu o limite de ${MAXIMO_MOODBOARDS} moodboards`)

  const criado = await inserirMoodboard(supabase, usuario.id, titulo.valor, descricao.valor)
  if (!criado.ok) return falhou(criado.codigo, 'criar moodboard')

  if (cena) {
    const salva = await inserirCena(supabase, criado.valor, cena)
    if (!salva.ok) {
      // Sem a cena, o moodboard novo não é o que a pessoa pediu: desfaz em vez de deixar um vazio.
      await apagarMoodboard(supabase, criado.valor)
      return falhou(salva.codigo, 'salvar cena no moodboard novo')
    }
  }

  revalidar(criado.valor)
  return { ok: true, id: criado.valor }
}

export async function adicionarCenaAction(idBruto: unknown, filmeIdBruto: unknown, caminhoBruto: unknown): Promise<Resposta> {
  if (!ehIdMoodboard(idBruto)) return recusar('Moodboard inválido')
  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO
  const conferida = await conferirCena(filmeIdBruto, caminhoBruto)
  if (!conferida.ok) return conferida
  const r = await inserirCena(supabase, idBruto, conferida.cena)
  if (!r.ok) return falhou(r.codigo, 'salvar cena')
  revalidar(idBruto)
  return { ok: true }
}

export async function removerCenaAction(idBruto: unknown, filmeIdBruto: unknown, caminhoBruto: unknown): Promise<Resposta> {
  if (!ehIdMoodboard(idBruto)) return recusar('Moodboard inválido')
  const filmeId = validarFilmeId(filmeIdBruto)
  if (!filmeId.ok) return recusar(filmeId.erro)
  const caminho = validarCaminhoCena(caminhoBruto)
  if (!caminho.ok) return recusar(caminho.erro)
  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO
  const r = await apagarCena(supabase, idBruto, filmeId.valor, caminho.valor)
  if (!r.ok) return falhou(r.codigo, 'remover cena')
  revalidar(idBruto)
  return { ok: true }
}

export async function editarMoodboardAction(idBruto: unknown, tituloBruto: unknown, descricaoBruta: unknown): Promise<Resposta> {
  if (!ehIdMoodboard(idBruto)) return recusar('Moodboard inválido')
  const titulo = validarTituloMoodboard(tituloBruto)
  if (!titulo.ok) return recusar(titulo.erro)
  const descricao = validarDescricaoMoodboard(descricaoBruta)
  if (!descricao.ok) return recusar(descricao.erro)
  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO
  const r = await atualizarMoodboard(supabase, idBruto, titulo.valor, descricao.valor)
  if (!r.ok) return falhou(r.codigo, 'editar moodboard')
  revalidar(idBruto)
  return { ok: true }
}

export async function excluirMoodboardAction(idBruto: unknown): Promise<Resposta> {
  if (!ehIdMoodboard(idBruto)) return recusar('Moodboard inválido')
  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO
  const r = await apagarMoodboard(supabase, idBruto)
  if (!r.ok) return falhou(r.codigo, 'excluir moodboard')
  revalidar(idBruto)
  return { ok: true }
}
```

- [ ] **Step 3: Conferir tipos**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/moodboard/banco.ts lib/moodboard/acoes.ts
git commit -m "feat(moodboard): banco e server actions

A cena é conferida no TMDB antes de gravar; o título do filme vem do
servidor, nunca do navegador.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Janela do moodboard e botão na galeria

**Files:**
- Modify: `components/Icones.tsx` — `IconeMoodboard`
- Create: `components/CamposMoodboard.tsx` — campos título + descrição (usados aqui e na Task 7)
- Create: `components/JanelaMoodboard.tsx`
- Modify: `components/GaleriaImagens.tsx` — botão "Salvar no moodboard" na tela cheia
- Modify: `app/filme/[id]/page.tsx:126` — passa `filmeId`

**Interfaces:**
- Consumes: actions da Task 4; `TelaCheia`, `BOTAO_TELA_CHEIA` da Task 3; `JanelaLogin`; `useUsuario` de `components/SessaoProvider`; `MensagemErro`.
- Produces:
  - `IconeMoodboard({ className })`
  - `CamposMoodboard({ prefixo, titulo, descricao, aoMudarTitulo, aoMudarDescricao, focarTitulo? })`
  - `JanelaMoodboard({ cena?: { filmeId: number; caminho: string }; aoFechar(): void })`: com `cena`, lista e salva; sem `cena`, só cria e leva para o moodboard novo. `aoFechar` precisa ser estável (`useCallback`).
  - `GaleriaImagens({ imagens, titulo, filmeId })`

- [ ] **Step 1: Ícone**

Em `components/Icones.tsx`, depois de `IconeDiario`:

```tsx
export const IconeMoodboard = ({ className }: Props) => (
  <svg {...base(className)}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
)
```

- [ ] **Step 2: `components/CamposMoodboard.tsx`**

As classes do campo são as mesmas da `JanelaSessaoDupla`.

```tsx
'use client'

import { DESCRICAO_MAXIMA, TITULO_MAXIMO } from '@/lib/moodboard/validacao'

const CAMPO =
  'w-full rounded-md bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none ring-1 ring-white/20 focus:ring-white/50'

type Props = {
  prefixo: string
  titulo: string
  descricao: string
  aoMudarTitulo(valor: string): void
  aoMudarDescricao(valor: string): void
  focarTitulo?: boolean
}

export function CamposMoodboard({ prefixo, titulo, descricao, aoMudarTitulo, aoMudarDescricao, focarTitulo = false }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${prefixo}-titulo`} className="mb-1 block text-sm font-semibold">
          Título
        </label>
        <input
          id={`${prefixo}-titulo`}
          type="text"
          autoFocus={focarTitulo}
          maxLength={TITULO_MAXIMO}
          value={titulo}
          onChange={(e) => aoMudarTitulo(e.target.value)}
          placeholder="Ex.: Neons, desertos, chuva"
          className={CAMPO}
        />
      </div>
      <div>
        <label htmlFor={`${prefixo}-descricao`} className="mb-1 block text-sm font-semibold">
          Descrição <span className="font-normal text-white/50">(opcional)</span>
        </label>
        <textarea
          id={`${prefixo}-descricao`}
          maxLength={DESCRICAO_MAXIMA}
          rows={2}
          value={descricao}
          onChange={(e) => aoMudarDescricao(e.target.value)}
          className={`${CAMPO} resize-none`}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `components/JanelaMoodboard.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { adicionarCenaAction, criarMoodboardAction, listarMeusMoodboardsAction } from '@/lib/moodboard/acoes'
import type { ResumoMoodboard } from '@/lib/moodboard/tipos'
import { CamposMoodboard } from './CamposMoodboard'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos'
import { IconeFechar } from './Icones'
import { MensagemErro } from './MensagemErro'
import { usePrenderFoco } from './usePrenderFoco'

type Cena = { filmeId: number; caminho: string }
type Props = { cena?: Cena; aoFechar(): void }
type Lista = { estado: 'carregando' } | { estado: 'erro' } | { estado: 'pronta'; moodboards: ResumoMoodboard[] }

export function JanelaMoodboard({ cena, aoFechar }: Props) {
  const router = useRouter()
  const caixaRef = useRef<HTMLDivElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const [lista, setLista] = useState<Lista>({ estado: 'carregando' })
  const [criando, setCriando] = useState(!cena)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')
  const [salvaEm, setSalvaEm] = useState<{ id: string; titulo: string } | null>(null)
  const [pendente, iniciar] = useTransition()
  // O objeto `cena` muda a cada render da galeria; o efeito depende só de existir ou não.
  const comCena = cena !== undefined
  usePrenderFoco(caixaRef)

  const carregar = useCallback(() => {
    setLista({ estado: 'carregando' })
    listarMeusMoodboardsAction().then(
      (r) => setLista(r.ok ? { estado: 'pronta', moodboards: r.moodboards } : { estado: 'erro' }),
      () => setLista({ estado: 'erro' }),
    )
  }, [])

  useEffect(() => {
    if (comCena) carregar()
  }, [comCena, carregar])

  useEffect(() => {
    if (!caixaRef.current?.contains(document.activeElement)) fecharRef.current?.focus()
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowAnterior
    }
  }, [])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aoFechar])

  function salvarEm(m: ResumoMoodboard) {
    if (!cena) return
    setErro('')
    iniciar(async () => {
      const r = await adicionarCenaAction(m.id, cena.filmeId, cena.caminho)
      if (r.ok) setSalvaEm({ id: m.id, titulo: m.titulo })
      else setErro(r.erro)
    })
  }

  function criar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    iniciar(async () => {
      const r = await criarMoodboardAction(titulo, descricao, cena)
      if (!r.ok) {
        setErro(r.erro)
        return
      }
      if (cena) setSalvaEm({ id: r.id, titulo: titulo.trim() })
      else router.push(`/moodboard/${r.id}`)
    })
  }

  const rotulo = cena ? 'Salvar no moodboard' : 'Novo moodboard'

  return (
    <div onClick={aoFechar} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-janela-moodboard"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-xl bg-superficie p-6 shadow-2xl ring-1 ring-white/10"
      >
        <button
          ref={fecharRef}
          type="button"
          aria-label="Fechar"
          onClick={aoFechar}
          className="absolute right-3 top-3 rounded p-1 text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <IconeFechar />
        </button>
        <h2 id="titulo-janela-moodboard" className="pr-6 text-xl font-extrabold">
          {rotulo}
        </h2>

        {salvaEm ? (
          <div role="status" className="mt-4 space-y-4">
            <p>Cena salva em “{salvaEm.titulo}”.</p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/moodboard/${salvaEm.id}`} className={BOTAO_PRIMARIO}>
                Ver moodboard
              </Link>
              <button type="button" onClick={aoFechar} className={BOTAO_SECUNDARIO}>
                Voltar às imagens
              </button>
            </div>
          </div>
        ) : criando ? (
          <form onSubmit={criar} className="mt-4 space-y-4">
            <CamposMoodboard
              prefixo="novo-moodboard"
              titulo={titulo}
              descricao={descricao}
              aoMudarTitulo={setTitulo}
              aoMudarDescricao={setDescricao}
              focarTitulo
            />
            <div className="flex gap-3">
              {cena && (
                <button type="button" onClick={() => setCriando(false)} disabled={pendente} className={BOTAO_SECUNDARIO}>
                  Voltar
                </button>
              )}
              <button type="submit" disabled={pendente || !titulo.trim()} className={`${BOTAO_PRIMARIO} flex-1`}>
                {pendente ? 'Salvando…' : cena ? 'Criar e salvar' : 'Criar'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4">
            {lista.estado === 'carregando' && <p className="py-2 text-sm text-white/60">Carregando…</p>}
            {lista.estado === 'erro' && <MensagemErro texto="Não foi possível carregar seus moodboards" aoTentar={carregar} />}
            {lista.estado === 'pronta' &&
              (lista.moodboards.length === 0 ? (
                <p className="py-2 text-sm text-white/60">Você ainda não tem moodboards.</p>
              ) : (
                <ul className="max-h-64 space-y-1 overflow-y-auto">
                  {lista.moodboards.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={pendente}
                        onClick={() => salvarEm(m)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
                      >
                        {m.capas[0] ? (
                          <img src={m.capas[0]} alt="" className="h-9 w-16 shrink-0 rounded object-cover" />
                        ) : (
                          <span className="h-9 w-16 shrink-0 rounded bg-white/10" />
                        )}
                        <span>
                          <span className="block text-sm font-semibold">{m.titulo}</span>
                          <span className="block text-xs text-white/50">
                            {m.quantidadeCenas} {m.quantidadeCenas === 1 ? 'cena' : 'cenas'}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ))}
            <button
              type="button"
              onClick={() => {
                setErro('')
                setCriando(true)
              }}
              className={`${BOTAO_SECUNDARIO} mt-4 w-full`}
            >
              Criar novo moodboard
            </button>
          </div>
        )}

        {erro && <p className="mt-4 text-sm text-perigo">{erro}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Botão na galeria**

Substitua `components/GaleriaImagens.tsx` inteiro por:

```tsx
'use client'

import { useCallback, useRef, useState } from 'react'
import { classesMosaico, NO_MOSAICO } from '@/lib/mosaico'
import type { ImagemFilme } from '@/lib/tmdb/tipos'
import { IconeMoodboard } from './Icones'
import { JanelaLogin } from './JanelaLogin'
import { JanelaMoodboard } from './JanelaMoodboard'
import { PaletaFilme } from './PaletaFilme'
import { useUsuario } from './SessaoProvider'
import { BOTAO_TELA_CHEIA, TelaCheia } from './TelaCheia'

export function GaleriaImagens({ imagens, titulo, filmeId }: { imagens: ImagemFilme[]; titulo: string; filmeId: number }) {
  const usuario = useUsuario()
  const [aberta, setAberta] = useState<number | null>(null)
  const [janela, setJanela] = useState<'moodboard' | 'login' | null>(null)
  const origemRef = useRef<HTMLButtonElement | null>(null)
  const salvarRef = useRef<HTMLButtonElement>(null)
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
  const fecharJanela = useCallback(() => {
    setJanela(null)
    salvarRef.current?.focus()
  }, [])

  return (
    <section aria-labelledby="imagens-titulo" className="space-y-4">
      <h2 id="imagens-titulo" className="text-xl font-bold md:text-2xl">
        Imagens
      </h2>
      <PaletaFilme cenas={imagens.slice(0, 3).map((imagem) => imagem.pequena)} />
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
        <TelaCheia
          imagens={imagens}
          titulo={titulo}
          indice={aberta}
          aoMudar={setAberta}
          aoFechar={fechar}
          pausada={janela !== null}
          acoes={
            <button
              ref={salvarRef}
              type="button"
              aria-label="Salvar no moodboard"
              onClick={() => setJanela(usuario ? 'moodboard' : 'login')}
              className={BOTAO_TELA_CHEIA}
            >
              <IconeMoodboard className="h-6 w-6" />
            </button>
          }
        />
      )}
      {aberta !== null && janela === 'moodboard' && (
        <JanelaMoodboard cena={{ filmeId, caminho: imagens[aberta].caminho }} aoFechar={fecharJanela} />
      )}
      {aberta !== null && janela === 'login' && <JanelaLogin aoFechar={fecharJanela} />}
    </section>
  )
}
```

A `JanelaLogin` (z-50) vem depois da `TelaCheia` no DOM e por isso fica por cima dela. A `JanelaMoodboard` usa z-[60].

- [ ] **Step 5: Passar o id do filme**

Em `app/filme/[id]/page.tsx:126`:

```tsx
            <GaleriaImagens imagens={filme.images} titulo={filme.title} filmeId={id} />
```

- [ ] **Step 6: Conferir**

Run: `npm run typecheck` → PASS
Run: `npm test` → PASS

- [ ] **Step 7: Commit**

```bash
git add components/Icones.tsx components/CamposMoodboard.tsx components/JanelaMoodboard.tsx components/GaleriaImagens.tsx "app/filme/[id]/page.tsx"
git commit -m "feat(moodboard): salvar cena pela tela cheia da galeria

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Página /moodboards e link no menu

**Files:**
- Create: `components/CardMoodboard.tsx`
- Create: `components/BotaoNovoMoodboard.tsx`
- Create: `app/moodboards/page.tsx`
- Modify: `components/Navbar.tsx` — desktop (linhas 123-129) e celular (depois de "Sessões duplas", linha 183)

**Interfaces:**
- Consumes: `listarResumos` (Task 4), `JanelaMoodboard` (Task 5), `MensagemErro`, `criarClienteServidor`.
- Produces: rota `/moodboards`.

- [ ] **Step 1: `components/CardMoodboard.tsx`**

```tsx
import Link from 'next/link'
import type { ResumoMoodboard } from '@/lib/moodboard/tipos'

export function CardMoodboard({ moodboard }: { moodboard: ResumoMoodboard }) {
  const { id, titulo, quantidadeCenas, capas } = moodboard
  return (
    <Link
      href={`/moodboard/${id}`}
      className="group block rounded-xl bg-superficie p-3 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
    >
      <div className="grid aspect-video grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-lg">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white/5">
            {capas[i] && <img src={capas[i]} alt="" loading="lazy" className="h-full w-full object-cover" />}
          </div>
        ))}
      </div>
      <h2 className="mt-2 truncate text-sm font-bold">{titulo}</h2>
      <p className="text-xs text-white/50">
        {quantidadeCenas} {quantidadeCenas === 1 ? 'cena' : 'cenas'}
      </p>
    </Link>
  )
}
```

- [ ] **Step 2: `components/BotaoNovoMoodboard.tsx`**

```tsx
'use client'

import { useCallback, useState } from 'react'
import { BOTAO_PRIMARIO } from './estilos'
import { IconeMais } from './Icones'
import { JanelaMoodboard } from './JanelaMoodboard'

export function BotaoNovoMoodboard() {
  const [aberta, setAberta] = useState(false)
  const fechar = useCallback(() => setAberta(false), [])
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className={BOTAO_PRIMARIO}>
        <IconeMais className="h-5 w-5" /> Novo moodboard
      </button>
      {aberta && <JanelaMoodboard aoFechar={fechar} />}
    </>
  )
}
```

- [ ] **Step 3: `app/moodboards/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BotaoNovoMoodboard } from '@/components/BotaoNovoMoodboard'
import { CardMoodboard } from '@/components/CardMoodboard'
import { CONTEUDO } from '@/components/estilos'
import { MensagemErro } from '@/components/MensagemErro'
import { listarResumos } from '@/lib/moodboard/banco'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export const metadata: Metadata = { title: 'Moodboards' }

export default async function PaginaMoodboards() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/entrar?voltar=/moodboards')

  const resultado = await listarResumos(supabase, data.user.id)
  if (!resultado.ok) console.error('[CineTeca] listar moodboards falhou:', resultado.codigo)

  return (
    <main className={`${CONTEUDO} min-h-screen pb-16 pt-24`}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold md:text-3xl">Moodboards</h1>
        <BotaoNovoMoodboard />
      </div>
      {!resultado.ok ? (
        <MensagemErro texto="Não foi possível carregar seus moodboards" />
      ) : resultado.valor.length === 0 ? (
        <p className="py-16 text-center text-white/60">
          Você ainda não tem moodboards. Abra as imagens de um filme e salve as cenas de que gostar.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {resultado.valor.map((m) => (
            <li key={m.id}>
              <CardMoodboard moodboard={m} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Link no menu**

Em `components/Navbar.tsx`, desktop: troque o bloco `{usuario && ( <li> ... Meu diário ... </li> )}` (linhas 123-129) por:

```tsx
            {usuario && (
              <>
                <li>
                  <LinkNav href="/moodboards" ativo={pathname === '/moodboards'}>
                    Moodboards
                  </LinkNav>
                </li>
                <li>
                  <LinkNav href="/diario" ativo={pathname === '/diario'}>
                    <IconeDiario className="inline h-4 w-4" /> Meu diário
                  </LinkNav>
                </li>
              </>
            )}
```

Celular: logo depois do `<li>` de "Sessões duplas" (linhas 179-183):

```tsx
                  <li>
                    <Link href="/moodboards" onClick={fecharMenu} className="block py-3">
                      Moodboards
                    </Link>
                  </li>
```

- [ ] **Step 5: Conferir**

Run: `npm run typecheck` → PASS

Com `npm run dev` rodando, abra http://localhost:3000 numa largura de 1280 px, logado, e confira se a barra do topo cabe numa linha só com o link novo. Se não couber, avise o dono antes de seguir e proponha mostrar "Moodboards" só no menu da conta e no celular.

- [ ] **Step 6: Commit**

```bash
git add components/CardMoodboard.tsx components/BotaoNovoMoodboard.tsx app/moodboards/page.tsx components/Navbar.tsx
git commit -m "feat(moodboard): página Moodboards e link no menu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Página pública /moodboard/[id]

**Files:**
- Create: `app/moodboard/[id]/page.tsx`
- Create: `components/PainelMoodboard.tsx`

**Interfaces:**
- Consumes: `lerMoodboard` (Task 4) com `criarClienteAdmin()`; `ehIdMoodboard`; actions `removerCenaAction`, `editarMoodboardAction`, `excluirMoodboardAction`; `TelaCheia`; `CamposMoodboard`; `BotaoCopiarLink`; `lerUrlSite` de `lib/supabase/config`.
- Produces: rota `/moodboard/[id]`, que nunca recebe `usuario_id` nem nome do autor.

- [ ] **Step 1: `app/moodboard/[id]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CONTEUDO } from '@/components/estilos'
import { MensagemErro } from '@/components/MensagemErro'
import { PainelMoodboard } from '@/components/PainelMoodboard'
import { lerMoodboard } from '@/lib/moodboard/banco'
import { ehIdMoodboard } from '@/lib/moodboard/validacao'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { lerUrlSite } from '@/lib/supabase/config'
import { criarClienteServidor } from '@/lib/supabase/servidor'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  if (!ehIdMoodboard(id)) return {}
  const r = await lerMoodboard(criarClienteAdmin(), id, null)
  if (!r.ok || !r.valor) return {}
  const descricao = r.valor.descricao ?? `Moodboard com ${r.valor.cenas.length} cenas de filmes`
  return { title: r.valor.titulo, description: descricao, openGraph: { title: r.valor.titulo, description: descricao } }
}

export default async function PaginaMoodboard({ params }: Props) {
  const { id } = await params
  if (!ehIdMoodboard(id)) notFound()

  let usuarioId: string | null = null
  try {
    const supabase = await criarClienteServidor()
    const { data } = await supabase.auth.getUser()
    usuarioId = data.user?.id ?? null
  } catch {
    // visitante
  }

  // Leitura pelo servidor: o banco só libera o dono, e o link é público.
  const r = await lerMoodboard(criarClienteAdmin(), id, usuarioId)
  if (!r.ok) {
    console.error('[CineTeca] ler moodboard falhou:', r.codigo)
    return (
      <main className={`${CONTEUDO} min-h-screen pb-16 pt-24`}>
        <MensagemErro texto="Não foi possível carregar este moodboard" />
      </main>
    )
  }
  if (!r.valor) notFound()

  const moodboard = r.valor
  return (
    <main className={`${CONTEUDO} min-h-screen pb-16 pt-24`}>
      <h1 className="text-2xl font-extrabold md:text-4xl">{moodboard.titulo}</h1>
      {moodboard.descricao && <p className="mt-2 max-w-3xl text-white/70">{moodboard.descricao}</p>}
      <PainelMoodboard moodboard={moodboard} link={`${lerUrlSite()}/moodboard/${moodboard.id}`} />
    </main>
  )
}
```

- [ ] **Step 2: `components/PainelMoodboard.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState, useTransition } from 'react'
import { editarMoodboardAction, excluirMoodboardAction, removerCenaAction } from '@/lib/moodboard/acoes'
import type { CenaMoodboard, Moodboard } from '@/lib/moodboard/tipos'
import { BotaoCopiarLink } from './BotaoCopiarLink'
import { CamposMoodboard } from './CamposMoodboard'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos'
import { IconeFechar } from './Icones'
import { TelaCheia } from './TelaCheia'

const mesmaCena = (a: CenaMoodboard, b: CenaMoodboard) => a.filmeId === b.filmeId && a.caminho === b.caminho

export function PainelMoodboard({ moodboard, link }: { moodboard: Moodboard; link: string }) {
  const router = useRouter()
  const [cenas, setCenas] = useState(moodboard.cenas)
  const [aberta, setAberta] = useState<number | null>(null)
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [titulo, setTitulo] = useState(moodboard.titulo)
  const [descricao, setDescricao] = useState(moodboard.descricao ?? '')
  const [erro, setErro] = useState('')
  const [pendente, iniciar] = useTransition()
  const origemRef = useRef<HTMLButtonElement | null>(null)

  const fechar = useCallback(() => {
    setAberta(null)
    origemRef.current?.focus()
  }, [])

  function remover(cena: CenaMoodboard) {
    setErro('')
    setCenas((atuais) => atuais.filter((c) => !mesmaCena(c, cena)))
    iniciar(async () => {
      const r = await removerCenaAction(moodboard.id, cena.filmeId, cena.caminho)
      if (!r.ok) {
        // Devolve a cena ao lugar original.
        setCenas((atuais) => {
          const ordem = moodboard.cenas
          return ordem.filter((c) => mesmaCena(c, cena) || atuais.some((a) => mesmaCena(a, c)))
        })
        setErro(r.erro)
      }
    })
  }

  function salvarEdicao() {
    setErro('')
    iniciar(async () => {
      const r = await editarMoodboardAction(moodboard.id, titulo, descricao)
      if (r.ok) {
        setEditando(false)
        router.refresh()
      } else setErro(r.erro)
    })
  }

  function excluir() {
    setErro('')
    iniciar(async () => {
      const r = await excluirMoodboardAction(moodboard.id)
      if (r.ok) router.push('/moodboards')
      else {
        setConfirmando(false)
        setErro(r.erro)
      }
    })
  }

  return (
    <>
      {moodboard.meu && (
        <div className="mt-6">
          {editando ? (
            <div className="max-w-xl space-y-4">
              <CamposMoodboard
                prefixo="editar-moodboard"
                titulo={titulo}
                descricao={descricao}
                aoMudarTitulo={setTitulo}
                aoMudarDescricao={setDescricao}
                focarTitulo
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditando(false)} disabled={pendente} className={BOTAO_SECUNDARIO}>
                  Cancelar
                </button>
                <button type="button" onClick={salvarEdicao} disabled={pendente || !titulo.trim()} className={BOTAO_PRIMARIO}>
                  {pendente ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <BotaoCopiarLink url={link} />
              <button type="button" onClick={() => setEditando(true)} className={BOTAO_SECUNDARIO}>
                Editar
              </button>
              {confirmando ? (
                <>
                  <button type="button" onClick={excluir} disabled={pendente} className={`${BOTAO_SECUNDARIO} text-perigo`}>
                    Confirmar
                  </button>
                  <button type="button" onClick={() => setConfirmando(false)} disabled={pendente} className={BOTAO_SECUNDARIO}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmando(true)} className={`${BOTAO_SECUNDARIO} text-perigo`}>
                  Excluir
                </button>
              )}
            </div>
          )}
          {erro && <p className="mt-3 text-sm text-perigo">{erro}</p>}
        </div>
      )}

      {cenas.length === 0 ? (
        <p className="py-16 text-center text-white/60">
          Nenhuma cena adicionada.
          {moodboard.meu && ' Abra as imagens de um filme e use o botão de moodboard para salvar cenas aqui.'}
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-3">
          {cenas.map((cena, i) => (
            <li key={`${cena.filmeId}${cena.caminho}`} className="group relative overflow-hidden rounded-lg bg-superficie">
              <button
                type="button"
                aria-label={`Abrir cena de ${cena.tituloFilme}`}
                onClick={(e) => {
                  origemRef.current = e.currentTarget
                  setAberta(i)
                }}
                className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
              >
                <img src={cena.imagem.media} alt="" loading="lazy" className="aspect-video w-full object-cover" />
              </button>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6 text-xs font-semibold md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100 motion-reduce:transition-none">
                {cena.tituloFilme}
              </span>
              {moodboard.meu && (
                <button
                  type="button"
                  aria-label={`Remover cena de ${cena.tituloFilme}`}
                  onClick={() => remover(cena)}
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 text-white/80 hover:text-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:opacity-0 md:group-hover:opacity-100"
                >
                  <IconeFechar className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {aberta !== null && cenas[aberta] && (
        <TelaCheia
          imagens={cenas.map((c) => c.imagem)}
          titulo={moodboard.titulo}
          indice={aberta}
          aoMudar={setAberta}
          aoFechar={fechar}
        />
      )}
    </>
  )
}
```

O botão de remover fica sempre visível no celular (não existe "passar o mouse") e aparece no foco do teclado.

- [ ] **Step 3: Conferir**

Run: `npm run typecheck` → PASS
Run: `npm test` → PASS

- [ ] **Step 4: Commit**

```bash
git add "app/moodboard/[id]/page.tsx" components/PainelMoodboard.tsx
git commit -m "feat(moodboard): página pública com tela cheia e controles do dono

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Testes de ponta a ponta

**Files:**
- Modify: `e2e/conta/ajudantes.ts` — `esperarMoodboard`, `criarMoodboardsTeste`, `limparMoodboards`
- Create: `e2e/moodboard.spec.ts`

**Interfaces:**
- Consumes: TMDB simulado (filme 1001 = "Filme Teste 1001", 7 cenas `/cena-1001-N.jpg`); fixtures `usuario` e `logado`; projeto `cineteca-testes` com a migration (Task 2).

- [ ] **Step 1: Ajudantes**

No fim de `e2e/conta/ajudantes.ts`:

```ts
// Devolve o id do moodboard quando ele existir com a quantidade de cenas pedida.
export async function esperarMoodboard(u: Pick<UsuarioTeste, 'id'>, titulo: string, cenas: number): Promise<string> {
  let id = ''
  await expect
    .poll(
      async () => {
        const { data } = await clienteAdmin()
          .from('moodboards')
          .select('id, moodboard_cenas(filme_id)')
          .eq('usuario_id', u.id)
          .eq('titulo', titulo)
        const linha = (data ?? [])[0] as { id: string; moodboard_cenas: unknown[] } | undefined
        if (!linha) return -1
        id = linha.id
        return linha.moodboard_cenas.length
      },
      { timeout: 15_000 },
    )
    .toBe(cenas)
  return id
}

export async function criarMoodboardsTeste(u: Pick<UsuarioTeste, 'id'>, titulos: string[]): Promise<void> {
  const { error } = await clienteAdmin()
    .from('moodboards')
    .insert(titulos.map((titulo) => ({ usuario_id: u.id, titulo })))
  if (error) throw error
}

export async function limparMoodboards(u: Pick<UsuarioTeste, 'id'>): Promise<void> {
  await clienteAdmin().from('moodboards').delete().eq('usuario_id', u.id)
}
```

- [ ] **Step 2: `e2e/moodboard.spec.ts`**

```ts
import type { Page } from '@playwright/test'
import { criarMoodboardsTeste, esperarMoodboard, limparMoodboards } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

const galeria = (page: Page) => page.getByRole('region', { name: 'Imagens', exact: true })
const telaCheia = (page: Page) => page.getByRole('dialog', { name: 'Imagens de Filme Teste 1001' })
const janela = (page: Page) => page.getByRole('dialog', { name: 'Salvar no moodboard' })

async function abrirCenaESalvar(page: Page, n = 1) {
  await page.goto('/filme/1001')
  await galeria(page).getByRole('button', { name: `Cena ${n} de Filme Teste 1001` }).click()
  await telaCheia(page).getByRole('button', { name: 'Salvar no moodboard' }).click()
}

test.afterEach(async ({ usuario }) => {
  await limparMoodboards(usuario)
})

test('salva cena num moodboard novo, abre sem login, remove a cena e exclui', async ({ page, logado, browser }) => {
  await abrirCenaESalvar(page, 2)
  await janela(page).getByRole('button', { name: 'Criar novo moodboard' }).click()
  await janela(page).getByRole('textbox', { name: 'Título', exact: true }).fill('Neons Teste')
  await janela(page).getByRole('button', { name: 'Criar e salvar' }).click()
  await expect(janela(page).getByText('Cena salva em “Neons Teste”.')).toBeVisible()
  const id = await esperarMoodboard(logado, 'Neons Teste', 1)

  await page.goto('/moodboards')
  await page.getByRole('main').getByRole('link', { name: /Neons Teste/ }).click()
  await page.waitForURL(`**/moodboard/${id}`)
  await expect(page.getByRole('heading', { name: 'Neons Teste', level: 1 })).toBeVisible()

  // Visitante vê o moodboard, sem controles de dono e sem nome de ninguém.
  const contexto = await browser.newContext()
  const visitante = await contexto.newPage()
  await visitante.goto(page.url())
  await expect(visitante.getByRole('heading', { name: 'Neons Teste', level: 1 })).toBeVisible()
  await expect(visitante.getByRole('button', { name: 'Abrir cena de Filme Teste 1001' })).toBeVisible()
  await expect(visitante.getByRole('button', { name: /Remover cena/ })).toHaveCount(0)
  await expect(visitante.getByRole('button', { name: 'Excluir' })).toHaveCount(0)
  await expect(visitante.getByText(logado.nome)).toHaveCount(0)
  await contexto.close()

  await page.getByRole('button', { name: 'Remover cena de Filme Teste 1001' }).click()
  await expect(page.getByText('Nenhuma cena adicionada.', { exact: false })).toBeVisible()
  await esperarMoodboard(logado, 'Neons Teste', 0)

  await page.getByRole('button', { name: 'Excluir' }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await page.waitForURL('**/moodboards')
  await expect(page.getByText('Você ainda não tem moodboards.', { exact: false })).toBeVisible()
})

test('a mesma cena duas vezes no mesmo moodboard avisa', async ({ page, logado }) => {
  await criarMoodboardsTeste(logado, ['Dup Teste'])
  await abrirCenaESalvar(page)
  await janela(page).getByRole('button', { name: /Dup Teste/ }).click()
  await expect(janela(page).getByText('Cena salva em “Dup Teste”.')).toBeVisible()
  await esperarMoodboard(logado, 'Dup Teste', 1)

  await janela(page).getByRole('button', { name: 'Voltar às imagens' }).click()
  await telaCheia(page).getByRole('button', { name: 'Salvar no moodboard' }).click()
  await janela(page).getByRole('button', { name: /Dup Teste/ }).click()
  await expect(janela(page).getByText('Essa cena já está neste moodboard')).toBeVisible()
})

test('sem conta, pede login e o Esc fecha só a janela de login', async ({ page }) => {
  await abrirCenaESalvar(page)
  const login = page.getByRole('dialog', { name: 'Entre para salvar seus filmes' })
  await expect(login).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(login).toHaveCount(0)
  await expect(telaCheia(page)).toBeVisible()
  await expect(telaCheia(page).getByRole('button', { name: 'Salvar no moodboard' })).toBeFocused()
})

test('Tab fica na janela do moodboard e o Esc fecha só ela', async ({ page, logado }) => {
  void logado
  await abrirCenaESalvar(page)
  await expect(janela(page).getByText('Você ainda não tem moodboards.')).toBeVisible()
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    expect(await janela(page).evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(janela(page)).toHaveCount(0)
  await expect(telaCheia(page)).toBeVisible()
})

test('limite de 20 moodboards', async ({ page, logado }) => {
  await criarMoodboardsTeste(logado, Array.from({ length: 20 }, (_, i) => `Limite ${i + 1}`))
  await page.goto('/moodboards')
  await page.getByRole('button', { name: 'Novo moodboard' }).click()
  const nova = page.getByRole('dialog', { name: 'Novo moodboard' })
  await nova.getByRole('textbox', { name: 'Título', exact: true }).fill('O vigésimo primeiro')
  await nova.getByRole('button', { name: 'Criar' }).click()
  await expect(nova.getByText('Você atingiu o limite de 20 moodboards')).toBeVisible()
})

test('endereço inválido ou inexistente dá 404, e a lista pede login', async ({ page }) => {
  expect((await page.goto('/moodboard/nao-e-um-id'))?.status()).toBe(404)
  expect((await page.goto('/moodboard/00000000-0000-4000-8000-000000000000'))?.status()).toBe(404)
  await page.goto('/moodboards')
  await expect(page).toHaveURL(/\/entrar/)
})
```

- [ ] **Step 3: Rodar a suíte inteira de ponta a ponta**

Run: `npm run test:e2e`
Expected: PASS em desktop e celular, incluindo `bastidores.spec.ts` (galeria) e os testes novos. Se algum teste antigo falhar, corrija antes de seguir: a Task 3 mexeu na galeria.

- [ ] **Step 4: Commit**

```bash
git add e2e/conta/ajudantes.ts e2e/moodboard.spec.ts
git commit -m "test(moodboard): ponta a ponta do moodboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Produção, documentação e Pull Request

**Files:**
- Modify: `CLAUDE.md` — seção "Fases" e "Estrutura"
- Modify: `docs/superpowers/roteiro-proximas-fases.md`

- [ ] **Step 1: Pedir ao dono que aplique o SQL no projeto de produção (um passo de cada vez)**

Os mesmos passos da Task 2, agora no projeto **cineteca**. Espere o print com "Success". Sem isso, o site no ar dá erro ao abrir Moodboards depois do merge.

Depois, confira daqui, sem imprimir chaves: um script em Node, salvo na pasta de rascunho da sessão, que lê o `.env.local` e faz `select('id', { head: true, count: 'exact' })` em `moodboards` com a chave secreta. Esperado: sem erro e contagem 0.

- [ ] **Step 2: Documentação**

Em `CLAUDE.md`, na lista de "Fases", depois de "Boas-vindas":

```markdown
- **Moodboard de cenas — concluída.** Salvar cenas da galeria em coleções com título e descrição; página `/moodboards` e link público `/moodboard/[id]`.
  - Spec: `docs/superpowers/specs/2026-10-02-cineteca-moodboard-cenas-design.md`
  - Plano: `docs/superpowers/plans/2026-10-02-cineteca-moodboard-cenas.md`
  - O banco só libera o dono; a página pública lê com `criarClienteAdmin()` e não mostra o nome de quem criou.
  - A cena é conferida no TMDB antes de gravar: o título do filme nunca vem do navegador.
```

Em "Estrutura", depois de `lib/diario/`:

```markdown
- `lib/moodboard/` — tipos, validação, banco e Server Actions do Moodboard. `components/TelaCheia.tsx` é a tela cheia compartilhada pela galeria e pelo moodboard.
```

Em `docs/superpowers/roteiro-proximas-fases.md`, na lista de ordem aprovada, antes de "Comunidade":

```markdown
4. **Moodboard de cenas** — concluído (spec e plano de 2026-10-02).
```

e renumere "Comunidade" para 5.

- [ ] **Step 3: Verificação final**

Run: `npm run typecheck` → PASS
Run: `npm test` → PASS
Run: `npm run test:supabase` → PASS
Run: `npm run test:e2e` → PASS

- [ ] **Step 4: Commit e Pull Request**

```bash
git add CLAUDE.md docs/superpowers/roteiro-proximas-fases.md
git commit -m "docs: moodboard de cenas no CLAUDE.md e no roteiro

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log --oneline master..HEAD
GIT_TERMINAL_PROMPT=0 git push -u origin moodboard-cenas
```

Mande ao dono o link que o `git push` imprime, com os passos: abrir o link, clicar em **Create pull request**, depois em **Merge pull request** e **Confirm merge**. Peça o print.

- [ ] **Step 5: Conferir no ar**

Depois do merge, espere a Vercel publicar e confira com `curl -s -o /dev/null -w "%{http_code}" https://cineteca-gules.vercel.app/moodboard/00000000-0000-4000-8000-000000000000` (esperado: 404) e `.../moodboards` (esperado: 307 para `/entrar`). Peça ao dono um print da página de um filme com a tela cheia aberta e o botão de moodboard visível.
