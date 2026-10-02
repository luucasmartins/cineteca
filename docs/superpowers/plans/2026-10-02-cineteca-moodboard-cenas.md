# Moodboard de Cenas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users save movie backdrops into themed visual collections (moodboards) that are private to them but shareable via a public URL.

**Architecture:** Two new Supabase tables (`moodboards`, `moodboard_cenas`) with public SELECT RLS. Server Actions for CRUD. A modal in the existing lightbox for adding scenes. A listing page at `/moodboards` and a public detail page at `/moodboard/[id]`. The public page uses `criarClienteAdmin()` to read the author's profile name (perfis has owner-only SELECT RLS).

**Tech Stack:** Next.js 16.3 (App Router), React 19, TypeScript 7, Tailwind v4, Supabase (Postgres + Auth + RLS)

**Spec:** `docs/superpowers/specs/2026-10-02-cineteca-moodboard-cenas-design.md`

## Global Constraints

- All UI text in pt-BR. TMDB calls use `language=pt-BR` and `region=BR`.
- Use design tokens (not raw colors): `destaque` green always with black text over it, `perigo` red only for errors and "Excluir minha conta".
- `<img>` tags, not `next/image`. Missing images use `ImagemComReserva` with `reserva` prop.
- Logs with `[CineTeca]` prefix; never log tokens, keys, passwords, headers, or user IDs.
- Commits end with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`.
- Next 16: `params` and `searchParams` are `Promise`. `catch` variable is `unknown`.
- Respect `prefers-reduced-motion`.
- Styles from `components/estilos.ts`: `CONTEUDO`, `BOTAO_PRIMARIO`, `BOTAO_SECUNDARIO`.

## Review Focus

1. A user who is not logged in clicks "Salvar no moodboard" in the lightbox — should redirect to login and resume the action after login (pending action pattern).
2. A visitor opens `/moodboard/[id]` for a moodboard that was deleted — should see 404, not a crash.
3. A user tries to add the same scene (same moodboard + filme + image path) twice — should see a friendly error, not a 500.
4. A user with 20 moodboards tries to create a 21st — should see "Você atingiu o limite de 20 moodboards", not a generic error.
5. The public moodboard page with 0 scenes — should show an empty state ("Nenhuma cena adicionada"), not a blank grid.

---

### Task 1: Database migration + types + validation

**Files:**
- Create: `supabase/migrations/20261002000000_moodboards.sql`
- Create: `lib/moodboard/tipos.ts`
- Create: `lib/moodboard/validacao.ts`
- Test: `lib/moodboard/__tests__/validacao.test.ts`

**Interfaces:**
- Consumes: `Resultado<T>` from `lib/auth/validacao`
- Produces:
  - `Moodboard`: `{ id: string; titulo: string; descricao: string | null; criadoEm: string; atualizadoEm: string; meu: boolean }`
  - `MoodboardCena`: `{ moodboardId: string; filmeId: number; caminhoImagem: string; tituloFilme: string | null; ordem: number; criadoEm: string }`
  - `MoodboardResumo`: `{ id: string; titulo: string; descricao: string | null; quantidadeCenas: number; primeirasCenas: string[] }`
  - `validarTituloMoodboard(bruto: unknown): Resultado<string>`
  - `validarDescricaoMoodboard(bruto: unknown): Resultado<string | null>`
  - `validarCaminhoImagem(bruto: unknown): Resultado<string>`
  - `TITULO_MAXIMO_MOODBOARD = 60`, `DESCRICAO_MAXIMA_MOODBOARD = 200`, `MAXIMO_MOODBOARDS = 20`

- [ ] **Step 1: Write validation tests**

```ts
// lib/moodboard/__tests__/validacao.test.ts
import { describe, expect, it } from 'vitest'
import {
  DESCRICAO_MAXIMA_MOODBOARD,
  MAXIMO_MOODBOARDS,
  TITULO_MAXIMO_MOODBOARD,
  validarCaminhoImagem,
  validarDescricaoMoodboard,
  validarTituloMoodboard,
} from '../validacao'

describe('validarTituloMoodboard', () => {
  it('aceita título válido', () => {
    expect(validarTituloMoodboard('Neons')).toEqual({ ok: true, valor: 'Neons' })
  })

  it('corta espaços', () => {
    expect(validarTituloMoodboard('  Chuva  ')).toEqual({ ok: true, valor: 'Chuva' })
  })

  it('recusa vazio', () => {
    expect(validarTituloMoodboard('')).toEqual({ ok: false, erro: 'Digite um título' })
  })

  it('recusa só espaços', () => {
    expect(validarTituloMoodboard('   ')).toEqual({ ok: false, erro: 'Digite um título' })
  })

  it('recusa não-string', () => {
    expect(validarTituloMoodboard(42)).toEqual({ ok: false, erro: 'Digite um título' })
  })

  it('recusa título longo demais', () => {
    const longo = 'a'.repeat(TITULO_MAXIMO_MOODBOARD + 1)
    const r = validarTituloMoodboard(longo)
    expect(r.ok).toBe(false)
  })

  it('aceita no limite', () => {
    const noLimite = 'a'.repeat(TITULO_MAXIMO_MOODBOARD)
    expect(validarTituloMoodboard(noLimite).ok).toBe(true)
  })
})

describe('validarDescricaoMoodboard', () => {
  it('aceita null/vazio como null', () => {
    expect(validarDescricaoMoodboard('')).toEqual({ ok: true, valor: null })
    expect(validarDescricaoMoodboard(null)).toEqual({ ok: true, valor: null })
    expect(validarDescricaoMoodboard(undefined)).toEqual({ ok: true, valor: null })
  })

  it('aceita descrição válida', () => {
    expect(validarDescricaoMoodboard('Cenas cyberpunk')).toEqual({ ok: true, valor: 'Cenas cyberpunk' })
  })

  it('recusa descrição longa demais', () => {
    const longa = 'a'.repeat(DESCRICAO_MAXIMA_MOODBOARD + 1)
    const r = validarDescricaoMoodboard(longa)
    expect(r.ok).toBe(false)
  })
})

describe('validarCaminhoImagem', () => {
  it('aceita caminho válido do TMDB', () => {
    expect(validarCaminhoImagem('/abc123.jpg')).toEqual({ ok: true, valor: '/abc123.jpg' })
  })

  it('recusa vazio', () => {
    expect(validarCaminhoImagem('')).toEqual({ ok: false, erro: 'Imagem inválida' })
  })

  it('recusa não-string', () => {
    expect(validarCaminhoImagem(123)).toEqual({ ok: false, erro: 'Imagem inválida' })
  })
})

