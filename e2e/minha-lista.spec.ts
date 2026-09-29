import { expect, test, type Page } from '@playwright/test'

const CHAVE = 'cineteca:listas:v1'
const filme = (id: number) => ({ id, title: `Filme Teste ${id}`, posterUrl: null, year: '2024', rating: 7.8 })

async function gravarListas(page: Page, valor: string) {
  await page.evaluate(([chave, v]) => localStorage.setItem(chave, v), [CHAVE, valor] as const)
}

test('lista vazia convida a explorar', async ({ page }) => {
  await page.goto('/minha-lista')
  await expect(page.getByRole('heading', { name: 'Minha lista' })).toBeVisible()
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
  await page.getByRole('link', { name: 'Explorar filmes' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('mostra favoritos e salvos em abas separadas', async ({ page }) => {
  await page.goto('/minha-lista')
  await gravarListas(page, JSON.stringify({ favoritos: [filme(1001)], salvos: [filme(2001), filme(2002)] }))
  await page.reload()

  await expect(page.getByRole('tab', { name: 'Favoritos (1)' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('movie-card')).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Filme Teste 1001' })).toBeVisible()

  await page.getByRole('tab', { name: 'Salvos para assistir (2)' }).click()
  await expect(page.getByTestId('movie-card')).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'Filme Teste 2002' })).toBeVisible()
})

test('filme sem pôster usa a imagem padrão', async ({ page }) => {
  await page.goto('/minha-lista')
  await gravarListas(page, JSON.stringify({ favoritos: [filme(1001)], salvos: [] }))
  await page.reload()
  await expect(page.getByTestId('movie-card').locator('img')).toHaveAttribute('src', '/poster-padrao.svg')
})

test('remover um favorito pelo cartão', async ({ page, isMobile }) => {
  test.skip(isMobile, 'os botões do cartão aparecem ao passar o mouse, só no desktop')
  await page.goto('/minha-lista')
  await gravarListas(page, JSON.stringify({ favoritos: [filme(1001)], salvos: [] }))
  await page.reload()

  const cartao = page.getByTestId('movie-card')
  await cartao.hover()
  const botao = cartao.getByRole('button', { name: 'Favoritar' })
  await expect(botao).toHaveAttribute('aria-pressed', 'true')
  await botao.click()
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
})

test('sincroniza com outra aba aberta', async ({ page, context }) => {
  await page.goto('/minha-lista')
  const outraAba = await context.newPage()
  await outraAba.goto('/minha-lista')
  await gravarListas(outraAba, JSON.stringify({ favoritos: [filme(4242)], salvos: [] }))
  await expect(page.getByRole('link', { name: 'Filme Teste 4242' })).toBeVisible()
})

test('dados corrompidos no navegador não quebram a página', async ({ page }) => {
  await page.goto('/minha-lista')
  await gravarListas(page, 'isso não é json')
  await page.reload()
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
})
