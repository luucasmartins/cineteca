# CineTeca Fase 2 (Contas e listas na conta) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar contas de usuário à CineTeca (e-mail + senha e Google, via Supabase) e guardar Favoritos e Salvos na conta, com confirmações rápidas na tela.

**Architecture:**
- **Login:** o Supabase Auth cuida do login. A integração com o Next.js 16 é pela biblioteca `@supabase/ssr`: a sessão fica em cookies e é renovada no `proxy.ts`, e as ações de conta rodam como Server Actions em `lib/auth/acoes.ts`.
- **Listas:** ficam na tabela `filmes_lista`, protegida por RLS. O acesso passa por `criarListaSupabase`, que implementa a mesma interface `ListaStore` da Fase 1, então as telas das listas não mudam.
- **Contexto no navegador:** `SessaoProvider` expõe o usuário ao site, `AvisosProvider` mostra os toasts, e o `ListasProvider` reescrito usa os dois.

**Tech Stack:** Next.js 16.3 (App Router, `proxy.ts`, Server Actions) · React 19 · TypeScript 7 · Tailwind v4 · `@supabase/supabase-js` + `@supabase/ssr` · Vitest 5 · Playwright (TMDB simulado + projeto Supabase de testes).

**Spec:** `docs/superpowers/specs/2026-09-29-cineteca-fase2-contas-design.md`. As restrições da Fase 1 continuam valendo (`docs/superpowers/specs/2026-09-29-catalogo-filmes-fase1-design.md`).

## Global Constraints

- **Texto:** tudo o que aparece na tela é em português do Brasil. As mensagens de erro e os toasts da spec (§3.5 e §6) são copiados exatamente.
- **Visual:** o mesmo da Fase 1:
  - fundo `#0B0B0F`, superfícies `#16161D`;
  - botão principal vermelho `#D7263D` (`BOTAO_PRIMARIO`), secundário cinza translúcido (`BOTAO_SECUNDARIO`);
  - contorno branco no foco;
  - fonte Manrope.
- **Acesso sem login:** navegação livre. Favoritar, salvar e ver Minha lista exigem conta.
- **Login:** e-mail + senha e "Continuar com Google". Sem confirmação de e-mail. Senha com no mínimo 8 e no máximo 72 caracteres. Nome com no máximo 80 caracteres.
- **Segredos:** `SUPABASE_SECRET_KEY` e `TMDB_READ_TOKEN` só existem no servidor (nunca `NEXT_PUBLIC_`). Nunca registrar em log senhas, tokens, chaves ou cookies.
- **Variáveis:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`. Os testes usam `.env.test.local` (projeto `cineteca-testes`).
- **Chaves do navegador:**
  - `sessionStorage`: `cineteca:acao-pendente`.
  - `localStorage` antigo, só para importação: `cineteca:listas:v1`.
- **`voltar`:** só caminhos internos (começam com `/`, não com `//`, sem `\`). Qualquer outro valor vira `/`.
- **Toasts:** somem em 3000 ms.
- **Ambiente:** Windows 10, Node 24, PowerShell 5.1 (sem `&&`). O caminho do projeto tem espaço e acento, então use sempre aspas.
- **Vitest:** todo hook (`beforeEach`/`afterEach`/`beforeAll`/`afterAll`) usa corpo em bloco `{ ... }`. Um valor retornado vira teardown.
- **Next 16:** `params`/`searchParams` são `Promise`; o arquivo de interceptação se chama `proxy.ts` (não `middleware.ts`).
- **Playwright:** para mensagens na tela, use `getByText`. O Next injeta um anunciador de rota com `role="alert"`, que confunde `getByRole('alert')`.
- **Commits:** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (use um segundo `-m`).

## Review Focus

1. **`voltar` malicioso** (`//site.com`, `/\site.com`, `https://site.com`, `/entrar`): depois do login a pessoa cai em `/`, nunca fora do site nem num laço de login. Testado na Task 3 (unitário) e na Task 5 (ponta a ponta).
2. **Duplo clique rápido em Favoritar ou Salvar:** o filme fica salvo uma vez só, e a tela e o banco concordam. Testado na Task 4 (upsert que ignora duplicados) e na Task 8 (ponta a ponta com `dblclick`).
3. **Sessão expirada, ou gravação recusada pelo banco, com a página aberta:** a tela desfaz a mudança e explica (reabre a janela de login ou mostra o toast de erro), sem falhar em silêncio. Testado na Task 4 (código do erro vira `sessaoExpirada`) e na Task 8 (usuário apagado no meio → desfaz + toast).
4. **E-mail com maiúsculas ou espaços, nome com espaços extras ou acentos:** o e-mail é normalizado (minúsculas, sem espaços) e o nome é limpo. Assim "Ana@Email.com " entra na mesma conta que "ana@email.com". Testado na Task 3.
5. **Ação pendente velha, corrompida ou de outro contexto** (a pessoa desistiu do login ontem, ou o `sessionStorage` foi mexido): é ignorada, executada no máximo uma vez, e expira em 30 min. Testado na Task 4.

---

## Mapa de arquivos

```
supabase/migrations/20260929000000_contas.sql   tabelas, gatilho, RLS e permissões
proxy.ts                                         renova a sessão
lib/supabase/config.ts                           lê as variáveis (erros claros)
lib/supabase/servidor.ts                         cliente com cookies (Server Components/Actions/rotas)
lib/supabase/navegador.ts                        cliente do navegador (singleton)
lib/supabase/admin.ts                            cliente com a chave secreta (server-only)
lib/auth/validacao.ts                            validações puras e caminhoDeRetorno
lib/auth/erros.ts                                MENSAGENS e mensagemDoErroAuth
lib/auth/usuario.ts                              tipo Usuario, montarUsuario, primeiroNome
lib/auth/sessao.ts                               obterUsuario() (server-only)
lib/auth/acoes.ts                                Server Actions de conta
lib/lista/supabase.ts                            criarListaSupabase + ErroLista
lib/lista/acao-pendente.ts                       ação pendente no sessionStorage
lib/lista/importacao.ts                          importa listas antigas do localStorage
app/auth/callback/route.ts                       retorno do Google
app/auth/confirmar/route.ts                      link de recuperação de senha
app/(conta)/layout.tsx                           fundo com mosaico + cartão
app/(conta)/entrar|cadastro|recuperar-senha|redefinir-senha|conta/page.tsx
components/SessaoProvider.tsx, AvisosProvider.tsx, MenuUsuario.tsx, JanelaLogin.tsx
components/conta/Cartao.tsx, Campo.tsx, Divisoria.tsx, BotaoGoogle.tsx, FormularioEntrar.tsx,
  FormularioCadastro.tsx, FormularioRecuperar.tsx, FormularioNovaSenha.tsx, FormularioNome.tsx, ExcluirConta.tsx
testes-integracao/banco.test.ts                  RLS e gatilho contra o projeto de testes
vitest.integracao.config.mts
e2e/conta/ajudantes.ts, e2e/conta/fixtures.ts, e2e/*.spec.ts
```

---

### Task 1: Base do Supabase no código (dependências, clientes, proxy, SQL)

**Files:**
- Create: `lib/supabase/config.ts`, `lib/supabase/servidor.ts`, `lib/supabase/navegador.ts`, `lib/supabase/admin.ts`, `proxy.ts`
- Create: `supabase/migrations/20260929000000_contas.sql`
- Create: `testes-integracao/banco.test.ts`, `vitest.integracao.config.mts`
- Modify: `package.json` (dependências + script `test:supabase`), `vitest.config.mts` (exclui `testes-integracao/**`), `.env.local.example`, `docs/superpowers/specs/2026-09-29-cineteca-fase2-contas-design.md:4` (status)
- Test: `lib/supabase/config.test.ts`

**Interfaces:**
- Consumes: nada da Fase 2.
- Produces:
  - `lerConfigSupabase(valores?: { url?: string; chavePublica?: string }): { url: string; chavePublica: string }` — lança um erro que cita as variáveis que faltam.
  - `lerChaveSecreta(valor?: string): string`
  - `lerUrlSite(valor?: string): string` — sem barra no fim; o padrão é `http://localhost:3000`.
  - `criarClienteServidor(): Promise<SupabaseClient>` (server-only)
  - `obterClienteNavegador(): SupabaseClient`
  - `criarClienteAdmin(): SupabaseClient` (server-only)
  - Tabelas `public.perfis(id, nome, criado_em)` e `public.filmes_lista(usuario_id, tipo, filme_id, titulo, poster_url, ano, nota, criado_em)` com RLS.
  - Script `npm run test:supabase` (integração, lê `.env.test.local`).

- [ ] **Step 1: Instalar dependências e ajustar scripts**

Run:
```powershell
npm install @supabase/supabase-js @supabase/ssr
```
Em `package.json`, dentro de `"scripts"`, acrescente depois de `"test:e2e"`:
```json
    "test:supabase": "vitest run --config vitest.integracao.config.mts"
```

Em `vitest.config.mts`, troque a linha do `exclude` por:
```ts
    exclude: ['node_modules/**', '.next/**', 'e2e/**', 'testes-integracao/**'],
```

Crie `vitest.integracao.config.mts`:
```ts
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Testes de integração rodam contra o projeto Supabase de testes (nunca o de produção).
if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local')

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
    include: ['testes-integracao/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
```

Substitua `.env.local.example` por:
```
# Token de leitura da API do TMDB ("API Read Access Token", começa com eyJ...)
TMDB_READ_TOKEN=

# Supabase (Project Settings → API Keys). A chave "publishable" pode ser pública; a "secret" NUNCA.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# Endereço do site (usado no retorno do Google e nos e-mails). Local: http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Para os testes automáticos, crie .env.test.local com as mesmas variáveis do projeto "cineteca-testes"
# e NEXT_PUBLIC_SITE_URL=http://localhost:3100
```

- [ ] **Step 2: Escrever o teste da configuração (falhando)**

`lib/supabase/config.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { lerChaveSecreta, lerConfigSupabase, lerUrlSite } from './config'

describe('lerConfigSupabase', () => {
  it('lê os valores e remove espaços', () => {
    expect(lerConfigSupabase({ url: ' https://abc.supabase.co ', chavePublica: ' sb_publishable_x ' })).toEqual({
      url: 'https://abc.supabase.co',
      chavePublica: 'sb_publishable_x',
    })
  })

  it('explica quais variáveis faltam', () => {
    expect(() => lerConfigSupabase({ url: '', chavePublica: 'x' })).toThrow('NEXT_PUBLIC_SUPABASE_URL')
    expect(() => lerConfigSupabase({ url: 'https://abc.supabase.co', chavePublica: undefined })).toThrow(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    )
  })
})

describe('lerChaveSecreta', () => {
  it('lê a chave e remove espaços', () => {
    expect(lerChaveSecreta(' sb_secret_y ')).toBe('sb_secret_y')
  })

  it('explica quando falta', () => {
    expect(() => lerChaveSecreta(undefined)).toThrow('SUPABASE_SECRET_KEY')
  })
})

describe('lerUrlSite', () => {
  it('usa localhost:3000 quando não definido', () => {
    expect(lerUrlSite(undefined)).toBe('http://localhost:3000')
  })

  it('remove barras no fim', () => {
    expect(lerUrlSite('https://cineteca-gules.vercel.app/ ')).toBe('https://cineteca-gules.vercel.app')
  })
})
```

- [ ] **Step 3: Rodar para ver falhar**

Run: `npx vitest run lib/supabase`
Expected: FAIL — `Failed to resolve import "./config"`.

- [ ] **Step 4: Implementar a configuração e os clientes**

`lib/supabase/config.ts`:
```ts
// Os valores padrão usam process.env.NOME literal: o Next só embute no navegador
// as variáveis NEXT_PUBLIC_ acessadas assim.
export function lerConfigSupabase(
  valores: { url?: string; chavePublica?: string } = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    chavePublica: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
): { url: string; chavePublica: string } {
  const url = valores.url?.trim() ?? ''
  const chavePublica = valores.chavePublica?.trim() ?? ''
  const faltando = [
    url ? null : 'NEXT_PUBLIC_SUPABASE_URL',
    chavePublica ? null : 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ].filter(Boolean)
  if (faltando.length > 0) {
    throw new Error(`[CineTeca] Supabase não configurado: defina ${faltando.join(' e ')}.`)
  }
  return { url, chavePublica }
}

export function lerChaveSecreta(valor: string | undefined = process.env.SUPABASE_SECRET_KEY): string {
  const chave = valor?.trim() ?? ''
  if (!chave) throw new Error('[CineTeca] Supabase não configurado: defina SUPABASE_SECRET_KEY.')
  return chave
}

export function lerUrlSite(valor: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  const url = valor?.trim().replace(/\/+$/, '') ?? ''
  return url || 'http://localhost:3000'
}
```

`lib/supabase/servidor.ts`:
```ts
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { lerConfigSupabase } from './config'

export async function criarClienteServidor(): Promise<SupabaseClient> {
  const { url, chavePublica } = lerConfigSupabase()
  const cookieStore = await cookies()
  return createServerClient(url, chavePublica, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesParaGravar) {
        try {
          for (const { name, value, options } of cookiesParaGravar) cookieStore.set(name, value, options)
        } catch {
          // Server Components não podem gravar cookies; o proxy.ts renova a sessão.
        }
      },
    },
  })
}
```

`lib/supabase/navegador.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { lerConfigSupabase } from './config'

let cliente: SupabaseClient | null = null

export function obterClienteNavegador(): SupabaseClient {
  if (!cliente) {
    const { url, chavePublica } = lerConfigSupabase()
    cliente = createBrowserClient(url, chavePublica)
  }
  return cliente
}
```

`lib/supabase/admin.ts`:
```ts
import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { lerChaveSecreta, lerConfigSupabase } from './config'

// Ignora as regras de RLS: use só para excluir contas.
export function criarClienteAdmin(): SupabaseClient {
  const { url } = lerConfigSupabase()
  return createClient(url, lerChaveSecreta(), { auth: { persistSession: false, autoRefreshToken: false } })
}
```

`proxy.ts` (na raiz do projeto):
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { lerConfigSupabase } from '@/lib/supabase/config'

// Renova a sessão do Supabase (o token de acesso expira) antes de cada página.
export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request })

  let ajustes: { url: string; chavePublica: string }
  try {
    ajustes = lerConfigSupabase()
  } catch {
    return resposta
  }

  const supabase = createServerClient(ajustes.url, ajustes.chavePublica, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesParaGravar) {
        for (const { name, value } of cookiesParaGravar) request.cookies.set(name, value)
        resposta = NextResponse.next({ request })
        for (const { name, value, options } of cookiesParaGravar) resposta.cookies.set(name, value, options)
      },
    },
  })

  try {
    await supabase.auth.getUser()
  } catch (erro) {
    console.error('[CineTeca] Falha ao renovar a sessão:', (erro as Error).name)
  }
  return resposta
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/filmes|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
```

- [ ] **Step 5: Rodar para ver passar**

Run: `npx vitest run lib/supabase`
Expected: PASS (6 testes).

- [ ] **Step 6: Escrever o SQL do banco**

`supabase/migrations/20260929000000_contas.sql`:
```sql
-- CineTeca Fase 2: perfis e listas de filmes por conta.
-- Aplicar no SQL Editor do Supabase, nos projetos "cineteca" e "cineteca-testes".

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 80),
  criado_em timestamptz not null default now()
);

create table public.filmes_lista (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('favoritos', 'salvos')),
  filme_id integer not null check (filme_id > 0),
  titulo text not null,
  poster_url text,
  ano text,
  nota numeric(3, 1),
  criado_em timestamptz not null default now(),
  primary key (usuario_id, tipo, filme_id)
);

create index filmes_lista_por_data on public.filmes_lista (usuario_id, tipo, criado_em desc);

-- Permissões: visitantes (anon) não acessam nada; contas logadas só o necessário.
revoke all on public.perfis from anon, authenticated;
revoke all on public.filmes_lista from anon, authenticated;
grant select on public.perfis to authenticated;
grant update (nome) on public.perfis to authenticated;
grant select, insert, delete on public.filmes_lista to authenticated;

alter table public.perfis enable row level security;
alter table public.filmes_lista enable row level security;

create policy "perfis: ler o próprio" on public.perfis
  for select to authenticated using ((select auth.uid()) = id);
create policy "perfis: atualizar o próprio" on public.perfis
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "filmes_lista: ler os próprios" on public.filmes_lista
  for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "filmes_lista: inserir os próprios" on public.filmes_lista
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "filmes_lista: apagar os próprios" on public.filmes_lista
  for delete to authenticated using ((select auth.uid()) = usuario_id);

-- Cria o perfil quando a conta nasce (cadastro por e-mail usa "nome"; Google usa "full_name"/"name").
create function public.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
        ''
      ),
      80
    )
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_para_novo_usuario();
```

- [ ] **Step 7: Escrever o teste de integração do banco (roda na Task 2, com o projeto de testes)**

`testes-integracao/banco.test.ts`:
```ts
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
  `integracao+${rotulo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@cineteca.test`

