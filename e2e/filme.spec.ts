import { expect, test } from '@playwright/test'
import { irPeloMenu } from './ajudantes'

test('mostra os detalhes completos do filme', async ({ page }) => {
  await page.goto('/filme/1001')
  const cabecalho = page.getByRole('region', { name: 'Filme Teste 1001' })
  await expect(cabecalho.getByRole('heading', { level: 1, name: 'Filme Teste 1001' })).toBeVisible()
  await expect(cabecalho.getByText('Sinopse do Filme Teste 1001.')).toBeVisible()
  await expect(cabecalho.getByText('2024 · 2h 16min · ★ 7.8')).toBeVisible()
  await expect(cabecalho.getByText('Ação', { exact: true })).toBeVisible()

  const ondeAssistir = page.getByRole('region', { name: 'Onde assistir' })
  await expect(ondeAssistir.getByRole('img', { name: 'Serviço de Streaming' })).toBeVisible()
  await expect(ondeAssistir.getByRole('link', { name: 'JustWatch' })).toBeVisible()

  await expect(page.getByRole('region', { name: 'Elenco principal' }).getByRole('listitem')).toHaveCount(15)
  await expect(page.getByRole('region', { name: 'Filmes semelhantes' }).getByTestId('movie-card')).toHaveCount(20)
})

test('abre e fecha o trailer', async ({ page }) => {
  await page.goto('/filme/1001')
  await page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Trailer' }).click()
  const modal = page.getByRole('dialog', { name: 'Trailer de Filme Teste 1001' })
  await expect(modal).toBeVisible()
  await expect(modal.locator('iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/trailer-teste/)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()

  await page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Trailer' }).click()
  await page.getByRole('button', { name: 'Fechar trailer' }).click()
  await expect(modal).toBeHidden()
})

test('fluxo completo: início → filme → favoritar e salvar → Minha lista → recarregar', async ({ page, isMobile }) => {
  await page.goto('/')
  await page.getByRole('region', { name: 'Em alta hoje' }).getByRole('link', { name: 'Filme Teste 1002' }).click()
  await expect(page).toHaveURL(/\/filme\/1002$/)

  const cabecalho = page.getByRole('region', { name: 'Filme Teste 1002' })
  const favoritar = cabecalho.getByRole('button', { name: 'Favoritar' })
  const salvar = cabecalho.getByRole('button', { name: 'Salvar para assistir' })
  await favoritar.click()
  await salvar.click()
  await expect(favoritar).toHaveAttribute('aria-pressed', 'true')
  await expect(salvar).toHaveAttribute('aria-pressed', 'true')

  await irPeloMenu(page, isMobile, 'Minha lista')
  // Sem esperar a navegação, o link "Filme Teste 1002" ainda casa com os semelhantes (1002xx) da página do filme.
  await expect(page).toHaveURL(/\/minha-lista$/)
  await expect(page.getByRole('link', { name: 'Filme Teste 1002' })).toBeVisible()
  await page.getByRole('tab', { name: /Salvos para assistir/ }).click()
  await expect(page.getByRole('link', { name: 'Filme Teste 1002' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('tab', { name: 'Favoritos (1)' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Filme Teste 1002' })).toBeVisible()
})

for (const rota of ['/filme/999999', '/filme/abc', '/filme/0']) {
  test(`filme inexistente ou inválido mostra 404: ${rota}`, async ({ page }) => {
    await page.goto(rota)
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
}
