# Sessão dupla e Diário pessoal — Plano de execução

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a Sessão dupla (dois filmes sob um título, compartilhável por link e baixável para redes), o botão Assisti (diário pessoal com data e anotação) e a aba Números (dashboard com mapa de calor, décadas e diretores).

**Architecture:** Três etapas independentes. A Sessão dupla tem tabela no Supabase, Server Actions, imagens via `ImageResponse` e uma página pública. O Assisti tem tabela, Server Actions e listagem agrupada por mês. O Números é uma função pura sobre os registros do Assisti, renderizada em SVG/CSS. O banco do Assisti guarda título, pôster, ano e diretores no momento do registro para que o dashboard não precise de consulta ao TMDB.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 7, Tailwind v4, Supabase (Postgres + Auth), `next/og` (ImageResponse), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-01-cineteca-sessao-dupla-diario-design.md`

## Global Constraints

- Texto na tela em pt-BR. Chamadas ao TMDB usam `language=pt-BR` e `region=BR`.
- Fundo `#0B0B0F`, superfícies `#16161D`, fonte Manrope, verde `#01BD4E` com texto preto.
- Usar tokens de cor, nunca cor escrita à mão. Botões seguem `BOTAO_PRIMARIO` / `BOTAO_SECUNDARIO` de `components/estilos.ts`.
- `<img>` simples, nunca `next/image`. Sem imagem: `ImagemComReserva` com prop `reserva`.
- Respeitar `prefers-reduced-motion`.
- Erros com `[CineTeca]`, só código — nunca tokens, chaves, senhas, cabeçalhos ou id de usuário.
- Nenhuma biblioteca nova.
- Next 16: `params` e `searchParams` são `Promise`. A variável do `catch` é `unknown`.
- Vitest: hooks em bloco `{ ... }`.
- Commits terminam com `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`.

## Review Focus

1. **Título vazio ou só com espaços:** `validarTitulo` deve recusar `"   "` — um título que passa `trim()` vazio é string vazia, não 1–60 chars.
2. **Data no fuso do usuário vs. fuso do servidor:** o servidor rejeita datas futuras em `America/Sao_Paulo`, mas o navegador manda a data local; alguém no Japão à meia-noite pode estar "amanhã" no Brasil. O banco aceita até `current_date + 1` como margem.
3. **Mesmo filme nos dois lados da sessão dupla:** a `CHECK` do banco e a validação do servidor devem proibir `filme1_id = filme2_id`.
4. **Pôster inexistente na imagem gerada:** a rota de imagem deve usar o poster-padrao.svg como fallback se poster_url for null; a ImageResponse não aceita `<img>` — precisa de `<img>` inline via fetch do ArrayBuffer.
5. **Registros duplicados no mesmo segundo (duplo clique):** a Server Action do Assisti grava com `gen_random_uuid()`, então dois cliques geram dois registros. O botão deve desabilitar durante o envio (`useTransition`).

---

### Task 1: Sessão dupla — banco, validação e Server Actions

**Files:**
- Create: `supabase/migrations/20261001020000_sessoes_duplas.sql`
- Create: `lib/sessao-dupla/tipos.ts`
- Create: `lib/sessao-dupla/validacao.ts`
- Create: `lib/sessao-dupla/validacao.test.ts`
- Create: `lib/sessao-dupla/banco.ts`
- Create: `lib/sessao-dupla/banco.test.ts`
- Create: `lib/sessao-dupla/acoes.ts`

**Interfaces:**
- Consumes: `lib/auth/validacao.ts` → `Resultado<T>`; `lib/avaliacoes/validacao.ts` → `validarFilmeId`; `lib/tmdb/detalhes.ts` → `getMovieDetails`; `lib/supabase/servidor.ts` → `criarClienteServidor`; `lib/supabase/admin.ts` → `criarClienteAdmin`.
- Produces: `SessaoDupla`, `RespostaSessaoDupla`, `validarTitulo(bruto: unknown): Resultado<string>`, `criarSessaoDupla(titulo: unknown, filme1Id: unknown, filme2Id: unknown): Promise<RespostaSessaoDupla>`, `apagarSessaoDupla(id: unknown): Promise<RespostaSimples>`, `lerSessaoPorCodigo(codigo: string): Promise<SessaoDupla | null>`, `listarMinhasSessoes(usuarioId: string): Promise<SessaoDupla[]>`.

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/20261001020000_sessoes_duplas.sql
-- CineTeca: Sessão dupla (dois filmes sob um título, pública por link).
-- Aplicar no SQL Editor do Supabase, nos projetos "cineteca" e "cineteca-testes".

create table public.sessoes_duplas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null check (char_length(trim(titulo)) between 1 and 60),
  filme1_id integer not null check (filme1_id > 0),
  filme1_titulo text not null check (char_length(filme1_titulo) <= 300),
  filme1_poster text,
  filme1_ano text,
  filme2_id integer not null check (filme2_id > 0),
  filme2_titulo text not null check (char_length(filme2_titulo) <= 300),
  filme2_poster text,
  filme2_ano text,
  criado_em timestamptz not null default now(),
  check (filme1_id <> filme2_id)
);

create index sessoes_duplas_por_usuario on public.sessoes_duplas (usuario_id, criado_em desc);

revoke all on public.sessoes_duplas from anon, authenticated;
grant select, insert, delete on public.sessoes_duplas to authenticated;

alter table public.sessoes_duplas enable row level security;

create policy "sessoes_duplas: ler as próprias" on public.sessoes_duplas
  for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "sessoes_duplas: inserir as próprias" on public.sessoes_duplas
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "sessoes_duplas: apagar as próprias" on public.sessoes_duplas
  for delete to authenticated using ((select auth.uid()) = usuario_id);
```

- [ ] **Step 2: Create types — `lib/sessao-dupla/tipos.ts`**

```ts
export type FilmeDaSessao = {
  id: number
  titulo: string
  posterUrl: string | null
  ano: string | null
}

export type SessaoDupla = {
  id: string
  titulo: string
  filme1: FilmeDaSessao
  filme2: FilmeDaSessao
  criadoEm: string
  minha: boolean // true quando o usuario_id é o da pessoa logada
}

export type RespostaSessaoDupla =
  | { ok: true; sessao: SessaoDupla }
  | { ok: false; erro: string; sessaoExpirada: boolean }

export type RespostaSimples =
  | { ok: true }
  | { ok: false; erro: string; sessaoExpirada: boolean }
```

- [ ] **Step 3: Write failing validation tests — `lib/sessao-dupla/validacao.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { validarFilmesDiferentes, validarTitulo } from './validacao'

describe('validarTitulo', () => {
  it('aceita título válido entre 1 e 60 caracteres', () => {
    expect(validarTitulo('Solidão Cyberpunk')).toEqual({ ok: true, valor: 'Solidão Cyberpunk' })
  })
  it('remove espaços das pontas', () => {
    expect(validarTitulo('  Amor & Caos  ')).toEqual({ ok: true, valor: 'Amor & Caos' })
  })
  it('recusa string vazia', () => {
    expect(validarTitulo('')).toEqual({ ok: false, erro: 'Digite um título' })
  })
  it('recusa só espaços', () => {
    expect(validarTitulo('   ')).toEqual({ ok: false, erro: 'Digite um título' })
  })
  it('recusa mais de 60 caracteres', () => {
    expect(validarTitulo('A'.repeat(61))).toEqual({ ok: false, erro: 'O título pode ter no máximo 60 caracteres' })
  })
  it('recusa valor não-string', () => {
    expect(validarTitulo(123)).toEqual({ ok: false, erro: 'Digite um título' })
    expect(validarTitulo(null)).toEqual({ ok: false, erro: 'Digite um título' })
  })
})