async function criarConta(nome: string): Promise<Conta> {
  const email = novoEmail(nome.split(' ')[0].toLowerCase())
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

const linha = (usuarioId: string, filmeId = 603) => ({
  usuario_id: usuarioId,
  tipo: 'favoritos',
  filme_id: filmeId,
  titulo: 'Matrix',
  poster_url: null,
  ano: '1999',
  nota: 8.2,
})

describe('banco da CineTeca (projeto de testes)', () => {
  const criadas: Conta[] = []
  let ana: Conta
  let bia: Conta
  let clienteAna: SupabaseClient
  let clienteBia: SupabaseClient

  beforeAll(async () => {
    if (!url || !chavePublica || !chaveSecreta) throw new Error('Falta .env.test.local com as chaves do projeto cineteca-testes')
    ana = await criarConta('Ana Souza')
    bia = await criarConta('Bia Lima')
    criadas.push(ana, bia)
    clienteAna = await clienteDe(ana)
    clienteBia = await clienteDe(bia)
  })

  afterAll(async () => {
    for (const conta of criadas) await admin().auth.admin.deleteUser(conta.id)
  })

  it('cria o perfil com o nome do cadastro', async () => {
    const { data, error } = await clienteAna.from('perfis').select('nome').eq('id', ana.id).single()
    expect(error).toBeNull()
    expect(data?.nome).toBe('Ana Souza')
  })

  it('não mostra o perfil de outra pessoa', async () => {
    const { data } = await clienteBia.from('perfis').select('id').eq('id', ana.id)
    expect(data).toEqual([])
  })

  it('atualiza o próprio nome, mas não o de outra pessoa', async () => {
    await clienteAna.from('perfis').update({ nome: 'Ana S.' }).eq('id', ana.id)
    await clienteBia.from('perfis').update({ nome: 'Invasora' }).eq('id', ana.id)
    const { data } = await admin().from('perfis').select('nome').eq('id', ana.id).single()
    expect(data?.nome).toBe('Ana S.')
  })

  it('insere e lê os próprios filmes', async () => {
    expect((await clienteAna.from('filmes_lista').insert(linha(ana.id))).error).toBeNull()
    const { data } = await clienteAna.from('filmes_lista').select('filme_id, titulo').eq('usuario_id', ana.id)
    expect(data).toEqual([{ filme_id: 603, titulo: 'Matrix' }])
  })

  it('inserir o mesmo filme de novo, ignorando duplicados, não dá erro nem duplica', async () => {
    const { error } = await clienteAna
      .from('filmes_lista')
      .upsert(linha(ana.id), { onConflict: 'usuario_id,tipo,filme_id', ignoreDuplicates: true })
    expect(error).toBeNull()
    const { data } = await clienteAna.from('filmes_lista').select('filme_id').eq('usuario_id', ana.id)
    expect(data).toHaveLength(1)
  })

  it('não mostra os filmes de outra pessoa', async () => {
    const { data } = await clienteBia.from('filmes_lista').select('filme_id').eq('usuario_id', ana.id)
    expect(data).toEqual([])
  })

  it('recusa inserir filme em nome de outra pessoa', async () => {
    const { error } = await clienteBia.from('filmes_lista').insert(linha(ana.id, 604))
    expect(error?.code).toBe('42501')
  })

  it('não apaga filme de outra pessoa', async () => {
    await clienteBia.from('filmes_lista').delete().eq('usuario_id', ana.id)
    const { data } = await admin().from('filmes_lista').select('filme_id').eq('usuario_id', ana.id)
    expect(data).toHaveLength(1)
  })

  it('visitante sem login não lê nada', async () => {
    const visitante = createClient(url, chavePublica, semSessao)
    const { data, error } = await visitante.from('filmes_lista').select('filme_id')
    expect(error !== null || (data ?? []).length === 0).toBe(true)
  })

  it('recusa um tipo de lista inválido', async () => {
    const { error } = await clienteAna.from('filmes_lista').insert({ ...linha(ana.id, 605), tipo: 'series' })
    expect(error?.code).toBe('23514')
  })

  it('excluir a conta apaga o perfil e os filmes', async () => {
    const caio = await criarConta('Caio')
    const clienteCaio = await clienteDe(caio)
    await clienteCaio.from('filmes_lista').insert(linha(caio.id))
    expect((await admin().auth.admin.deleteUser(caio.id)).error).toBeNull()
    const perfis = await admin().from('perfis').select('id').eq('id', caio.id)
    const filmes = await admin().from('filmes_lista').select('filme_id').eq('usuario_id', caio.id)
    expect(perfis.data).toEqual([])
    expect(filmes.data).toEqual([])
  })
})
```

- [ ] **Step 8: Conferir tudo o que roda sem o banco**

Run:
```powershell
npx vitest run
npm run typecheck
npm run build
```
Expected: os testes unitários passam; o typecheck não mostra erros; o build termina. O build não precisa das variáveis do Supabase: o `proxy.ts` ignora a configuração ausente. **Não** rode `npm run test:supabase` agora, porque ele depende da Task 2.

Em `docs/superpowers/specs/2026-09-29-cineteca-fase2-contas-design.md`, troque `**Status:** aguardando revisão` por `**Status:** aprovada`.

- [ ] **Step 9: Commit**

```powershell
git add package.json package-lock.json vitest.config.mts vitest.integracao.config.mts .env.local.example lib/supabase proxy.ts supabase testes-integracao docs/superpowers/specs/2026-09-29-cineteca-fase2-contas-design.md
git commit -m "feat: base do Supabase (clientes, proxy de sessão e banco com RLS)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Configurar os projetos Supabase (com o dono do produto)

> **Execução pelo controlador, junto com o dono.** Não despache para um subagente: esta task depende de painéis web e dos segredos do dono. Peça **uma ação por vez**, em linguagem simples. **Nunca** peça que ele cole chaves no chat; ele cola as chaves direto nos arquivos.

**Files:**
- Create (fora do git): `.env.test.local`
- Modify (fora do git): `.env.local`

**Interfaces:**
- Consumes: o SQL da Task 1 e `npm run test:supabase`.
- Produces: projetos `cineteca` e `cineteca-testes` configurados; `.env.local` (produção + `NEXT_PUBLIC_SITE_URL=http://localhost:3000`); `.env.test.local` (testes + `NEXT_PUBLIC_SITE_URL=http://localhost:3100`).

- [ ] **Step 1: Criar os dois projetos**
Guie o dono:
1. Criar conta em https://supabase.com, com "Continue with GitHub".
2. Criar um projeto chamado `cineteca`, na região **South America (São Paulo)**. A senha do banco é gerada; peça que ele guarde num lugar seguro.
3. Criar um segundo projeto, `cineteca-testes`, na mesma região.

- [ ] **Step 2: Aplicar o SQL nos dois projetos**
Em cada projeto, o dono abre **SQL Editor → New query**, cola o conteúdo de `supabase/migrations/20260929000000_contas.sql` e clica em **Run**. O resultado esperado é "Success. No rows returned".

- [ ] **Step 3: Configurar Authentication nos dois projetos**
Em cada projeto:
1. **Authentication → Sign In / Providers → Email:**
   - "Enable Email provider" ligado;
   - **"Confirm email" desligado**;
   - "Minimum password length" = **8**.
2. **Authentication → URL Configuration:**
   - `cineteca`:
     - Site URL = `https://cineteca-gules.vercel.app`
     - Redirect URLs: `https://cineteca-gules.vercel.app/**` e `http://localhost:3000/**`
   - `cineteca-testes`:
     - Site URL = `http://localhost:3100`
     - Redirect URLs: `http://localhost:3100/**`
3. **Authentication → Emails → Reset Password** (template): troque o link do corpo por
   `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery&voltar=/redefinir-senha`
   e o assunto por "Crie uma nova senha na CineTeca".
4. **Só no `cineteca-testes`, em Authentication → Rate Limits:** suba "sign-ups and sign-ins" e "token refreshes" para o máximo permitido. Os testes automáticos criam e logam muitas contas.

- [ ] **Step 4: Preencher os arquivos de variáveis**
1. Crie `.env.test.local` copiando `.env.local.example` e abra-o no VS Code (`code .env.test.local`).
2. Em **Project Settings → API Keys** de `cineteca-testes`, o dono copia e cola, **direto no arquivo**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Secret key → `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3100`
   - `TMDB_READ_TOKEN` pode ficar vazio.
3. Abra `.env.local` (que já tem o token do TMDB) e acrescente as mesmas quatro variáveis com os valores do projeto `cineteca` e `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

Confirme sem mostrar valores:
```powershell
foreach ($a in '.env.local', '.env.test.local') { $a; foreach ($v in 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SITE_URL') { "  $v preenchida: " + [bool](Select-String -Path $a -Pattern "^$v=.+" -Quiet) } }
git check-ignore .env.test.local
```
Expected: todas `True`, e o último comando imprime `.env.test.local` (ignorado pelo git).

- [ ] **Step 5: Rodar o teste de integração do banco**

Run: `npm run test:supabase`
Expected: PASS (11 testes).
- Se falhar com `email_address_invalid` por causa do domínio `cineteca.test`, troque o domínio em `testes-integracao/banco.test.ts` para `example.com` e registre a decisão.
- Se falhar em RLS ou permissões, confira se o SQL foi aplicado inteiro no projeto de testes.

- [ ] **Step 6: Commit (só se algo mudou no repositório, como o domínio de teste)**

```powershell
git status --short
```

---

### Task 3: Validações e mensagens de erro de conta

**Files:**
- Create: `lib/auth/validacao.ts`, `lib/auth/erros.ts`
- Test: `lib/auth/validacao.test.ts`, `lib/auth/erros.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }`
  - `SENHA_MINIMA = 8`, `SENHA_MAXIMA = 72`, `NOME_MAXIMO = 80`
  - `validarEmail(bruto: unknown): Resultado<string>` (sem espaços e em minúsculas)
  - `validarSenha(bruto: unknown): Resultado<string>`
  - `validarConfirmacao(senha: string, confirmacao: unknown): Resultado<string>`
  - `validarNome(bruto: unknown): Resultado<string>` (espaços extras removidos)
  - `caminhoDeRetorno(bruto: unknown): string`
  - `MENSAGENS` (objeto com as mensagens da spec §6 + `senhaVazia`, `mesmaSenha`, `generico`)
  - `mensagemDoErroAuth(erro: { code?: string; status?: number; name?: string } | null | undefined): string`

- [ ] **Step 1: Escrever os testes (falhando)**

`lib/auth/validacao.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { caminhoDeRetorno, validarConfirmacao, validarEmail, validarNome, validarSenha } from './validacao'

describe('validarEmail', () => {
  it('remove espaços e passa para minúsculas', () => {
    expect(validarEmail('  Ana.Souza@Email.COM ')).toEqual({ ok: true, valor: 'ana.souza@email.com' })
  })

  it('recusa formatos inválidos', () => {
    for (const valor of ['', 'ana', 'ana@', '@email.com', 'ana@email', 'ana souza@email.com', null, 42]) {
      expect(validarEmail(valor)).toEqual({ ok: false, erro: 'Digite um e-mail válido' })
    }
  })
})

describe('validarSenha', () => {
  it('aceita de 8 a 72 caracteres, sem alterar a senha', () => {
    expect(validarSenha(' 12345678')).toEqual({ ok: true, valor: ' 12345678' })
    expect(validarSenha('a'.repeat(72))).toEqual({ ok: true, valor: 'a'.repeat(72) })
  })

  it('recusa senha curta', () => {
    expect(validarSenha('1234567')).toEqual({ ok: false, erro: 'A senha precisa ter pelo menos 8 caracteres' })
    expect(validarSenha(undefined)).toEqual({ ok: false, erro: 'A senha precisa ter pelo menos 8 caracteres' })
  })

  it('recusa senha longa demais', () => {
    expect(validarSenha('a'.repeat(73))).toEqual({ ok: false, erro: 'A senha pode ter no máximo 72 caracteres' })
  })
})

describe('validarConfirmacao', () => {
  it('aceita senhas iguais', () => {
    expect(validarConfirmacao('senha-123', 'senha-123')).toEqual({ ok: true, valor: 'senha-123' })
  })

  it('recusa senhas diferentes', () => {
    expect(validarConfirmacao('senha-123', 'senha-124')).toEqual({ ok: false, erro: 'As senhas não são iguais' })
  })
})

describe('validarNome', () => {
  it('remove espaços extras e mantém acentos', () => {
    expect(validarNome('  João   da  Silva ')).toEqual({ ok: true, valor: 'João da Silva' })
  })

  it('recusa nome vazio', () => {
    expect(validarNome('   ')).toEqual({ ok: false, erro: 'Digite seu nome' })
    expect(validarNome(null)).toEqual({ ok: false, erro: 'Digite seu nome' })
  })

  it('recusa nome com mais de 80 caracteres', () => {
    expect(validarNome('a'.repeat(81))).toEqual({ ok: false, erro: 'O nome pode ter no máximo 80 caracteres' })
    expect(validarNome('a'.repeat(80))).toEqual({ ok: true, valor: 'a'.repeat(80) })
  })
})

describe('caminhoDeRetorno', () => {
  it('aceita caminhos internos, com busca', () => {
    expect(caminhoDeRetorno('/filme/603')).toBe('/filme/603')
    expect(caminhoDeRetorno('/busca?q=matrix')).toBe('/busca?q=matrix')
  })

  it('troca por / qualquer coisa fora do site ou estranha', () => {
    for (const valor of [
      '//site.com',
      '/\\site.com',
      'https://site.com',
      'site.com',
      '',
      '/filme\n603',
      `/${'a'.repeat(600)}`,
      null,
      undefined,
    ]) {
      expect(caminhoDeRetorno(valor)).toBe('/')
    }
  })

  it('evita voltar para as próprias páginas de acesso', () => {
    expect(caminhoDeRetorno('/entrar')).toBe('/')
    expect(caminhoDeRetorno('/cadastro?voltar=/x')).toBe('/')
    expect(caminhoDeRetorno('/entrarx')).toBe('/entrarx')
  })
})
```

`lib/auth/erros.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { MENSAGENS, mensagemDoErroAuth } from './erros'

describe('mensagemDoErroAuth', () => {
  it.each([
    ['invalid_credentials', 'E-mail ou senha incorretos'],
    ['user_already_exists', 'Já existe uma conta com esse e-mail'],
    ['email_exists', 'Já existe uma conta com esse e-mail'],
    ['weak_password', 'A senha precisa ter pelo menos 8 caracteres'],
    ['over_request_rate_limit', 'Muitas tentativas. Espere um pouco e tente de novo.'],
    ['over_email_send_rate_limit', 'Muitas tentativas. Espere um pouco e tente de novo.'],
    ['same_password', 'A nova senha precisa ser diferente da atual'],
    ['otp_expired', 'Este link expirou. Peça um novo.'],
    ['flow_state_expired', 'Este link expirou. Peça um novo.'],
  ])('código %s', (code, mensagem) => {
    expect(mensagemDoErroAuth({ code })).toBe(mensagem)
  })

  it('status 429 sem código vira "muitas tentativas"', () => {
    expect(mensagemDoErroAuth({ status: 429 })).toBe(MENSAGENS.limite)
  })

  it('falha de rede ou servidor fora do ar vira "não foi possível conectar"', () => {
    expect(mensagemDoErroAuth({ name: 'AuthRetryableFetchError' })).toBe('Não foi possível conectar. Tente em instantes.')
    expect(mensagemDoErroAuth({ status: 503 })).toBe(MENSAGENS.conexao)
    expect(mensagemDoErroAuth({ status: 0 })).toBe(MENSAGENS.conexao)
  })

  it('qualquer outro erro vira a mensagem genérica', () => {
    expect(mensagemDoErroAuth({ code: 'algo_novo', status: 400 })).toBe('Algo deu errado. Tente de novo.')
    expect(mensagemDoErroAuth(null)).toBe(MENSAGENS.generico)
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run lib/auth`
Expected: FAIL — `Failed to resolve import "./validacao"` / `"./erros"`.

- [ ] **Step 3: Implementar**

`lib/auth/validacao.ts`:
```ts
export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }

export const SENHA_MINIMA = 8
export const SENHA_MAXIMA = 72
export const NOME_MAXIMO = 80

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PAGINAS_DE_ACESSO = ['/entrar', '/cadastro']

export function validarEmail(bruto: unknown): Resultado<string> {
  const email = typeof bruto === 'string' ? bruto.trim().toLowerCase() : ''
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, erro: 'Digite um e-mail válido' }
  return { ok: true, valor: email }
}

export function validarSenha(bruto: unknown): Resultado<string> {
  const senha = typeof bruto === 'string' ? bruto : ''
  if (senha.length < SENHA_MINIMA) return { ok: false, erro: 'A senha precisa ter pelo menos 8 caracteres' }
  if (senha.length > SENHA_MAXIMA) return { ok: false, erro: 'A senha pode ter no máximo 72 caracteres' }
  return { ok: true, valor: senha }
}

export function validarConfirmacao(senha: string, confirmacao: unknown): Resultado<string> {
  if (confirmacao !== senha) return { ok: false, erro: 'As senhas não são iguais' }
  return { ok: true, valor: senha }
}

export function validarNome(bruto: unknown): Resultado<string> {
  const nome = typeof bruto === 'string' ? bruto.trim().replace(/\s+/g, ' ') : ''
  if (!nome) return { ok: false, erro: 'Digite seu nome' }
  if (nome.length > NOME_MAXIMO) return { ok: false, erro: 'O nome pode ter no máximo 80 caracteres' }
  return { ok: true, valor: nome }
}

// Para onde levar a pessoa depois do login: só caminhos deste site.
export function caminhoDeRetorno(bruto: unknown): string {
  if (typeof bruto !== 'string') return '/'
  const valor = bruto.trim()
  const invalido =
    !valor.startsWith('/') ||
    valor.startsWith('//') ||
    valor.includes('\\') ||
    valor.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(valor)
  if (invalido) return '/'
  const caminho = valor.split(/[?#]/)[0]
  if (PAGINAS_DE_ACESSO.some((p) => caminho === p || caminho.startsWith(`${p}/`))) return '/'
  return valor
}
```

`lib/auth/erros.ts`:
```ts
export const MENSAGENS = {
  credenciais: 'E-mail ou senha incorretos',
  emailEmUso: 'Já existe uma conta com esse e-mail',
  senhaFraca: 'A senha precisa ter pelo menos 8 caracteres',
  senhaVazia: 'Digite sua senha',
  mesmaSenha: 'A nova senha precisa ser diferente da atual',
  limite: 'Muitas tentativas. Espere um pouco e tente de novo.',
  conexao: 'Não foi possível conectar. Tente em instantes.',
  linkExpirado: 'Este link expirou. Peça um novo.',
  google: 'Não foi possível entrar com o Google.',
  generico: 'Algo deu errado. Tente de novo.',
} as const

const POR_CODIGO: Record<string, string> = {
  invalid_credentials: MENSAGENS.credenciais,
  user_already_exists: MENSAGENS.emailEmUso,
  email_exists: MENSAGENS.emailEmUso,
  weak_password: MENSAGENS.senhaFraca,
  over_request_rate_limit: MENSAGENS.limite,
  over_email_send_rate_limit: MENSAGENS.limite,
  same_password: MENSAGENS.mesmaSenha,
  otp_expired: MENSAGENS.linkExpirado,
  flow_state_expired: MENSAGENS.linkExpirado,
  flow_state_not_found: MENSAGENS.linkExpirado,
  bad_code_verifier: MENSAGENS.linkExpirado,
}

type ErroAuth = { code?: string; status?: number; name?: string } | null | undefined

export function mensagemDoErroAuth(erro: ErroAuth): string {
  if (!erro) return MENSAGENS.generico
  if (erro.code && POR_CODIGO[erro.code]) return POR_CODIGO[erro.code]
  if (erro.status === 429) return MENSAGENS.limite
  if (erro.name === 'AuthRetryableFetchError' || erro.status === 0 || (erro.status ?? 0) >= 500) return MENSAGENS.conexao
  return MENSAGENS.generico
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run lib/auth`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add lib/auth
git commit -m "feat: validações de conta e mensagens de erro em pt-BR" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Listas no Supabase, ação pendente e importação (lógica pura)

**Files:**
- Create: `lib/lista/supabase.ts`, `lib/lista/acao-pendente.ts`, `lib/lista/importacao.ts`
- Modify: `lib/lista/local.ts` (exportar `ehFilmeSalvo` e `lerListas`; `obterArmazenamentoSeguro` passa a devolver `Storage | null`)
- Test: `lib/lista/supabase.test.ts`, `lib/lista/acao-pendente.test.ts`, `lib/lista/importacao.test.ts`

**Interfaces:**
- Consumes: `ListaStore`, `FilmeSalvo`, `TipoLista`, `Listas` (`lib/lista/tipos.ts`); `CHAVE_LISTAS`, `criarListaLocal` (`lib/lista/local.ts`); `caminhoDeRetorno` (Task 3).
- Produces:
  - `class ErroLista extends Error { sessaoExpirada: boolean }`
  - `criarListaSupabase(cliente: Pick<SupabaseClient, 'from'>, usuarioId: string): ListaStore`
  - `CHAVE_ACAO_PENDENTE = 'cineteca:acao-pendente'`, `VALIDADE_ACAO_MS = 1_800_000`
  - `type AcaoPendente = { tipo: TipoLista; filme: FilmeSalvo; voltar: string; criadaEm: number }`
  - `type ArmazenamentoDaSessao = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`
  - `obterArmazenamentoDaSessao(): Storage | null`
  - `guardarAcaoPendente(armazenamento: ArmazenamentoDaSessao | null, acao: Omit<AcaoPendente, 'criadaEm'>, agora?: number): void`
  - `lerAcaoPendente(armazenamento: ArmazenamentoDaSessao | null, agora?: number): AcaoPendente | null`
  - `limparAcaoPendente(armazenamento: ArmazenamentoDaSessao | null): void`
  - `importarListasDoNavegador(armazenamento: Pick<Storage, 'getItem' | 'removeItem'> | null, destino: ListaStore): Promise<number>`
  - Em `local.ts`:
    - `ehFilmeSalvo(valor: unknown): valor is FilmeSalvo` (exportado)
    - `lerListas(armazenamento: Pick<Storage, 'getItem'>): Listas` (exportado)
    - `obterArmazenamentoSeguro(): Storage | null`

- [ ] **Step 1: Ajustar `lib/lista/local.ts`**

Faça estas quatro trocas, sem mudar o comportamento:
- `export function obterArmazenamentoSeguro(): ArmazenamentoSimples | null {` → `export function obterArmazenamentoSeguro(): Storage | null {`
- `function ehFilmeSalvo(valor: unknown): valor is FilmeSalvo {` → `export function ehFilmeSalvo(valor: unknown): valor is FilmeSalvo {`
- `function lerListas(armazenamento: ArmazenamentoSimples): Listas {` → `export function lerListas(armazenamento: Pick<Storage, 'getItem'>): Listas {`
- Em `criarListaLocal`, nada muda.

Run: `npx vitest run lib/lista`
Expected: PASS (os testes existentes continuam verdes).

- [ ] **Step 2: Escrever os testes (falhando)**

`lib/lista/supabase.test.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { criarListaSupabase, ErroLista } from './supabase'
import type { FilmeSalvo } from './tipos'

type Resposta = { data: unknown; error: { code?: string; message?: string } | null; status?: number }

function clienteFalso(resposta: Resposta = { data: [], error: null, status: 200 }) {
  const chamadas: { metodo: string; args: unknown[] }[] = []
  const consulta: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'order', 'limit', 'upsert', 'delete']) {
    consulta[metodo] = (...args: unknown[]) => {
      chamadas.push({ metodo, args })
      return consulta
    }
  }
  consulta.then = (aoResolver: (r: Resposta) => unknown, aoRejeitar?: (e: unknown) => unknown) =>
    Promise.resolve(resposta).then(aoResolver, aoRejeitar)
  const cliente = {
    from: (tabela: string) => {
      chamadas.push({ metodo: 'from', args: [tabela] })
      return consulta
    },
  }
  return { cliente: cliente as unknown as Pick<SupabaseClient, 'from'>, chamadas }
}

const matrix: FilmeSalvo = { id: 603, title: 'Matrix', posterUrl: 'https://img/p.jpg', year: '1999', rating: 8.2 }

describe('criarListaSupabase', () => {
  it('lista os filmes da pessoa, mais recentes primeiro', async () => {
    const { cliente, chamadas } = clienteFalso({
      data: [{ filme_id: 603, titulo: 'Matrix', poster_url: 'https://img/p.jpg', ano: '1999', nota: '8.2' }],
      error: null,
      status: 200,
    })
    const filmes = await criarListaSupabase(cliente, 'u1').listar('favoritos')
    expect(filmes).toEqual([matrix])
    expect(chamadas).toEqual([
      { metodo: 'from', args: ['filmes_lista'] },
      { metodo: 'select', args: ['filme_id, titulo, poster_url, ano, nota'] },
      { metodo: 'eq', args: ['usuario_id', 'u1'] },
      { metodo: 'eq', args: ['tipo', 'favoritos'] },
      { metodo: 'order', args: ['criado_em', { ascending: false }] },
    ])
  })

  it('converte nota nula em null', async () => {
    const { cliente } = clienteFalso({
      data: [{ filme_id: 1, titulo: 'X', poster_url: null, ano: null, nota: null }],
      error: null,
      status: 200,
    })
    expect(await criarListaSupabase(cliente, 'u1').listar('salvos')).toEqual([
      { id: 1, title: 'X', posterUrl: null, year: null, rating: null },
    ])
  })

  it('adiciona sem duplicar (upsert que ignora repetidos)', async () => {
    const { cliente, chamadas } = clienteFalso({ data: null, error: null, status: 201 })
    await criarListaSupabase(cliente, 'u1').adicionar('salvos', matrix)
    expect(chamadas[1]).toEqual({
      metodo: 'upsert',
      args: [
        { usuario_id: 'u1', tipo: 'salvos', filme_id: 603, titulo: 'Matrix', poster_url: 'https://img/p.jpg', ano: '1999', nota: 8.2 },
        { onConflict: 'usuario_id,tipo,filme_id', ignoreDuplicates: true },
      ],
    })
  })

  it('remove só o filme daquela pessoa e daquela lista', async () => {
    const { cliente, chamadas } = clienteFalso({ data: null, error: null, status: 204 })
    await criarListaSupabase(cliente, 'u1').remover('favoritos', 603)
    expect(chamadas.slice(1)).toEqual([
      { metodo: 'delete', args: [] },
      { metodo: 'eq', args: ['usuario_id', 'u1'] },
      { metodo: 'eq', args: ['tipo', 'favoritos'] },
      { metodo: 'eq', args: ['filme_id', 603] },
    ])
  })

  it('contem consulta um único filme', async () => {
    const { cliente } = clienteFalso({ data: [{ filme_id: 603 }], error: null, status: 200 })
    expect(await criarListaSupabase(cliente, 'u1').contem('favoritos', 603)).toBe(true)
    const vazio = clienteFalso({ data: [], error: null, status: 200 })
    expect(await criarListaSupabase(vazio.cliente, 'u1').contem('favoritos', 603)).toBe(false)
  })

  it('erro de permissão ou sessão vira ErroLista com sessaoExpirada', async () => {
    for (const resposta of [
      { data: null, error: { code: '42501', message: 'rls' }, status: 403 },
      { data: null, error: { code: 'PGRST301', message: 'jwt expired' }, status: 401 },
      { data: null, error: { message: 'sem código' }, status: 401 },
    ]) {
      const erro = await criarListaSupabase(clienteFalso(resposta).cliente, 'u1').adicionar('favoritos', matrix).catch((e) => e)
      expect(erro).toBeInstanceOf(ErroLista)
      expect(erro.sessaoExpirada).toBe(true)
    }
  })

  it('outros erros viram ErroLista comum', async () => {
    const { cliente } = clienteFalso({ data: null, error: { code: '23503', message: 'fk' }, status: 409 })
    const erro = await criarListaSupabase(cliente, 'u1').listar('favoritos').catch((e) => e)
    expect(erro).toBeInstanceOf(ErroLista)
    expect(erro.sessaoExpirada).toBe(false)
  })
})
```

`lib/lista/acao-pendente.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { CHAVE_ACAO_PENDENTE, guardarAcaoPendente, lerAcaoPendente, limparAcaoPendente, VALIDADE_ACAO_MS } from './acao-pendente'

function armazenamentoFalso(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial))
  return {
    dados,
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => {
      dados.set(k, v)
    },
    removeItem: (k: string) => {
      dados.delete(k)
    },
  }
}

const filme = { id: 603, title: 'Matrix', posterUrl: null, year: '1999', rating: 8.2 }

describe('ação pendente', () => {
  it('guarda e lê de volta', () => {
    const a = armazenamentoFalso()
    guardarAcaoPendente(a, { tipo: 'favoritos', filme, voltar: '/filme/603' }, 1000)
    expect(lerAcaoPendente(a, 2000)).toEqual({ tipo: 'favoritos', filme, voltar: '/filme/603', criadaEm: 1000 })
  })

  it('limpar apaga a ação', () => {
    const a = armazenamentoFalso()
    guardarAcaoPendente(a, { tipo: 'salvos', filme, voltar: '/' }, 1000)
    limparAcaoPendente(a)
    expect(lerAcaoPendente(a, 1000)).toBeNull()
  })

  it('expira depois de 30 minutos e é apagada', () => {
    const a = armazenamentoFalso()
    guardarAcaoPendente(a, { tipo: 'salvos', filme, voltar: '/' }, 0)
    expect(VALIDADE_ACAO_MS).toBe(30 * 60 * 1000)
    expect(lerAcaoPendente(a, VALIDADE_ACAO_MS + 1)).toBeNull()
    expect(a.dados.has(CHAVE_ACAO_PENDENTE)).toBe(false)
  })

  it('ignora e apaga dados corrompidos ou com formato errado', () => {
    for (const bruto of [
      'isso não é json',
      'null',
      JSON.stringify({ tipo: 'series', filme, voltar: '/', criadaEm: 0 }),
      JSON.stringify({ tipo: 'favoritos', filme: { id: '603' }, voltar: '/', criadaEm: 0 }),
      JSON.stringify({ tipo: 'favoritos', filme, voltar: '/', criadaEm: 'ontem' }),
    ]) {
      const a = armazenamentoFalso({ [CHAVE_ACAO_PENDENTE]: bruto })
      expect(lerAcaoPendente(a, 0)).toBeNull()
      expect(a.dados.has(CHAVE_ACAO_PENDENTE)).toBe(false)
    }
  })

  it('limpa o endereço de retorno ao guardar e ao ler', () => {
    const a = armazenamentoFalso()
    guardarAcaoPendente(a, { tipo: 'favoritos', filme, voltar: '//site.com' }, 0)
    expect(lerAcaoPendente(a, 0)?.voltar).toBe('/')
    const b = armazenamentoFalso({
      [CHAVE_ACAO_PENDENTE]: JSON.stringify({ tipo: 'favoritos', filme, voltar: 'https://site.com', criadaEm: 0 }),
    })
    expect(lerAcaoPendente(b, 0)?.voltar).toBe('/')
  })

  it('não quebra sem armazenamento ou quando gravar falha', () => {
    expect(() => guardarAcaoPendente(null, { tipo: 'favoritos', filme, voltar: '/' })).not.toThrow()
    expect(lerAcaoPendente(null)).toBeNull()
    const quebrado = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
      removeItem: () => undefined,
    }
    expect(() => guardarAcaoPendente(quebrado, { tipo: 'favoritos', filme, voltar: '/' })).not.toThrow()
  })
})
```

`lib/lista/importacao.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { importarListasDoNavegador } from './importacao'
import { CHAVE_LISTAS, criarListaLocal } from './local'
import type { FilmeSalvo, ListaStore } from './tipos'

const filme = (id: number): FilmeSalvo => ({ id, title: `Filme ${id}`, posterUrl: null, year: '2024', rating: 7 })

function navegador(conteudo: string | null) {
  const dados = new Map<string, string>()
  if (conteudo !== null) dados.set(CHAVE_LISTAS, conteudo)
  return {
    dados,
    getItem: (k: string) => dados.get(k) ?? null,
    removeItem: (k: string) => {
      dados.delete(k)
    },
  }
}

describe('importarListasDoNavegador', () => {
  it('leva os filmes para a conta, mantendo a ordem, e apaga do navegador', async () => {
    const origem = navegador(JSON.stringify({ favoritos: [filme(2), filme(1)], salvos: [filme(3)] }))
    const conta = criarListaLocal(null)
    expect(await importarListasDoNavegador(origem, conta)).toBe(3)
    expect((await conta.listar('favoritos')).map((f) => f.id)).toEqual([2, 1])
    expect((await conta.listar('salvos')).map((f) => f.id)).toEqual([3])
    expect(origem.dados.has(CHAVE_LISTAS)).toBe(false)
  })

  it('não duplica o que já está na conta', async () => {
    const origem = navegador(JSON.stringify({ favoritos: [filme(1), filme(2)], salvos: [] }))
    const conta = criarListaLocal(null)
    await conta.adicionar('favoritos', filme(1))
    expect(await importarListasDoNavegador(origem, conta)).toBe(1)
    expect((await conta.listar('favoritos')).map((f) => f.id).sort()).toEqual([1, 2])
  })

  it('nada para importar: devolve 0 e apaga dados corrompidos', async () => {
    const corrompido = navegador('isso não é json')
    expect(await importarListasDoNavegador(corrompido, criarListaLocal(null))).toBe(0)
    expect(corrompido.dados.has(CHAVE_LISTAS)).toBe(false)
    expect(await importarListasDoNavegador(navegador(null), criarListaLocal(null))).toBe(0)
    expect(await importarListasDoNavegador(null, criarListaLocal(null))).toBe(0)
  })

  it('se a conta falhar, mantém os dados no navegador para tentar de novo', async () => {
    const origem = navegador(JSON.stringify({ favoritos: [filme(1)], salvos: [] }))
    const quebrada: ListaStore = {
      listar: async () => [],
      contem: async () => false,
      adicionar: async () => {
        throw new Error('fora do ar')
      },
      remover: async () => undefined,
    }
    await expect(importarListasDoNavegador(origem, quebrada)).rejects.toThrow('fora do ar')
    expect(origem.dados.has(CHAVE_LISTAS)).toBe(true)
  })
})
```

- [ ] **Step 3: Rodar para ver falhar**

Run: `npx vitest run lib/lista`
Expected: FAIL — `Failed to resolve import "./supabase"` / `"./acao-pendente"` / `"./importacao"`.

- [ ] **Step 4: Implementar**

`lib/lista/supabase.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FilmeSalvo, ListaStore, TipoLista } from './tipos'

type LinhaFilme = {
  filme_id: number
  titulo: string
  poster_url: string | null
  ano: string | null
  nota: number | string | null
}

type ErroBanco = { code?: string; message?: string }

export class ErroLista extends Error {
  readonly sessaoExpirada: boolean

  constructor(mensagem: string, sessaoExpirada: boolean) {
    super(mensagem)
    this.name = 'ErroLista'
    this.sessaoExpirada = sessaoExpirada
  }
}

// 42501 = recusado pela RLS; PGRST301/PGRST303 = token inválido ou expirado.
const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])

function falha(erro: ErroBanco, status?: number): ErroLista {
  const sessao = CODIGOS_DE_SESSAO.has(erro.code ?? '') || status === 401
  return new ErroLista(erro.message ?? 'Falha ao acessar a lista', sessao)
}

function paraFilme(linha: LinhaFilme): FilmeSalvo {
  return {
    id: linha.filme_id,
    title: linha.titulo,
    posterUrl: linha.poster_url,
    year: linha.ano,
    rating: linha.nota === null ? null : Number(linha.nota),
  }
}

export function criarListaSupabase(cliente: Pick<SupabaseClient, 'from'>, usuarioId: string): ListaStore {
  const tabela = () => cliente.from('filmes_lista')

  return {
    async listar(tipo: TipoLista) {
      const { data, error, status } = await tabela()
        .select('filme_id, titulo, poster_url, ano, nota')
        .eq('usuario_id', usuarioId)
        .eq('tipo', tipo)
        .order('criado_em', { ascending: false })
      if (error) throw falha(error, status)
      return ((data ?? []) as LinhaFilme[]).map(paraFilme)
    },
    async contem(tipo: TipoLista, id: number) {
      const { data, error, status } = await tabela()
        .select('filme_id')
        .eq('usuario_id', usuarioId)
        .eq('tipo', tipo)
        .eq('filme_id', id)
        .limit(1)
      if (error) throw falha(error, status)
      return (data ?? []).length > 0
    },
    async adicionar(tipo: TipoLista, filme: FilmeSalvo) {
      const { error, status } = await tabela().upsert(
        {
          usuario_id: usuarioId,
          tipo,
          filme_id: filme.id,
          titulo: filme.title,
          poster_url: filme.posterUrl,
          ano: filme.year,
          nota: filme.rating,
        },
        { onConflict: 'usuario_id,tipo,filme_id', ignoreDuplicates: true },
      )
      if (error) throw falha(error, status)
    },
    async remover(tipo: TipoLista, id: number) {
      const { error, status } = await tabela().delete().eq('usuario_id', usuarioId).eq('tipo', tipo).eq('filme_id', id)
      if (error) throw falha(error, status)
    },
  }
}
```

`lib/lista/acao-pendente.ts`:
```ts
import { caminhoDeRetorno } from '@/lib/auth/validacao'
import { ehFilmeSalvo } from './local'
import { TIPOS_LISTA, type FilmeSalvo, type TipoLista } from './tipos'

export const CHAVE_ACAO_PENDENTE = 'cineteca:acao-pendente'
export const VALIDADE_ACAO_MS = 30 * 60 * 1000

export type AcaoPendente = { tipo: TipoLista; filme: FilmeSalvo; voltar: string; criadaEm: number }
export type ArmazenamentoDaSessao = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function obterArmazenamentoDaSessao(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function guardarAcaoPendente(
  armazenamento: ArmazenamentoDaSessao | null,
  acao: Omit<AcaoPendente, 'criadaEm'>,
  agora: number = Date.now(),
): void {
  if (!armazenamento) return
  const registro: AcaoPendente = { ...acao, voltar: caminhoDeRetorno(acao.voltar), criadaEm: agora }
  try {
    armazenamento.setItem(CHAVE_ACAO_PENDENTE, JSON.stringify(registro))
  } catch {
    // Sem espaço ou bloqueado: a pessoa só precisará clicar de novo depois do login.
  }
}

export function limparAcaoPendente(armazenamento: ArmazenamentoDaSessao | null): void {
  try {
    armazenamento?.removeItem(CHAVE_ACAO_PENDENTE)
  } catch {
    // ignorado
  }
}

export function lerAcaoPendente(armazenamento: ArmazenamentoDaSessao | null, agora: number = Date.now()): AcaoPendente | null {
  if (!armazenamento) return null
  let bruto: string | null = null
  try {
    bruto = armazenamento.getItem(CHAVE_ACAO_PENDENTE)
  } catch {
    return null
  }
  if (!bruto) return null
  try {
    const dados = JSON.parse(bruto) as Record<string, unknown> | null
    const valida =
      dados !== null &&
      typeof dados === 'object' &&
      TIPOS_LISTA.includes(dados.tipo as TipoLista) &&
      ehFilmeSalvo(dados.filme) &&
      typeof dados.voltar === 'string' &&
      typeof dados.criadaEm === 'number' &&
      agora - dados.criadaEm <= VALIDADE_ACAO_MS
    if (valida) {
      return {
        tipo: dados.tipo as TipoLista,
        filme: dados.filme as FilmeSalvo,
        voltar: caminhoDeRetorno(dados.voltar),
        criadaEm: dados.criadaEm as number,
      }
    }
  } catch {
    // corrompido: cai na limpeza abaixo
  }
  limparAcaoPendente(armazenamento)
  return null
}
```

`lib/lista/importacao.ts`:
```ts
import { CHAVE_LISTAS, lerListas } from './local'
import { TIPOS_LISTA, type ListaStore } from './tipos'

// Leva para a conta as listas que a Fase 1 guardava no navegador. Devolve quantos filmes foram trazidos.
export async function importarListasDoNavegador(
  armazenamento: Pick<Storage, 'getItem' | 'removeItem'> | null,
  destino: ListaStore,
): Promise<number> {
  if (!armazenamento) return 0
  let existe = false
  try {
    existe = armazenamento.getItem(CHAVE_LISTAS) !== null
  } catch {
    return 0
  }
  if (!existe) return 0

  const antigas = lerListas(armazenamento)
  let trazidos = 0
  for (const tipo of TIPOS_LISTA) {
    const naConta = new Set((await destino.listar(tipo)).map((f) => f.id))
    // Do mais antigo para o mais novo, para o mais novo continuar no topo.
    for (const filme of [...antigas[tipo]].reverse()) {
      if (naConta.has(filme.id)) continue
      await destino.adicionar(tipo, filme)
      naConta.add(filme.id)
      trazidos++
    }
  }
  try {
    armazenamento.removeItem(CHAVE_LISTAS)
  } catch {
    // ignorado: na próxima vez os filmes já estarão na conta e nada será duplicado
  }
  return trazidos
}
```

- [ ] **Step 5: Rodar para ver passar**

Run: `npx vitest run lib/lista`
Expected: PASS (testes antigos + novos).

- [ ] **Step 6: Tudo verde e commit**

Run: `npx vitest run` e `npm run typecheck` — sem erros.
```powershell
git add lib/lista
git commit -m "feat: listas no Supabase, ação pendente e importação das listas antigas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Sessão, entrar, criar conta, Google e sair

**Files:**
- Create: `lib/auth/usuario.ts`, `lib/auth/sessao.ts`, `lib/auth/acoes.ts`, `app/auth/callback/route.ts`
- Create: `components/SessaoProvider.tsx`, `components/MenuUsuario.tsx`, `components/conta/Cartao.tsx`, `components/conta/Campo.tsx`, `components/conta/Divisoria.tsx`, `components/conta/BotaoGoogle.tsx`, `components/conta/FormularioEntrar.tsx`, `components/conta/FormularioCadastro.tsx`
- Create: `app/(conta)/layout.tsx`, `app/(conta)/entrar/page.tsx`, `app/(conta)/cadastro/page.tsx`
- Modify: `app/layout.tsx`, `components/Navbar.tsx`, `e2e/iniciar-servidor.mjs`, `playwright.config.ts`
- Create: `e2e/conta/ajudantes.ts`, `e2e/conta/fixtures.ts`
- Test: `lib/auth/usuario.test.ts`, `e2e/acesso.spec.ts`

**Interfaces:**
- Consumes:
  - `criarClienteServidor`, `obterClienteNavegador`, `lerUrlSite` (Task 1)
  - validações, `caminhoDeRetorno`, `MENSAGENS`, `mensagemDoErroAuth` (Task 3)
- Produces:
  - `type Usuario = { id: string; email: string; nome: string; fotoUrl: string | null; soGoogle: boolean }`
  - `montarUsuario(u, nomePerfil: string | null): Usuario`, `primeiroNome(nome: string): string`
  - `obterUsuario(): Promise<Usuario | null>` (server-only)
  - `type EstadoFormulario = { erro: string | null; sucesso?: string | null; email?: string; nome?: string }`
  - Server Actions:
    - `entrar(estado, formData)`, `cadastrar(estado, formData)` (campos `nome`, `email`, `senha`, `voltar`)
    - `entrarComGoogle(formData)`, `sair()`
  - `<SessaoProvider usuario>` e `useUsuario(): Usuario | null`
  - `<Cartao titulo>`, `<Campo rotulo nome tipo? autoComplete? valorInicial? dica?>`, `<Divisoria />`, `<BotaoGoogle voltar />`
  - `Navbar` recebe `usuario: Usuario | null`
  - e2e:
    - `criarUsuarioTeste(nome?)`, `apagarUsuarioTeste(u)`, `apagarPorEmail(email)`, `novoEmail()`
    - `entrarPelaTela(page, u, voltar?)`, `sairPeloMenu(page)`, `clienteAdmin()`, `inserirFilmes(u, tipo, ids)`
    - fixtures `usuario` e `logado`; `type UsuarioTeste = { id: string; email: string; senha: string; nome: string }`

- [ ] **Step 1: Escrever o teste de `montarUsuario` (falhando)**

`lib/auth/usuario.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { montarUsuario, primeiroNome } from './usuario'

describe('montarUsuario', () => {
  it('prefere o nome do perfil', () => {
    const u = montarUsuario(
      { id: '1', email: 'ana@x.com', user_metadata: { nome: 'Outro' }, app_metadata: { providers: ['email'] } },
      'Ana Souza',
    )
    expect(u).toEqual({ id: '1', email: 'ana@x.com', nome: 'Ana Souza', fotoUrl: null, soGoogle: false })
  })

  it('usa o nome e a foto do Google quando não há perfil', () => {
    const u = montarUsuario(
      {
        id: '2',
        email: 'bia@gmail.com',
        user_metadata: { full_name: 'Bia Lima', avatar_url: 'https://lh3.googleusercontent.com/a/x' },
        app_metadata: { providers: ['google'] },
      },
      null,
    )
    expect(u.nome).toBe('Bia Lima')
    expect(u.fotoUrl).toBe('https://lh3.googleusercontent.com/a/x')
    expect(u.soGoogle).toBe(true)
  })

  it('conta com e-mail e Google não é "só Google"', () => {
    expect(montarUsuario({ id: '3', email: 'c@x.com', app_metadata: { providers: ['email', 'google'] } }, 'C').soGoogle).toBe(false)
  })

  it('sem nome em lugar nenhum, usa o começo do e-mail', () => {
    expect(montarUsuario({ id: '4', email: 'davi.r@x.com' }, '  ').nome).toBe('davi.r')
  })

  it('ignora foto que não é https', () => {
    expect(montarUsuario({ id: '5', email: 'e@x.com', user_metadata: { picture: 'http://x/y.png' } }, 'E').fotoUrl).toBeNull()
  })
})

describe('primeiroNome', () => {
  it('pega a primeira palavra', () => {
    expect(primeiroNome('  Ana   Souza ')).toBe('Ana')
    expect(primeiroNome('Ana')).toBe('Ana')
  })
})
```

Run: `npx vitest run lib/auth/usuario.test.ts`
Expected: FAIL — `Failed to resolve import "./usuario"`.

- [ ] **Step 2: Implementar usuário, sessão, ações e rota de retorno**

`lib/auth/usuario.ts`:
```ts
export type Usuario = { id: string; email: string; nome: string; fotoUrl: string | null; soGoogle: boolean }

type UsuarioSupabase = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
  app_metadata?: Record<string, unknown> | null
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

export function montarUsuario(u: UsuarioSupabase, nomePerfil: string | null): Usuario {
  const meta = u.user_metadata ?? {}
  const email = u.email ?? ''
  const nome =
    texto(nomePerfil) || texto(meta.nome) || texto(meta.full_name) || texto(meta.name) || email.split('@')[0] || 'Você'
  const foto = texto(meta.avatar_url) || texto(meta.picture)
  const brutos = u.app_metadata?.providers
  const provedores = Array.isArray(brutos) ? brutos.filter((p): p is string => typeof p === 'string') : []
  return {
    id: u.id,
    email,
    nome,
    fotoUrl: foto.startsWith('https://') ? foto : null,
    soGoogle: provedores.length > 0 && !provedores.includes('email'),
  }
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome
}
```

`lib/auth/sessao.ts`:
```ts
import 'server-only'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { montarUsuario, type Usuario } from './usuario'

export async function obterUsuario(): Promise<Usuario | null> {
  let supabase
  try {
    supabase = await criarClienteServidor()
  } catch {
    return null
  }
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  const { data: perfil } = await supabase.from('perfis').select('nome').eq('id', data.user.id).maybeSingle()
  return montarUsuario(data.user, (perfil?.nome as string | undefined) ?? null)
}
```

`lib/auth/acoes.ts`:
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { lerUrlSite } from '@/lib/supabase/config'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { MENSAGENS, mensagemDoErroAuth } from './erros'
import { caminhoDeRetorno, validarEmail, validarNome, validarSenha } from './validacao'

export type EstadoFormulario = { erro: string | null; sucesso?: string | null; email?: string; nome?: string }

type ErroAuth = { code?: string; status?: number; name?: string }

function campo(formData: FormData, nome: string): string {
  const valor = formData.get(nome)
  return typeof valor === 'string' ? valor : ''
}

function registrar(acao: string, erro: ErroAuth) {
  console.error(`[CineTeca] ${acao} falhou:`, erro.code ?? erro.name ?? `status ${erro.status ?? '?'}`)
}

// Mensagem para a tela; registra no log só o que não é erro "esperado" da pessoa.
function falhaAuth(acao: string, erro: ErroAuth): string {
  const mensagem = mensagemDoErroAuth(erro)
  if (mensagem === MENSAGENS.generico || mensagem === MENSAGENS.conexao) registrar(acao, erro)
  return mensagem
}

export async function entrar(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const emailDigitado = campo(formData, 'email')
  const email = validarEmail(emailDigitado)
  const senha = campo(formData, 'senha')
  const voltar = caminhoDeRetorno(campo(formData, 'voltar'))
  if (!email.ok) return { erro: email.erro, email: emailDigitado }
  if (!senha) return { erro: MENSAGENS.senhaVazia, email: email.valor }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email: email.valor, password: senha })
  if (error) return { erro: falhaAuth('entrar', error), email: email.valor }

  revalidatePath('/', 'layout')
  redirect(voltar)
}

export async function cadastrar(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = { nome: campo(formData, 'nome'), email: campo(formData, 'email') }
  const nome = validarNome(valores.nome)
  const email = validarEmail(valores.email)
  const senha = validarSenha(campo(formData, 'senha'))
  const voltar = caminhoDeRetorno(campo(formData, 'voltar'))
  if (!nome.ok) return { erro: nome.erro, ...valores }
  if (!email.ok) return { erro: email.erro, ...valores }
  if (!senha.ok) return { erro: senha.erro, ...valores }

  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.auth.signUp({
    email: email.valor,
    password: senha.valor,
    options: { data: { nome: nome.valor } },
  })
  if (error) return { erro: falhaAuth('cadastrar', error), ...valores }
  if (!data.session) {
    console.error('[CineTeca] cadastro sem sessão: confira se "Confirm email" está desligado no Supabase')
    return { erro: MENSAGENS.generico, ...valores }
  }

  revalidatePath('/', 'layout')
  redirect(voltar)
}

export async function entrarComGoogle(formData: FormData): Promise<void> {
  const voltar = caminhoDeRetorno(campo(formData, 'voltar'))
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${lerUrlSite()}/auth/callback?voltar=${encodeURIComponent(voltar)}` },
  })
  if (error || !data.url) {
    if (error) registrar('entrarComGoogle', error)
    redirect(`/entrar?erro=google&voltar=${encodeURIComponent(voltar)}`)
  }
  redirect(data.url)
}

export async function sair(): Promise<void> {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
```

`app/auth/callback/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { caminhoDeRetorno } from '@/lib/auth/validacao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

// Retorno do "Continuar com Google": troca o código por uma sessão.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const codigo = url.searchParams.get('code')
  const voltar = caminhoDeRetorno(url.searchParams.get('voltar'))

  if (codigo) {
    const supabase = await criarClienteServidor()
    const { error } = await supabase.auth.exchangeCodeForSession(codigo)
    if (!error) return NextResponse.redirect(new URL(voltar, url.origin))
    console.error('[CineTeca] retorno do Google falhou:', error.code ?? error.name)
  }
  return NextResponse.redirect(new URL(`/entrar?erro=google&voltar=${encodeURIComponent(voltar)}`, url.origin))
}
```

Run: `npx vitest run lib/auth`
Expected: PASS.

- [ ] **Step 3: Preparar a infraestrutura de testes ponta a ponta com o Supabase de testes**

Em `e2e/iniciar-servidor.mjs`, logo depois dos imports, acrescente:
```js
import { existsSync } from 'node:fs'

if (!existsSync('.env.test.local')) {
  console.error('[e2e] Falta o arquivo .env.test.local com as chaves do projeto Supabase "cineteca-testes".')
  process.exit(1)
}
// Variáveis já presentes no processo têm prioridade sobre o .env.local (produção) que o Next carrega.
process.loadEnvFile('.env.test.local')
```

Em `playwright.config.ts`, logo depois do import, acrescente:
```ts
import { existsSync } from 'node:fs'

// Os ajudantes dos testes usam a chave secreta do projeto de testes para criar e apagar contas.
if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local')
```

`e2e/conta/ajudantes.ts`:
```ts
import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

export type UsuarioTeste = { id: string; email: string; senha: string; nome: string }

// Domínio reservado para testes. Se o Supabase recusar, troque por example.com.
const DOMINIO = 'cineteca.test'

export function clienteAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SECRET_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function novoEmail(): string {
  return `teste+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@${DOMINIO}`
}

export async function criarUsuarioTeste(nome = 'Teste E2E'): Promise<UsuarioTeste> {
  const email = novoEmail()
  const senha = 'senha-de-teste-123'
  const { data, error } = await clienteAdmin().auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })
  if (error) throw error
  return { id: data.user.id, email, senha, nome }
}

export async function apagarUsuarioTeste(u: Pick<UsuarioTeste, 'id'>): Promise<void> {
  // Tolerante: o próprio teste pode já ter excluído a conta.
  await clienteAdmin().auth.admin.deleteUser(u.id)
}

export async function apagarPorEmail(email: string): Promise<void> {
  const { data } = await clienteAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 })
  const usuario = data.users.find((u) => u.email === email)
  if (usuario) await apagarUsuarioTeste(usuario)
}

export async function entrarPelaTela(page: Page, u: Pick<UsuarioTeste, 'email' | 'senha'>, voltar = '/'): Promise<void> {
  await page.goto(`/entrar?voltar=${encodeURIComponent(voltar)}`)
  await page.getByLabel('E-mail').fill(u.email)
  await page.getByLabel('Senha', { exact: true }).fill(u.senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  const destino = new URL(voltar, 'http://x').pathname
  await page.waitForURL((url) => url.pathname === destino)
}

export async function sairPeloMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('button', { name: 'Menu da conta' })).toBeHidden()
}

export async function inserirFilmes(u: Pick<UsuarioTeste, 'id'>, tipo: 'favoritos' | 'salvos', ids: number[]): Promise<void> {
  const agora = Date.now()
  const linhas = ids.map((id, i) => ({
    usuario_id: u.id,
    tipo,
    filme_id: id,
    titulo: `Filme Teste ${id}`,
    poster_url: null,
    ano: '2024',
    nota: 7.8,
    criado_em: new Date(agora - i * 1000).toISOString(),
  }))
  const { error } = await clienteAdmin().from('filmes_lista').insert(linhas)
  if (error) throw error
}
```

`e2e/conta/fixtures.ts`:
```ts
import { test as base, expect } from '@playwright/test'
import { apagarUsuarioTeste, criarUsuarioTeste, entrarPelaTela, type UsuarioTeste } from './ajudantes'

// usuario: conta criada antes do teste e apagada depois. logado: a mesma conta, já logada na página.
export const test = base.extend<{ usuario: UsuarioTeste; logado: UsuarioTeste }>({
  usuario: async ({}, usar) => {
    const usuario = await criarUsuarioTeste()
    await usar(usuario)
    await apagarUsuarioTeste(usuario)
  },
  logado: async ({ page, usuario }, usar) => {
    await entrarPelaTela(page, usuario)
    await usar(usuario)
  },
})

export { expect }
```

- [ ] **Step 4: Escrever o teste ponta a ponta (falhando)**

`e2e/acesso.spec.ts`:
```ts
import { apagarPorEmail, entrarPelaTela, novoEmail, sairPeloMenu } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

test('sem login, a barra mostra Entrar', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Entrar', exact: true })).toBeVisible()
})

test('criar conta leva de volta para onde a pessoa estava, já logada', async ({ page }) => {
  const email = novoEmail()
  try {
    await page.goto('/cadastro?voltar=%2Fgenero%2F35')
    await expect(page.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeVisible()
    await page.getByLabel('Nome').fill('Ana Souza')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill('senha-forte-123')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page).toHaveURL(/\/genero\/35$/)
    await page.getByRole('button', { name: 'Menu da conta' }).click()
    await expect(page.getByText('Olá, Ana')).toBeVisible()
  } finally {
    await apagarPorEmail(email)
  }
})

test('validações do cadastro aparecem com mensagens claras', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Digite seu nome')).toBeVisible()
  await page.getByLabel('Nome').fill('Ana')
  await page.getByLabel('E-mail').fill('ana@email.com')
  await page.getByLabel('Senha').fill('curta')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('A senha precisa ter pelo menos 8 caracteres')).toBeVisible()
  await expect(page.getByLabel('Nome')).toHaveValue('Ana')
})

test('e-mail já cadastrado', async ({ page, usuario }) => {
  await page.goto('/cadastro')
  await page.getByLabel('Nome').fill('Outra Pessoa')
  await page.getByLabel('E-mail').fill(usuario.email)
  await page.getByLabel('Senha').fill('outra-senha-123')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Já existe uma conta com esse e-mail')).toBeVisible()
})

test('senha errada mostra mensagem clara e mantém o e-mail', async ({ page, usuario }) => {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(usuario.email)
  await page.getByLabel('Senha').fill('senha-errada-999')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('E-mail ou senha incorretos')).toBeVisible()
  await expect(page.getByLabel('E-mail')).toHaveValue(usuario.email)
})

test('e-mail com maiúsculas e espaços entra na mesma conta', async ({ page, usuario }) => {
  await entrarPelaTela(page, { email: `  ${usuario.email.toUpperCase()} `, senha: usuario.senha })
  await expect(page.getByRole('button', { name: 'Menu da conta' })).toBeVisible()
})

test('sair mostra o Entrar de novo', async ({ page, logado, isMobile }) => {
  await sairPeloMenu(page)
  await expect(page).toHaveURL(/\/$/)
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Entrar', exact: true })).toBeVisible()
})

test('quem já está logado e abre /entrar volta para o início', async ({ page, logado }) => {
  await page.goto('/entrar')
  await expect(page).toHaveURL(/\/$/)
})

test('endereço de retorno para fora do site é ignorado', async ({ page, usuario }) => {
  await page.goto('/entrar?voltar=%2F%2Fsite-malicioso.com')
  await page.getByLabel('E-mail').fill(usuario.email)
  await page.getByLabel('Senha').fill(usuario.senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('http://localhost:3100/')
})

test('as páginas de acesso oferecem Continuar com Google', async ({ page }) => {
  for (const rota of ['/entrar', '/cadastro']) {
    await page.goto(rota)
    await expect(page.getByRole('button', { name: 'Continuar com Google' })).toBeVisible()
  }
})
```

Run: `npx playwright test e2e/acesso.spec.ts`
Expected: FAIL — o build quebra na checagem de tipos (componentes ainda inexistentes) ou `/entrar` mostra 404.

- [ ] **Step 5: Provedor de sessão, menu do usuário e barra superior**

`components/SessaoProvider.tsx`:
```tsx
'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import type { Usuario } from '@/lib/auth/usuario'
import { obterClienteNavegador } from '@/lib/supabase/navegador'

const ContextoSessao = createContext<Usuario | null>(null)

export function SessaoProvider({ usuario, children }: { usuario: Usuario | null; children: ReactNode }) {
  const router = useRouter()
  const idAtual = usuario?.id ?? null

  // Login ou logout em outra aba: atualiza esta página.
  useEffect(() => {
    let cliente
    try {
      cliente = obterClienteNavegador()
    } catch {
      return
    }
    const { data } = cliente.auth.onAuthStateChange((evento, sessao) => {
      const novoId = sessao?.user.id ?? null
      if ((evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') && novoId !== idAtual) router.refresh()
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [idAtual, router])

  return <ContextoSessao.Provider value={usuario}>{children}</ContextoSessao.Provider>
}

export function useUsuario(): Usuario | null {
  return useContext(ContextoSessao)
}
```

`components/MenuUsuario.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { sair } from '@/lib/auth/acoes'
import { primeiroNome, type Usuario } from '@/lib/auth/usuario'

const ITEM = 'block w-full rounded px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white'

export function MenuUsuario({ usuario }: { usuario: Usuario | null }) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const caixaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setAberto(false)
  }, [pathname])

  useEffect(() => {
    if (!aberto) return
    const aoClicarFora = (e: MouseEvent) => {
      if (!caixaRef.current?.contains(e.target as Node)) setAberto(false)
    }
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  if (!usuario) {
    // No celular, "Entrar" fica no menu recolhível.
    return (
      <Link
        href={`/entrar?voltar=${encodeURIComponent(pathname || '/')}`}
        className="hidden rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:inline-flex"
      >
        Entrar
      </Link>
    )
  }

  const nome = primeiroNome(usuario.nome)
  return (
    <div ref={caixaRef} className="relative">
      <button
        type="button"
        aria-label="Menu da conta"
        aria-expanded={aberto}
        aria-controls="menu-conta"
        onClick={() => setAberto((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/15 text-sm font-bold transition hover:ring-2 hover:ring-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {usuario.fotoUrl ? (
          <img src={usuario.fotoUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          nome.charAt(0).toUpperCase()
        )}
      </button>
      {aberto && (
        <div
          id="menu-conta"
          className="absolute right-0 top-full mt-3 w-56 rounded-md bg-superficie/95 p-2 shadow-xl ring-1 ring-white/10 backdrop-blur"
        >
          <p className="truncate px-3 py-2 text-sm font-semibold text-white">Olá, {nome}</p>
          <Link href="/minha-lista" className={ITEM}>
            Minha lista
          </Link>
          <Link href="/conta" className={ITEM}>
            Minha conta
          </Link>
          <form action={sair}>
            <button type="submit" className={ITEM}>
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
```

Em `components/Navbar.tsx`:
1. Acrescente os imports:
```tsx
import { sair } from '@/lib/auth/acoes'
import type { Usuario } from '@/lib/auth/usuario'
import { MenuUsuario } from './MenuUsuario'
```
2. Troque a assinatura `export function Navbar({ generos }: { generos: Genero[] }) {` por:
```tsx
export function Navbar({ generos, usuario }: { generos: Genero[]; usuario: Usuario | null }) {
```
3. Dentro de `<div className="ml-auto flex items-center gap-2">`, logo depois do bloco `</Suspense>` do `CampoBusca`, insira:
```tsx
            <MenuUsuario usuario={usuario} />
```
4. No menu do celular, depois do `<li>` de "Minha lista" (antes do `</ul>` que fecha a lista de links), insira:
```tsx
              {usuario ? (
                <>
                  <li>
                    <Link href="/conta" onClick={fecharMenu} className="block py-3">
                      Minha conta
                    </Link>
                  </li>
                  <li>
                    <form action={sair}>
                      <button type="submit" className="block w-full py-3 text-left">
                        Sair
                      </button>
                    </form>
                  </li>
                </>
              ) : (
                <li>
                  <Link href={`/entrar?voltar=${encodeURIComponent(pathname || '/')}`} onClick={fecharMenu} className="block py-3">
                    Entrar
                  </Link>
                </li>
              )}
```

Em `app/layout.tsx`:
1. Acrescente os imports:
```tsx
import { SessaoProvider } from '@/components/SessaoProvider'
import { obterUsuario } from '@/lib/auth/sessao'
```
2. Troque `const generos = await getGenres().catch((): Genero[] => [])` por:
```tsx
  const [generos, usuario] = await Promise.all([getGenres().catch((): Genero[] => []), obterUsuario()])
```
3. Troque o conteúdo do `<body>` por:
```tsx
        <SessaoProvider usuario={usuario}>
          <ListasProvider>
            <Navbar generos={generos} usuario={usuario} />
            <main className="min-h-screen">{children}</main>
            <Rodape />
          </ListasProvider>
        </SessaoProvider>
```

- [ ] **Step 6: Páginas Entrar e Criar conta**

`components/conta/Cartao.tsx`:
```tsx
import type { ReactNode } from 'react'

export function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby="titulo-cartao"
      className="rounded-xl bg-superficie/95 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur sm:p-8"
    >
      <h1 id="titulo-cartao" className="mb-6 text-2xl font-extrabold md:text-3xl">
        {titulo}
      </h1>
      {children}
    </section>
  )
}
```

`components/conta/Campo.tsx`:
```tsx
import { useId } from 'react'

type Props = {
  rotulo: string
  nome: string
  tipo?: 'text' | 'email' | 'password'
  autoComplete?: string
  valorInicial?: string
  dica?: string
}

export function Campo({ rotulo, nome, tipo = 'text', autoComplete, valorInicial, dica }: Props) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-white/80">
        {rotulo}
      </label>
      <input
        id={id}
        name={nome}
        type={tipo}
        autoComplete={autoComplete}
        defaultValue={valorInicial}
        className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2.5 text-white outline-none transition-colors focus:border-white"
      />
      {dica && <p className="text-xs text-white/50">{dica}</p>}
    </div>
  )
}
```

`components/conta/Divisoria.tsx`:
```tsx
export function Divisoria() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-white/40">
      <span className="h-px flex-1 bg-white/10" />
      ou
      <span className="h-px flex-1 bg-white/10" />
    </div>
  )
}
```

`components/conta/BotaoGoogle.tsx`:
```tsx
import { entrarComGoogle } from '@/lib/auth/acoes'

export function BotaoGoogle({ voltar }: { voltar: string }) {
  return (
    <form action={entrarComGoogle}>
      <input type="hidden" name="voltar" value={voltar} />
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-fundo md:text-base"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continuar com Google
      </button>
    </form>
  )
}
```

`components/conta/FormularioEntrar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { entrar } from '@/lib/auth/acoes'
import { BOTAO_PRIMARIO } from '../estilos'
import { Campo } from './Campo'

export function FormularioEntrar({ voltar, erroInicial }: { voltar: string; erroInicial: string | null }) {
  const [estado, acao, pendente] = useActionState(entrar, { erro: erroInicial })
  return (
    <form action={acao} noValidate className="space-y-4">
      <input type="hidden" name="voltar" value={voltar} />
      <Campo rotulo="E-mail" nome="email" tipo="email" autoComplete="email" valorInicial={estado.email} />
      <Campo rotulo="Senha" nome="senha" tipo="password" autoComplete="current-password" />
      <div className="text-right">
        <Link href="/recuperar-senha" className="text-sm text-white/60 hover:text-white hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      {estado.erro && <p className="rounded-md bg-destaque/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className={`${BOTAO_PRIMARIO} w-full`}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
```

`components/conta/FormularioCadastro.tsx`:
```tsx
'use client'

import { useActionState } from 'react'
import { cadastrar } from '@/lib/auth/acoes'
import { BOTAO_PRIMARIO } from '../estilos'
import { Campo } from './Campo'

export function FormularioCadastro({ voltar }: { voltar: string }) {
  const [estado, acao, pendente] = useActionState(cadastrar, { erro: null })
  return (
    <form action={acao} noValidate className="space-y-4">
      <input type="hidden" name="voltar" value={voltar} />
      <Campo rotulo="Nome" nome="nome" autoComplete="name" valorInicial={estado.nome} />
      <Campo rotulo="E-mail" nome="email" tipo="email" autoComplete="email" valorInicial={estado.email} />
      <Campo rotulo="Senha" nome="senha" tipo="password" autoComplete="new-password" dica="Mínimo de 8 caracteres" />
      {estado.erro && <p className="rounded-md bg-destaque/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className={`${BOTAO_PRIMARIO} w-full`}>
        {pendente ? 'Criando conta…' : 'Criar conta'}
      </button>
    </form>
  )
}
```

`app/(conta)/layout.tsx`:
```tsx
import type { ReactNode } from 'react'
import { getTrending } from '@/lib/tmdb/filmes'

export default async function LayoutConta({ children }: { children: ReactNode }) {
  const posteres = await getTrending()
    .then((p) => p.results.map((f) => f.posterUrl).filter((u): u is string => Boolean(u)).slice(0, 18))
    .catch((): string[] => [])

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 pb-16 pt-24">
      {posteres.length > 0 && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="grid grid-cols-3 gap-2 opacity-20 sm:grid-cols-6">
            {posteres.map((poster, i) => (
              <img key={i} src={poster} alt="" className="aspect-[2/3] w-full object-cover" />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-fundo/70 via-fundo/90 to-fundo" />
        </div>
      )}
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  )
}
```

`app/(conta)/entrar/page.tsx`:
```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BotaoGoogle } from '@/components/conta/BotaoGoogle'
import { Cartao } from '@/components/conta/Cartao'
import { Divisoria } from '@/components/conta/Divisoria'
import { FormularioEntrar } from '@/components/conta/FormularioEntrar'
import { MENSAGENS } from '@/lib/auth/erros'
import { obterUsuario } from '@/lib/auth/sessao'
import { caminhoDeRetorno } from '@/lib/auth/validacao'

export const metadata: Metadata = { title: 'Entrar' }

type Props = { searchParams: Promise<{ voltar?: string | string[]; erro?: string | string[] }> }

export default async function PaginaEntrar({ searchParams }: Props) {
  const { voltar: bruto, erro } = await searchParams
  if (await obterUsuario()) redirect('/')
  const voltar = caminhoDeRetorno(typeof bruto === 'string' ? bruto : null)

  return (
    <Cartao titulo="Entrar">
      <BotaoGoogle voltar={voltar} />
      <Divisoria />
      <FormularioEntrar voltar={voltar} erroInicial={erro === 'google' ? MENSAGENS.google : null} />
      <p className="mt-6 text-center text-sm text-white/60">
        Não tem conta?{' '}
        <Link href={`/cadastro?voltar=${encodeURIComponent(voltar)}`} className="font-semibold text-white hover:underline">
          Criar conta
        </Link>
      </p>
    </Cartao>
  )
}
```

`app/(conta)/cadastro/page.tsx`:
```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BotaoGoogle } from '@/components/conta/BotaoGoogle'
import { Cartao } from '@/components/conta/Cartao'
import { Divisoria } from '@/components/conta/Divisoria'
import { FormularioCadastro } from '@/components/conta/FormularioCadastro'
import { obterUsuario } from '@/lib/auth/sessao'
import { caminhoDeRetorno } from '@/lib/auth/validacao'

export const metadata: Metadata = { title: 'Criar conta' }

type Props = { searchParams: Promise<{ voltar?: string | string[] }> }

export default async function PaginaCadastro({ searchParams }: Props) {
  const { voltar: bruto } = await searchParams
  if (await obterUsuario()) redirect('/')
  const voltar = caminhoDeRetorno(typeof bruto === 'string' ? bruto : null)

  return (
    <Cartao titulo="Criar conta">
      <BotaoGoogle voltar={voltar} />
      <Divisoria />
      <FormularioCadastro voltar={voltar} />
      <p className="mt-6 text-center text-sm text-white/60">
        Já tem conta?{' '}
        <Link href={`/entrar?voltar=${encodeURIComponent(voltar)}`} className="font-semibold text-white hover:underline">
          Entrar
        </Link>
      </p>
    </Cartao>
  )
}
```

- [ ] **Step 7: Rodar para ver passar**

Run:
```powershell
npx vitest run
npm run typecheck
npx playwright test
```
Expected: todos PASS. As specs da Fase 1 continuam verdes, porque as listas ainda funcionam no navegador até a Task 8. O `acesso.spec.ts` passa no desktop e no celular.
- Se `createUser` falhar com `email_address_invalid`, troque `DOMINIO` em `e2e/conta/ajudantes.ts` para `example.com` e registre isso no relatório.
- Se aparecer "rate limit", confira o Step 3.4 da Task 2.

- [ ] **Step 8: Commit**

```powershell
git add lib/auth app/auth "app/(conta)" app/layout.tsx components e2e playwright.config.ts
git commit -m "feat: sessão, entrar, criar conta, Google e sair" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Recuperar e redefinir senha + avisos na tela (toasts)

**Files:**
- Create: `components/AvisosProvider.tsx`, `components/conta/FormularioRecuperar.tsx`, `components/conta/FormularioNovaSenha.tsx`
- Create: `app/auth/confirmar/route.ts`, `app/(conta)/recuperar-senha/page.tsx`, `app/(conta)/redefinir-senha/page.tsx`
- Modify: `lib/auth/acoes.ts` (acrescentar `recuperarSenha`, `redefinirSenha`), `app/layout.tsx` (envolver com `AvisosProvider`)
- Test: `e2e/senha.spec.ts`

**Interfaces:**
- Consumes: `EstadoFormulario`, `campo`, `falhaAuth`, `registrar` (em `acoes.ts`, Task 5); validações e `MENSAGENS` (Task 3); `Cartao`, `Campo` (Task 5); `clienteAdmin`, fixtures, `entrarPelaTela`, `sairPeloMenu` (Task 5).
- Produces:
  - `<AvisosProvider>` e `useAvisos(): { mostrar(texto: string): void }`. Os toasts ficam em `role="status"` e somem em 3000 ms.
  - `?aviso=senha-alterada` e `?aviso=conta-excluida` na URL mostram "Senha alterada" e "Sua conta foi excluída", e o parâmetro sai da URL.
  - `type EstadoRecuperacao = { erro: string | null; enviado: boolean }`
  - `recuperarSenha(estado: EstadoRecuperacao, formData)`, `redefinirSenha(estado: EstadoFormulario, formData)` (campos `senha`, `confirmacao`)
  - `<FormularioNovaSenha acao rotuloBotao />`, reutilizado na Task 7. Campos "Nova senha" e "Confirmar nova senha".
  - `GET /auth/confirmar?token_hash=&type=recovery&voltar=`

- [ ] **Step 1: Escrever o teste ponta a ponta (falhando)**

`e2e/senha.spec.ts`:
```ts
import { clienteAdmin, entrarPelaTela, novoEmail, sairPeloMenu, type UsuarioTeste } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'
import type { Page } from '@playwright/test'

async function abrirLinkDeRecuperacao(page: Page, usuario: UsuarioTeste) {
  const { data, error } = await clienteAdmin().auth.admin.generateLink({ type: 'recovery', email: usuario.email })
  if (error) throw error
  await page.goto(`/auth/confirmar?token_hash=${data.properties.hashed_token}&type=recovery&voltar=%2Fredefinir-senha`)
  await expect(page).toHaveURL(/\/redefinir-senha$/)
}

test('pedir o link mostra sempre a mesma mensagem', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
  await expect(page).toHaveURL(/\/recuperar-senha$/)
  await page.getByLabel('E-mail').fill(novoEmail())
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(page.getByText('Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.')).toBeVisible()
})

test('e-mail inválido ao pedir o link', async ({ page }) => {
  await page.goto('/recuperar-senha')
  await page.getByLabel('E-mail').fill('sem-arroba')
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(page.getByText('Digite um e-mail válido')).toBeVisible()
})

test('o link do e-mail permite criar uma nova senha', async ({ page, usuario }) => {
  await abrirLinkDeRecuperacao(page, usuario)
  await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-456')
  await page.getByLabel('Confirmar nova senha').fill('nova-senha-456')
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Senha alterada')).toBeVisible()
  await sairPeloMenu(page)
  await entrarPelaTela(page, { email: usuario.email, senha: 'nova-senha-456' })
})

test('senhas diferentes na nova senha', async ({ page, usuario }) => {
  await abrirLinkDeRecuperacao(page, usuario)
  await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-456')
  await page.getByLabel('Confirmar nova senha').fill('outra-senha-789')
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page.getByText('As senhas não são iguais')).toBeVisible()
})

test('link inválido leva para pedir outro', async ({ page }) => {
  await page.goto('/auth/confirmar?token_hash=invalido&type=recovery&voltar=%2Fredefinir-senha')
  await expect(page).toHaveURL(/\/recuperar-senha\?erro=expirado$/)
  await expect(page.getByText('Este link expirou. Peça um novo.')).toBeVisible()
})

test('abrir a página de nova senha sem link mostra o aviso', async ({ page }) => {
  await page.goto('/redefinir-senha')
  await expect(page.getByText('Este link expirou. Peça um novo.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pedir um novo link' })).toHaveAttribute('href', '/recuperar-senha')
})
```

Run: `npx playwright test e2e/senha.spec.ts`
Expected: FAIL — `/recuperar-senha` mostra 404.

- [ ] **Step 2: Avisos na tela**

`components/AvisosProvider.tsx`:
```tsx
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

const DURACAO_MS = 3000

// Avisos que chegam por redirecionamento do servidor (?aviso=...).
const AVISOS_DA_URL: Record<string, string> = {
  'senha-alterada': 'Senha alterada',
  'conta-excluida': 'Sua conta foi excluída',
}

type ValorAvisos = { mostrar(texto: string): void }
type Aviso = { id: number; texto: string }

const ContextoAvisos = createContext<ValorAvisos | null>(null)

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const proximoId = useRef(0)

  const mostrar = useCallback((texto: string) => {
    proximoId.current += 1
    const id = proximoId.current
    setAvisos((atuais) => [...atuais.slice(-2), { id, texto }])
    setTimeout(() => {
      setAvisos((atuais) => atuais.filter((a) => a.id !== id))
    }, DURACAO_MS)
  }, [])

  const valor = useMemo(() => ({ mostrar }), [mostrar])

  return (
    <ContextoAvisos.Provider value={valor}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
        {avisos.map((a) => (
          <p key={a.id} className="animar-surgir rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-xl">
            {a.texto}
          </p>
        ))}
      </div>
      <Suspense fallback={null}>
        <AvisoDaUrl mostrar={mostrar} />
      </Suspense>
    </ContextoAvisos.Provider>
  )
}

function AvisoDaUrl({ mostrar }: { mostrar(texto: string): void }) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const codigo = params.get('aviso')

  useEffect(() => {
    if (!codigo) return
    const texto = AVISOS_DA_URL[codigo]
    if (texto) mostrar(texto)
    const resto = new URLSearchParams(params.toString())
    resto.delete('aviso')
    const consulta = resto.toString()
    router.replace(consulta ? `${pathname}?${consulta}` : pathname, { scroll: false })
  }, [codigo, mostrar, params, pathname, router])

  return null
}

