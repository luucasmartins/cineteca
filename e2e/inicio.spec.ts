import { expect, test } from '@playwright/test'
import { irPeloMenu } from './ajudantes'

test('mostra o banner destaque com um filme em alta', async ({ page }) => {
  await page.goto('/')
  const destaque = page.getByRole('region', { name: 'Destaque' })
  await expect(destaque.getByRole('heading', { level: 1, name: 'Filme Teste 1001' })).toBeVisible()
  await expect(destaque.getByText('Sinopse do Filme Teste 1001.')).toBeVisible()
  await expect(destaque.getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute('href', '/filme/1001')
})

test('mostra as fileiras da página inicial', async ({ page }) => {
  await page.goto('/')
  for (const titulo of ['Em alta hoje', 'Populares', 'Em cartaz nos cinemas', 'Mais bem avaliados', 'Ação', 'Comédia', 'Terror', 'Animação']) {
    await expect(page.getByRole('heading', { level: 2, name: titulo, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('region', { name: 'Populares' }).getByTestId('movie-card')).toHaveCount(20)
  // exact: sem ele, "Ação" também casaria com "Animação".
  await expect(page.getByRole('region', { name: 'Ação', exact: true }).getByRole('link', { name: /Ver tudo/ })).toHaveAttribute('href', '/genero/28')
})

test('uma fileira com erro não derruba as outras', async ({ page }) => {
  await page.goto('/')
  const fileira = page.getByRole('region', { name: 'Ficção científica' })
  await expect(fileira.getByText('Não foi possível carregar')).toBeVisible()
  await expect(fileira.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Terror' }).getByTestId('movie-card').first()).toBeVisible()
})

test('+ Minha lista do banner salva o filme', async ({ page, isMobile }) => {
  await page.goto('/')
  const botao = page.getByRole('region', { name: 'Destaque' }).getByRole('button', { name: 'Salvar para assistir' })
  await botao.click()
  await expect(botao).toHaveAttribute('aria-pressed', 'true')

  await irPeloMenu(page, isMobile, 'Minha lista')
  await page.getByRole('tab', { name: /Salvos para assistir/ }).click()
  await expect(page.getByRole('link', { name: 'Filme Teste 1001' })).toBeVisible()
})

test('favoritar pelo cartão ao passar o mouse', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover só existe no desktop')
  await page.goto('/')
  const cartao = page.getByRole('region', { name: 'Populares' }).getByTestId('movie-card').first()
  await cartao.hover()
  await expect(cartao.getByText('2024 · ★ 7.8')).toBeVisible()
  const botao = cartao.getByRole('button', { name: 'Favoritar' })
  await botao.click()
  await expect(botao).toHaveAttribute('aria-pressed', 'true')

  await irPeloMenu(page, false, 'Minha lista')
  await expect(page.getByRole('link', { name: 'Filme Teste 2001' })).toBeVisible()
})