describe('validarFilmesDiferentes', () => {
  it('aceita ids diferentes', () => {
    expect(validarFilmesDiferentes(603, 604)).toEqual({ ok: true, valor: undefined })
  })
  it('recusa ids iguais', () => {
    expect(validarFilmesDiferentes(603, 603)).toEqual({ ok: false, erro: 'Escolha dois filmes diferentes' })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run lib/sessao-dupla/validacao.test.ts`
Expected: FAIL — module not found

- [ ] **Step 5: Implement validation — `lib/sessao-dupla/validacao.ts`**

```ts
import type { Resultado } from '@/lib/auth/validacao'

export const TITULO_MAXIMO = 60
export const MENSAGEM_ERRO_SESSAO = 'Não foi possível salvar. Tente de novo.'

export function validarTitulo(bruto: unknown): Resultado<string> {
  const titulo = typeof bruto === 'string' ? bruto.trim() : ''
  if (!titulo) return { ok: false, erro: 'Digite um título' }
  if (titulo.length > TITULO_MAXIMO) return { ok: false, erro: 'O título pode ter no máximo 60 caracteres' }
  return { ok: true, valor: titulo }
}

export function validarFilmesDiferentes(id1: number, id2: number): Resultado<void> {
  if (id1 === id2) return { ok: false, erro: 'Escolha dois filmes diferentes' }
  return { ok: true, valor: undefined }
}
```

- [ ] **Step 6: Run validation tests to verify they pass**

Run: `npx vitest run lib/sessao-dupla/validacao.test.ts`
Expected: PASS

- [ ] **Step 7: Write failing banco tests — `lib/sessao-dupla/banco.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { paraFilmeDaSessao, paraSessaoDupla } from './banco'

describe('paraFilmeDaSessao', () => {
  it('converte a linha do banco para FilmeDaSessao', () => {
    expect(
      paraFilmeDaSessao({ id: 603, titulo: 'Matrix', poster: '/p.jpg', ano: '1999' }),
    ).toEqual({ id: 603, titulo: 'Matrix', posterUrl: '/p.jpg', ano: '1999' })
  })
  it('poster nulo continua nulo', () => {
    expect(paraFilmeDaSessao({ id: 603, titulo: 'Matrix', poster: null, ano: '1999' }).posterUrl).toBeNull()
  })
})

describe('paraSessaoDupla', () => {
  const linha = {
    id: 'abc-123',
    titulo: 'Solidão Cyberpunk',
    filme1_id: 603,
    filme1_titulo: 'Matrix',
    filme1_poster: '/p1.jpg',
    filme1_ano: '1999',
    filme2_id: 604,
    filme2_titulo: 'Her',
    filme2_poster: '/p2.jpg',
    filme2_ano: '2013',
    criado_em: '2026-10-01T12:00:00Z',
    usuario_id: 'u1',
  }

  it('converte a linha do banco para SessaoDupla', () => {
    const sessao = paraSessaoDupla(linha, 'u1')
    expect(sessao.titulo).toBe('Solidão Cyberpunk')
    expect(sessao.filme1).toEqual({ id: 603, titulo: 'Matrix', posterUrl: '/p1.jpg', ano: '1999' })
    expect(sessao.filme2).toEqual({ id: 604, titulo: 'Her', posterUrl: '/p2.jpg', ano: '2013' })
    expect(sessao.minha).toBe(true)
  })

  it('minha é false para outro usuário', () => {
    expect(paraSessaoDupla(linha, 'u2').minha).toBe(false)
  })

  it('minha é false sem usuário', () => {
    expect(paraSessaoDupla(linha, null).minha).toBe(false)
  })
})
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npx vitest run lib/sessao-dupla/banco.test.ts`
Expected: FAIL

- [ ] **Step 9: Implement banco — `lib/sessao-dupla/banco.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FilmeDaSessao, SessaoDupla } from './tipos'

type Cliente = Pick<SupabaseClient, 'from'>

type LinhaSessao = {
  id: string
  titulo: string
  filme1_id: number
  filme1_titulo: string
  filme1_poster: string | null
  filme1_ano: string | null
  filme2_id: number
  filme2_titulo: string
  filme2_poster: string | null
  filme2_ano: string | null
  criado_em: string
  usuario_id: string
}

const COLUNAS =
  'id, titulo, filme1_id, filme1_titulo, filme1_poster, filme1_ano, filme2_id, filme2_titulo, filme2_poster, filme2_ano, criado_em, usuario_id'

export function paraFilmeDaSessao(f: { id: number; titulo: string; poster: string | null; ano: string | null }): FilmeDaSessao {
  return { id: f.id, titulo: f.titulo, posterUrl: f.poster, ano: f.ano }
}

export function paraSessaoDupla(linha: LinhaSessao, usuarioIdAtual: string | null): SessaoDupla {
  return {
    id: linha.id,
    titulo: linha.titulo,
    filme1: { id: linha.filme1_id, titulo: linha.filme1_titulo, posterUrl: linha.filme1_poster, ano: linha.filme1_ano },
    filme2: { id: linha.filme2_id, titulo: linha.filme2_titulo, posterUrl: linha.filme2_poster, ano: linha.filme2_ano },
    criadoEm: linha.criado_em,
    minha: usuarioIdAtual !== null && linha.usuario_id === usuarioIdAtual,
  }
}

export async function lerSessaoPorCodigo(cliente: Cliente, codigo: string, usuarioId: string | null): Promise<SessaoDupla | null> {
  const { data, error } = await cliente
    .from('sessoes_duplas')
    .select(COLUNAS)
    .eq('id', codigo)
    .maybeSingle()
  if (error) {
    console.error('[CineTeca] Falha ao ler sessão dupla:', error.code)
    return null
  }
  return data ? paraSessaoDupla(data as LinhaSessao, usuarioId) : null
}

export async function listarMinhasSessoes(cliente: Cliente, usuarioId: string): Promise<SessaoDupla[]> {
  const { data, error } = await cliente
    .from('sessoes_duplas')
    .select(COLUNAS)
    .eq('usuario_id', usuarioId)
    .order('criado_em', { ascending: false })
    .limit(50)
  if (error) {
    console.error('[CineTeca] Falha ao listar sessões duplas:', error.code)
    return []
  }
  return ((data ?? []) as LinhaSessao[]).map((l) => paraSessaoDupla(l, usuarioId))
}
```

- [ ] **Step 10: Run banco tests to verify they pass**

Run: `npx vitest run lib/sessao-dupla/banco.test.ts`
Expected: PASS

- [ ] **Step 11: Implement Server Actions — `lib/sessao-dupla/acoes.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { getMovieDetails } from '@/lib/tmdb/detalhes'
import { validarFilmeId } from '@/lib/avaliacoes/validacao'
import { listarMinhasSessoes, paraSessaoDupla } from './banco'
import type { RespostaSimples, RespostaSessaoDupla, SessaoDupla } from './tipos'
import { MENSAGEM_ERRO_SESSAO, validarFilmesDiferentes, validarTitulo } from './validacao'

const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])

function falhou(codigo: string | undefined, acao: string): { ok: false; erro: string; sessaoExpirada: boolean } {
  console.error(`[CineTeca] ${acao} falhou:`, codigo ?? 'sem código')
  return { ok: false, erro: MENSAGEM_ERRO_SESSAO, sessaoExpirada: CODIGOS_DE_SESSAO.has(codigo ?? '') }
}

async function obterUsuario() {
  const supabase = await criarClienteServidor()
  const { data: sessao, error } = await supabase.auth.getUser()
  if (!sessao.user) {
    const temCookie = (await cookies()).getAll().some((c) => c.name.includes('auth-token'))
    console.error('[CineTeca] sessão dupla sem sessão:', error?.name ?? 'sem erro', temCookie ? 'com cookie' : 'sem cookie')
    return { supabase, usuario: null as null }
  }
  return { supabase, usuario: sessao.user }
}

export async function criarSessaoDupla(
  tituloInput: unknown,
  filme1IdInput: unknown,
  filme2IdInput: unknown,
): Promise<RespostaSessaoDupla> {
  const titulo = validarTitulo(tituloInput)
  if (!titulo.ok) return { ok: false, erro: titulo.erro, sessaoExpirada: false }
  const id1 = validarFilmeId(filme1IdInput)
  if (!id1.ok) return { ok: false, erro: id1.erro, sessaoExpirada: false }
  const id2 = validarFilmeId(filme2IdInput)
  if (!id2.ok) return { ok: false, erro: id2.erro, sessaoExpirada: false }
  const diferentes = validarFilmesDiferentes(id1.valor, id2.valor)
  if (!diferentes.ok) return { ok: false, erro: diferentes.erro, sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: MENSAGEM_ERRO_SESSAO, sessaoExpirada: true }

  const [filme1, filme2] = await Promise.all([
    getMovieDetails(id1.valor).catch(() => null),
    getMovieDetails(id2.valor).catch(() => null),
  ])
  if (!filme1 || !filme2) return { ok: false, erro: 'Filme não encontrado', sessaoExpirada: false }

  const { data, error } = await supabase
    .from('sessoes_duplas')
    .insert({
      usuario_id: usuario.id,
      titulo: titulo.valor,
      filme1_id: id1.valor,
      filme1_titulo: filme1.title.slice(0, 300),
      filme1_poster: filme1.posterUrl,
      filme1_ano: filme1.year,
      filme2_id: id2.valor,
      filme2_titulo: filme2.title.slice(0, 300),
      filme2_poster: filme2.posterUrl,
      filme2_ano: filme2.year,
    })
    .select('id, titulo, filme1_id, filme1_titulo, filme1_poster, filme1_ano, filme2_id, filme2_titulo, filme2_poster, filme2_ano, criado_em, usuario_id')
    .single()

  if (error || !data) return falhou(error?.code, 'criar sessão dupla')

  revalidatePath('/sessoes')
  return { ok: true, sessao: paraSessaoDupla(data as never, usuario.id) }
}

export async function apagarSessaoDupla(idInput: unknown): Promise<RespostaSimples> {
  if (typeof idInput !== 'string' || !idInput.trim()) return { ok: false, erro: 'Sessão inválida', sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: MENSAGEM_ERRO_SESSAO, sessaoExpirada: true }

  const { error } = await supabase.from('sessoes_duplas').delete().eq('id', idInput.trim()).eq('usuario_id', usuario.id)
  if (error) return falhou(error.code, 'apagar sessão dupla')

  revalidatePath('/sessoes')
  return { ok: true }
}

export async function obterMinhasSessoes(): Promise<SessaoDupla[]> {
  try {
    const { supabase, usuario } = await obterUsuario()
    if (!usuario) return []
    return await listarMinhasSessoes(supabase, usuario.id)
  } catch {
    return []
  }
}
```

- [ ] **Step 12: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (or only pre-existing errors)

- [ ] **Step 13: Commit**

```
git add lib/sessao-dupla/ supabase/migrations/20261001020000_sessoes_duplas.sql
git commit -m "feat(sessao-dupla): banco, validação e server actions"
```

---

### Task 2: Sessão dupla — página pública e janela de criação

**Files:**
- Create: `app/sessao/[codigo]/page.tsx`
- Create: `app/sessao/[codigo]/loading.tsx`
- Create: `components/BotaoSessaoDupla.tsx`
- Create: `components/JanelaSessaoDupla.tsx`
- Modify: `app/filme/[id]/page.tsx` — add Sessão dupla button below the existing buttons
- Modify: `components/Navbar.tsx` — add "Sessões duplas" link in mobile menu for logged-in users
- Modify: `components/MenuUsuario.tsx` — add "Sessões duplas" link

**Interfaces:**
- Consumes: `lib/sessao-dupla/acoes.ts` → `criarSessaoDupla`; `lib/sessao-dupla/tipos.ts` → `SessaoDupla`, `FilmeDaSessao`; `lib/supabase/admin.ts` → `criarClienteAdmin`; `components/SessaoProvider.tsx` → `useUsuario`; `components/JanelaLogin.tsx`; `components/AvisosProvider.tsx` → `useAvisos`; `components/estilos.ts` → `CONTEUDO`, `BOTAO_PRIMARIO`, `BOTAO_SECUNDARIO`.
- Produces: `BotaoSessaoDupla` component (used in film page); `JanelaSessaoDupla` component; `/sessao/[codigo]` page.

- [ ] **Step 1: Create `BotaoSessaoDupla.tsx`**

Client component. Receives `filme: FilmeSalvo`. If user is not logged in, opens `JanelaLogin`. Otherwise opens `JanelaSessaoDupla` with the current film pre-filled as film 1.

```tsx
'use client'

import { useState } from 'react'
import type { FilmeSalvo } from '@/lib/lista/tipos'
import { BOTAO_SECUNDARIO } from './estilos'
import { IconeMais } from './Icones'
import { JanelaLogin } from './JanelaLogin'
import { JanelaSessaoDupla } from './JanelaSessaoDupla'
import { useUsuario } from './SessaoProvider'

export function BotaoSessaoDupla({ filme }: { filme: FilmeSalvo }) {
  const usuario = useUsuario()
  const [janela, setJanela] = useState<'login' | 'criar' | null>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => setJanela(usuario ? 'criar' : 'login')}
        className={BOTAO_SECUNDARIO}
      >
        <IconeMais /> Sessão dupla
      </button>
      {janela === 'login' && <JanelaLogin aoFechar={() => setJanela(null)} />}
      {janela === 'criar' && <JanelaSessaoDupla filme1={filme} aoFechar={() => setJanela(null)} />}
    </>
  )
}
```

- [ ] **Step 2: Create `JanelaSessaoDupla.tsx`**

Client component. Shows film 1 on the left, a search field on the right (fetches from `/api/filmes?tipo=busca&q=...`), a title input (counter to 60), and "Criar" button. On success, navigates to `/sessao/[id]`.

This is a larger file (~150 lines). Key points:
- `useTransition` for the create action to disable the button during submission.
- Search uses `fetch('/api/filmes?tipo=busca&q=...')` with a debounce of 400ms.
- Rejects picking the same film as film 1.
- On success, `router.push('/sessao/' + sessao.id)`.
- On session expired, shows `JanelaLogin`.
- Dialog with `role="dialog"`, `aria-modal="true"`, closes on Escape and backdrop click.
- Counter shows `titulo.length/60` below the input.

Write the full component following the patterns in `JanelaLogin.tsx` and `BlocoAvaliacao.tsx`. Search results show poster thumbnail, title, and year. Selected film shows the same mini-card.

- [ ] **Step 3: Create `/sessao/[codigo]/page.tsx`**

Server component. Uses `criarClienteAdmin()` to read the session (bypasses RLS since the page is public). Shows the two posters side by side, the title, and download buttons. If the logged-in user is the creator, shows "Copiar link". `generateMetadata` sets `openGraph.images` to the preview image route.

Key points:
- `params` is `Promise<{ codigo: string }>`, await it.
- If session not found: `notFound()`.
- The download buttons point to `/sessao/[codigo]/imagem/stories` and `/sessao/[codigo]/imagem/quadrada` with `download` attribute.
- The copy-link button is a client component island (`BotaoCopiarLink`).

- [ ] **Step 4: Create `/sessao/[codigo]/loading.tsx`**

Simple skeleton with two poster-shaped rectangles and a title placeholder, using the existing skeleton pattern from `app/filme/[id]/loading.tsx`.

- [ ] **Step 5: Add the button to `app/filme/[id]/page.tsx`**

In the `flex flex-wrap gap-3` div that holds `BotaoTrailer` and the two `BotaoLista`, add `BotaoSessaoDupla` after the last `BotaoLista`:

```tsx
import { BotaoSessaoDupla } from '@/components/BotaoSessaoDupla'
// ...
<BotaoSessaoDupla filme={salvo} />
```

- [ ] **Step 6: Add "Sessões duplas" to `MenuUsuario.tsx`**

Add a `<Link href="/sessoes">` between "Minha lista" and "Minha conta":

```tsx
<Link href="/sessoes" className={ITEM}>
  Sessões duplas