export function useAvisos(): ValorAvisos {
  const valor = useContext(ContextoAvisos)
  if (!valor) throw new Error('useAvisos precisa estar dentro de <AvisosProvider>')
  return valor
}
```

Em `app/layout.tsx`, acrescente `import { AvisosProvider } from '@/components/AvisosProvider'` e envolva o conteúdo de `<SessaoProvider>` com `<AvisosProvider>`:
```tsx
        <SessaoProvider usuario={usuario}>
          <AvisosProvider>
            <ListasProvider>
              <Navbar generos={generos} usuario={usuario} />
              <main className="min-h-screen">{children}</main>
              <Rodape />
            </ListasProvider>
          </AvisosProvider>
        </SessaoProvider>
```

- [ ] **Step 3: Ações, rota de confirmação e páginas**

Acrescente ao **fim** de `lib/auth/acoes.ts`, e inclua `validarConfirmacao` no import de `./validacao`:
```ts
export type EstadoRecuperacao = { erro: string | null; enviado: boolean }

export async function recuperarSenha(_estado: EstadoRecuperacao, formData: FormData): Promise<EstadoRecuperacao> {
  const email = validarEmail(campo(formData, 'email'))
  if (!email.ok) return { erro: email.erro, enviado: false }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.resetPasswordForEmail(email.valor, { redirectTo: `${lerUrlSite()}/redefinir-senha` })
  if (error) {
    const mensagem = mensagemDoErroAuth(error)
    if (mensagem === MENSAGENS.limite) return { erro: mensagem, enviado: false }
    // Outros erros não aparecem para não revelar quem tem conta.
    registrar('recuperarSenha', error)
  }
  return { erro: null, enviado: true }
}

