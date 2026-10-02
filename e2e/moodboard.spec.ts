import type { Page } from '@playwright/test'
import { criarMoodboardsTeste, esperarMoodboard, limparMoodboards } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

const galeria = (page: Page) => page.getByRole('region', { name: 'Imagens', exact: true })
const telaCheia = (page: Page) => page.getByRole('dialog', { name: 'Imagens de Filme Teste 1001' })
const janela = (page: Page) => page.getByRole('dialog', { name: 'Salvar no moodboard' })

async function abrirCenaESalvar(page: Page, n = 1) {
  await page.goto('/filme/1001')
  await galeria(page).getByRole('button', { name: `Cena ${n} de Filme Teste 1001` }).click()
  await telaCheia(page).getByRole('button', { name: 'Salvar no moodboard' }).click()
}

test.afterEach(async ({ usuario }) => {
  await limparMoodboards(usuario)
})

test('salva cena num moodboard novo, abre sem login, remove a cena e exclui', async ({ page, logado, browser }) => {
  await abrirCenaESalvar(page, 2)
  await janela(page).getByRole('button', { name: 'Criar novo moodboard' }).click()
  await janela(page).getByRole('textbox', { name: 'Título', exact: true }).fill('Neons Teste')
  await janela(page).getByRole('button', { name: 'Criar e salvar' }).click()
  await expect(janela(page).getByText('Cena salva em "Neons Teste".')).toBeVisible()
  const id = await esperarMoodboard(logado, 'Neons Teste', 1)

  await page.goto('/moodboards')
  await page.getByRole('main').getByRole('link', { name: /Neons Teste/ }).click()
  await page.waitForURL(`**/moodboard/${id}`)
  await expect(page.getByRole('heading', { name: 'Neons Teste', level: 1 })).toBeVisible()

  // Visitante vê o moodboard, sem controles de dono e sem nome de ninguém.
  const contexto = await browser.newContext()
  const visitante = await contexto.newPage()
  await visitante.goto(page.url())
  await expect(visitante.getByRole('heading', { name: 'Neons Teste', level: 1 })).toBeVisible()
  await expect(visitante.getByRole('button', { name: 'Abrir cena de Filme Teste 1001' })).toBeVisible()
  await expect(visitante.getByRole('button', { name: /Remover cena/ })).toHaveCount(0)
  await expect(visitante.getByRole('button', { name: 'Excluir' })).toHaveCount(0)
  await expect(visitante.getByText(logado.nome)).toHaveCount(0)
  await contexto.close()

  await page.getByRole('button', { name: 'Remover cena de Filme Teste 1001' }).click()
  await expect(page.getByText('Nenhuma cena adicionada.', { exact: false })).toBeVisible()
  await esperarMoodboard(logado, 'Neons Teste', 0)

  await page.getByRole('button', { name: 'Excluir' }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await page.waitForURL('**/moodboards')
  await expect(page.getByText('Você ainda não tem moodboards.', { exact: false })).toBeVisible()
})

test('a mesma cena duas vezes no mesmo moodboard avisa', async ({ page, logado }) => {
  await criarMoodboardsTeste(logado, ['Dup Teste'])
  await abrirCenaESalvar(page)
  await janela(page).getByRole('button', { name: /Dup Teste/ }).click()
  await expect(janela(page).getByText('Cena salva em "Dup Teste".')).toBeVisible()
  await esperarMoodboard(logado, 'Dup Teste', 1)

  await janela(page).getByRole('button', { name: 'Voltar às imagens' }).click()
  await telaCheia(page).getByRole('button', { name: 'Salvar no moodboard' }).click()
  await janela(page).getByRole('button', { name: /Dup Teste/ }).click()
  await expect(janela(page).getByText('Essa cena já está neste moodboard')).toBeVisible()
})

test('sem conta, pede login e o Esc fecha só a janela de login', async ({ page }) => {
  await abrirCenaESalvar(page)
  const login = page.getByRole('dialog', { name: 'Entre para salvar seus filmes' })
  await expect(login).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(login).toHaveCount(0)
  await expect(telaCheia(page)).toBeVisible()
  await expect(telaCheia(page).getByRole('button', { name: 'Salvar no moodboard' })).toBeFocused()
})

test('Tab fica na janela do moodboard e o Esc fecha só ela', async ({ page, logado }) => {
  void logado
  await abrirCenaESalvar(page)
  await expect(janela(page).getByText('Você ainda não tem moodboards.')).toBeVisible()
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    expect(await janela(page).evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(janela(page)).toHaveCount(0)
  await expect(telaCheia(page)).toBeVisible()
})

test('limite de 20 moodboards', async ({ page, logado }) => {
  await criarMoodboardsTeste(logado, Array.from({ length: 20 }, (_, i) => `Limite ${i + 1}`))
  await page.goto('/moodboards')
  await page.getByRole('button', { name: 'Novo moodboard' }).click()
  const nova = page.getByRole('dialog', { name: 'Novo moodboard' })
  await nova.getByRole('textbox', { name: 'Título', exact: true }).fill('O vigésimo primeiro')
  await nova.getByRole('button', { name: 'Criar' }).click()
  await expect(nova.getByText('Você atingiu o limite de 20 moodboards')).toBeVisible()
})

test('endereço inválido ou inexistente dá 404, e a lista pede login', async ({ page }) => {
  expect((await page.goto('/moodboard/nao-e-um-id'))?.status()).toBe(404)
  expect((await page.goto('/moodboard/00000000-0000-4000-8000-000000000000'))?.status()).toBe(404)
  await page.goto('/moodboards')
  await expect(page).toHaveURL(/\/entrar/)
})