describe('constantes', () => {
  it('exporta limites corretos', () => {
    expect(TITULO_MAXIMO_MOODBOARD).toBe(60)
    expect(DESCRICAO_MAXIMA_MOODBOARD).toBe(200)
    expect(MAXIMO_MOODBOARDS).toBe(20)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/moodboard/__tests__/validacao.test.ts`
Expected: FAIL — module `../validacao` not found

- [ ] **Step 3: Write types**

```ts
// lib/moodboard/tipos.ts
export type Moodboard = {
  id: string
  titulo: string
  descricao: string | null
  criadoEm: string
  atualizadoEm: string
  meu: boolean
}

export type MoodboardCena = {
  moodboardId: string
  filmeId: number
  caminhoImagem: string
  tituloFilme: string | null
  ordem: number
  criadoEm: string
}

export type MoodboardResumo = {
  id: string
  titulo: string
  descricao: string | null
  quantidadeCenas: number
  primeirasCenas: string[]
}
```

- [ ] **Step 4: Write validation**

```ts
// lib/moodboard/validacao.ts
import type { Resultado } from '@/lib/auth/validacao'

export const TITULO_MAXIMO_MOODBOARD = 60
export const DESCRICAO_MAXIMA_MOODBOARD = 200
export const MAXIMO_MOODBOARDS = 20

export function validarTituloMoodboard(bruto: unknown): Resultado<string> {
  const titulo = typeof bruto === 'string' ? bruto.trim() : ''
  if (!titulo) return { ok: false, erro: 'Digite um título' }
  if (titulo.length > TITULO_MAXIMO_MOODBOARD)
    return { ok: false, erro: `O título pode ter no máximo ${TITULO_MAXIMO_MOODBOARD} caracteres` }
  return { ok: true, valor: titulo }
}

export function validarDescricaoMoodboard(bruto: unknown): Resultado<string | null> {
  if (bruto === null || bruto === undefined) return { ok: true, valor: null }
  const descricao = typeof bruto === 'string' ? bruto.trim() : ''
  if (!descricao) return { ok: true, valor: null }
  if (descricao.length > DESCRICAO_MAXIMA_MOODBOARD)
    return { ok: false, erro: `A descrição pode ter no máximo ${DESCRICAO_MAXIMA_MOODBOARD} caracteres` }
  return { ok: true, valor: descricao }
}

export function validarCaminhoImagem(bruto: unknown): Resultado<string> {
  const caminho = typeof bruto === 'string' ? bruto.trim() : ''
  if (!caminho) return { ok: false, erro: 'Imagem inválida' }
  return { ok: true, valor: caminho }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/moodboard/__tests__/validacao.test.ts`
Expected: All PASS

- [ ] **Step 6: Write migration**

```sql
-- supabase/migrations/20261002000000_moodboards.sql
-- CineTeca: Moodboards de cenas (coleções temáticas de backdrops).
-- Aplicar no SQL Editor do Supabase, nos projetos "cineteca" e "cineteca-testes".

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
grant select on public.moodboards to anon, authenticated;
grant insert, update, delete on public.moodboards to authenticated;

alter table public.moodboards enable row level security;

create policy "moodboards: qualquer um lê" on public.moodboards
  for select using (true);
create policy "moodboards: inserir as próprias" on public.moodboards
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "moodboards: atualizar as próprias" on public.moodboards
  for update to authenticated using ((select auth.uid()) = usuario_id);
create policy "moodboards: apagar as próprias" on public.moodboards
  for delete to authenticated using ((select auth.uid()) = usuario_id);

create table public.moodboard_cenas (
  moodboard_id uuid not null references public.moodboards (id) on delete cascade,
  filme_id integer not null check (filme_id > 0),
  caminho_imagem text not null,
  titulo_filme text,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  primary key (moodboard_id, filme_id, caminho_imagem)
);

create index moodboard_cenas_por_moodboard on public.moodboard_cenas (moodboard_id, ordem, criado_em);

revoke all on public.moodboard_cenas from anon, authenticated;
grant select on public.moodboard_cenas to anon, authenticated;
grant insert, delete on public.moodboard_cenas to authenticated;

alter table public.moodboard_cenas enable row level security;

create policy "moodboard_cenas: qualquer um lê" on public.moodboard_cenas
  for select using (true);
create policy "moodboard_cenas: inserir no próprio moodboard" on public.moodboard_cenas
  for insert to authenticated
  with check (
    exists (
      select 1 from public.moodboards
      where id = moodboard_id and usuario_id = (select auth.uid())
    )
  );
create policy "moodboard_cenas: apagar do próprio moodboard" on public.moodboard_cenas
  for delete to authenticated
  using (
    exists (
      select 1 from public.moodboards
      where id = moodboard_id and usuario_id = (select auth.uid())
    )
  );
```

- [ ] **Step 7: Commit**

```bash
git add lib/moodboard/tipos.ts lib/moodboard/validacao.ts lib/moodboard/__tests__/validacao.test.ts supabase/migrations/20261002000000_moodboards.sql
git commit -m "feat(moodboard): tipos, validação e migration

Tabelas moodboards e moodboard_cenas com RLS público para leitura.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Database layer (banco.ts)

**Files:**
- Create: `lib/moodboard/banco.ts`

**Interfaces:**
- Consumes: `Moodboard`, `MoodboardCena`, `MoodboardResumo` from `lib/moodboard/tipos.ts`; `SupabaseClient` from `@supabase/supabase-js`
- Produces:
  - `listarMeusMoodboards(cliente, usuarioId): Promise<MoodboardResumo[]>`
  - `lerMoodboard(cliente, id, usuarioIdAtual): Promise<{ moodboard: Moodboard; cenas: MoodboardCena[]; nomeAutor: string | null } | null>`
  - `criarMoodboard(cliente, usuarioId, titulo, descricao): Promise<string>` — returns the new ID
  - `atualizarMoodboard(cliente, id, usuarioId, titulo, descricao): Promise<boolean>`
  - `excluirMoodboard(cliente, id, usuarioId): Promise<boolean>`
  - `adicionarCena(cliente, moodboardId, filmeId, caminhoImagem, tituloFilme): Promise<boolean>`
  - `removerCena(cliente, moodboardId, filmeId, caminhoImagem): Promise<boolean>`
  - `contarMoodboards(cliente, usuarioId): Promise<number>`

- [ ] **Step 1: Write banco.ts**

```ts
// lib/moodboard/banco.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Moodboard, MoodboardCena, MoodboardResumo } from './tipos'

type Cliente = Pick<SupabaseClient, 'from'>

type LinhaMoodboard = {
  id: string
  titulo: string
  descricao: string | null
  criado_em: string
  atualizado_em: string
  usuario_id: string
}

type LinhaCena = {
  moodboard_id: string
  filme_id: number
  caminho_imagem: string
  titulo_filme: string | null
  ordem: number
  criado_em: string
}

function paraMoodboard(linha: LinhaMoodboard, usuarioIdAtual: string | null): Moodboard {
  return {
    id: linha.id,
    titulo: linha.titulo,
    descricao: linha.descricao,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
    meu: usuarioIdAtual !== null && linha.usuario_id === usuarioIdAtual,
  }
}

function paraCena(linha: LinhaCena): MoodboardCena {
  return {
    moodboardId: linha.moodboard_id,
    filmeId: linha.filme_id,
    caminhoImagem: linha.caminho_imagem,
    tituloFilme: linha.titulo_filme,
    ordem: linha.ordem,
    criadoEm: linha.criado_em,
  }
}

export async function contarMoodboards(cliente: Cliente, usuarioId: string): Promise<number> {
  const { count, error } = await cliente
    .from('moodboards')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
  if (error) {
    console.error('[CineTeca] contarMoodboards falhou:', error.code)
    return 0
  }
  return count ?? 0
}

export async function listarMeusMoodboards(cliente: Cliente, usuarioId: string): Promise<MoodboardResumo[]> {
  const { data, error } = await cliente
    .from('moodboards')
    .select('id, titulo, descricao, criado_em')
    .eq('usuario_id', usuarioId)
    .order('criado_em', { ascending: false })
    .limit(50)
  if (error) {
    console.error('[CineTeca] listarMeusMoodboards falhou:', error.code)
    return []
  }
  const moodboards = (data ?? []) as Array<{ id: string; titulo: string; descricao: string | null }>
  if (moodboards.length === 0) return []

  const ids = moodboards.map((m) => m.id)
  const { data: cenas } = await cliente
    .from('moodboard_cenas')
    .select('moodboard_id, caminho_imagem')
    .in('moodboard_id', ids)
    .order('ordem')
    .order('criado_em')
  const cenasMap = new Map<string, string[]>()
  for (const c of (cenas ?? []) as Array<{ moodboard_id: string; caminho_imagem: string }>) {
    const lista = cenasMap.get(c.moodboard_id) ?? []
    lista.push(c.caminho_imagem)
    cenasMap.set(c.moodboard_id, lista)
  }

  return moodboards.map((m) => {
    const todas = cenasMap.get(m.id) ?? []
    return {
      id: m.id,
      titulo: m.titulo,
      descricao: m.descricao,
      quantidadeCenas: todas.length,
      primeirasCenas: todas.slice(0, 4),
    }
  })
}

export async function lerMoodboard(
  cliente: Cliente,
  id: string,
  usuarioIdAtual: string | null,
): Promise<{ moodboard: Moodboard; cenas: MoodboardCena[]; nomeAutor: string | null } | null> {
  const { data, error } = await cliente
    .from('moodboards')
    .select('id, titulo, descricao, criado_em, atualizado_em, usuario_id')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) {
    if (error) console.error('[CineTeca] lerMoodboard falhou:', error.code)
    return null
  }
  const linha = data as LinhaMoodboard

  const [cenasRes, perfilRes] = await Promise.all([
    cliente
      .from('moodboard_cenas')
      .select('moodboard_id, filme_id, caminho_imagem, titulo_filme, ordem, criado_em')
      .eq('moodboard_id', id)
      .order('ordem')
      .order('criado_em'),
    cliente.from('perfis').select('nome').eq('id', linha.usuario_id).maybeSingle(),
  ])

  return {
    moodboard: paraMoodboard(linha, usuarioIdAtual),
    cenas: ((cenasRes.data ?? []) as LinhaCena[]).map(paraCena),
    nomeAutor: (perfilRes.data?.nome as string | undefined) ?? null,
  }
}

export async function criarMoodboard(
  cliente: Cliente,
  usuarioId: string,
  titulo: string,
  descricao: string | null,
): Promise<string | null> {
  const { data, error } = await cliente
    .from('moodboards')
    .insert({ usuario_id: usuarioId, titulo, descricao })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[CineTeca] criarMoodboard falhou:', error?.code)
    return null
  }
  return (data as { id: string }).id
}

export async function atualizarMoodboard(
  cliente: Cliente,
  id: string,
  usuarioId: string,
  titulo: string,
  descricao: string | null,
): Promise<boolean> {
  const { error } = await cliente
    .from('moodboards')
    .update({ titulo, descricao, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('usuario_id', usuarioId)
  if (error) {
    console.error('[CineTeca] atualizarMoodboard falhou:', error.code)
    return false
  }
  return true
}

export async function excluirMoodboard(cliente: Cliente, id: string, usuarioId: string): Promise<boolean> {
  const { error } = await cliente
    .from('moodboards')
    .delete()
    .eq('id', id)
    .eq('usuario_id', usuarioId)
  if (error) {
    console.error('[CineTeca] excluirMoodboard falhou:', error.code)
    return false
  }
  return true
}

export async function adicionarCena(
  cliente: Cliente,
  moodboardId: string,
  filmeId: number,
  caminhoImagem: string,
  tituloFilme: string | null,
): Promise<{ ok: boolean; duplicada?: boolean }> {
  const { error } = await cliente
    .from('moodboard_cenas')
    .insert({ moodboard_id: moodboardId, filme_id: filmeId, caminho_imagem: caminhoImagem, titulo_filme: tituloFilme })
  if (error) {
    if (error.code === '23505') return { ok: false, duplicada: true }
    console.error('[CineTeca] adicionarCena falhou:', error.code)
    return { ok: false }
  }
  return { ok: true }
}

export async function removerCena(
  cliente: Cliente,
  moodboardId: string,
  filmeId: number,
  caminhoImagem: string,
): Promise<boolean> {
  const { error } = await cliente
    .from('moodboard_cenas')
    .delete()
    .eq('moodboard_id', moodboardId)
    .eq('filme_id', filmeId)
    .eq('caminho_imagem', caminhoImagem)
  if (error) {
    console.error('[CineTeca] removerCena falhou:', error.code)
    return false
  }
  return true
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/moodboard/banco.ts
git commit -m "feat(moodboard): camada de banco (queries Supabase)

CRUD de moodboards e cenas, listagem com contagem e primeiras 4 cenas.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Server Actions

**Files:**
- Create: `lib/moodboard/acoes.ts`

**Interfaces:**
- Consumes: `criarClienteServidor` from `lib/supabase/servidor`; `validarTituloMoodboard`, `validarDescricaoMoodboard`, `validarCaminhoImagem`, `MAXIMO_MOODBOARDS` from `lib/moodboard/validacao`; all banco functions from `lib/moodboard/banco`; `validarFilmeId` from `lib/avaliacoes/validacao`
- Produces:
  - `criarMoodboardAction(titulo, descricao): Promise<RespostaMoodboard>`
  - `excluirMoodboardAction(id): Promise<RespostaSimples>`
  - `atualizarMoodboardAction(id, titulo, descricao): Promise<RespostaSimples>`
  - `adicionarCenaAction(moodboardId, filmeId, caminhoImagem, tituloFilme): Promise<RespostaSimples>`
  - `removerCenaAction(moodboardId, filmeId, caminhoImagem): Promise<RespostaSimples>`
  - `obterMeusMoodboards(): Promise<MoodboardResumo[]>`
  - `RespostaMoodboard = { ok: true; id: string } | { ok: false; erro: string; sessaoExpirada: boolean }`
  - `RespostaSimples = { ok: true } | { ok: false; erro: string; sessaoExpirada: boolean }`

- [ ] **Step 1: Write acoes.ts**

```ts
// lib/moodboard/acoes.ts
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { validarFilmeId } from '@/lib/avaliacoes/validacao'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import {
  adicionarCena,
  atualizarMoodboard,
  contarMoodboards,
  criarMoodboard,
  excluirMoodboard,
  listarMeusMoodboards,
  removerCena,
} from './banco'
import type { MoodboardResumo } from './tipos'
import { MAXIMO_MOODBOARDS, validarCaminhoImagem, validarDescricaoMoodboard, validarTituloMoodboard } from './validacao'

export type RespostaMoodboard =
  | { ok: true; id: string }
  | { ok: false; erro: string; sessaoExpirada: boolean }

export type RespostaSimples =
  | { ok: true }
  | { ok: false; erro: string; sessaoExpirada: boolean }

const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])
const ERRO_GENERICO = 'Não foi possível salvar. Tente de novo.'

async function obterUsuario() {
  const supabase = await criarClienteServidor()
  const { data: sessao, error } = await supabase.auth.getUser()
  if (!sessao.user) {
    const temCookie = (await cookies()).getAll().some((c) => c.name.includes('auth-token'))
    console.error('[CineTeca] moodboard sem sessão:', error?.name ?? 'sem erro', temCookie ? 'com cookie' : 'sem cookie')
    return { supabase, usuario: null as null }
  }
  return { supabase, usuario: sessao.user }
}

export async function criarMoodboardAction(
  tituloInput: unknown,
  descricaoInput: unknown,
): Promise<RespostaMoodboard> {
  const titulo = validarTituloMoodboard(tituloInput)
  if (!titulo.ok) return { ok: false, erro: titulo.erro, sessaoExpirada: false }
  const descricao = validarDescricaoMoodboard(descricaoInput)
  if (!descricao.ok) return { ok: false, erro: descricao.erro, sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: ERRO_GENERICO, sessaoExpirada: true }

  const total = await contarMoodboards(supabase, usuario.id)
  if (total >= MAXIMO_MOODBOARDS)
    return { ok: false, erro: `Você atingiu o limite de ${MAXIMO_MOODBOARDS} moodboards`, sessaoExpirada: false }

  const id = await criarMoodboard(supabase, usuario.id, titulo.valor, descricao.valor)
  if (!id) return { ok: false, erro: ERRO_GENERICO, sessaoExpirada: false }

  revalidatePath('/moodboards')
  return { ok: true, id }
}

export async function excluirMoodboardAction(idInput: unknown): Promise<RespostaSimples> {
  if (typeof idInput !== 'string' || !idInput.trim())
    return { ok: false, erro: 'Moodboard inválido', sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: ERRO_GENERICO, sessaoExpirada: true }

  const ok = await excluirMoodboard(supabase, idInput.trim(), usuario.id)
  if (!ok) return { ok: false, erro: ERRO_GENERICO, sessaoExpirada: false }

  revalidatePath('/moodboards')
  return { ok: true }
}

export async function atualizarMoodboardAction(
  idInput: unknown,
  tituloInput: unknown,
  descricaoInput: unknown,
): Promise<RespostaSimples> {
  if (typeof idInput !== 'string' || !idInput.trim())
    return { ok: false, erro: 'Moodboard inválido', sessaoExpirada: false }
  const titulo = validarTituloMoodboard(tituloInput)
  if (!titulo.ok) return { ok: false, erro: titulo.erro, sessaoExpirada: false }
  const descricao = validarDescricaoMoodboard(descricaoInput)
  if (!descricao.ok) return { ok: false, erro: descricao.erro, sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: ERRO_GENERICO, sessaoExpirada: true }

  const ok = await atualizarMoodboard(supabase, idInput.trim(), usuario.id, titulo.valor, descricao.valor)
  if (!ok) return { ok: false, erro: ERRO_GENERICO, sessaoExpirada: false }

  revalidatePath('/moodboards')
  revalidatePath(`/moodboard/${idInput.trim()}`)
  return { ok: true }
}

export async function adicionarCenaAction(
  moodboardIdInput: unknown,
  filmeIdInput: unknown,
  caminhoInput: unknown,
  tituloFilmeInput: unknown,
): Promise<RespostaSimples> {
  if (typeof moodboardIdInput !== 'string' || !moodboardIdInput.trim())
    return { ok: false, erro: 'Moodboard inválido', sessaoExpirada: false }
  const filmeId = validarFilmeId(filmeIdInput)
  if (!filmeId.ok) return { ok: false, erro: filmeId.erro, sessaoExpirada: false }
  const caminho = validarCaminhoImagem(caminhoInput)
  if (!caminho.ok) return { ok: false, erro: caminho.erro, sessaoExpirada: false }
  const tituloFilme = typeof tituloFilmeInput === 'string' ? tituloFilmeInput.slice(0, 300) : null

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: ERRO_GENERICO, sessaoExpirada: true }

  const resultado = await adicionarCena(supabase, moodboardIdInput.trim(), filmeId.valor, caminho.valor, tituloFilme)
  if (!resultado.ok) {
    if (resultado.duplicada) return { ok: false, erro: 'Cena já está neste moodboard', sessaoExpirada: false }
    return { ok: false, erro: ERRO_GENERICO, sessaoExpirada: false }
  }

  revalidatePath('/moodboards')
  revalidatePath(`/moodboard/${moodboardIdInput.trim()}`)
  return { ok: true }
}

export async function removerCenaAction(
  moodboardIdInput: unknown,
  filmeIdInput: unknown,
  caminhoInput: unknown,
): Promise<RespostaSimples> {
  if (typeof moodboardIdInput !== 'string' || !moodboardIdInput.trim())
    return { ok: false, erro: 'Moodboard inválido', sessaoExpirada: false }
  const filmeId = validarFilmeId(filmeIdInput)
  if (!filmeId.ok) return { ok: false, erro: filmeId.erro, sessaoExpirada: false }
  const caminho = validarCaminhoImagem(caminhoInput)
  if (!caminho.ok) return { ok: false, erro: caminho.erro, sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: ERRO_GENERICO, sessaoExpirada: true }

  const ok = await removerCena(supabase, moodboardIdInput.trim(), filmeId.valor, caminho.valor)
  if (!ok) return { ok: false, erro: ERRO_GENERICO, sessaoExpirada: false }

  revalidatePath(`/moodboard/${moodboardIdInput.trim()}`)
  revalidatePath('/moodboards')
  return { ok: true }
}

export async function obterMeusMoodboards(): Promise<MoodboardResumo[]> {
  try {
    const { supabase, usuario } = await obterUsuario()
    if (!usuario) return []
    return await listarMeusMoodboards(supabase, usuario.id)
  } catch {
    return []
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/moodboard/acoes.ts
git commit -m "feat(moodboard): server actions (CRUD de moodboards e cenas)

Limite de 20 moodboards, detecção de duplicada, revalidação de cache.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Modal component (ModalMoodboard)

**Files:**
- Create: `components/ModalMoodboard.tsx`

**Interfaces:**
- Consumes: `criarMoodboardAction`, `adicionarCenaAction`, `obterMeusMoodboards` from `lib/moodboard/acoes`; `MoodboardResumo` from `lib/moodboard/tipos`; `TITULO_MAXIMO_MOODBOARD`, `DESCRICAO_MAXIMA_MOODBOARD` from `lib/moodboard/validacao`; `usePrenderFoco` from `components/usePrenderFoco`
- Produces: `ModalMoodboard` component with props `{ filmeId: number; caminhoImagem: string; tituloFilme: string; aoFechar: () => void }`

- [ ] **Step 1: Write ModalMoodboard.tsx**

```tsx
// components/ModalMoodboard.tsx
'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { adicionarCenaAction, criarMoodboardAction, obterMeusMoodboards } from '@/lib/moodboard/acoes'
import type { MoodboardResumo } from '@/lib/moodboard/tipos'
import { DESCRICAO_MAXIMA_MOODBOARD, TITULO_MAXIMO_MOODBOARD } from '@/lib/moodboard/validacao'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos'
import { IconeFechar } from './Icones'
import { usePrenderFoco } from './usePrenderFoco'

type Props = {
  filmeId: number
  caminhoImagem: string
  tituloFilme: string
  aoFechar: () => void
}

export function ModalMoodboard({ filmeId, caminhoImagem, tituloFilme, aoFechar }: Props) {
  const caixaRef = useRef<HTMLDivElement>(null)
  const [moodboards, setMoodboards] = useState<MoodboardResumo[] | null>(null)
  const [criando, setCriando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [pendente, iniciar] = useTransition()
  usePrenderFoco(caixaRef)

  useEffect(() => {
    obterMeusMoodboards().then(setMoodboards)
  }, [])

  useEffect(() => {
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
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  function selecionarMoodboard(moodboardId: string) {
    setErro('')
    setSucesso('')
    iniciar(async () => {
      const r = await adicionarCenaAction(moodboardId, filmeId, caminhoImagem, tituloFilme)
      if (r.ok) {
        setSucesso('Cena adicionada!')
        setTimeout(aoFechar, 1200)
      } else {
        setErro(r.erro)
      }
    })
  }

  function criarESalvar() {
    setErro('')
    setSucesso('')
    iniciar(async () => {
      const r = await criarMoodboardAction(titulo, descricao || null)
      if (!r.ok) {
        setErro(r.erro)
        return
      }
      const r2 = await adicionarCenaAction(r.id, filmeId, caminhoImagem, tituloFilme)
      if (r2.ok) {
        setSucesso('Moodboard criado e cena adicionada!')
        setTimeout(aoFechar, 1200)
      } else {
        setErro(r2.erro)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={aoFechar}
    >
      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-label="Salvar no moodboard"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-superficie p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{criando ? 'Novo moodboard' : 'Salvar no moodboard'}</h2>
          <button type="button" aria-label="Fechar" onClick={aoFechar} className="rounded p-1 hover:bg-white/10">
            <IconeFechar className="h-5 w-5" />
          </button>
        </div>

        {erro && <p className="mb-3 rounded bg-perigo/20 px-3 py-2 text-sm text-perigo">{erro}</p>}
        {sucesso && <p className="mb-3 rounded bg-destaque/20 px-3 py-2 text-sm text-destaque">{sucesso}</p>}

        {!criando ? (
          <>
            {moodboards === null ? (
              <p className="py-4 text-center text-sm text-white/50">Carregando...</p>
            ) : moodboards.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/60">
                Você ainda não tem moodboards.
              </p>
            ) : (
              <ul className="mb-4 max-h-60 space-y-1 overflow-y-auto">
                {moodboards.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() => selecionarMoodboard(m.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/10 disabled:opacity-60"
                    >
                      <span className="grid h-10 w-10 shrink-0 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded">
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className="bg-white/10">
                            {m.primeirasCenas[i] && (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${m.primeirasCenas[i]}`}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            )}
                          </span>
                        ))}
                      </span>
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
            )}
            <button
              type="button"
              onClick={() => setCriando(true)}
              className={`${BOTAO_SECUNDARIO} w-full`}
            >
              + Criar novo moodboard
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              criarESalvar()
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="titulo-moodboard" className="mb-1 block text-sm font-semibold">
                Título
              </label>
              <input
                id="titulo-moodboard"
                type="text"
                maxLength={TITULO_MAXIMO_MOODBOARD}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Neons, Desertos, Chuva..."
                className="w-full rounded-lg border border-white/20 bg-fundo px-3 py-2 text-sm outline-none focus:border-destaque"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="descricao-moodboard" className="mb-1 block text-sm font-semibold">
                Descrição <span className="font-normal text-white/50">(opcional)</span>
              </label>
              <textarea
                id="descricao-moodboard"
                maxLength={DESCRICAO_MAXIMA_MOODBOARD}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Do que se trata este moodboard?"
                rows={2}
                className="w-full resize-none rounded-lg border border-white/20 bg-fundo px-3 py-2 text-sm outline-none focus:border-destaque"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCriando(false)}
                className={`${BOTAO_SECUNDARIO} flex-1`}
                disabled={pendente}
              >
                Voltar
              </button>
              <button type="submit" className={`${BOTAO_PRIMARIO} flex-1`} disabled={pendente || !titulo.trim()}>
                {pendente ? 'Salvando...' : 'Criar e salvar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ModalMoodboard.tsx
git commit -m "feat(moodboard): modal de seleção/criação de moodboard

Lista os moodboards existentes, cria novo inline, adiciona a cena.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Integrate into gallery lightbox + navbar

**Files:**
- Modify: `components/GaleriaImagens.tsx` — add "Salvar no moodboard" button in `TelaCheia`
- Modify: `components/Navbar.tsx` — add "Moodboards" link for logged-in users

**Interfaces:**
- Consumes: `ModalMoodboard` from `components/ModalMoodboard.tsx`; `Usuario` type from `lib/auth/usuario`
- Produces: updated `GaleriaImagens` with `usuario` prop and moodboard button in lightbox; updated `Navbar` with Moodboards link

- [ ] **Step 1: Update GaleriaImagens**

Add `usuario` prop to `GaleriaImagens` so it knows whether to show the moodboard button. Add an `IconeMoodboard` to `Icones.tsx`. Add the "Salvar no moodboard" button inside `TelaCheia`. When clicked without account, redirect to login.

In `GaleriaImagens.tsx`:
- Add `usuario` to the props: `{ imagens: ImagemFilme[]; titulo: string; filmeId: number; usuario: Usuario | null }`
- Pass `filmeId` and `usuario` down to `TelaCheia`
- In `TelaCheia`, add a state `modalAberto` and render `ModalMoodboard` when true
- Add the button next to the close button, with `aria-label="Salvar no moodboard"`
- If user is not logged in, redirect to `/entrar?voltar=...` using `window.location.href`

Key code for the button in `TelaCheia`:

```tsx
const [modalAberto, setModalAberto] = useState(false)

// In the render, after the close button:
<button
  type="button"
  aria-label="Salvar no moodboard"
  onClick={() => {
    if (!usuario) {
      window.location.href = `/entrar?voltar=${encodeURIComponent(window.location.pathname)}`
      return
    }
    setModalAberto(true)
  }}
  className={`${botao} fixed right-4 top-16 z-10`}
>
  <IconeMoodboard className="h-6 w-6" />
</button>

{modalAberto && (
  <ModalMoodboard
    filmeId={filmeId}
    caminhoImagem={caminhoImagemAtual}
    tituloFilme={titulo}
    aoFechar={() => setModalAberto(false)}
  />
)}
```

The `caminhoImagem` needs to be extracted from the TMDB URL. Add a helper: the `ImagemFilme` stores full URLs like `https://image.tmdb.org/t/p/w1280/abc.jpg`. Extract the path part (`/abc.jpg`) by splitting on `/t/p/` and taking the last segment after the size prefix.

Add to `lib/tmdb/tipos.ts` or inline: a function `caminhoDoTmdb(url: string): string` that extracts the `/filename.jpg` path.

**Important:** The `GaleriaImagens` component is also called from the movie page (`app/filme/[id]/page.tsx`). Update that call site to pass `filmeId` and `usuario`.

- [ ] **Step 2: Add IconeMoodboard to Icones.tsx**

Add a simple grid/collection icon:

```tsx
export function IconeMoodboard({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  )
}
```

- [ ] **Step 3: Update Navbar**

In `Navbar.tsx`, add a "Moodboards" link for logged-in users in the desktop menu (after "Meu diário") and in the mobile menu (after "Sessões duplas"):

Desktop (inside the `{usuario && (` block, add a new `<li>` before the diário one):

```tsx
<li>
  <LinkNav href="/moodboards" ativo={pathname === '/moodboards'}>
    Moodboards
  </LinkNav>
</li>
```

Mobile (inside the `{usuario ? (` block, add after "Sessões duplas"):

```tsx
<li>
  <Link href="/moodboards" onClick={fecharMenu} className="block py-3">
    Moodboards
  </Link>
</li>
```

- [ ] **Step 4: Update movie page call site**

In `app/filme/[id]/page.tsx`, pass `filmeId` and `usuario` to `<GaleriaImagens>`. The movie page already has access to the movie ID from `params` and may already have `usuario` from the session. Check and add the props.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS with no errors

- [ ] **Step 6: Commit**

```bash
git add components/GaleriaImagens.tsx components/Icones.tsx components/Navbar.tsx components/ModalMoodboard.tsx app/filme/[id]/page.tsx
git commit -m "feat(moodboard): botão na galeria e link no menu

Salvar no moodboard pelo lightbox da galeria. Link na barra para logados.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Listing page (/moodboards)

**Files:**
- Create: `components/CardMoodboard.tsx`
- Create: `app/moodboards/page.tsx`

**Interfaces:**
- Consumes: `obterMeusMoodboards` from `lib/moodboard/acoes`; `MoodboardResumo` from `lib/moodboard/tipos`; `obterUsuarioAtual` from `lib/auth/sessao`; `CONTEUDO`, `BOTAO_PRIMARIO` from `components/estilos`
- Produces: `/moodboards` page showing the user's moodboards as cards

- [ ] **Step 1: Write CardMoodboard.tsx**

```tsx
// components/CardMoodboard.tsx
import Link from 'next/link'

type Props = {
  id: string
  titulo: string
  quantidadeCenas: number
  primeirasCenas: string[]
}

export function CardMoodboard({ id, titulo, quantidadeCenas, primeirasCenas }: Props) {
  return (
    <Link
      href={`/moodboard/${id}`}
      className="group block rounded-xl bg-superficie p-3 transition-colors hover:bg-white/10"
    >
      <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-lg">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white/5">
            {primeirasCenas[i] && (
              <img
                src={`https://image.tmdb.org/t/p/w300${primeirasCenas[i]}`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>
      <h3 className="mt-2 truncate text-sm font-bold group-hover:text-white">{titulo}</h3>
      <p className="text-xs text-white/50">
        {quantidadeCenas} {quantidadeCenas === 1 ? 'cena' : 'cenas'}
      </p>
    </Link>
  )
}
```

- [ ] **Step 2: Write app/moodboards/page.tsx**

```tsx
// app/moodboards/page.tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CardMoodboard } from '@/components/CardMoodboard'
import { BOTAO_PRIMARIO, CONTEUDO } from '@/components/estilos'
import { obterUsuarioAtual } from '@/lib/auth/sessao'
import { obterMeusMoodboards } from '@/lib/moodboard/acoes'
import { CriarMoodboardVazio } from './CriarMoodboardVazio'

export const metadata: Metadata = { title: 'Moodboards — CineTeca' }

export default async function PaginaMoodboards() {
  const usuario = await obterUsuarioAtual()
  if (!usuario) redirect('/entrar?voltar=/moodboards')

  const moodboards = await obterMeusMoodboards()

  return (
    <main className={`${CONTEUDO} pb-16 pt-24`}>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold md:text-3xl">Moodboards</h1>
        <CriarMoodboardVazio />
      </div>

      {moodboards.length === 0 ? (
        <p className="py-16 text-center text-white/50">
          Você ainda não tem moodboards. Abra a galeria de um filme e salve cenas aqui.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {moodboards.map((m) => (
            <CardMoodboard
              key={m.id}
              id={m.id}
              titulo={m.titulo}
              quantidadeCenas={m.quantidadeCenas}
              primeirasCenas={m.primeirasCenas}
            />
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Write CriarMoodboardVazio client component**

```tsx
// app/moodboards/CriarMoodboardVazio.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { criarMoodboardAction } from '@/lib/moodboard/acoes'
import { BOTAO_PRIMARIO } from '@/components/estilos'

export function CriarMoodboardVazio() {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()

  function criar() {
    const titulo = prompt('Título do moodboard:')
    if (!titulo?.trim()) return
    iniciar(async () => {
      const r = await criarMoodboardAction(titulo, null)
      if (r.ok) router.push(`/moodboard/${r.id}`)
      else alert(r.erro)
    })
  }

  return (
    <button type="button" onClick={criar} disabled={pendente} className={BOTAO_PRIMARIO}>
      {pendente ? 'Criando...' : '+ Novo moodboard'}
    </button>
  )
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/CardMoodboard.tsx app/moodboards/page.tsx app/moodboards/CriarMoodboardVazio.tsx
git commit -m "feat(moodboard): página de listagem (/moodboards)

Grid de cards com miniaturas 2x2, criação rápida pelo botão do topo.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Public detail page (/moodboard/[id])

**Files:**
- Create: `app/moodboard/[id]/page.tsx`

**Interfaces:**
- Consumes: `criarClienteAdmin` from `lib/supabase/admin`; `criarClienteServidor` from `lib/supabase/servidor`; `lerMoodboard` from `lib/moodboard/banco`; `CONTEUDO`, `BOTAO_SECUNDARIO` from `components/estilos`; `removerCenaAction`, `excluirMoodboardAction`, `atualizarMoodboardAction` from `lib/moodboard/acoes`
- Produces: public moodboard page with grid of scenes, lightbox, owner controls

- [ ] **Step 1: Write the server page**

```tsx
// app/moodboard/[id]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CONTEUDO } from '@/components/estilos'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { lerMoodboard } from '@/lib/moodboard/banco'
import { GradeMoodboard } from './GradeMoodboard'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const dados = await lerMoodboard(criarClienteAdmin(), id, null)
  if (!dados) return {}
  return {
    title: `${dados.moodboard.titulo} — CineTeca`,
    description: dados.moodboard.descricao || `Moodboard com ${dados.cenas.length} cenas`,
  }
}

export default async function PaginaMoodboard({ params }: Props) {
  const { id } = await params

  let usuarioId: string | null = null
  try {
    const supabase = await criarClienteServidor()
    const { data } = await supabase.auth.getUser()
    usuarioId = data.user?.id ?? null
  } catch {
    // visitante
  }

  const dados = await lerMoodboard(criarClienteAdmin(), id, usuarioId)
  if (!dados) notFound()

  const { moodboard, cenas, nomeAutor } = dados

  return (
    <main className={`${CONTEUDO} pb-16 pt-24`}>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold md:text-3xl">{moodboard.titulo}</h1>
        {moodboard.descricao && <p className="mt-2 text-white/70">{moodboard.descricao}</p>}
        {nomeAutor && <p className="mt-1 text-sm text-white/50">por {nomeAutor}</p>}
      </div>

      {cenas.length === 0 ? (
        <p className="py-16 text-center text-white/50">Nenhuma cena adicionada.</p>
      ) : (
        <GradeMoodboard cenas={cenas} meu={moodboard.meu} moodboardId={moodboard.id} titulo={moodboard.titulo} descricao={moodboard.descricao} />
      )}
    </main>
  )
}
```

- [ ] **Step 2: Write the client-side grid component**

```tsx
// app/moodboard/[id]/GradeMoodboard.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from '@/components/estilos'
import { IconeFechar, IconeSetaDireita, IconeSetaEsquerda } from '@/components/Icones'
import { atualizarMoodboardAction, excluirMoodboardAction, removerCenaAction } from '@/lib/moodboard/acoes'
import type { MoodboardCena } from '@/lib/moodboard/tipos'
import { DESCRICAO_MAXIMA_MOODBOARD, TITULO_MAXIMO_MOODBOARD } from '@/lib/moodboard/validacao'

type Props = {
  cenas: MoodboardCena[]
  meu: boolean
  moodboardId: string
  titulo: string
  descricao: string | null
}

export function GradeMoodboard({ cenas: cenasIniciais, meu, moodboardId, titulo: tituloInicial, descricao: descricaoInicial }: Props) {
  const router = useRouter()
  const [cenas, setCenas] = useState(cenasIniciais)
  const [aberta, setAberta] = useState<number | null>(null)
  const [pendente, iniciar] = useTransition()
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(tituloInicial)
  const [descricao, setDescricao] = useState(descricaoInicial ?? '')

  function remover(cena: MoodboardCena) {
    iniciar(async () => {
      const r = await removerCenaAction(moodboardId, cena.filmeId, cena.caminhoImagem)
      if (r.ok) {
        setCenas((prev) => prev.filter((c) => !(c.filmeId === cena.filmeId && c.caminhoImagem === cena.caminhoImagem)))
        setAberta(null)
      }
    })
  }

  function excluir() {
    if (!confirm('Excluir este moodboard? Essa ação não pode ser desfeita.')) return
    iniciar(async () => {
      const r = await excluirMoodboardAction(moodboardId)
      if (r.ok) router.push('/moodboards')
    })
  }

  function salvarEdicao() {
    iniciar(async () => {
      const r = await atualizarMoodboardAction(moodboardId, titulo, descricao || null)
      if (r.ok) {
        setEditando(false)
        router.refresh()
      }
    })
  }

  const fechar = useCallback(() => setAberta(null), [])
  const total = cenas.length
  const anterior = useCallback(() => setAberta((i) => (i !== null ? (i - 1 + total) % total : null)), [total])
  const proxima = useCallback(() => setAberta((i) => (i !== null ? (i + 1) % total : null)), [total])

  return (
    <>
      {meu && (
        <div className="mb-6 flex flex-wrap gap-2">
          {editando ? (
            <div className="w-full space-y-3">
              <input
                type="text"
                maxLength={TITULO_MAXIMO_MOODBOARD}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-fundo px-3 py-2 text-sm outline-none focus:border-destaque"
              />
              <textarea
                maxLength={DESCRICAO_MAXIMA_MOODBOARD}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                placeholder="Descrição (opcional)"
                className="w-full resize-none rounded-lg border border-white/20 bg-fundo px-3 py-2 text-sm outline-none focus:border-destaque"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditando(false)} className={BOTAO_SECUNDARIO} disabled={pendente}>
                  Cancelar
                </button>
                <button type="button" onClick={salvarEdicao} className={BOTAO_PRIMARIO} disabled={pendente || !titulo.trim()}>
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" onClick={() => setEditando(true)} className={BOTAO_SECUNDARIO}>
                Editar
              </button>
              <button type="button" onClick={excluir} className={`${BOTAO_SECUNDARIO} text-perigo`} disabled={pendente}>
                Excluir
              </button>
            </>
          )}
        </div>
      )}

      <div role="list" className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {cenas.map((cena, i) => (
          <div key={`${cena.filmeId}-${cena.caminhoImagem}`} role="listitem" className="group relative">
            <button
              type="button"
              onClick={() => setAberta(i)}
              className="w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <img
                src={`https://image.tmdb.org/t/p/w780${cena.caminhoImagem}`}
                alt={cena.tituloFilme ? `Cena de ${cena.tituloFilme}` : 'Cena'}
                loading="lazy"
                className="aspect-video w-full object-cover"
              />
            </button>
            {cena.tituloFilme && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100">
                {cena.tituloFilme}
              </span>
            )}
            {meu && (
              <button
                type="button"
                aria-label={`Remover cena de ${cena.tituloFilme ?? 'filme'}`}
                onClick={() => remover(cena)}
                disabled={pendente}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white/70 opacity-0 hover:text-white group-hover:opacity-100"
              >
                <IconeFechar className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {aberta !== null && (
        <TelaCheiaMoodboard
          cenas={cenas}
          indice={aberta}
          aoMudar={setAberta}
          aoFechar={fechar}
          anterior={anterior}
          proxima={proxima}
        />
      )}
    </>
  )
}

type TelaProps = {
  cenas: MoodboardCena[]
  indice: number
  aoMudar: (i: number) => void
  aoFechar: () => void
  anterior: () => void
  proxima: () => void
}

function TelaCheiaMoodboard({ cenas, indice, aoFechar, anterior, proxima }: TelaProps) {
  const cena = cenas[indice]
  const botao = 'rounded-full bg-black/60 p-2 text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

  useKeyboard(aoFechar, anterior, proxima)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cena em tela cheia"
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
    >
      <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <img
          src={`https://image.tmdb.org/t/p/w1280${cena.caminhoImagem}`}
          alt={cena.tituloFilme ? `Cena de ${cena.tituloFilme}` : 'Cena'}
          className="max-h-[80vh] w-full rounded-lg object-contain"
        />
        {cena.tituloFilme && (
          <p className="mt-3 text-center text-sm text-white/70">{cena.tituloFilme}</p>
        )}
        <p className="mt-1 text-center text-xs text-white/40">
          {indice + 1} de {cenas.length}
        </p>
        <button type="button" aria-label="Fechar" onClick={aoFechar} className={`${botao} fixed right-4 top-4 z-10`}>
          <IconeFechar className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Cena anterior" onClick={anterior} className={`${botao} absolute left-2 top-1/2 -translate-y-1/2`}>
          <IconeSetaEsquerda className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Próxima cena" onClick={proxima} className={`${botao} absolute right-2 top-1/2 -translate-y-1/2`}>
          <IconeSetaDireita className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}

function useKeyboard(aoFechar: () => void, anterior: () => void, proxima: () => void) {
  import('react').then(({ useEffect }) => {
    // This won't work — we need to use useEffect at top level
  })
}
```

**Correction — `useKeyboard` must be a proper hook.** Replace the broken `useKeyboard` at the bottom with:

```tsx
import { useEffect } from 'react'

// Place this as a module-level function, not inline
function useKeyboard(aoFechar: () => void, anterior: () => void, proxima: () => void) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
      else if (e.key === 'ArrowLeft') anterior()
      else if (e.key === 'ArrowRight') proxima()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar, anterior, proxima])
}
```

Import `useEffect` at the top of the file alongside the other React imports.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/moodboard/[id]/page.tsx app/moodboard/[id]/GradeMoodboard.tsx
git commit -m "feat(moodboard): página pública do moodboard (/moodboard/[id])

Grid de cenas com lightbox, hover com título do filme, controles do dono.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Integration tests (Supabase)

**Files:**
- Create: `testes-integracao/moodboard.test.ts`

**Interfaces:**
- Consumes: Supabase test helpers from `testes-integracao/banco.test.ts` (study the existing helpers); `contarMoodboards`, `listarMeusMoodboards`, `lerMoodboard`, `criarMoodboard`, `excluirMoodboard`, `adicionarCena`, `removerCena` from `lib/moodboard/banco`

- [ ] **Step 1: Write integration tests**

```ts
// testes-integracao/moodboard.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
// Follow the exact same setup pattern as testes-integracao/banco.test.ts:
// - import admin() helper and clienteDe() helper
// - create test users in beforeAll, delete in afterAll
// - test against the cineteca-testes project

// Tests to write:
// 1. criarMoodboard: creates a moodboard, returns an id
// 2. listarMeusMoodboards: lists only the user's moodboards
// 3. adicionarCena: adds a scene, shows in lerMoodboard
// 4. adicionarCena duplicate: returns { ok: false, duplicada: true }
// 5. removerCena: removes the scene
// 6. excluirMoodboard: cascades to cenas
// 7. RLS: user B cannot insert into user A's moodboard
// 8. RLS: user B CAN read user A's moodboard (public SELECT)
// 9. contarMoodboards: returns correct count
```

Each test body follows the same pattern as the existing `banco.test.ts` tests — create via `clienteDe(user)`, verify with admin queries. See existing test file for the exact helpers to import.

- [ ] **Step 2: Run tests against cineteca-testes**

Run: `npm run test:supabase -- moodboard`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add testes-integracao/moodboard.test.ts
git commit -m "test(moodboard): testes de integração (CRUD + RLS)

Testa criação, listagem, cenas, duplicada, cascata e RLS público.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Apply migration + final verification

**Files:**
- None new — this task applies the migration and runs full checks

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: Run unit tests**

Run: `npm test`
Expected: PASS (includes the validation tests from Task 1)

- [ ] **Step 3: Inform the owner to apply the migration**

The owner needs to run the SQL from `supabase/migrations/20261002000000_moodboards.sql` in the SQL Editor of both Supabase projects (`cineteca` and `cineteca-testes`). Provide step-by-step instructions:

1. Abra o painel do Supabase (https://supabase.com/dashboard)
2. Selecione o projeto **cineteca-testes**
3. Vá em **SQL Editor**
4. Cole o conteúdo de `supabase/migrations/20261002000000_moodboards.sql`
5. Clique em **Run**
6. Repita para o projeto **cineteca**

- [ ] **Step 4: Run integration tests after migration is applied**

Run: `npm run test:supabase -- moodboard`
Expected: All PASS

- [ ] **Step 5: Start dev server and test manually**

Run: `npm run dev`
Test:
1. Open a movie with images
2. Click a scene in the gallery → lightbox opens
3. Click the moodboard button → modal appears
4. Create a new moodboard with a title → scene is added
5. Go to /moodboards → see the new moodboard card
6. Click the card → see the public page with the scene
7. Remove the scene → grid updates
8. Delete the moodboard → redirects to /moodboards

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(moodboard): ajustes da verificação final

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
