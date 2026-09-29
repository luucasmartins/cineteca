import { expect, test } from '@playwright/test'

test('página de gênero carrega mais filmes ao rolar, sem repetidos, até acabar', async ({ page }) => {
  await page.goto('/genero/28')
  await expect(page.getByRole('heading', { level: 1, name: 'Ação', exact: true })).toBeVisible()
  const cartoes = page.getByTestId('movie-card')
  await expect(cartoes.first()).toBeVisible()

  // O simulador tem 3 páginas de 20, e a página 2 repete um filme: 59 filmes únicos.
  await expect(async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    expect(await cartoes.count()).toBe(59)
  }).toPass({ timeout: 15_000 })

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)
  await expect(cartoes).toHaveCount(59)
})

test('troca a ordenação', async ({ page }) => {
  await page.goto('/genero/28')
  const ordem = page.getByRole('navigation', { name: 'Ordenar por' })
  await expect(ordem.getByRole('link', { name: 'Popularidade' })).toHaveAttribute('aria-current', 'page')
  await ordem.getByRole('link', { name: 'Nota' }).click()
  await expect(page).toHaveURL(/\/genero\/28\?ordem=nota$/)
  await expect(ordem.getByRole('link', { name: 'Nota' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('movie-card').first()).toBeVisible()
})

test('ordem desconhecida volta para popularidade', async ({ page }) => {
  await page.goto('/genero/28?ordem=aleatoria')
  await expect(page.getByRole('navigation', { name: 'Ordenar por' }).getByRole('link', { name: 'Popularidade' })).toHaveAttribute('aria-current', 'page')
})

test('gênero com falha no TMDB mostra mensagem de erro', async ({ page }) => {
  await page.goto('/genero/878')
  await expect(page.getByRole('heading', { level: 1, name: 'Ficção científica' })).toBeVisible()
  await expect(page.getByText('Não foi possível carregar')).toBeVisible()
})

for (const rota of ['/genero/abc', '/genero/424242']) {
  test(`gênero inválido ou inexistente mostra 404: ${rota}`, async ({ page }) => {
    await page.goto(rota)
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
}

test('menu de gêneros leva à página do gênero', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  else await page.getByRole('button', { name: 'Gêneros' }).click()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Comédia' }).click()
  await expect(page).toHaveURL(/\/genero\/35$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Comédia' })).toBeVisible()
})