export async function redefinirSenha(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const senha = validarSenha(campo(formData, 'senha'))
  if (!senha.ok) return { erro: senha.erro }
  const confirmacao = validarConfirmacao(senha.valor, campo(formData, 'confirmacao'))
  if (!confirmacao.ok) return { erro: confirmacao.erro }

  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return { erro: MENSAGENS.linkExpirado }
  const { error } = await supabase.auth.updateUser({ password: senha.valor })
  if (error) return { erro: falhaAuth('redefinirSenha', error) }

  revalidatePath('/', 'layout')
  redirect('/?aviso=senha-alterada')
}
```

`app/auth/confirmar/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { caminhoDeRetorno } from '@/lib/auth/validacao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

// Link do e-mail de "Esqueci minha senha": valida o token e cria a sessão.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const tipo = url.searchParams.get('type')
  const voltar = caminhoDeRetorno(url.searchParams.get('voltar'))

  if (tokenHash && tipo === 'recovery') {
    const supabase = await criarClienteServidor()
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(voltar, url.origin))
    console.error('[CineTeca] link de recuperação recusado:', error.code ?? error.name)
  }
  return NextResponse.redirect(new URL('/recuperar-senha?erro=expirado', url.origin))
}
```

`components/conta/FormularioRecuperar.tsx`:
```tsx
'use client'

