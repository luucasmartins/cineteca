import { expect, test } from '@playwright/test'
import { irPeloMenu } from './ajudantes'

test('buscar mostra resultados enquanto digita', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('searchbox', { name: 'Buscar filmes' }).fill('matrix')
  await expect(page).toHaveURL(/\/busca\?q=matrix$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Resultados para "matrix"' })).toBeVisible()
  await expect(page.getByTestId('movie-card')).toHaveCount(3)
  await expect(page.getByRole('link', { name: 'Matrix Reloaded' })).toBeVisible()
})

test('busca sem resultados', async ({ page }) => {
  await page.goto('/busca?q=xyz')
  await expect(page.getByText('Nenhum filme encontrado para "xyz"')).toBeVisible()
})

test('busca vazia pede um termo', async ({ page }) => {
  await page.goto('/busca')
  await expect(page.getByText('Digite o nome de um filme')).toBeVisible()
})

test('acentos e símbolos chegam intactos', async ({ page }) => {
  await page.goto(`/busca?q=${encodeURIComponent('Amélie & cia?')}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Resultados para "Amélie & cia?"' })).toBeVisible()
  await expect(page.getByText('Nenhum filme encontrado para "Amélie & cia?"')).toBeVisible()
})

test('o campo reabre com o termo atual na página de busca', async ({ page }) => {
  await page.goto('/busca?q=matrix')
  await expect(page.getByRole('searchbox', { name: 'Buscar filmes' })).toHaveValue('matrix')
})

test('sair da busca não volta sozinho para ela', async ({ page, isMobile }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('searchbox', { name: 'Buscar filmes' }).fill('matrix')
  await expect(page).toHaveURL(/\/busca\?q=matrix$/)
  await irPeloMenu(page, isMobile, 'Início')
  await expect(page).toHaveURL(/\/$/)
  await page.waitForTimeout(800)
  await expect(page).toHaveURL(/\/$/)
})