</Link>
```

- [ ] **Step 7: Add "Sessões duplas" to mobile menu in `Navbar.tsx`**

Inside the `{usuario ? ( <>` block, add a `<li>` with `<Link href="/sessoes">` before "Minha conta":

```tsx
<li>
  <Link href="/sessoes" onClick={fecharMenu} className="block py-3">
    Sessões duplas
  </Link>
</li>
```

- [ ] **Step 8: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```
git add app/sessao/ components/BotaoSessaoDupla.tsx components/JanelaSessaoDupla.tsx components/MenuUsuario.tsx components/Navbar.tsx app/filme/
git commit -m "feat(sessao-dupla): página pública, janela de criação e links no menu"
```

---

### Task 3: Sessão dupla — imagens e página "Minhas sessões duplas"

**Files:**
- Create: `app/sessao/[codigo]/imagem/[formato]/route.tsx`
- Create: `app/sessoes/page.tsx`
- Create: `components/GradeSessoes.tsx`
- Modify: `e2e/mock-tmdb/dados.mjs` — add search result for a second film to support e2e

**Interfaces:**
- Consumes: `lib/sessao-dupla/acoes.ts` → `obterMinhasSessoes`, `apagarSessaoDupla`; `lib/sessao-dupla/tipos.ts` → `SessaoDupla`; `lib/supabase/admin.ts` → `criarClienteAdmin`; `next/og` → `ImageResponse`.
- Produces: Image route returning PNG; `/sessoes` page; `GradeSessoes` client component.

- [ ] **Step 1: Create the image route — `app/sessao/[codigo]/imagem/[formato]/route.tsx`**

Route handler that generates the image using `ImageResponse` from `next/og`. Read the `next/og` docs first: `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`.

```tsx
import { ImageResponse } from 'next/og'
import { criarClienteAdmin } from '@/lib/supabase/admin'

const TAMANHOS: Record<string, { width: number; height: number }> = {
  stories: { width: 1080, height: 1920 },
  quadrada: { width: 1080, height: 1080 },
  previa: { width: 1200, height: 630 },
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codigo: string; formato: string }> },
) {
  const { codigo, formato } = await params
  const tamanho = TAMANHOS[formato]
  if (!tamanho) return new Response('Formato inválido', { status: 400 })

  const { data } = await criarClienteAdmin()
    .from('sessoes_duplas')
    .select('titulo, filme1_titulo, filme1_poster, filme1_ano, filme2_titulo, filme2_poster, filme2_ano')
    .eq('id', codigo)
    .maybeSingle()

  if (!data) return new Response('Sessão não encontrada', { status: 404 })

  // Fetch posters as ArrayBuffer for ImageResponse (it doesn't support external URLs directly in all environments)
  const buscarPoster = async (url: string | null): Promise<ArrayBuffer | null> => {
    if (!url) return null
    try {
      const res = await fetch(url)
      return res.ok ? await res.arrayBuffer() : null
    } catch {
      return null
    }
  }

  const [poster1, poster2] = await Promise.all([
    buscarPoster(data.filme1_poster),
    buscarPoster(data.filme2_poster),
  ])

  // Build the JSX for ImageResponse using inline styles (only flexbox supported).
  // Layout: dark background, two posters, "+" between them, title at bottom, logo.
  // The vertical (stories) layout stacks posters vertically; square and preview use side-by-side.
  const vertical = formato === 'stories'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0B0B0F',
          color: 'white',
          fontFamily: 'sans-serif',
          padding: vertical ? '80px 60px' : '40px 60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: vertical ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: vertical ? '40px' : '30px',
            flex: 1,
          }}
        >
          {poster1 ? (
            <img
              src={`data:image/jpeg;base64,${Buffer.from(poster1).toString('base64')}`}
              width={vertical ? 340 : formato === 'previa' ? 180 : 280}
              style={{ borderRadius: '12px' }}
            />
          ) : (
            <div style={{ width: vertical ? 340 : 280, height: vertical ? 510 : 420, backgroundColor: '#16161D', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#666' }}>
              Sem pôster
            </div>
          )}
          <div style={{ fontSize: vertical ? 60 : 40, color: '#01BD4E', fontWeight: 700 }}>+</div>
          {poster2 ? (
            <img
              src={`data:image/jpeg;base64,${Buffer.from(poster2).toString('base64')}`}
              width={vertical ? 340 : formato === 'previa' ? 180 : 280}
              style={{ borderRadius: '12px' }}
            />
          ) : (
            <div style={{ width: vertical ? 340 : 280, height: vertical ? 510 : 420, backgroundColor: '#16161D', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#666' }}>
              Sem pôster
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: vertical ? '40px' : '20px',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: vertical ? 48 : formato === 'previa' ? 28 : 36, fontWeight: 800, textAlign: 'center', maxWidth: '90%' }}>
            {data.titulo}
          </div>
          <div style={{ fontSize: vertical ? 24 : 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
            {data.filme1_titulo} {data.filme1_ano ? `(${data.filme1_ano})` : ''} + {data.filme2_titulo} {data.filme2_ano ? `(${data.filme2_ano})` : ''}
          </div>
          <div style={{ fontSize: vertical ? 20 : 14, color: '#01BD4E', fontWeight: 700, marginTop: '8px' }}>
            CineTeca
          </div>
        </div>
      </div>
    ),
    { ...tamanho },
  )
}
```

Refine the layout sizes to look good during implementation. This is the starting skeleton.

- [ ] **Step 2: Create `/sessoes/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { CONTEUDO } from '@/components/estilos'
import { GradeSessoes } from '@/components/GradeSessoes'
import { obterMinhasSessoes } from '@/lib/sessao-dupla/acoes'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export const metadata: Metadata = { title: 'Minhas sessões duplas' }

export default async function PaginaSessoes() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  const sessoes = data.user ? await obterMinhasSessoes() : null

  return (
    <div className={`${CONTEUDO} pb-16 pt-24`}>
      <h1 className="mb-6 text-3xl font-extrabold md:text-4xl">Minhas sessões duplas</h1>
      <GradeSessoes sessoes={sessoes} />
    </div>
  )
}
```

- [ ] **Step 3: Create `GradeSessoes.tsx`**

Client component. If `sessoes` is null (not logged in), shows invite to sign in. If empty, shows "Nenhuma sessão dupla ainda". Otherwise, grid of cards with two poster thumbnails, title, and Abrir / Copiar link / Apagar actions. Apagar opens a confirmation dialog. Uses `useTransition` for delete.

- [ ] **Step 4: Add a second searchable film to `e2e/mock-tmdb/dados.mjs`**

Currently search only matches "matrix". Add a second match for "her" so the e2e can create a session with two different films:

```js
if (termo.includes('her') && !termo.includes('matrix')) {
  return responder(200, {
    page: 1,
    results: [filme(8001, 'Her'), filme(8002, 'Ela')],
    total_pages: 1,
    total_results: 2,
  })
}
```

Place this block before the existing matrix search check.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```
git add app/sessao/ app/sessoes/ components/GradeSessoes.tsx e2e/mock-tmdb/dados.mjs
git commit -m "feat(sessao-dupla): imagens, página /sessoes e grade"
```

---

### Task 4: Assisti — banco, validação e Server Actions

**Files:**
- Create: `supabase/migrations/20261001030000_assistidos.sql`
- Create: `lib/diario/tipos.ts`
- Create: `lib/diario/validacao.ts`
- Create: `lib/diario/validacao.test.ts`
- Create: `lib/diario/banco.ts`
- Create: `lib/diario/banco.test.ts`
- Create: `lib/diario/acoes.ts`

**Interfaces:**
- Consumes: `lib/auth/validacao.ts` → `Resultado<T>`; `lib/avaliacoes/validacao.ts` → `validarFilmeId`; `lib/tmdb/detalhes.ts` → `getMovieDetails`; `lib/tmdb/equipe.ts` → `FUNCOES_EQUIPE` (for extracting directors); `lib/supabase/servidor.ts` → `criarClienteServidor`.
- Produces: `RegistroAssistido`, `ResumoAssistido`, `RespostaAssistido`, `validarData(bruto: unknown): Resultado<string>`, `validarAnotacao(bruto: unknown): Resultado<string | null>`, `registrarAssistido(filmeId: unknown, data: unknown, anotacao: unknown): Promise<RespostaAssistido>`, `editarAssistido(id: unknown, data: unknown, anotacao: unknown): Promise<RespostaSimples>`, `apagarAssistido(id: unknown): Promise<RespostaSimples>`, `obterMeusAssistidos(): Promise<RegistroAssistido[]>`, `contarAssistidos(filmeId: number): Promise<ResumoAssistido | null>`.

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/20261001030000_assistidos.sql
-- CineTeca: Diário pessoal (Assisti).
-- Aplicar no SQL Editor do Supabase, nos projetos "cineteca" e "cineteca-testes".

create table public.assistidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  filme_id integer not null check (filme_id > 0),
  assistido_em date not null check (assistido_em >= '1895-01-01' and assistido_em <= current_date + 1),
  anotacao text check (anotacao is null or char_length(anotacao) <= 500),
  titulo text not null check (char_length(titulo) <= 300),
  poster_url text,
  ano text,
  diretores jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now()
);

create index assistidos_por_data on public.assistidos (usuario_id, assistido_em desc);
create index assistidos_por_filme on public.assistidos (usuario_id, filme_id);

revoke all on public.assistidos from anon, authenticated;
grant select, insert, delete on public.assistidos to authenticated;
grant update (assistido_em, anotacao) on public.assistidos to authenticated;

alter table public.assistidos enable row level security;

create policy "assistidos: ler os próprios" on public.assistidos
  for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "assistidos: inserir os próprios" on public.assistidos
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "assistidos: atualizar os próprios" on public.assistidos
  for update to authenticated using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);
create policy "assistidos: apagar os próprios" on public.assistidos
  for delete to authenticated using ((select auth.uid()) = usuario_id);
```

- [ ] **Step 2: Create types — `lib/diario/tipos.ts`**

```ts
export type DiretorRegistro = {
  id: number
  nome: string
  fotoUrl: string | null
}

export type RegistroAssistido = {
  id: string
  filmeId: number
  titulo: string
  posterUrl: string | null
  ano: string | null
  diretores: DiretorRegistro[]
  assistidoEm: string // 'YYYY-MM-DD'
  anotacao: string | null
  criadoEm: string
}

// Resumo para a página do filme: quantas vezes a pessoa viu e quando foi a última.
export type ResumoAssistido = {
  vezes: number
  ultimaData: string // 'YYYY-MM-DD'
}

export type RespostaAssistido =
  | { ok: true; registro: RegistroAssistido }
  | { ok: false; erro: string; sessaoExpirada: boolean }

export type RespostaSimples =
  | { ok: true }
  | { ok: false; erro: string; sessaoExpirada: boolean }
```

- [ ] **Step 3: Write failing validation tests — `lib/diario/validacao.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { validarAnotacao, validarData } from './validacao'

describe('validarData', () => {
  it('aceita data válida no passado', () => {
    expect(validarData('2026-06-15')).toEqual({ ok: true, valor: '2026-06-15' })
  })
  it('aceita hoje', () => {
    // Usa a data do teste; implementação usa America/Sao_Paulo.
    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    expect(validarData(hoje).ok).toBe(true)
  })
  it('recusa data no futuro (amanhã + 2)', () => {
    const futuro = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
    expect(validarData(futuro)).toEqual({ ok: false, erro: 'A data não pode ser no futuro' })
  })
  it('recusa antes de 1895', () => {
    expect(validarData('1894-12-31')).toEqual({ ok: false, erro: 'Data inválida' })
  })
  it('recusa formato inválido', () => {
    expect(validarData('abc')).toEqual({ ok: false, erro: 'Data inválida' })
    expect(validarData(123)).toEqual({ ok: false, erro: 'Data inválida' })
    expect(validarData(null)).toEqual({ ok: false, erro: 'Data inválida' })
  })
})

describe('validarAnotacao', () => {
  it('aceita texto até 500 caracteres', () => {
    expect(validarAnotacao('Vi no cinema')).toEqual({ ok: true, valor: 'Vi no cinema' })
  })
  it('remove espaços das pontas', () => {
    expect(validarAnotacao('  Nota  ')).toEqual({ ok: true, valor: 'Nota' })
  })
  it('vazio e null viram null', () => {
    expect(validarAnotacao('')).toEqual({ ok: true, valor: null })
    expect(validarAnotacao('   ')).toEqual({ ok: true, valor: null })
    expect(validarAnotacao(null)).toEqual({ ok: true, valor: null })
    expect(validarAnotacao(undefined)).toEqual({ ok: true, valor: null })
  })
  it('recusa mais de 500 caracteres', () => {
    expect(validarAnotacao('A'.repeat(501))).toEqual({ ok: false, erro: 'A anotação pode ter no máximo 500 caracteres' })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run lib/diario/validacao.test.ts`
Expected: FAIL

- [ ] **Step 5: Implement validation — `lib/diario/validacao.ts`**

```ts
import type { Resultado } from '@/lib/auth/validacao'

export const ANOTACAO_MAXIMA = 500
export const MENSAGEM_ERRO_DIARIO = 'Não foi possível salvar. Tente de novo.'

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
const DATA_MINIMA = '1895-01-01'

function hojeEmSaoPaulo(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

export function validarData(bruto: unknown): Resultado<string> {
  if (typeof bruto !== 'string' || !DATA_RE.test(bruto)) return { ok: false, erro: 'Data inválida' }
  const d = new Date(bruto + 'T12:00:00') // meio-dia evita troca de dia por fuso
  if (isNaN(d.getTime())) return { ok: false, erro: 'Data inválida' }
  if (bruto < DATA_MINIMA) return { ok: false, erro: 'Data inválida' }
  const hoje = hojeEmSaoPaulo()
  if (bruto > hoje) return { ok: false, erro: 'A data não pode ser no futuro' }
  return { ok: true, valor: bruto }
}

export function validarAnotacao(bruto: unknown): Resultado<string | null> {
  if (bruto === null || bruto === undefined) return { ok: true, valor: null }
  const texto = typeof bruto === 'string' ? bruto.trim() : ''
  if (!texto) return { ok: true, valor: null }
  if (texto.length > ANOTACAO_MAXIMA) return { ok: false, erro: 'A anotação pode ter no máximo 500 caracteres' }
  return { ok: true, valor: texto }
}
```

- [ ] **Step 6: Run validation tests to verify they pass**

Run: `npx vitest run lib/diario/validacao.test.ts`
Expected: PASS

- [ ] **Step 7: Write failing banco tests — `lib/diario/banco.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { paraRegistroAssistido } from './banco'

describe('paraRegistroAssistido', () => {
  const linha = {
    id: 'r1',
    filme_id: 603,
    titulo: 'Matrix',
    poster_url: '/p.jpg',
    ano: '1999',
    diretores: [{ id: 900, nome: 'Lana Wachowski', fotoUrl: null }],
    assistido_em: '2026-09-14',
    anotacao: 'Cinema IMAX',
    criado_em: '2026-09-14T18:00:00Z',
  }

  it('converte a linha do banco', () => {
    const r = paraRegistroAssistido(linha)
    expect(r.filmeId).toBe(603)
    expect(r.titulo).toBe('Matrix')
    expect(r.posterUrl).toBe('/p.jpg')
    expect(r.diretores).toEqual([{ id: 900, nome: 'Lana Wachowski', fotoUrl: null }])
    expect(r.assistidoEm).toBe('2026-09-14')
    expect(r.anotacao).toBe('Cinema IMAX')
  })

  it('anotação null continua null', () => {
    expect(paraRegistroAssistido({ ...linha, anotacao: null }).anotacao).toBeNull()
  })

  it('diretores vazio continua array vazio', () => {
    expect(paraRegistroAssistido({ ...linha, diretores: [] }).diretores).toEqual([])
  })
})
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npx vitest run lib/diario/banco.test.ts`
Expected: FAIL

- [ ] **Step 9: Implement banco — `lib/diario/banco.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DiretorRegistro, RegistroAssistido, ResumoAssistido } from './tipos'

type Cliente = Pick<SupabaseClient, 'from'>

type LinhaAssistido = {
  id: string
  filme_id: number
  titulo: string
  poster_url: string | null
  ano: string | null
  diretores: DiretorRegistro[]
  assistido_em: string
  anotacao: string | null
  criado_em: string
}

const COLUNAS = 'id, filme_id, titulo, poster_url, ano, diretores, assistido_em, anotacao, criado_em'

export function paraRegistroAssistido(linha: LinhaAssistido): RegistroAssistido {
  return {
    id: linha.id,
    filmeId: linha.filme_id,
    titulo: linha.titulo,
    posterUrl: linha.poster_url,
    ano: linha.ano,
    diretores: Array.isArray(linha.diretores) ? linha.diretores : [],
    assistidoEm: linha.assistido_em,
    anotacao: linha.anotacao,
    criadoEm: linha.criado_em,
  }
}

export async function listarAssistidos(cliente: Cliente, usuarioId: string): Promise<RegistroAssistido[]> {
  const { data, error } = await cliente
    .from('assistidos')
    .select(COLUNAS)
    .eq('usuario_id', usuarioId)
    .order('assistido_em', { ascending: false })
    .order('criado_em', { ascending: false })
    .limit(500)
  if (error) {
    console.error('[CineTeca] Falha ao listar assistidos:', error.code)
    return []
  }
  return ((data ?? []) as LinhaAssistido[]).map(paraRegistroAssistido)
}

export async function contarAssistidos(
  cliente: Cliente,
  usuarioId: string,
  filmeId: number,
): Promise<ResumoAssistido | null> {
  const { data, error } = await cliente
    .from('assistidos')
    .select('assistido_em')
    .eq('usuario_id', usuarioId)
    .eq('filme_id', filmeId)
    .order('assistido_em', { ascending: false })
  if (error || !data || data.length === 0) return null
  return { vezes: data.length, ultimaData: (data[0] as { assistido_em: string }).assistido_em }
}
```

- [ ] **Step 10: Run banco tests to verify they pass**

Run: `npx vitest run lib/diario/banco.test.ts`
Expected: PASS

- [ ] **Step 11: Implement Server Actions — `lib/diario/acoes.ts`**

Follow the same pattern as `lib/sessao-dupla/acoes.ts` and `lib/avaliacoes/acoes.ts`:
- `registrarAssistido(filmeId, data, anotacao)`: validates inputs, gets user, fetches movie from TMDB (extracts directors from `crew` where job is 'Director'), inserts into `assistidos`.
- `editarAssistido(id, data, anotacao)`: validates, updates only `assistido_em` and `anotacao`.
- `apagarAssistido(id)`: deletes by id + user.
- `obterMeusAssistidos()`: returns all for current user.
- `obterResumoAssistido(filmeId)`: returns count and last date for current user.

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { getMovieDetails } from '@/lib/tmdb/detalhes'
import { validarFilmeId } from '@/lib/avaliacoes/validacao'
import { contarAssistidos as contarNoBanco, listarAssistidos, paraRegistroAssistido } from './banco'
import type { DiretorRegistro, RegistroAssistido, RespostaAssistido, RespostaSimples, ResumoAssistido } from './tipos'
import { MENSAGEM_ERRO_DIARIO, validarAnotacao, validarData } from './validacao'

const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])

