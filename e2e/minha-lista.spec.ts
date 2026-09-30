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
