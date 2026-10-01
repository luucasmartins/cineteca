# Trilha sonora — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma trilha no clima de cinema começa no primeiro gesto do visitante, continua tocando enquanto ele navega, pausa durante o trailer com som e pode ser desligada por um botão na barra superior.

**Architecture:**
- Um `TrilhaSonoraProvider` client fica no layout raiz e renderiza um único `<audio loop>`. Como o App Router não recarrega a página, o áudio sobrevive à navegação.
- A preferência "desligado" fica no `localStorage`, atrás de `lib/som/preferencia.ts`.
- O `BotaoSom`, na `Navbar`, e o `ModalTrailer` usam o provider pelo hook `useTrilhaSonora()`.

**Tech Stack:** Next.js 16.3 (App Router), React 19, TypeScript 7, Tailwind v4, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-30-trilha-sonora-design.md`

## Global Constraints

- Todo o trabalho acontece no worktree `.claude/worktrees/trilha-sonora` (branch `trilha-sonora`). Nunca troque de branch nem faça commits na pasta principal: outra sessão trabalha no `master` lá.
- Todo texto visível fica em pt-BR. Rótulos do botão: exatamente "Desligar trilha sonora" e "Ligar trilha sonora".
- Chave do `localStorage`: `cineteca:som`, com valor `desligado`.
- Volume `0.3`, `loop` ligado. Arquivo em `public/som/trilha.mp3`, com até cerca de 3 MB.
- A faixa vem da Pixabay Music: uso comercial permitido, sem crédito obrigatório. Nunca use trilha de filme real.
- Erros são registrados com o prefixo `[CineTeca]`. Rejeições de `play()` por autoplay não são registradas.
- Cores: fundo `#0B0B0F`, superfície `#16161D`, destaque `#D7263D`. O botão segue o estilo dos botões de ícone da `Navbar` (`rounded p-2`).
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Uma mudança lógica por commit.
- Next 16: leia `node_modules/next/dist/docs/` se tiver dúvida de API. Vitest: hooks com corpo em bloco `{ ... }`.
- Nunca leia nem imprima `.env.local` e `.env.test.local`. Só copie.
- O e2e usa as portas 3100 e 4010. Antes de rodar, confira que estão livres (veja a Task 6).

## Review Focus

1. **O primeiro gesto é abrir o trailer.** A trilha não pode tocar por cima do trailer: fica pausada com o modal aberto e começa ao fechar. → teste na Task 5.
2. **O arquivo de áudio não carrega** (404, rede). O site segue normal, sem erro de página, e registra uma vez com `[CineTeca]`. → teste na Task 3.
3. **Som desligado, e a pessoa abre e fecha o trailer.** Fechar não pode religar a trilha. → teste na Task 5.
4. **O primeiro clique da visita é no botão de som.** Desliga sem tocar nem um instante. → teste na Task 4.
5. **`localStorage` bloqueado** (aba anônima, cookies bloqueados). Lê "ligado" e gravar não lança erro. → teste na Task 2.

---

### Task 1: Preparar o worktree e trazer a faixa

**Files:**
- Create: `public/som/trilha.mp3`
- Create: `docs/trilha-sonora.md`

**Interfaces:**
- Produces: o arquivo servido em `/som/trilha.mp3`, que as Tasks 3–5 usam.

- [x] **Step 1: Instalar dependências e copiar os arquivos de ambiente (sem ler)**

Run (Git Bash, a partir do worktree):
```bash
cd "C:/Users/Windows/Desktop/Projeto Catálogo de Filmes/.claude/worktrees/trilha-sonora"
npm install
cp "../../../.env.local" .env.local
cp "../../../.env.test.local" .env.test.local
test -f .env.local && test -f .env.test.local && echo copiados
```
Expected: `npm install` termina sem erro e aparece `copiados`.

- [x] **Step 2: Conferir que a base está verde**

Run: `npm test && npm run typecheck`
Expected: tudo PASS.