function falhou(codigo: string | undefined, acao: string): { ok: false; erro: string; sessaoExpirada: boolean } {
  console.error(`[CineTeca] ${acao} falhou:`, codigo ?? 'sem código')
  return { ok: false, erro: MENSAGEM_ERRO_DIARIO, sessaoExpirada: CODIGOS_DE_SESSAO.has(codigo ?? '') }
}

async function obterUsuario() {
  const supabase = await criarClienteServidor()
  const { data: sessao, error } = await supabase.auth.getUser()
  if (!sessao.user) {
    const temCookie = (await cookies()).getAll().some((c) => c.name.includes('auth-token'))
    console.error('[CineTeca] diário sem sessão:', error?.name ?? 'sem erro', temCookie ? 'com cookie' : 'sem cookie')
    return { supabase, usuario: null as null }
  }
  return { supabase, usuario: sessao.user }
}

function extrairDiretores(crew: { id: number; name: string; profileUrl: string | null; funcoes: string[] }[]): DiretorRegistro[] {
  return crew
    .filter((m) => m.funcoes.includes('Direção'))
    .slice(0, 3)
    .map((m) => ({ id: m.id, nome: m.name, fotoUrl: m.profileUrl }))
}

export async function registrarAssistido(
  filmeIdInput: unknown,
  dataInput: unknown,
  anotacaoInput: unknown,
): Promise<RespostaAssistido> {
  const id = validarFilmeId(filmeIdInput)
  if (!id.ok) return { ok: false, erro: id.erro, sessaoExpirada: false }
  const data = validarData(dataInput)
  if (!data.ok) return { ok: false, erro: data.erro, sessaoExpirada: false }
  const anotacao = validarAnotacao(anotacaoInput)
  if (!anotacao.ok) return { ok: false, erro: anotacao.erro, sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: MENSAGEM_ERRO_DIARIO, sessaoExpirada: true }

  const filme = await getMovieDetails(id.valor).catch(() => null)
  if (!filme) return { ok: false, erro: 'Filme não encontrado', sessaoExpirada: false }

  const diretores = extrairDiretores(filme.crew)

  const { data: inserido, error } = await supabase
    .from('assistidos')
    .insert({
      usuario_id: usuario.id,
      filme_id: id.valor,
      assistido_em: data.valor,
      anotacao: anotacao.valor,
      titulo: filme.title.slice(0, 300),
      poster_url: filme.posterUrl,
      ano: filme.year,
      diretores,
    })
    .select('id, filme_id, titulo, poster_url, ano, diretores, assistido_em, anotacao, criado_em')
    .single()

  if (error || !inserido) return falhou(error?.code, 'registrar assistido')

  revalidatePath('/diario')
  return { ok: true, registro: paraRegistroAssistido(inserido as never) }
}

