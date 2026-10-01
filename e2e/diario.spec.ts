import { expect, test } from './conta/fixtures'
import { esperarAssistido, limparAssistidos } from './conta/ajudantes'

test.afterEach(async ({ usuario }) => {
  await limparAssistidos(usuario)
})

test('registra Assisti, vê no diário, edita e apaga', async ({ page, logado }) => {
  await page.goto('/filme/1001')
  await page.getByRole('button', { name: 'Assisti' }).click()
  await page.getByRole('button', { name: 'Registrar' }).click()

  await esperarAssistido(logado, 1001)

  await page.reload()
  await expect(page.getByText(/Você viu 1 vez/)).toBeVisible()

  await page.goto('/diario')
  await expect(page.getByText('Filme Teste 1001')).toBeVisible()

  // Editar
  await page.getByRole('button', { name: /editar/i }).first().click()
  await page.getByLabel(/anotação/i).fill('Ótimo filme')
  await page.getByRole('button', { name: /salvar/i }).click()

  // Apagar
  await page.getByText('Excluir').first().click()
  await page.getByText('Confirmar exclusão').click()
  await expect(page.getByText('Filme Teste 1001')).toBeHidden()
})

test('dashboard mostra números após 3 registros', async ({ page, logado }) => {
  for (const id of [1001, 1002, 1004]) {
    await page.goto(`/filme/${id}`)
    await page.getByRole('button', { name: 'Assisti' }).click()
    await page.getByRole('button', { name: 'Registrar' }).click()
    await esperarAssistido(logado, id)
  }

  await page.goto('/diario?aba=numeros')
  await expect(page.getByText('3')).toBeVisible()
  await expect(page.getByText(/202/)).toBeVisible()
})
