import { expect, test } from './conta/fixtures'

const janela = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Fure a bolha' })
// Na home, o Fure a bolha é uma faixa própria entre as fileiras, com o botão Sortear.
const faixa = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Fure a bolha' })
const sortear = (page: import('@playwright/test').Page) => faixa(page).getByRole('button', { name: 'Sortear', exact: true })
const tituloSugerido = (page: import('@playwright/test').Page) => janela(page).getByRole('heading', { level: 3 })

test('o botão da home abre uma sugestão com idioma e país', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Um filme aclamado, longe do circuito de sempre.')).toBeVisible()
  await sortear(page).click()
  await expect(tituloSugerido(page)).toHaveText(/Filme Teste 8000\d\d/)
  await expect(janela(page).getByText(/· Coreia do Sul/)).toBeVisible()
})

test('"Outra sugestão" troca o filme e "Ver filme" leva à página dele', async ({ page }) => {
  await page.goto('/')
  await sortear(page).click()
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
  await sortear(page).click()
  await expect(janela(page).getByRole('button', { name: 'Outra sugestão' })).toBeDisabled()
  await expect(tituloSugerido(page)).toHaveText(/Filme Teste/)
  await expect(janela(page).getByRole('button', { name: 'Outra sugestão' })).toBeEnabled()
})

test('falha no sorteio mostra o erro e "Tentar de novo" recupera', async ({ page }) => {
  await page.route('**/api/fure-a-bolha**', (rota) => rota.fulfill({ status: 502, contentType: 'application/json', body: '{"erro":true}' }))
  await page.goto('/')
  await sortear(page).click()
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

test('ao fechar, o foco volta para o botão que abriu a janela', async ({ page }) => {
  await page.goto('/')
  const botao = sortear(page)
  await botao.focus()
  await page.keyboard.press('Enter')
  await expect(tituloSugerido(page)).toHaveText(/Filme Teste/)
  await page.keyboard.press('Escape')
  await expect(janela(page)).toHaveCount(0)
  await expect(botao).toBeFocused()
})

test('"Outra sugestão" pelo teclado não tira o foco da janela', async ({ page }) => {
  await page.goto('/')
  await sortear(page).click()
  await expect(tituloSugerido(page)).toHaveText(/Filme Teste/)
  await janela(page).getByRole('button', { name: 'Outra sugestão' }).focus()
  await page.keyboard.press('Enter')
  await expect(tituloSugerido(page)).toHaveText(/Filme Teste/)
  expect(await janela(page).evaluate((el) => el.contains(document.activeElement))).toBe(true)
})

test('a faixa fica entre as fileiras, longe do banner', async ({ page }) => {
  await page.goto('/')
  await expect(faixa(page).getByText('Um filme aclamado, longe do circuito de sempre.')).toBeVisible()
  const topoFaixa = (await faixa(page).boundingBox())!.y
  const topoPopulares = (await page.getByRole('region', { name: 'Populares' }).boundingBox())!.y
  expect(topoFaixa).toBeGreaterThan(topoPopulares)
  await expect(page.getByRole('main').getByRole('button', { name: 'Fure a bolha' })).toHaveCount(0)
})