export async function editarAssistido(
  idInput: unknown,
  dataInput: unknown,
  anotacaoInput: unknown,
): Promise<RespostaSimples> {
  if (typeof idInput !== 'string' || !idInput.trim()) return { ok: false, erro: 'Registro inválido', sessaoExpirada: false }
  const data = validarData(dataInput)
  if (!data.ok) return { ok: false, erro: data.erro, sessaoExpirada: false }
  const anotacao = validarAnotacao(anotacaoInput)
  if (!anotacao.ok) return { ok: false, erro: anotacao.erro, sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: MENSAGEM_ERRO_DIARIO, sessaoExpirada: true }

  const { error } = await supabase
    .from('assistidos')
    .update({ assistido_em: data.valor, anotacao: anotacao.valor })
    .eq('id', idInput.trim())
    .eq('usuario_id', usuario.id)
  if (error) return falhou(error.code, 'editar assistido')

  revalidatePath('/diario')
  return { ok: true }
}

export async function apagarAssistido(idInput: unknown): Promise<RespostaSimples> {
  if (typeof idInput !== 'string' || !idInput.trim()) return { ok: false, erro: 'Registro inválido', sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: MENSAGEM_ERRO_DIARIO, sessaoExpirada: true }

  const { error } = await supabase.from('assistidos').delete().eq('id', idInput.trim()).eq('usuario_id', usuario.id)
  if (error) return falhou(error.code, 'apagar assistido')

  revalidatePath('/diario')
  return { ok: true }
}