- [x] **Step 3: Escolher a faixa na Pixabay Music**
  - Use `WebSearch` e `WebFetch` em `https://pixabay.com/music/search/cinematic%20orchestral/`, com termos alternativos como "epic cinematic", "movie trailer orchestral" e "cinematic intro".
  - Critérios, em ordem:
    - (a) orquestral/cinematográfico, sem vocal;
    - (b) entre 1:30 e 3:00 de duração;
    - (c) clima de abertura ou de tema, e não de ação frenética nem de terror;
    - (d) emenda bem em repetição: prefira faixas descritas como "loop" ou que terminam suavemente.
  - Confira a licença atual em `https://pixabay.com/service/license-summary/`. Ela precisa continuar permitindo uso comercial sem crédito.

- [x] **Step 4: Baixar a faixa**

Run:
```bash
mkdir -p public/som
curl -L -A "Mozilla/5.0" -o public/som/trilha.mp3 "<URL de download da faixa escolhida>"
head -c 3 public/som/trilha.mp3 | od -An -c
stat -c %s public/som/trilha.mp3
```
Expected: o início do arquivo é `I D 3` ou começa com o byte `377` (0xFF), ou seja, é MP3 e não HTML. O tamanho fica abaixo de 3.500.000 bytes.

**Se o download falhar** (403, Cloudflare ou HTML no lugar do MP3):
- Apague o arquivo inválido.
- Pare e peça ao dono, de clique em clique:
  1. Abra `<link da página da faixa>`.
  2. Clique em "Download". Se pedir login, use "Continuar com Google".
  3. Salve o arquivo como `trilha.mp3` em `C:\Users\Windows\Desktop\Projeto Catálogo de Filmes\.claude\worktrees\trilha-sonora\public\som\`.
- Depois, repita a verificação.

**Se o arquivo passar de 3,5 MB:** escolha outra faixa mais curta. Não reencode o arquivo.

- [x] **Step 5: Registrar origem e licença**

Crie `docs/trilha-sonora.md` com os dados reais da faixa baixada:
```markdown
# Trilha sonora do site