import { useActionState } from 'react'
import { recuperarSenha } from '@/lib/auth/acoes'
import { BOTAO_PRIMARIO } from '../estilos'
import { Campo } from './Campo'

export function FormularioRecuperar({ erroInicial }: { erroInicial: string | null }) {
  const [estado, acao, pendente] = useActionState(recuperarSenha, { erro: erroInicial, enviado: false })

  if (estado.enviado) {
    return <p className="text-white/80">Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.</p>
  }

  return (
    <form action={acao} noValidate className="space-y-4">
      <p className="text-sm text-white/70">Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</p>
      <Campo rotulo="E-mail" nome="email" tipo="email" autoComplete="email" />
      {estado.erro && <p className="rounded-md bg-destaque/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className={`${BOTAO_PRIMARIO} w-full`}>
        {pendente ? 'Enviando…' : 'Enviar link'}
      </button>
    </form>
  )
}
```

`components/conta/FormularioNovaSenha.tsx`:
```tsx
'use client'

import { useActionState, useEffect } from 'react'
import type { EstadoFormulario } from '@/lib/auth/acoes'
import { useAvisos } from '../AvisosProvider'
import { BOTAO_PRIMARIO } from '../estilos'
import { Campo } from './Campo'

type Props = {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>
  rotuloBotao: string
}

export function FormularioNovaSenha({ acao: acaoServidor, rotuloBotao }: Props) {
  const [estado, acao, pendente] = useActionState(acaoServidor, { erro: null })
  const { mostrar } = useAvisos()

  useEffect(() => {
    if (estado.sucesso) mostrar(estado.sucesso)
  }, [estado, mostrar])

  return (
    <form action={acao} noValidate className="space-y-4">
      <Campo rotulo="Nova senha" nome="senha" tipo="password" autoComplete="new-password" dica="Mínimo de 8 caracteres" />
      <Campo rotulo="Confirmar nova senha" nome="confirmacao" tipo="password" autoComplete="new-password" />
      {estado.erro && <p className="rounded-md bg-destaque/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className={`${BOTAO_PRIMARIO} w-full`}>
        {pendente ? 'Salvando…' : rotuloBotao}
      </button>
    </form>
  )
}
```

`app/(conta)/recuperar-senha/page.tsx`:
```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Cartao } from '@/components/conta/Cartao'
import { FormularioRecuperar } from '@/components/conta/FormularioRecuperar'
import { MENSAGENS } from '@/lib/auth/erros'

export const metadata: Metadata = { title: 'Esqueci minha senha' }

type Props = { searchParams: Promise<{ erro?: string | string[] }> }

export default async function PaginaRecuperarSenha({ searchParams }: Props) {
  const { erro } = await searchParams
  return (
    <Cartao titulo="Esqueci minha senha">
      <FormularioRecuperar erroInicial={erro === 'expirado' ? MENSAGENS.linkExpirado : null} />
      <p className="mt-6 text-center text-sm text-white/60">
        Lembrou?{' '}
        <Link href="/entrar" className="font-semibold text-white hover:underline">
          Entrar
        </Link>
      </p>
    </Cartao>
  )
}
```

`app/(conta)/redefinir-senha/page.tsx`:
```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Cartao } from '@/components/conta/Cartao'
import { FormularioNovaSenha } from '@/components/conta/FormularioNovaSenha'
import { BOTAO_PRIMARIO } from '@/components/estilos'
import { redefinirSenha } from '@/lib/auth/acoes'
import { MENSAGENS } from '@/lib/auth/erros'
import { obterUsuario } from '@/lib/auth/sessao'

