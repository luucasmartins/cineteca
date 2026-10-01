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