- **Faixa:** <título exato na Pixabay>
- **Autor:** <nome do autor na Pixabay>
- **Página:** <URL da página da faixa>
- **Baixada em:** 2026-09-30
- **Licença:** Pixabay Content License (https://pixabay.com/service/license-summary/). Uso comercial permitido, sem crédito obrigatório.

## Como trocar a faixa

1. Baixe outra faixa (MP3, até cerca de 3 MB) de uma biblioteca com licença comercial.
2. Substitua `public/som/trilha.mp3` mantendo o mesmo nome.
3. Atualize os dados acima.
```

- [x] **Step 6: Commit**

```bash
git add public/som/trilha.mp3 docs/trilha-sonora.md
git commit -m "feat: faixa da trilha sonora (Pixabay, uso comercial livre)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Preferência de som no navegador

**Files:**
- Create: `lib/som/preferencia.ts`
- Test: `lib/som/preferencia.test.ts`

**Interfaces:**
- Consumes: nada. O chamador passa o armazenamento, normalmente `obterArmazenamentoSeguro()` de `lib/lista/local.ts`, que devolve `Storage | null`.
- Produces:
  - `CHAVE_SOM = 'cineteca:som'`;
  - `lerSomDesligado(armazenamento: Pick<Storage, 'getItem'> | null): boolean`;
  - `gravarSomDesligado(armazenamento: Pick<Storage, 'setItem' | 'removeItem'> | null, desligado: boolean): void`.

- [x] **Step 1: Escrever os testes que falham**

`lib/som/preferencia.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { CHAVE_SOM, gravarSomDesligado, lerSomDesligado } from './preferencia'

function armazenamentoFalso() {
  const dados = new Map<string, string>()
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

const quebrado = {
  getItem(): string | null {
    throw new DOMException('bloqueado', 'SecurityError')
  },
  setItem(): void {
    throw new DOMException('cheio', 'QuotaExceededError')
  },
  removeItem(): void {
    throw new DOMException('bloqueado', 'SecurityError')
  },
}

describe('preferência de som', () => {
  it('começa ligado', () => {
    expect(lerSomDesligado(armazenamentoFalso())).toBe(false)
  })

  it('grava e lê "desligado"', () => {
    const a = armazenamentoFalso()
    gravarSomDesligado(a, true)
    expect(a.dados.get(CHAVE_SOM)).toBe('desligado')
    expect(lerSomDesligado(a)).toBe(true)
  })

  it('religar apaga a chave', () => {
    const a = armazenamentoFalso()
    gravarSomDesligado(a, true)
    gravarSomDesligado(a, false)
    expect(a.dados.has(CHAVE_SOM)).toBe(false)
    expect(lerSomDesligado(a)).toBe(false)
  })

  it('sem armazenamento, lê ligado e gravar não faz nada', () => {
    expect(lerSomDesligado(null)).toBe(false)
    expect(() => gravarSomDesligado(null, true)).not.toThrow()
  })

  it('com o armazenamento bloqueado, lê ligado e gravar não lança erro', () => {
    expect(lerSomDesligado(quebrado)).toBe(false)
    expect(() => gravarSomDesligado(quebrado, true)).not.toThrow()
    expect(() => gravarSomDesligado(quebrado, false)).not.toThrow()
  })
})
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/som/preferencia.test.ts`
Expected: FAIL, porque não encontra `./preferencia`.

- [x] **Step 3: Implementar**

`lib/som/preferencia.ts`:
```ts
export const CHAVE_SOM = 'cineteca:som'

export function lerSomDesligado(armazenamento: Pick<Storage, 'getItem'> | null): boolean {
  try {
    return armazenamento?.getItem(CHAVE_SOM) === 'desligado'
  } catch {
    return false
  }
}

export function gravarSomDesligado(
  armazenamento: Pick<Storage, 'setItem' | 'removeItem'> | null,
  desligado: boolean,
): void {
  if (!armazenamento) return
  try {
    if (desligado) armazenamento.setItem(CHAVE_SOM, 'desligado')
    else armazenamento.removeItem(CHAVE_SOM)
  } catch {
    // Sem armazenamento, a escolha vale só até recarregar a página.
  }
}
```

- [x] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/som/preferencia.test.ts`
Expected: PASS (5 testes).

- [x] **Step 5: Commit**

```bash
git add lib/som/preferencia.ts lib/som/preferencia.test.ts
git commit -m "feat: preferência de som guardada no navegador

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tocador da trilha no layout raiz

**Files:**
- Create: `components/TrilhaSonoraProvider.tsx`
- Modify: `app/layout.tsx` (import e o provider em volta de `Navbar`/`main`/`Rodape`)
- Test: `e2e/trilha-sonora.spec.ts`

**Interfaces:**
- Consumes:
  - `lerSomDesligado` e `gravarSomDesligado` (Task 2);
  - `obterArmazenamentoSeguro` de `@/lib/lista/local`.
- Produces:
  - `TrilhaSonoraProvider({ children }: { children: ReactNode })`;
  - `useTrilhaSonora(): { ligada: boolean; alternar(): void; pausar(): void; retomar(): void }`;
  - o elemento `<audio data-testid="trilha-sonora">`;
  - o contrato de que eventos cujo alvo está dentro de `[data-botao-som]` não iniciam a trilha (usado pela Task 4).

- [x] **Step 1: Escrever os testes e2e que falham**

`e2e/trilha-sonora.spec.ts`:
```ts
import { expect, test, type Page } from '@playwright/test'

const trilha = (page: Page) => page.getByTestId('trilha-sonora')
const tocando = (page: Page) => trilha(page).evaluate((a: HTMLAudioElement) => !a.paused)
const tempo = (page: Page) => trilha(page).evaluate((a: HTMLAudioElement) => a.currentTime)

// Clica num canto do rodapé, onde não há link. Repete até a hidratação ligar o ouvinte de gesto.
async function iniciarTrilha(page: Page) {
  await expect(async () => {
    await page.getByRole('contentinfo').click({ position: { x: 2, y: 2 } })
    expect(await tocando(page)).toBe(true)
  }).toPass()
}

test('a trilha só começa depois do primeiro gesto, em repetição e volume moderado', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('load')
  expect(await tocando(page)).toBe(false)
  await iniciarTrilha(page)
  expect(await trilha(page).evaluate((a: HTMLAudioElement) => [a.loop, a.volume])).toEqual([true, 0.3])
})

test('a trilha continua tocando ao abrir um filme, sem recomeçar', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }) // banner parado no Filme Teste 1001
  await page.goto('/')
  await iniciarTrilha(page)
  await expect.poll(() => tempo(page)).toBeGreaterThan(0.5)
  const antes = await tempo(page)
  await page.getByRole('region', { name: 'Destaque' }).getByRole('link', { name: 'Ver detalhes' }).click()
  await expect(page).toHaveURL(/\/filme\/1001$/)
  expect(await tocando(page)).toBe(true)
  expect(await tempo(page)).toBeGreaterThanOrEqual(antes)
})

test('se o arquivo da trilha falhar, o site segue normal', async ({ page }) => {
  const errosDePagina: string[] = []
  const registros: string[] = []
  page.on('pageerror', (e) => errosDePagina.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') registros.push(m.text())
  })
  await page.route('**/som/trilha.mp3', (rota) => rota.abort())
  await page.goto('/')
  await expect(async () => {
    await page.getByRole('contentinfo').click({ position: { x: 2, y: 2 } })
    expect(registros.some((r) => r.includes('[CineTeca]'))).toBe(true)
  }).toPass()
  expect(registros.filter((r) => r.includes('[CineTeca]'))).toHaveLength(1)
  expect(errosDePagina).toEqual([])
  await expect(page.getByRole('region', { name: 'Destaque' })).toBeVisible()
})
```

- [x] **Step 2: Rodar e ver falhar**

Primeiro confira as portas (veja o Step 1 da Task 6). Depois:

Run: `npx playwright test e2e/trilha-sonora.spec.ts`
Expected: FAIL. O `getByTestId('trilha-sonora')` não encontra elemento.

- [x] **Step 3: Implementar o provider**

`components/TrilhaSonoraProvider.tsx`:
```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { obterArmazenamentoSeguro } from '@/lib/lista/local'
import { gravarSomDesligado, lerSomDesligado } from '@/lib/som/preferencia'

const VOLUME = 0.3

type ValorTrilha = {
  ligada: boolean
  alternar(): void
  pausar(): void
  retomar(): void
}

const ContextoTrilha = createContext<ValorTrilha | null>(null)

export function TrilhaSonoraProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [ligada, setLigada] = useState(true)
  const [paginaCarregada, setPaginaCarregada] = useState(false)
  // Lembra que a pausa veio do trailer, para só retomar nesse caso.
  const pausadaTemporariamente = useRef(false)
  const erroRegistrado = useRef(false)

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = VOLUME
    if (lerSomDesligado(obterArmazenamentoSeguro())) setLigada(false)
    if (document.readyState === 'complete') {
      setPaginaCarregada(true)
      return
    }
    const aoCarregar = () => setPaginaCarregada(true)
    window.addEventListener('load', aoCarregar)
    return () => window.removeEventListener('load', aoCarregar)
  }, [])

  // Os navegadores só liberam som depois de um gesto: o primeiro clique, toque ou tecla dá o play.
  useEffect(() => {
    const audio = audioRef.current
    if (!ligada || !audio) return
    const aoGesto = (e: Event) => {
      if (pausadaTemporariamente.current) return
      if (e.target instanceof Element && e.target.closest('[data-botao-som]')) return
      audio.play().catch(() => {})
    }
    const parar = () => {
      document.removeEventListener('pointerdown', aoGesto)
      document.removeEventListener('keydown', aoGesto)
      audio.removeEventListener('play', parar)
    }
    document.addEventListener('pointerdown', aoGesto)
    document.addEventListener('keydown', aoGesto)
    audio.addEventListener('play', parar)
    return parar
  }, [ligada])

  const alternar = useCallback(() => {
    const audio = audioRef.current
    const armazenamento = obterArmazenamentoSeguro()
    pausadaTemporariamente.current = false
    if (ligada) {
      audio?.pause()
      gravarSomDesligado(armazenamento, true)
      setLigada(false)
    } else {
      gravarSomDesligado(armazenamento, false)
      setLigada(true)
      audio?.play().catch(() => {})
    }
  }, [ligada])

  const pausar = useCallback(() => {
    const audio = audioRef.current
    if (audio && !audio.paused) {
      audio.pause()
      pausadaTemporariamente.current = true
    }
  }, [])

  const retomar = useCallback(() => {
    if (!pausadaTemporariamente.current) return
    pausadaTemporariamente.current = false
    audioRef.current?.play().catch(() => {})
  }, [])

  const aoErro = useCallback(() => {
    if (erroRegistrado.current) return
    erroRegistrado.current = true
    console.error('[CineTeca] Não foi possível carregar a trilha sonora')
  }, [])

  const valor = useMemo(() => ({ ligada, alternar, pausar, retomar }), [ligada, alternar, pausar, retomar])

  return (
    <ContextoTrilha.Provider value={valor}>
      {children}
      <audio
        ref={audioRef}
        data-testid="trilha-sonora"
        src="/som/trilha.mp3"
        loop
        preload={ligada && paginaCarregada ? 'auto' : 'none'}
        onError={aoErro}
      />
    </ContextoTrilha.Provider>
  )
}

export function useTrilhaSonora(): ValorTrilha {
  const valor = useContext(ContextoTrilha)
  if (!valor) throw new Error('useTrilhaSonora precisa estar dentro de <TrilhaSonoraProvider>')
  return valor
}
```

- [x] **Step 4: Colocar o provider no layout raiz**

Em `app/layout.tsx`, adicione o import junto dos outros providers:
```tsx
import { TrilhaSonoraProvider } from '@/components/TrilhaSonoraProvider'
```
E troque o miolo do `ListasProvider` por:
```tsx
            <ListasProvider>
              <TrilhaSonoraProvider>
                <Navbar generos={generos} usuario={usuario} />
                <main className="min-h-screen">{children}</main>
                <Rodape />
              </TrilhaSonoraProvider>
            </ListasProvider>
```

- [x] **Step 5: Rodar e ver passar**

Run: `npx playwright test e2e/trilha-sonora.spec.ts`
Expected: PASS (3 testes × desktop e celular).

**Se "continua tocando" falhar porque `currentTime` fica em 0:** o Chromium do Playwright pode não estar decodificando o MP3. Confira com `trilha(page).evaluate(a => a.error?.code)`. Não enfraqueça o teste; reporte o problema.

- [x] **Step 6: Typecheck e unitários**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add components/TrilhaSonoraProvider.tsx app/layout.tsx e2e/trilha-sonora.spec.ts
git commit -m "feat: trilha sonora começa no primeiro gesto e segue na navegação

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Botão de som na barra superior

**Files:**
- Create: `components/BotaoSom.tsx`
- Modify: `components/Icones.tsx` (dois ícones no fim do arquivo)
- Modify: `components/Navbar.tsx` (import e o botão entre `CampoBusca` e `MenuUsuario`)
- Test: `e2e/trilha-sonora.spec.ts` (adicionar testes)

**Interfaces:**
- Consumes:
  - `useTrilhaSonora()` (Task 3);
  - o contrato de `[data-botao-som]` (Task 3).
- Produces:
  - `BotaoSom()`, sem props;
  - `IconeSom` e `IconeSomDesligado` (`{ className?: string }`).

- [x] **Step 1: Escrever os testes que falham**

Acrescente ao fim de `e2e/trilha-sonora.spec.ts`:
```ts
test('o botão de som desliga e religa a trilha na hora', async ({ page }) => {
  await page.goto('/')
  await iniciarTrilha(page)
  await page.getByRole('button', { name: 'Desligar trilha sonora' }).click()
  expect(await tocando(page)).toBe(false)
  await page.getByRole('button', { name: 'Ligar trilha sonora' }).click()
  expect(await tocando(page)).toBe(true)
})

test('clicar primeiro no botão desliga sem tocar, e a escolha vale depois de recarregar', async ({ page }) => {
  await page.goto('/')
  await expect(async () => {
    await page.getByRole('button', { name: 'Desligar trilha sonora' }).click({ timeout: 1000 })
    await expect(page.getByRole('button', { name: 'Ligar trilha sonora' })).toBeVisible({ timeout: 1000 })
  }).toPass()
  expect(await tocando(page)).toBe(false)

  await page.reload()
  // O botão só vira "Ligar" depois da hidratação ler a preferência: aí o ouvinte de gesto já existiria.
  await expect(page.getByRole('button', { name: 'Ligar trilha sonora' })).toBeVisible()
  await page.getByRole('contentinfo').click({ position: { x: 2, y: 2 } })
  await page.waitForTimeout(500)
  expect(await tocando(page)).toBe(false)
})
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/trilha-sonora.spec.ts -g "botão"`
Expected: FAIL, porque não existe botão "Desligar trilha sonora".

- [x] **Step 3: Adicionar os ícones**

Fim de `components/Icones.tsx`:
```tsx
export const IconeSom = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
  </svg>
)

export const IconeSomDesligado = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </svg>
)
```

- [x] **Step 4: Criar o botão**

`components/BotaoSom.tsx`:
```tsx
'use client'

import { IconeSom, IconeSomDesligado } from './Icones'
import { useTrilhaSonora } from './TrilhaSonoraProvider'

export function BotaoSom() {
  const { ligada, alternar } = useTrilhaSonora()

  return (
    <button
      type="button"
      data-botao-som
      onClick={alternar}
      aria-label={ligada ? 'Desligar trilha sonora' : 'Ligar trilha sonora'}
      title={ligada ? 'Desligar trilha sonora' : 'Ligar trilha sonora'}
      className="rounded p-2 text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {ligada ? <IconeSom className="h-5 w-5" /> : <IconeSomDesligado className="h-5 w-5" />}
    </button>
  )
}
```

- [x] **Step 5: Colocar na Navbar**

Em `components/Navbar.tsx`:
- adicione `import { BotaoSom } from './BotaoSom'` em ordem alfabética, antes de `import { CampoBusca } from './CampoBusca'`;
- no `div` `ml-auto`, entre `</Suspense>` e `<MenuUsuario usuario={usuario} />`, insira:
```tsx
            <BotaoSom />
```

- [x] **Step 6: Rodar e ver passar**

Run: `npx playwright test e2e/trilha-sonora.spec.ts`
Expected: PASS (5 testes × desktop e celular).

- [x] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add components/BotaoSom.tsx components/Icones.tsx components/Navbar.tsx e2e/trilha-sonora.spec.ts
git commit -m "feat: botão de som na barra superior, com a escolha lembrada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Trailer com som pausa a trilha

**Files:**
- Modify: `components/BotaoTrailer.tsx` (`ModalTrailer`)
- Test: `e2e/trilha-sonora.spec.ts` (adicionar testes)

**Interfaces:**
- Consumes: `useTrilhaSonora().pausar` e `useTrilhaSonora().retomar` (Task 3).
- Produces: nada novo.

- [x] **Step 1: Escrever os testes que falham**

Acrescente ao fim de `e2e/trilha-sonora.spec.ts`:
```ts
const botaoTrailer = (page: Page) =>
  page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Trailer' })

test('o trailer pausa a trilha, e ela volta ao fechar', async ({ page }) => {
  await page.goto('/filme/1001')
  await iniciarTrilha(page)
  await botaoTrailer(page).click()
  await expect.poll(() => tocando(page)).toBe(false)
  await page.getByRole('button', { name: 'Fechar trailer' }).click()
  await expect.poll(() => tocando(page)).toBe(true)
})

test('se o primeiro gesto é abrir o trailer, a trilha só começa ao fechar', async ({ page }) => {
  await page.goto('/filme/1001')
  await expect(async () => {
    await botaoTrailer(page).click({ timeout: 1000 })
    await expect(page.getByRole('dialog', { name: 'Trailer de Filme Teste 1001' })).toBeVisible({ timeout: 1000 })
  }).toPass()
  await expect.poll(() => tocando(page)).toBe(false)
  await page.getByRole('button', { name: 'Fechar trailer' }).click()
  await expect.poll(() => tocando(page)).toBe(true)
})

test('com o som desligado, abrir e fechar o trailer não religa a trilha', async ({ page }) => {
  await page.goto('/filme/1001')
  await expect(async () => {
    await page.getByRole('button', { name: 'Desligar trilha sonora' }).click({ timeout: 1000 })
    await expect(page.getByRole('button', { name: 'Ligar trilha sonora' })).toBeVisible({ timeout: 1000 })
  }).toPass()
  await botaoTrailer(page).click()
  await page.getByRole('button', { name: 'Fechar trailer' }).click()
  await page.waitForTimeout(500)
  expect(await tocando(page)).toBe(false)
})
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/trilha-sonora.spec.ts -g "trailer"`
Expected: os dois primeiros FAIL, porque a trilha continua tocando com o modal aberto. O terceiro pode passar já agora; ele protege contra regressão.

- [x] **Step 3: Pausar e retomar no modal**

Em `components/BotaoTrailer.tsx`:
- adicione `import { useTrilhaSonora } from './TrilhaSonoraProvider'` depois do import de `./Icones`;
- no começo de `ModalTrailer`, logo após `const fecharRef = ...`, adicione:
```tsx
  const { pausar, retomar } = useTrilhaSonora()

  useEffect(() => {
    pausar()
    return retomar
  }, [pausar, retomar])
```

- [x] **Step 4: Rodar e ver passar**

Run: `npx playwright test e2e/trilha-sonora.spec.ts e2e/filme.spec.ts`
Expected: PASS (todos, desktop e celular).

- [x] **Step 5: Commit**

```bash
git add components/BotaoTrailer.tsx e2e/trilha-sonora.spec.ts
git commit -m "feat: trailer com som pausa a trilha sonora

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Verificação completa e conferência no site local

**Files:** nenhum novo. Só corrija o que a verificação apontar.

- [x] **Step 1: Conferir que as portas do e2e estão livres**

Run (Git Bash): `netstat -ano | grep -E ':(3100|4010) ' | grep LISTENING || echo livres`
Expected: `livres`. Se estiverem ocupadas, a outra sessão está rodando e2e: espere e confira de novo. Não mate processos que não são seus.

- [x] **Step 2: Suíte completa**

Run: `npm test && npm run typecheck && npm run test:e2e`
Expected: tudo PASS. Se um teste antigo quebrar por causa do botão novo na barra (por exemplo, um `getByRole('button')` ambíguo), corrija o teste com um seletor mais específico e explique no commit.

- [x] **Step 3: Conferir no site local**

- Suba `npx next dev -p 3005` em segundo plano. A porta 3000 pode ser da outra sessão.
- Com um script Playwright na pasta de rascunho da sessão, tire capturas da barra superior em 1280×800 e em 412×915 (celular).
- Confira:
  - o ícone aparece alinhado entre a busca e o menu do usuário;
  - nada quebra de linha nem transborda no celular.
- Clique na página e confirme `!audio.paused`.
- Encerre o servidor.

- [x] **Step 4: Commit das correções (se houver)**

```bash
git add <arquivos corrigidos>
git commit -m "fix: <o que foi ajustado e por quê>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [x] **Step 5: Entregar ao dono**

- Não faça merge no `master`. Informe o dono:
  - qual faixa foi escolhida, com o link da página;
  - como ouvir no site local;
  - que o branch `trilha-sonora` está pronto para revisão.
- Depois do ok dele, o merge e o envio ao GitHub seguem o fluxo de sempre: ele envia pelo painel Controle do Código-Fonte do VS Code.