export const metadata: Metadata = { title: 'Nova senha' }

export default async function PaginaRedefinirSenha() {
  const usuario = await obterUsuario()
  return (
    <Cartao titulo="Nova senha">
      {usuario ? (
        <FormularioNovaSenha acao={redefinirSenha} rotuloBotao="Salvar nova senha" />
      ) : (
        <div className="space-y-4">
          <p className="text-white/80">{MENSAGENS.linkExpirado}</p>
          <Link href="/recuperar-senha" className={BOTAO_PRIMARIO}>
            Pedir um novo link
          </Link>
        </div>
      )}
    </Cartao>
  )
}
```

- [ ] **Step 4: Rodar para ver passar**

Run:
```powershell
npm run typecheck
npx playwright test e2e/senha.spec.ts e2e/acesso.spec.ts
```
Expected: PASS em desktop e celular.

- [ ] **Step 5: Commit**

```powershell
git add lib/auth/acoes.ts app/auth "app/(conta)" app/layout.tsx components e2e/senha.spec.ts
git commit -m "feat: recuperar e redefinir senha, e avisos na tela" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Página Minha conta (nome, senha, sair, excluir)

**Files:**
- Create: `app/(conta)/conta/page.tsx`, `components/conta/FormularioNome.tsx`, `components/conta/ExcluirConta.tsx`
- Modify: `lib/auth/acoes.ts` (acrescentar `atualizarNome`, `trocarSenha`, `excluirConta`)
- Test: `e2e/conta.spec.ts`

**Interfaces:**
- Consumes:
  - `obterUsuario` (Task 5); `criarClienteAdmin` (Task 1)
  - `FormularioNovaSenha`, `useAvisos` (Task 6)
  - `Cartao`, `Campo`, `sair`, helpers e fixtures (Task 5)
- Produces:
  - `atualizarNome(estado, formData)` (campo `nome`; sucesso "Nome atualizado")
  - `trocarSenha(estado, formData)` (campos `senha`, `confirmacao`; sucesso "Senha alterada")
  - `excluirConta(estado, formData)` (campo `confirmacao` = `EXCLUIR`; redireciona para `/?aviso=conta-excluida`)

- [ ] **Step 1: Escrever o teste ponta a ponta (falhando)**