export async function obterMeusAssistidos(): Promise<RegistroAssistido[]> {
  try {
    const { supabase, usuario } = await obterUsuario()
    if (!usuario) return []
    return await listarAssistidos(supabase, usuario.id)
  } catch {
    return []
  }
}

export async function obterResumoAssistido(filmeId: number): Promise<ResumoAssistido | null> {
  try {
    const { supabase, usuario } = await obterUsuario()
    if (!usuario) return null
    return await contarNoBanco(supabase, usuario.id, filmeId)
  } catch {
    return null
  }
}
```

- [ ] **Step 12: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 13: Commit**

```
git add lib/diario/ supabase/migrations/20261001030000_assistidos.sql
git commit -m "feat(diario): banco, validação e server actions do Assisti"
```

---

### Task 5: Assisti — botão na página do filme e página `/diario` (aba Registros)

**Files:**
- Create: `components/BotaoAssisti.tsx`
- Create: `components/JanelaAssisti.tsx`
- Create: `components/ListaDiario.tsx`
- Create: `app/diario/page.tsx`
- Create: `app/diario/loading.tsx`
- Modify: `app/filme/[id]/page.tsx` — add Assisti button and watched-count line
- Modify: `components/Navbar.tsx` — add "Meu diário" link
- Modify: `components/MenuUsuario.tsx` — add "Meu diário" link

**Interfaces:**
- Consumes: `lib/diario/acoes.ts` → `registrarAssistido`, `editarAssistido`, `apagarAssistido`, `obterMeusAssistidos`, `obterResumoAssistido`; `lib/diario/tipos.ts`; `components/SessaoProvider.tsx` → `useUsuario`; `components/JanelaLogin.tsx`; `components/AvisosProvider.tsx` → `useAvisos`.
- Produces: `BotaoAssisti` (used in film page), `JanelaAssisti`, `ListaDiario`, `/diario` page.

- [ ] **Step 1: Create `BotaoAssisti.tsx`**

Client component. Receives `filmeId: number` and `resumo: ResumoAssistido | null`. Without user, opens `JanelaLogin`. With user, opens `JanelaAssisti`. Below the button (or next to it), shows "Você viu 2 vezes · última em 14 set 2026" when `resumo` is not null. Date formatted in pt-BR with `toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })`.

- [ ] **Step 2: Create `JanelaAssisti.tsx`**

Client component. Dialog with date input (default: today, max: today, min: 1895-01-01), textarea for annotation (counter to 500), and "Registrar" button. Uses `useTransition`. On success, shows toast and closes. On session expired, switches to `JanelaLogin`.

For editing (reused by `ListaDiario`), also accept optional `registro: RegistroAssistido` prop. When present, pre-fill the date and annotation, and call `editarAssistido` instead.

- [ ] **Step 3: Create `ListaDiario.tsx`**

Client component. Receives `registros: RegistroAssistido[]`. Groups by month ("setembro de 2026") using `assistidoEm`. Each item: small poster, title (link to film), date, annotation (truncated), Editar (opens `JanelaAssisti` in edit mode), Apagar (confirmation dialog). Uses `useTransition` for delete.

Grouping logic: use a helper `agruparPorMes(registros)` that returns `{ mes: string; registros: RegistroAssistido[] }[]`. The month label format: `toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })`.

- [ ] **Step 4: Create `/diario/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { CONTEUDO } from '@/components/estilos'
import { ListaDiario } from '@/components/ListaDiario'
import { obterMeusAssistidos } from '@/lib/diario/acoes'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export const metadata: Metadata = { title: 'Meu diário' }

