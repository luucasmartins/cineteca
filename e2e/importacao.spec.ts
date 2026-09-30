import type { Page } from '@playwright/test'
import { entrarPelaTela, inserirFilmes, sairPeloMenu } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

const CHAVE = 'cineteca:listas:v1'
const filme = (id: number) => ({ id, title: `Filme Teste ${id}`, posterUrl: null, year: '2024', rating: 7.8 })

async function gravarListasAntigas(page: Page, valor: string) {
  await page.goto('/')
  await page.evaluate(([chave, v]) => localStorage.setItem(chave, v), [CHAVE, valor] as const)
}

const lerChave = (page: Page) => page.evaluate((chave) => localStorage.getItem(chave), CHAVE)

test('no primeiro login, traz os filmes salvos neste navegador', async ({ page, usuario }) => {
  await gravarListasAntigas(page, JSON.stringify({ favoritos: [filme(1001), filme(1002)], salvos: [filme(2001)] }))
  await entrarPelaTela(page, usuario, '/minha-lista')
  await expect(page.getByText('Trouxemos 3 filmes que você tinha salvo neste navegador')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Favoritos (2)' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Salvos para assistir (1)' })).toBeVisible()
  expect(await lerChave(page)).toBeNull()

  await sairPeloMenu(page)
  await entrarPelaTela(page, usuario, '/minha-lista')
  await expect(page.getByRole('tab', { name: 'Favoritos (2)' })).toBeVisible()
  await expect(page.getByText(/Trouxemos/)).toHaveCount(0)
})

test('não duplica filmes que já estavam na conta', async ({ page, usuario }) => {
  await inserirFilmes(usuario, 'favoritos', [1001])
  await gravarListasAntigas(page, JSON.stringify({ favoritos: [filme(1001), filme(1002)], salvos: [] }))
  await entrarPelaTela(page, usuario, '/minha-lista')
  await expect(page.getByText('Trouxemos 1 filme que você tinha salvo neste navegador')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Favoritos (2)' })).toBeVisible()
})

test('dados antigos corrompidos não atrapalham o login', async ({ page, usuario }) => {
  await gravarListasAntigas(page, 'isso não é json')
  await entrarPelaTela(page, usuario, '/minha-lista')
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
  await expect(page.getByText(/Trouxemos/)).toHaveCount(0)
  // A limpeza acontece depois que as listas carregam; sem toast, é preciso esperar.
  await expect.poll(() => lerChave(page)).toBeNull()
})