`e2e/conta.spec.ts`:
```ts
import { entrarPelaTela, sairPeloMenu } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

test('/conta sem login leva para entrar', async ({ page }) => {
  await page.goto('/conta')
  await expect(page).toHaveURL(/\/entrar\?voltar=%2Fconta$/)
})

test('mostra os dados da conta', async ({ page, logado }) => {
  await page.goto('/conta')
  await expect(page.getByRole('heading', { level: 1, name: 'Minha conta' })).toBeVisible()
  await expect(page.getByLabel('Nome')).toHaveValue(logado.nome)
  await expect(page.getByText(logado.email)).toBeVisible()
})

test('mudar o nome aparece na barra superior', async ({ page, logado }) => {
  await page.goto('/conta')
  await page.getByLabel('Nome').fill('  Carla   Dias ')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Nome atualizado')).toBeVisible()
  await expect(page.getByLabel('Nome')).toHaveValue('Carla Dias')
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await expect(page.getByText('Olá, Carla')).toBeVisible()
})

test('nome vazio mostra mensagem', async ({ page, logado }) => {
  await page.goto('/conta')
  await page.getByLabel('Nome').fill('   ')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Digite seu nome')).toBeVisible()
})

test('trocar a senha e entrar com a nova', async ({ page, logado }) => {
  await page.goto('/conta')
  await page.getByLabel('Nova senha', { exact: true }).fill('senha-trocada-789')
  await page.getByLabel('Confirmar nova senha').fill('senha-trocada-789')
  await page.getByRole('button', { name: 'Trocar senha' }).click()
  await expect(page.getByText('Senha alterada')).toBeVisible()
  await sairPeloMenu(page)
  await entrarPelaTela(page, { email: logado.email, senha: 'senha-trocada-789' })
})

test('trocar a senha com confirmação diferente', async ({ page, logado }) => {
  await page.goto('/conta')
  await page.getByLabel('Nova senha', { exact: true }).fill('senha-trocada-789')
  await page.getByLabel('Confirmar nova senha').fill('outra-coisa-000')
  await page.getByRole('button', { name: 'Trocar senha' }).click()
  await expect(page.getByText('As senhas não são iguais')).toBeVisible()
})

test('excluir a conta exige digitar EXCLUIR e depois impede o login', async ({ page, logado }) => {
  await page.goto('/conta')
  const botao = page.getByRole('button', { name: 'Excluir minha conta' })
  await expect(botao).toBeDisabled()
  await page.getByLabel('Digite EXCLUIR para confirmar').fill('excluir')
  await expect(botao).toBeDisabled()
  await page.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR')
  await expect(botao).toBeEnabled()
  await botao.click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Sua conta foi excluída')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Menu da conta' })).toBeHidden()

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(logado.email)
  await page.getByLabel('Senha').fill(logado.senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('E-mail ou senha incorretos')).toBeVisible()
})

test('Sair na página da conta', async ({ page, logado }) => {
  await page.goto('/conta')
  await page.getByRole('main').getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: 'Menu da conta' })).toBeHidden()
})
```

Run: `npx playwright test e2e/conta.spec.ts`
Expected: FAIL — `/conta` mostra 404.

- [ ] **Step 2: Ações da conta**

Acrescente ao **fim** de `lib/auth/acoes.ts`, com `import { criarClienteAdmin } from '@/lib/supabase/admin'` no topo:
```ts
async function usuarioObrigatorio() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/entrar?voltar=%2Fconta')
  return { supabase, usuario: data.user }
}

export async function atualizarNome(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const digitado = campo(formData, 'nome')
  const nome = validarNome(digitado)
  if (!nome.ok) return { erro: nome.erro, nome: digitado }

  const { supabase, usuario } = await usuarioObrigatorio()
  const { error } = await supabase.from('perfis').update({ nome: nome.valor }).eq('id', usuario.id)
  if (error) {
    console.error('[CineTeca] atualizarNome falhou:', error.code)
    return { erro: MENSAGENS.generico, nome: nome.valor }
  }
  revalidatePath('/', 'layout')
  return { erro: null, sucesso: 'Nome atualizado', nome: nome.valor }
}

export async function trocarSenha(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const senha = validarSenha(campo(formData, 'senha'))
  if (!senha.ok) return { erro: senha.erro }
  const confirmacao = validarConfirmacao(senha.valor, campo(formData, 'confirmacao'))
  if (!confirmacao.ok) return { erro: confirmacao.erro }

  const { supabase } = await usuarioObrigatorio()
  const { error } = await supabase.auth.updateUser({ password: senha.valor })
  if (error) return { erro: falhaAuth('trocarSenha', error) }
  return { erro: null, sucesso: 'Senha alterada' }
}

export async function excluirConta(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  if (campo(formData, 'confirmacao') !== 'EXCLUIR') return { erro: 'Digite EXCLUIR para confirmar' }

  const { supabase, usuario } = await usuarioObrigatorio()
  const { error } = await criarClienteAdmin().auth.admin.deleteUser(usuario.id)
  if (error) {
    registrar('excluirConta', error)
    return { erro: MENSAGENS.generico }
  }
  // A conta já não existe; só limpa os cookies desta sessão.
  await supabase.auth.signOut({ scope: 'local' })
  revalidatePath('/', 'layout')
  redirect('/?aviso=conta-excluida')
}
```

- [ ] **Step 3: Componentes e página**

`components/conta/FormularioNome.tsx`:
```tsx
'use client'

import { useActionState, useEffect } from 'react'
import { atualizarNome } from '@/lib/auth/acoes'
import { useAvisos } from '../AvisosProvider'
import { BOTAO_SECUNDARIO } from '../estilos'
import { Campo } from './Campo'

export function FormularioNome({ nomeAtual }: { nomeAtual: string }) {
  const [estado, acao, pendente] = useActionState(atualizarNome, { erro: null, nome: nomeAtual })
  const { mostrar } = useAvisos()

  useEffect(() => {
    if (estado.sucesso) mostrar(estado.sucesso)
  }, [estado, mostrar])

  return (
    <form action={acao} noValidate className="space-y-3">
      <Campo rotulo="Nome" nome="nome" autoComplete="name" valorInicial={estado.nome} />
      {estado.erro && <p className="rounded-md bg-destaque/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className={BOTAO_SECUNDARIO}>
        {pendente ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  )
}
```

`components/conta/ExcluirConta.tsx`:
```tsx
'use client'

import { useActionState, useId, useState } from 'react'
import { excluirConta } from '@/lib/auth/acoes'

export function ExcluirConta() {
  const [estado, acao, pendente] = useActionState(excluirConta, { erro: null })
  const [confirmacao, setConfirmacao] = useState('')
  const id = useId()

  return (
    <section aria-labelledby="titulo-excluir" className="space-y-3 rounded-md border border-destaque/40 p-4">
      <h2 id="titulo-excluir" className="font-bold text-red-200">
        Excluir conta
      </h2>
      <p className="text-sm text-white/70">
        Sua conta, seus favoritos e seus filmes salvos serão apagados para sempre. Isso não pode ser desfeito.
      </p>
      <form action={acao} noValidate className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor={id} className="block text-sm font-semibold text-white/80">
            Digite EXCLUIR para confirmar
          </label>
          <input
            id={id}
            name="confirmacao"
            autoComplete="off"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2.5 text-white outline-none transition-colors focus:border-white"
          />
        </div>
        {estado.erro && <p className="rounded-md bg-destaque/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
        <button
          type="submit"
          disabled={confirmacao !== 'EXCLUIR' || pendente}
          className="w-full rounded-md bg-destaque px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-destaque-escuro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pendente ? 'Excluindo…' : 'Excluir minha conta'}
        </button>
      </form>
    </section>
  )
}
```

`app/(conta)/conta/page.tsx`:
```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Cartao } from '@/components/conta/Cartao'
import { ExcluirConta } from '@/components/conta/ExcluirConta'
import { FormularioNome } from '@/components/conta/FormularioNome'
import { FormularioNovaSenha } from '@/components/conta/FormularioNovaSenha'
import { BOTAO_SECUNDARIO } from '@/components/estilos'
import { sair, trocarSenha } from '@/lib/auth/acoes'
import { obterUsuario } from '@/lib/auth/sessao'

export const metadata: Metadata = { title: 'Minha conta' }

export default async function PaginaConta() {
  const usuario = await obterUsuario()
  if (!usuario) redirect('/entrar?voltar=%2Fconta')

  return (
    <Cartao titulo="Minha conta">
      <div className="space-y-8">
        <FormularioNome nomeAtual={usuario.nome} />

        <section aria-labelledby="titulo-email" className="space-y-1">
          <h2 id="titulo-email" className="text-sm font-semibold text-white/80">
            E-mail
          </h2>
          <p className="break-all text-white">{usuario.email}</p>
        </section>

        <section aria-labelledby="titulo-senha" className="space-y-3">
          <h2 id="titulo-senha" className="text-sm font-semibold text-white/80">
            Senha
          </h2>
          {usuario.soGoogle ? (
            <p className="text-white/70">Você entra com o Google.</p>
          ) : (
            <FormularioNovaSenha acao={trocarSenha} rotuloBotao="Trocar senha" />
          )}
        </section>

        <form action={sair}>
          <button type="submit" className={`${BOTAO_SECUNDARIO} w-full`}>
            Sair
          </button>
        </form>

        <ExcluirConta />
      </div>
    </Cartao>
  )
}
```

- [ ] **Step 4: Rodar para ver passar**

Run:
```powershell
npm run typecheck
npx playwright test e2e/conta.spec.ts
```
Expected: PASS em desktop e celular.

- [ ] **Step 5: Commit**

```powershell
git add lib/auth/acoes.ts "app/(conta)/conta" components/conta e2e/conta.spec.ts
git commit -m "feat: página Minha conta (nome, senha, sair e excluir)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Listas na conta, janela de login e ação pendente

**Files:**
- Create: `components/JanelaLogin.tsx`
- Modify: `components/ListasProvider.tsx` (substituir por completo), `components/MinhaLista.tsx`
- Modify: `e2e/minha-lista.spec.ts` (substituir por completo), `e2e/inicio.spec.ts`, `e2e/filme.spec.ts`
- Test: `e2e/listas-conta.spec.ts`

**Interfaces:**
- Consumes:
  - `useUsuario` (Task 5), `useAvisos` (Task 6)
  - `criarListaSupabase`, `ErroLista`, `guardarAcaoPendente`, `lerAcaoPendente`, `limparAcaoPendente`, `obterArmazenamentoDaSessao` (Task 4)
  - `obterClienteNavegador` (Task 1), `caminhoDeRetorno` (Task 3)
  - helpers e fixtures e2e (Task 5)
- Produces:
  - `useListas(): { carregado: boolean; logado: boolean; listas: Listas; contem(tipo, id): boolean; alternar(tipo, filme): void }`
  - `<JanelaLogin pendente={{ tipo, filme }} aoFechar />`, com `role="dialog"` e nome "Entre para salvar seus filmes"
  - Toasts: `"<Título>" adicionado aos favoritos`, `… removido dos favoritos`, `… adicionado aos salvos`, `… removido dos salvos` e `Não foi possível salvar. Tente de novo.`

- [ ] **Step 1: Escrever o teste ponta a ponta (falhando)**

`e2e/listas-conta.spec.ts`:
```ts
import { apagarPorEmail, apagarUsuarioTeste, entrarPelaTela, novoEmail } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

test('favoritar sem login abre a janela e, depois de criar conta, o filme já está salvo', async ({ page }) => {
  const email = novoEmail()
  try {
    await page.goto('/filme/1001')
    const cabecalho = page.getByRole('region', { name: 'Filme Teste 1001' })
    await cabecalho.getByRole('button', { name: 'Favoritar' }).click()
    const janela = page.getByRole('dialog', { name: 'Entre para salvar seus filmes' })
    await expect(janela).toBeVisible()
    await janela.getByRole('link', { name: 'Criar conta' }).click()
    await expect(page).toHaveURL(/\/cadastro\?voltar=%2Ffilme%2F1001$/)
    await page.getByLabel('Nome').fill('Duda')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill('senha-forte-123')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page).toHaveURL(/\/filme\/1001$/)
    await expect(page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Favoritar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByText('"Filme Teste 1001" adicionado aos favoritos')).toBeVisible()
  } finally {
    await apagarPorEmail(email)
  }
})

test('fechar a janela sem entrar não salva nada', async ({ page }) => {
  await page.goto('/filme/1001')
  const botao = page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Salvar para assistir' })
  await botao.click()
  const janela = page.getByRole('dialog', { name: 'Entre para salvar seus filmes' })
  await expect(janela).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(janela).toBeHidden()
  await expect(botao).toHaveAttribute('aria-pressed', 'false')
})

test('salvar mostra o aviso e a lista aparece em outro aparelho', async ({ page, logado, browser }) => {
  await page.goto('/filme/1001')
  await page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Salvar para assistir' }).click()
  await expect(page.getByText('"Filme Teste 1001" adicionado aos salvos')).toBeVisible()

  const outroAparelho = await browser.newContext()
  try {
    const outraPagina = await outroAparelho.newPage()
    await entrarPelaTela(outraPagina, logado, '/minha-lista')
    await outraPagina.getByRole('tab', { name: /Salvos para assistir/ }).click()
    await expect(outraPagina.getByRole('link', { name: 'Filme Teste 1001' })).toBeVisible()
  } finally {
    await outroAparelho.close()
  }
})

test('duplo clique rápido não duplica nem desfaz', async ({ page, logado }) => {
  await page.goto('/filme/1001')
  const botao = page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Favoritar' })
  await botao.dblclick()
  await expect(botao).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/minha-lista')
  await expect(page.getByRole('tab', { name: 'Favoritos (1)' })).toBeVisible()
})

test('se o banco recusar, a tela desfaz e avisa', async ({ page, logado }) => {
  await page.goto('/filme/1001')
  const botao = page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Favoritar' })
  await expect(botao).toHaveAttribute('aria-pressed', 'false')
  await apagarUsuarioTeste(logado) // a conta some com a página aberta
  await botao.click()
  await expect(page.getByText('Não foi possível salvar. Tente de novo.').or(page.getByRole('dialog', { name: 'Entre para salvar seus filmes' }))).toBeVisible()
  await expect(botao).toHaveAttribute('aria-pressed', 'false')
})