export default async function PaginaDiario({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  const registros = data.user ? await obterMeusAssistidos() : null

  return (
    <div className={`${CONTEUDO} pb-16 pt-24`}>
      <h1 className="mb-6 text-3xl font-extrabold md:text-4xl">Meu diário</h1>
      {/* Tabs: Registros | Números */}
      {/* Tab switching is client-side; "aba" searchParam selects the initial tab */}
      {/* Task 6 adds the Números tab content */}
      <AbasDiario abaInicial={aba === 'numeros' ? 'numeros' : 'registros'} registros={registros} />
    </div>
  )
}
```

Create `AbasDiario` as a client component wrapper that manages the active tab and updates `?aba=` in the URL. The Registros tab renders `ListaDiario`. The Números tab initially shows a "Em breve" placeholder (filled in Task 6).

- [ ] **Step 5: Add Assisti to `app/filme/[id]/page.tsx`**

```tsx
import { BotaoAssisti } from '@/components/BotaoAssisti'
import { obterResumoAssistido } from '@/lib/diario/acoes'
// After const avaliacao = ...
const resumoAssistido = await obterResumoAssistido(id)
// In the buttons flex:
<BotaoAssisti filmeId={id} resumo={resumoAssistido} />
```

- [ ] **Step 6: Add "Meu diário" to `MenuUsuario.tsx` and `Navbar.tsx`**

Same pattern as Task 2 Step 6–7, adding `<Link href="/diario">Meu diário</Link>` between "Sessões duplas" and "Minha conta".

- [ ] **Step 7: Create `app/diario/loading.tsx`**

Simple skeleton.

- [ ] **Step 8: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```
git add components/BotaoAssisti.tsx components/JanelaAssisti.tsx components/ListaDiario.tsx app/diario/ app/filme/ components/MenuUsuario.tsx components/Navbar.tsx
git commit -m "feat(diario): botão Assisti, janela de registro e página /diario"
```

---

### Task 6: Dashboard — função `numeros.ts` e aba Números

**Files:**
- Create: `lib/diario/numeros.ts`
- Create: `lib/diario/numeros.test.ts`
- Create: `components/MapaCalor.tsx`
- Create: `components/GraficoDecadas.tsx`
- Create: `components/DiretoresFavoritos.tsx`
- Modify: `app/diario/page.tsx` (or the `AbasDiario` component) — replace placeholder with real dashboard

**Interfaces:**
- Consumes: `lib/diario/tipos.ts` → `RegistroAssistido`; `components/ImagemComReserva.tsx`.
- Produces: `calcularNumeros(registros: RegistroAssistido[], hoje: string): Numeros`; dashboard components.

- [ ] **Step 1: Write failing tests for `numeros.ts`**

```ts
import { describe, expect, it } from 'vitest'
import type { RegistroAssistido } from './tipos'
import { calcularNumeros } from './numeros'

function registro(parcial: Partial<RegistroAssistido> & { filmeId: number; assistidoEm: string }): RegistroAssistido {
  return {
    id: `r-${parcial.filmeId}-${parcial.assistidoEm}`,
    titulo: `Filme ${parcial.filmeId}`,
    posterUrl: null,
    ano: parcial.ano ?? '2020',
    diretores: parcial.diretores ?? [],
    anotacao: null,
    criadoEm: '2026-10-01T00:00:00Z',
    ...parcial,
  }
}

describe('calcularNumeros', () => {
  it('sessoes conta todos, filmes conta distintos, esteAno filtra pelo ano', () => {
    const registros = [
      registro({ filmeId: 1, assistidoEm: '2026-03-10' }),
      registro({ filmeId: 1, assistidoEm: '2026-09-01' }), // revisão
      registro({ filmeId: 2, assistidoEm: '2025-12-20' }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    expect(n.topo.sessoes).toBe(3)
    expect(n.topo.filmes).toBe(2)
    expect(n.topo.esteAno).toBe(2) // os dois de 2026
  })

  it('mapa de calor inclui anos sem registro entre o primeiro e o atual', () => {
    const registros = [
      registro({ filmeId: 1, assistidoEm: '2024-01-15' }),
      registro({ filmeId: 2, assistidoEm: '2026-06-10' }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    expect(n.mapa.map((l) => l.ano)).toEqual([2026, 2025, 2024]) // mais recente primeiro
    expect(n.mapa.find((l) => l.ano === 2025)!.meses.every((m) => m.contagem === 0)).toBe(true)
  })

  it('revisões contam no mapa de calor', () => {
    const registros = [
      registro({ filmeId: 1, assistidoEm: '2026-03-10' }),
      registro({ filmeId: 1, assistidoEm: '2026-03-20' }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    const marco = n.mapa[0].meses[2] // index 2 = março
    expect(marco.contagem).toBe(2)
  })

  it('décadas contam filmes distintos e incluem vazias no meio', () => {
    const registros = [
      registro({ filmeId: 1, assistidoEm: '2026-01-01', ano: '1990' }),
      registro({ filmeId: 1, assistidoEm: '2026-02-01', ano: '1990' }), // revisão, mesmo filme
      registro({ filmeId: 2, assistidoEm: '2026-03-01', ano: '2010' }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    expect(n.decadas).toEqual([
      { decada: '1990', contagem: 1, campea: false },
      { decada: '2000', contagem: 0, campea: false },
      { decada: '2010', contagem: 1, campea: true }, // empate, mais recente
    ])
  })

  it('filme sem ano fica fora das décadas', () => {
    const registros = [registro({ filmeId: 1, assistidoEm: '2026-01-01', ano: null })]
    const n = calcularNumeros(registros, '2026-10-01')
    expect(n.decadas).toEqual([])
  })

  it('diretores contam filmes distintos, top 5, desempate por mais recente', () => {
    const d1 = [{ id: 1, nome: 'Diretor A', fotoUrl: null }]
    const d2 = [{ id: 2, nome: 'Diretor B', fotoUrl: null }]
    const registros = [
      registro({ filmeId: 1, assistidoEm: '2026-01-01', diretores: d1 }),
      registro({ filmeId: 1, assistidoEm: '2026-06-01', diretores: d1 }), // revisão, não conta
      registro({ filmeId: 2, assistidoEm: '2026-09-01', diretores: d1 }),
      registro({ filmeId: 3, assistidoEm: '2026-09-15', diretores: d2 }),
      registro({ filmeId: 4, assistidoEm: '2026-09-20', diretores: d2 }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    expect(n.diretores[0].id).toBe(1) // 2 filmes
    expect(n.diretores[0].filmes).toBe(2)
    expect(n.diretores[1].id).toBe(2) // 2 filmes, mas visto mais recentemente → empate, ambos 2 filmes, B mais recente
  })

  it('niveisMapa vai de 0 a 4 proporcional ao maior mês', () => {
    const registros = [
      ...Array.from({ length: 8 }, (_, i) => registro({ filmeId: 100 + i, assistidoEm: `2026-03-${String(i + 1).padStart(2, '0')}` })),
      registro({ filmeId: 200, assistidoEm: '2026-07-01' }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    const marco = n.mapa[0].meses[2]
    expect(marco.nivel).toBe(4) // o maior
    const julho = n.mapa[0].meses[6]
    expect(julho.nivel).toBe(1) // 1/8 do maior → nível 1
  })

  it('sem registros devolve tudo zerado e arrays vazios', () => {
    const n = calcularNumeros([], '2026-10-01')
    expect(n.topo).toEqual({ sessoes: 0, filmes: 0, esteAno: 0 })
    expect(n.mapa).toEqual([])
    expect(n.decadas).toEqual([])
    expect(n.diretores).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/diario/numeros.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `numeros.ts`**

```ts
import type { DiretorRegistro, RegistroAssistido } from './tipos'

export type Topo = { sessoes: number; filmes: number; esteAno: number }
export type CelulaMapa = { contagem: number; nivel: number } // nivel 0–4
export type LinhaMapa = { ano: number; meses: CelulaMapa[] }
export type Decada = { decada: string; contagem: number; campea: boolean }
export type DiretorFavorito = { id: number; nome: string; fotoUrl: string | null; filmes: number; titulos: string[] }

export type Numeros = {
  topo: Topo
  mapa: LinhaMapa[]
  decadas: Decada[]
  diretores: DiretorFavorito[]
}

export function calcularNumeros(registros: RegistroAssistido[], hoje: string): Numeros {
  if (registros.length === 0) {
    return { topo: { sessoes: 0, filmes: 0, esteAno: 0 }, mapa: [], decadas: [], diretores: [] }
  }

  const anoAtual = Number(hoje.slice(0, 4))
  const filmesDistintos = new Set(registros.map((r) => r.filmeId))

  // --- Topo ---
  const topo: Topo = {
    sessoes: registros.length,
    filmes: filmesDistintos.size,
    esteAno: registros.filter((r) => r.assistidoEm.startsWith(String(anoAtual))).length,
  }

  // --- Mapa de calor ---
  const contagemPorMes = new Map<string, number>() // "2026-03" → 2
  let anoMinimo = anoAtual
  for (const r of registros) {
    const chave = r.assistidoEm.slice(0, 7)
    contagemPorMes.set(chave, (contagemPorMes.get(chave) ?? 0) + 1)
    const anoReg = Number(r.assistidoEm.slice(0, 4))
    if (anoReg < anoMinimo) anoMinimo = anoReg
  }

  let maiorMes = 0
  for (const c of contagemPorMes.values()) if (c > maiorMes) maiorMes = c

  const mapa: LinhaMapa[] = []
  for (let ano = anoAtual; ano >= anoMinimo; ano--) {
    const meses: CelulaMapa[] = Array.from({ length: 12 }, (_, m) => {
      const chave = `${ano}-${String(m + 1).padStart(2, '0')}`
      const contagem = contagemPorMes.get(chave) ?? 0
      const nivel = maiorMes === 0 ? 0 : Math.min(4, Math.max(contagem > 0 ? 1 : 0, Math.round((contagem / maiorMes) * 4)))
      return { contagem, nivel }
    })
    mapa.push({ ano, meses })
  }

  // --- Décadas (filmes distintos) ---
  const filmePorDecada = new Map<string, Set<number>>()
  const filmeJaContadoDecada = new Set<number>()
  for (const r of registros) {
    if (!r.ano || filmeJaContadoDecada.has(r.filmeId)) continue
    filmeJaContadoDecada.add(r.filmeId)
    const anoFilme = Number(r.ano)
    if (isNaN(anoFilme)) continue
    const decada = String(Math.floor(anoFilme / 10) * 10)
    const conjunto = filmePorDecada.get(decada) ?? new Set()
    conjunto.add(r.filmeId)
    filmePorDecada.set(decada, conjunto)
  }

  const decadasOrdenadas = [...filmePorDecada.keys()].sort()
  if (decadasOrdenadas.length > 0) {
    const primeira = Number(decadasOrdenadas[0])
    const ultima = Number(decadasOrdenadas[decadasOrdenadas.length - 1])
    for (let d = primeira; d <= ultima; d += 10) {
      const chave = String(d)
      if (!filmePorDecada.has(chave)) filmePorDecada.set(chave, new Set())
    }
  }

  const decadasFinal = [...filmePorDecada.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([decada, filmes]) => ({ decada, contagem: filmes.size, campea: false }))

  if (decadasFinal.length > 0) {
    let maxContagem = 0
    let idxCampea = -1
    for (let i = 0; i < decadasFinal.length; i++) {
      if (decadasFinal[i].contagem > maxContagem || (decadasFinal[i].contagem === maxContagem && decadasFinal[i].contagem > 0)) {
        maxContagem = decadasFinal[i].contagem
        idxCampea = i
      }
    }
    if (idxCampea >= 0) decadasFinal[idxCampea].campea = true
  }

  // --- Diretores (filmes distintos, top 5, desempate por mais recente) ---
  const diretorInfo = new Map<number, { nome: string; fotoUrl: string | null; filmes: Set<number>; titulos: string[]; ultimaData: string }>()
  const filmeJaContadoDiretor = new Map<number, Set<number>>() // filmeId → Set<diretorId>

  for (const r of registros) {
    for (const d of r.diretores) {
      const jaContou = filmeJaContadoDiretor.get(r.filmeId)
      if (jaContou?.has(d.id)) continue

      if (!filmeJaContadoDiretor.has(r.filmeId)) filmeJaContadoDiretor.set(r.filmeId, new Set())
      filmeJaContadoDiretor.get(r.filmeId)!.add(d.id)

      const info = diretorInfo.get(d.id) ?? { nome: d.nome, fotoUrl: d.fotoUrl, filmes: new Set(), titulos: [], ultimaData: '' }
      if (!info.filmes.has(r.filmeId)) {
        info.filmes.add(r.filmeId)
        info.titulos.push(r.titulo)
      }
      if (r.assistidoEm > info.ultimaData) info.ultimaData = r.assistidoEm
      diretorInfo.set(d.id, info)
    }
  }

  const diretores: DiretorFavorito[] = [...diretorInfo.entries()]
    .map(([id, info]) => ({ id, nome: info.nome, fotoUrl: info.fotoUrl, filmes: info.filmes.size, titulos: info.titulos, ultimaData: info.ultimaData }))
    .sort((a, b) => b.filmes - a.filmes || (b.ultimaData > a.ultimaData ? 1 : -1))
    .slice(0, 5)
    .map(({ ultimaData: _, ...rest }) => rest)

  return { topo, mapa, decadas: decadasFinal, diretores }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/diario/numeros.test.ts`
Expected: PASS

- [ ] **Step 5: Create `MapaCalor.tsx`**

Client component. Renders the heat map grid in SVG/CSS. Months as columns (jan–dez), years as rows (most recent on top). Cells are `<rect>` elements with fill color from a 5-step scale (level 0 = `#16161D`, 1–4 = increasingly saturated green toward `#01BD4E`). Each cell is focusable (`tabIndex={0}`) with `aria-label="março de 2026: 4 filmes"`. Tooltip on hover/focus shows the same text.

Respects `prefers-reduced-motion`: no entry animation.

Mobile: cells ~22px. Add month labels at the top ("J F M A M J J A S O N D") and year labels on the left.

- [ ] **Step 6: Create `GraficoDecadas.tsx`**

Client component. Horizontal bars. Each bar's width proportional to `contagem / max`. Champion bar in `destaque`, others in `white/20`. Bar label on the left ("1990"), count at the end. Bars grow from 0 to full width on mount (CSS `@keyframes`), skipped with `prefers-reduced-motion`. Each bar has `aria-label="1990: 3 filmes"`.

- [ ] **Step 7: Create `DiretoresFavoritos.tsx`**

Client component. 5 rows. Round photo with `ImagemComReserva` reserva `/pessoa-padrao.svg`, name, "4 filmes". Click/tap on a row expands the list of film titles below. `aria-expanded` on the button.

- [ ] **Step 8: Wire the dashboard into the Números tab**

In the `AbasDiario` client component (from Task 5), replace the placeholder with the real dashboard: calculate `numeros` from `registros` (call `calcularNumeros` client-side since it's a pure function), render the three stats, then `MapaCalor`, `GraficoDecadas`, `DiretoresFavoritos`. Empty state: invite to mark the first Assisti.

Summary text for screen readers: below the three stats, a `<p className="sr-only">` with "Você assistiu a N sessões de M filmes diferentes, sendo K este ano."

- [ ] **Step 9: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 10: Commit**

```
git add lib/diario/numeros.ts lib/diario/numeros.test.ts components/MapaCalor.tsx components/GraficoDecadas.tsx components/DiretoresFavoritos.tsx app/diario/
git commit -m "feat(dashboard): função numeros.ts e aba Números com mapa, décadas e diretores"
```

---

### Task 7: Testes de banco e ponta a ponta

**Files:**
- Create: `e2e/sessao-dupla.spec.ts`
- Create: `e2e/diario.spec.ts`
- Modify: `e2e/conta/ajudantes.ts` — add helpers for double feature and diary
- Modify: `e2e/mock-tmdb/dados.mjs` — ensure search for "her" works (from Task 3)

**Interfaces:**
- Consumes: everything from Tasks 1–6; e2e fixtures from `e2e/conta/fixtures.ts`.
- Produces: e2e test files.

- [ ] **Step 1: Add helpers to `e2e/conta/ajudantes.ts`**

```ts
// After the existing esperarNaConta function:

export async function esperarSessaoDupla(
  u: Pick<UsuarioTeste, 'id'>,
  titulo: string,
): Promise<string> {
  let sessaoId = ''
  await expect
    .poll(
      async () => {
        const { data } = await clienteAdmin()
          .from('sessoes_duplas')
          .select('id')
          .eq('usuario_id', u.id)
          .eq('titulo', titulo)
        if (data && data.length > 0) sessaoId = (data[0] as { id: string }).id
        return data?.length ?? 0
      },
      { timeout: 15_000 },
    )
    .toBe(1)
  return sessaoId
}

export async function esperarAssistido(
  u: Pick<UsuarioTeste, 'id'>,
  filmeId: number,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const { data } = await clienteAdmin()
          .from('assistidos')
          .select('id')
          .eq('usuario_id', u.id)
          .eq('filme_id', filmeId)
        return data?.length ?? 0
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThanOrEqual(1)
}

export async function limparSessoesDuplas(u: Pick<UsuarioTeste, 'id'>): Promise<void> {
  await clienteAdmin().from('sessoes_duplas').delete().eq('usuario_id', u.id)
}

export async function limparAssistidos(u: Pick<UsuarioTeste, 'id'>): Promise<void> {
  await clienteAdmin().from('assistidos').delete().eq('usuario_id', u.id)
}
```

- [ ] **Step 2: Write `e2e/sessao-dupla.spec.ts`**

```ts
import { expect, test } from './conta/fixtures'
import { esperarSessaoDupla, limparSessoesDuplas } from './conta/ajudantes'

test.afterEach(async ({ usuario }) => {
  await limparSessoesDuplas(usuario)
})

test('cria sessão dupla, abre sem login e apaga', async ({ page, logado }) => {
  // Go to a film page
  await page.goto('/filme/1001')
  await page.getByRole('button', { name: 'Sessão dupla' }).click()

  // Search for second film
  await page.getByPlaceholder(/buscar/i).fill('matrix')
  await page.getByText('Matrix Reloaded').click()

  // Fill title and create
  await page.getByLabel(/título/i).fill('Dupla Teste')
  await page.getByRole('button', { name: 'Criar' }).click()

  // Should navigate to the session page
  await page.waitForURL(/\/sessao\//)
  await expect(page.getByText('Dupla Teste')).toBeVisible()

  // The session was saved
  const sessaoId = await esperarSessaoDupla(logado, 'Dupla Teste')

  // Open the link in an incognito-like context (log out first)
  const url = page.url()
  const outroContexto = await page.context().browser()!.newContext()
  const outraPagina = await outroContexto.newPage()
  await outraPagina.goto(url)
  await expect(outraPagina.getByText('Dupla Teste')).toBeVisible()
  // Not-logged-in user should NOT see "Copiar link" — actually they should see download but not copy-link
  await outroContexto.close()

  // Image route responds with PNG
  const resposta = await page.request.get(`/sessao/${sessaoId}/imagem/previa`)
  expect(resposta.status()).toBe(200)
  expect(resposta.headers()['content-type']).toContain('image/png')

  // Delete from /sessoes
  await page.goto('/sessoes')
  await page.getByRole('button', { name: /apagar/i }).first().click()
  await page.getByRole('button', { name: /confirmar/i }).click()
  await expect(page.getByText('Dupla Teste')).toBeHidden()
})
```

- [ ] **Step 3: Write `e2e/diario.spec.ts`**

```ts
import { expect, test } from './conta/fixtures'
import { esperarAssistido, limparAssistidos } from './conta/ajudantes'

test.afterEach(async ({ usuario }) => {
  await limparAssistidos(usuario)
})

test('registra Assisti, vê no diário, edita e apaga', async ({ page, logado }) => {
  // Register
  await page.goto('/filme/1001')
  await page.getByRole('button', { name: 'Assisti' }).click()
  await page.getByRole('button', { name: 'Registrar' }).click()

  // Wait for it to save
  await esperarAssistido(logado, 1001)

  // Should show "Você viu 1 vez" on the film page
  await page.reload()
  await expect(page.getByText(/Você viu 1 vez/)).toBeVisible()

  // Check the diary
  await page.goto('/diario')
  await expect(page.getByText('Filme Teste 1001')).toBeVisible()

  // Edit
  await page.getByRole('button', { name: /editar/i }).first().click()
  await page.getByLabel(/anotação/i).fill('Ótimo filme')
  await page.getByRole('button', { name: /salvar/i }).click()

  // Delete
  await page.getByRole('button', { name: /apagar/i }).first().click()
  await page.getByRole('button', { name: /confirmar/i }).click()
  await expect(page.getByText('Filme Teste 1001')).toBeHidden()
})

test('dashboard mostra números após 3 registros', async ({ page, logado }) => {
  // Register 3 films
  for (const id of [1001, 1002, 1004]) {
    await page.goto(`/filme/${id}`)
    await page.getByRole('button', { name: 'Assisti' }).click()
    await page.getByRole('button', { name: 'Registrar' }).click()
    await esperarAssistido(logado, id)
  }

  // Go to dashboard
  await page.goto('/diario?aba=numeros')
  // Top stats
  await expect(page.getByText('3')).toBeVisible() // sessões or filmes
  // Check that the heat map has at least one colored cell
  // and the decade section exists
  await expect(page.getByText(/202/)).toBeVisible() // decade label
})
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test` (unit tests)
Expected: PASS

Then: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add e2e/sessao-dupla.spec.ts e2e/diario.spec.ts e2e/conta/ajudantes.ts
git commit -m "test: e2e da sessão dupla e do diário"
```

---

### Task 8: Roteiro e CLAUDE.md

**Files:**
- Modify: `docs/superpowers/roteiro-proximas-fases.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nothing.
- Produces: updated project docs.

- [ ] **Step 1: Update `roteiro-proximas-fases.md`**

Mark "Sessão dupla" as concluída with a reference to spec and plan. Move "Diário pessoal (Assisti) e Dashboard" to the concluída section. Update the "Diário com Comunidade" entry to note that the private diary part is done and only the community layer remains.

- [ ] **Step 2: Update `CLAUDE.md`**

Add a new phase entry after the Harmonia section:

```markdown
- **Sessão dupla + Diário pessoal — concluída.** Dois filmes sob um título, link público, imagem para Stories/feed. Botão "Assisti" na página do filme com data e anotação. Dashboard ("Números") com mapa de calor, décadas e 5 diretores favoritos.
  - Spec: `docs/superpowers/specs/2026-10-01-cineteca-sessao-dupla-diario-design.md`
  - Plano: `docs/superpowers/plans/2026-10-01-cineteca-sessao-dupla-diario.md`
  - A página pública da sessão busca pelo servidor com `criarClienteAdmin()`; visitantes não têm acesso à tabela.
  - Os diretores são gravados no registro do Assisti; o dashboard não consulta o TMDB.
```

Update the "Próximas, na ordem aprovada" line to reflect that only "Diário com Comunidade (parte pública)" remains.

- [ ] **Step 3: Commit**

```
git add docs/superpowers/roteiro-proximas-fases.md CLAUDE.md
git commit -m "docs: sessão dupla e diário no CLAUDE.md e no roteiro"
```
