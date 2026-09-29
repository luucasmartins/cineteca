import { expect, test } from '@playwright/test'
import { irPeloMenu } from './ajudantes'

test('página inexistente mostra o 404 no estilo do site', async ({ page }) => {
  await page.goto('/pagina-que-nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('rodapé mostra a atribuição do TMDB', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByText('Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB'),
  ).toBeVisible()
  await expect(page.getByRole('img', { name: 'TMDB' })).toBeVisible()
})

test('menu principal leva à Minha lista', async ({ page, isMobile }) => {
  await page.goto('/')
  await irPeloMenu(page, isMobile, 'Minha lista')
  await expect(page).toHaveURL(/\/minha-lista$/)
})

test('menu mostra os gêneros vindos do TMDB', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  else await page.getByRole('button', { name: 'Gêneros' }).click()
  const link = page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Comédia' })
  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('href', '/genero/35')
})