test('Minha lista sem login convida a entrar', async ({ page }) => {
  await page.goto('/minha-lista')
  await expect(page.getByText('Entre para ver seus favoritos e filmes salvos')).toBeVisible()
  await expect(page.getByRole('main').getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar?voltar=%2Fminha-lista')
  await expect(page.getByRole('main').getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro?voltar=%2Fminha-lista')
})
```

Run: `npx playwright test e2e/listas-conta.spec.ts`
Expected: FAIL — sem login, o favorito é salvo no navegador e a janela não aparece.

- [ ] **Step 2: Janela de login**

`components/JanelaLogin.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { caminhoDeRetorno } from '@/lib/auth/validacao'
import { guardarAcaoPendente, obterArmazenamentoDaSessao } from '@/lib/lista/acao-pendente'
import type { FilmeSalvo, TipoLista } from '@/lib/lista/tipos'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos'
import { IconeFechar } from './Icones'

type Props = { pendente: { tipo: TipoLista; filme: FilmeSalvo }; aoFechar(): void }

export function JanelaLogin({ pendente, aoFechar }: Props) {
  const primeiroRef = useRef<HTMLAnchorElement>(null)
  const [voltar, setVoltar] = useState('/')

  useEffect(() => {
    setVoltar(caminhoDeRetorno(window.location.pathname + window.location.search))
    primeiroRef.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aoFechar])

  const guardar = () => {
    guardarAcaoPendente(obterArmazenamentoDaSessao(), { ...pendente, voltar })
    aoFechar()
  }
  const consulta = `?voltar=${encodeURIComponent(voltar)}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-janela-login"
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-xl bg-superficie p-6 shadow-2xl ring-1 ring-white/10"
      >
        <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute right-3 top-3 rounded p-1 text-white/60 hover:text-white">
          <IconeFechar />
        </button>
        <h2 id="titulo-janela-login" className="pr-6 text-xl font-extrabold">
          Entre para salvar seus filmes
        </h2>
        <p className="mt-2 text-sm text-white/70">Crie sua conta grátis para guardar seus favoritos e os filmes que quer assistir.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Link ref={primeiroRef} href={`/entrar${consulta}`} onClick={guardar} className={BOTAO_PRIMARIO}>
            Entrar
          </Link>
          <Link href={`/cadastro${consulta}`} onClick={guardar} className={BOTAO_SECUNDARIO}>
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Provedor das listas na conta**

`components/ListasProvider.tsx` (substitui o arquivo inteiro):
```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { lerAcaoPendente, limparAcaoPendente, obterArmazenamentoDaSessao } from '@/lib/lista/acao-pendente'
import { criarListaSupabase, ErroLista } from '@/lib/lista/supabase'
import type { FilmeSalvo, ListaStore, Listas, TipoLista } from '@/lib/lista/tipos'
import { obterClienteNavegador } from '@/lib/supabase/navegador'
import { useAvisos } from './AvisosProvider'
import { JanelaLogin } from './JanelaLogin'
import { useUsuario } from './SessaoProvider'

type ValorListas = {
  carregado: boolean
  logado: boolean
  listas: Listas
  contem(tipo: TipoLista, id: number): boolean
  alternar(tipo: TipoLista, filme: FilmeSalvo): void
}

const TEXTOS: Record<TipoLista, { adicionado: string; removido: string }> = {
  favoritos: { adicionado: 'adicionado aos favoritos', removido: 'removido dos favoritos' },
  salvos: { adicionado: 'adicionado aos salvos', removido: 'removido dos salvos' },
}
const ERRO_AO_SALVAR = 'Não foi possível salvar. Tente de novo.'
const vazias = (): Listas => ({ favoritos: [], salvos: [] })

const ContextoListas = createContext<ValorListas | null>(null)

export function ListasProvider({ children }: { children: ReactNode }) {
  const usuario = useUsuario()
  const { mostrar } = useAvisos()
  const usuarioId = usuario?.id ?? null

  const lojaRef = useRef<ListaStore | null>(null)
  const emAndamento = useRef(new Set<string>())
  const [listas, setListas] = useState<Listas>(vazias)
  const listasRef = useRef<Listas>(listas)
  const [carregado, setCarregado] = useState(false)
  const [janela, setJanela] = useState<{ tipo: TipoLista; filme: FilmeSalvo } | null>(null)

  useEffect(() => {
    listasRef.current = listas
  }, [listas])

  const recarregar = useCallback(async (loja: ListaStore) => {
    try {
      const [favoritos, salvos] = await Promise.all([loja.listar('favoritos'), loja.listar('salvos')])
      setListas({ favoritos, salvos })
    } catch (erro) {
      console.error('[CineTeca] Falha ao carregar as listas:', (erro as Error).message)
    } finally {
      setCarregado(true)
    }
  }, [])

  // Atualiza a tela na hora, grava no banco e desfaz se der errado.
  const aplicar = useCallback(
    async (tipo: TipoLista, filme: FilmeSalvo, adicionar: boolean) => {
      const loja = lojaRef.current
      if (!loja) return
      const chave = `${tipo}:${filme.id}`
      if (emAndamento.current.has(chave)) return
      emAndamento.current.add(chave)

      const colocar = (dentro: boolean) =>
        setListas((atuais) => ({
          ...atuais,
          [tipo]: dentro
            ? [filme, ...atuais[tipo].filter((f) => f.id !== filme.id)]
            : atuais[tipo].filter((f) => f.id !== filme.id),
        }))

      colocar(adicionar)
      try {
        if (adicionar) await loja.adicionar(tipo, filme)
        else await loja.remover(tipo, filme.id)
        mostrar(`"${filme.title}" ${adicionar ? TEXTOS[tipo].adicionado : TEXTOS[tipo].removido}`)
      } catch (erro) {
        colocar(!adicionar)
        if (erro instanceof ErroLista && erro.sessaoExpirada) setJanela({ tipo, filme })
        else mostrar(ERRO_AO_SALVAR)
        console.error('[CineTeca] Falha ao gravar na lista:', (erro as Error).message)
      } finally {
        emAndamento.current.delete(chave)
      }
    },
    [mostrar],
  )

  useEffect(() => {
    if (!usuarioId) {
      lojaRef.current = null
      setListas(vazias())
      setCarregado(true)
      return
    }

    let cancelado = false
    setCarregado(false)
    const loja = criarListaSupabase(obterClienteNavegador(), usuarioId)
    lojaRef.current = loja

    void (async () => {
      await recarregar(loja)
      if (cancelado) return
      // Filme que a pessoa tentou salvar antes de entrar.
      const armazenamento = obterArmazenamentoDaSessao()
      const acao = lerAcaoPendente(armazenamento)
      if (!acao) return
      limparAcaoPendente(armazenamento)
      const jaEsta = await loja.contem(acao.tipo, acao.filme.id).catch(() => false)
      if (!jaEsta && !cancelado) await aplicar(acao.tipo, acao.filme, true)
    })()

    return () => {
      cancelado = true
    }
  }, [usuarioId, recarregar, aplicar])

  const contem = useCallback((tipo: TipoLista, id: number) => listas[tipo].some((f) => f.id === id), [listas])

  const alternar = useCallback(
    (tipo: TipoLista, filme: FilmeSalvo) => {
      if (!usuarioId) {
        setJanela({ tipo, filme })
        return
      }
      const jaEsta = listasRef.current[tipo].some((f) => f.id === filme.id)
      void aplicar(tipo, filme, !jaEsta)
    },
    [usuarioId, aplicar],
  )

  const fecharJanela = useCallback(() => setJanela(null), [])

  const valor = useMemo(
    () => ({ carregado, logado: usuarioId !== null, listas, contem, alternar }),
    [carregado, usuarioId, listas, contem, alternar],
  )

  return (
    <ContextoListas.Provider value={valor}>
      {children}
      {janela && <JanelaLogin pendente={janela} aoFechar={fecharJanela} />}
    </ContextoListas.Provider>
  )
}

export function useListas(): ValorListas {
  const valor = useContext(ContextoListas)
  if (!valor) throw new Error('useListas precisa estar dentro de <ListasProvider>')
  return valor
}
```

Em `components/MinhaLista.tsx`:
1. Troque `import { BOTAO_PRIMARIO } from './estilos'` por `import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos'`.
2. Troque `const { carregado, listas } = useListas()` por `const { carregado, logado, listas } = useListas()`.
3. Logo depois da linha `const filmes = listas[aba]`, insira:
```tsx
  if (carregado && !logado) {
    return (
      <div className="flex flex-col items-start gap-4 py-10">
        <p className="text-lg text-white/70">Entre para ver seus favoritos e filmes salvos</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/entrar?voltar=%2Fminha-lista" className={BOTAO_PRIMARIO}>
            Entrar
          </Link>
          <Link href="/cadastro?voltar=%2Fminha-lista" className={BOTAO_SECUNDARIO}>
            Criar conta
          </Link>
        </div>
      </div>
    )
  }
```

- [ ] **Step 4: Atualizar os testes da Fase 1 que salvavam sem conta**

`e2e/minha-lista.spec.ts` (substitui o arquivo inteiro):
```ts
import { inserirFilmes } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

test('lista vazia convida a explorar', async ({ page, logado }) => {
  await page.goto('/minha-lista')
  await expect(page.getByRole('heading', { name: 'Minha lista' })).toBeVisible()
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
  await page.getByRole('link', { name: 'Explorar filmes' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('mostra favoritos e salvos em abas separadas', async ({ page, logado }) => {
  await inserirFilmes(logado, 'favoritos', [1001])
  await inserirFilmes(logado, 'salvos', [2001, 2002])
  await page.goto('/minha-lista')

  await expect(page.getByRole('tab', { name: 'Favoritos (1)' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('movie-card')).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Filme Teste 1001' })).toBeVisible()

  await page.getByRole('tab', { name: 'Salvos para assistir (2)' }).click()
  await expect(page.getByTestId('movie-card')).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'Filme Teste 2002' })).toBeVisible()
})

test('filme sem pôster usa a imagem padrão', async ({ page, logado }) => {
  await inserirFilmes(logado, 'favoritos', [1001])
  await page.goto('/minha-lista')
  await expect(page.getByTestId('movie-card').locator('img')).toHaveAttribute('src', '/poster-padrao.svg')
})

test('remover um favorito pelo cartão', async ({ page, logado, isMobile }) => {
  test.skip(isMobile, 'os botões do cartão aparecem ao passar o mouse, só no desktop')
  await inserirFilmes(logado, 'favoritos', [1001])
  await page.goto('/minha-lista')

  const cartao = page.getByTestId('movie-card')
  await cartao.hover()
  const botao = cartao.getByRole('button', { name: 'Favoritar' })
  await expect(botao).toHaveAttribute('aria-pressed', 'true')
  await botao.click()
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
  await expect(page.getByText('"Filme Teste 1001" removido dos favoritos')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
})
```

Em `e2e/inicio.spec.ts`:
1. Troque a primeira linha `import { expect, test } from '@playwright/test'` por:
```ts
import { expect, test } from './conta/fixtures'
```
2. Troque o cabeçalho `test('+ Minha lista do banner salva o filme', async ({ page, isMobile }) => {` por:
```ts
test('+ Minha lista do banner salva o filme', async ({ page, logado, isMobile }) => {
```
3. Troque o cabeçalho `test('favoritar pelo cartão ao passar o mouse', async ({ page, isMobile }) => {` por:
```ts
test('favoritar pelo cartão ao passar o mouse', async ({ page, logado, isMobile }) => {
```

Em `e2e/filme.spec.ts`:
1. Troque a primeira linha `import { expect, test } from '@playwright/test'` por:
```ts
import { expect, test } from './conta/fixtures'
```
2. Troque o cabeçalho `test('fluxo completo: início → filme → favoritar e salvar → Minha lista → recarregar', async ({ page, isMobile }) => {` por:
```ts
test('fluxo completo: início → filme → favoritar e salvar → Minha lista → recarregar', async ({ page, logado, isMobile }) => {
```

(Os testes sem `usuario`/`logado` não criam contas: a fixture só roda quando é pedida.)

- [ ] **Step 5: Rodar para ver passar**

Run:
```powershell
npx vitest run
npm run typecheck
npx playwright test
```
Expected: todos PASS. Os testes pulados continuam sendo só os de hover no celular e o de toque no desktop.

- [ ] **Step 6: Commit**

```powershell
git add components e2e
git commit -m "feat: listas guardadas na conta, janela de login e ação pendente" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Importar as listas antigas do navegador

**Files:**
- Modify: `components/ListasProvider.tsx`
- Test: `e2e/importacao.spec.ts`

**Interfaces:**
- Consumes: `importarListasDoNavegador` (Task 4), `obterArmazenamentoSeguro` (`lib/lista/local.ts`), fixtures (Task 5).
- Produces: toast `Trouxemos N filme(s) que você tinha salvo neste navegador` — "1 filme" no singular, "N filmes" no plural.

- [ ] **Step 1: Escrever o teste ponta a ponta (falhando)**

`e2e/importacao.spec.ts`:
```ts
import type { Page } from '@playwright/test'
import { entrarPelaTela, inserirFilmes, sairPeloMenu } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

const CHAVE = 'cineteca:listas:v1'
const filme = (id: number) => ({ id, title: `Filme Teste ${id}`, posterUrl: null, year: '2024', rating: 7.8 })

async function gravarListasAntigas(page: Page, valor: string) {
  await page.goto('/')
  await page.evaluate(([chave, v]) => localStorage.setItem(chave, v), [CHAVE, valor] as const)
}

const lerChave = (page: Page) => page.evaluate((chave) => localStorage.getItem(chave), CHAVE)

test('no primeiro login, traz os filmes salvos neste navegador', async ({ page, usuario }) => {
  await gravarListasAntigas(page, JSON.stringify({ favoritos: [filme(1001), filme(1002)], salvos: [filme(2001)] }))
  await entrarPelaTela(page, usuario, '/minha-lista')
  await expect(page.getByText('Trouxemos 3 filmes que você tinha salvo neste navegador')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Favoritos (2)' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Salvos para assistir (1)' })).toBeVisible()
  expect(await lerChave(page)).toBeNull()

  await sairPeloMenu(page)
  await entrarPelaTela(page, usuario, '/minha-lista')
  await expect(page.getByRole('tab', { name: 'Favoritos (2)' })).toBeVisible()
  await expect(page.getByText(/Trouxemos/)).toHaveCount(0)
})

test('não duplica filmes que já estavam na conta', async ({ page, usuario }) => {
  await inserirFilmes(usuario, 'favoritos', [1001])
  await gravarListasAntigas(page, JSON.stringify({ favoritos: [filme(1001), filme(1002)], salvos: [] }))
  await entrarPelaTela(page, usuario, '/minha-lista')
  await expect(page.getByText('Trouxemos 1 filme que você tinha salvo neste navegador')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Favoritos (2)' })).toBeVisible()
})

test('dados antigos corrompidos não atrapalham o login', async ({ page, usuario }) => {
  await gravarListasAntigas(page, 'isso não é json')
  await entrarPelaTela(page, usuario, '/minha-lista')
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
  await expect(page.getByText(/Trouxemos/)).toHaveCount(0)
  expect(await lerChave(page)).toBeNull()
})
```

Run: `npx playwright test e2e/importacao.spec.ts`
Expected: FAIL — o toast "Trouxemos…" não aparece.

- [ ] **Step 2: Importar no carregamento das listas**

Em `components/ListasProvider.tsx`:
1. Acrescente os imports:
```tsx
import { importarListasDoNavegador } from '@/lib/lista/importacao'
import { obterArmazenamentoSeguro } from '@/lib/lista/local'
```
2. Logo abaixo de `const vazias = ...`, acrescente:
```tsx
const textoImportacao = (n: number) =>
  `Trouxemos ${n} ${n === 1 ? 'filme' : 'filmes'} que você tinha salvo neste navegador`
```
3. No efeito que carrega a loja, troque:
```tsx
      await recarregar(loja)
      if (cancelado) return
```
por:
```tsx
      await recarregar(loja)
      if (cancelado) return
      // Listas que a Fase 1 guardava no navegador.
      try {
        const trazidos = await importarListasDoNavegador(obterArmazenamentoSeguro(), loja)
        if (trazidos > 0 && !cancelado) {
          await recarregar(loja)
          mostrar(textoImportacao(trazidos))
        }
      } catch (erro) {
        console.error('[CineTeca] Falha ao importar as listas do navegador:', (erro as Error).message)
      }
      if (cancelado) return
```
4. Acrescente `mostrar` ao array de dependências desse efeito: `[usuarioId, recarregar, aplicar, mostrar]`.

- [ ] **Step 3: Rodar para ver passar**

Run:
```powershell
npm run typecheck
npx playwright test
```
Expected: todos PASS.

- [ ] **Step 4: Commit**

```powershell
git add components/ListasProvider.tsx e2e/importacao.spec.ts
git commit -m "feat: traz para a conta as listas salvas no navegador" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Google, e-mails, Vercel e conferência final (com o dono do produto)

> **Execução pelo controlador, junto com o dono.** Não use subagente. Faça uma ação por vez, e nenhuma chave no chat.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: tudo o que foi feito.
- Produces: login com Google funcionando em produção; recuperação de senha pelo Resend (se houver domínio); Fase 2 publicada.

- [ ] **Step 1: README**

Em `README.md`, troque a seção "Rodar no seu computador" por:
````markdown
## Rodar no seu computador

1. Instale o [Node.js](https://nodejs.org) (versão 20 ou mais nova) e rode `npm install`.
2. Copie `.env.local.example` para `.env.local` e preencha:
   - `TMDB_READ_TOKEN` — token de leitura do TMDB;
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` — do projeto Supabase `cineteca` (Project Settings → API Keys);
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
3. Rode `npm run dev` e abra http://localhost:3000.

O banco (tabelas e regras de segurança) está em `supabase/migrations/`. Para um projeto novo, cole esse SQL no SQL Editor do Supabase.
````
E troque a seção "Testes" por:
````markdown
## Testes

- `npm test` — testes unitários.
- `npm run test:supabase` — confere o banco e as regras de segurança no projeto `cineteca-testes`.
- `npm run test:e2e` — testes no navegador (computador e celular), com TMDB simulado e o projeto `cineteca-testes`.
- `npm run typecheck` — confere os tipos do TypeScript.

Os dois últimos precisam de `.env.test.local`, com as chaves do projeto `cineteca-testes` e `NEXT_PUBLIC_SITE_URL=http://localhost:3100`.
````
Na seção "Publicar na Vercel", troque o passo 3 por:
```markdown
3. Em **Environment Variables**, crie `TMDB_READ_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `NEXT_PUBLIC_SITE_URL` (o endereço do site).
```

```powershell
git add README.md
git commit -m "docs: README com Supabase e testes da Fase 2" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: "Continuar com Google" (dono, com guia)**

1. Em https://console.cloud.google.com:
   - crie o projeto "CineTeca";
   - em **APIs e serviços → Tela de consentimento OAuth**, escolha "Externo", nome "CineTeca", e informe o e-mail de suporte e o domínio `cineteca-gules.vercel.app`;
   - publique o app ("Em produção").
2. Em **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**:
   - Origem JavaScript autorizada: `https://cineteca-gules.vercel.app`
   - URI de redirecionamento autorizado: `https://<ref-do-projeto>.supabase.co/auth/v1/callback`. O endereço exato aparece no Supabase, em **Authentication → Sign In / Providers → Google**.
3. No Supabase (`cineteca`), em **Authentication → Sign In / Providers → Google**: ligue o provedor e cole o Client ID e o Client Secret no painel. Não cole no chat.

- [ ] **Step 3: E-mails de recuperação (dono, com guia)**

Pergunte se ele tem um domínio.
- **Com domínio:**
  1. Crie a conta em https://resend.com, adicione o domínio e crie os registros DNS indicados. Espere o "Verified".
  2. Crie uma API key.
  3. No Supabase (`cineteca`), em **Authentication → Emails → SMTP Settings**, ligue o SMTP personalizado:
     - host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a API key (colada no painel);
     - remetente `CineTeca <nao-responda@SEU-DOMINIO>`.
- **Sem domínio:** registre que a recuperação de senha para o público fica pendente até haver um domínio. Todo o resto funciona. Explique isso ao dono.

- [ ] **Step 4: Variáveis na Vercel e publicação**

1. Na Vercel, em **Settings → Environment Variables**, o dono cria, com os valores do projeto `cineteca`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_SITE_URL=https://cineteca-gules.vercel.app`
2. Junte o branch da Fase 2 ao `master` (skill `superpowers:finishing-a-development-branch`). O dono envia pelo VS Code (**Controle do Código-Fonte → Sincronizar Alterações**), e a Vercel publica sozinha.

- [ ] **Step 5: Conferência final com o dono**

Em `https://cineteca-gules.vercel.app`, com o dono:
1. Criar conta com e-mail.
2. Favoritar um filme.
3. Abrir no celular: a lista aparece.
4. Sair e entrar com Google.
5. Com domínio configurado: "Esqueci minha senha" → o e-mail chega → trocar a senha.
6. Excluir uma conta de teste.

Depois disso, confira os **Logs** da Vercel: não pode haver linhas `[CineTeca] ... falhou` inesperadas.
