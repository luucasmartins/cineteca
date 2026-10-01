import { expect, test } from './conta/fixtures'
import { esperarSessaoDupla, limparSessoesDuplas } from './conta/ajudantes'

test.afterEach(async ({ usuario }) => {
  await limparSessoesDuplas(usuario)
})

test('cria sessão dupla, abre sem login e apaga', async ({ page, logado }) => {
  await page.goto('/filme/1001')
  await page.getByRole('button', { name: 'Sessão dupla' }).click()

  await page.getByPlaceholder(/buscar/i).fill('matrix')
  await page.getByText('Matrix Reloaded').click()

  await page.getByLabel(/título/i).fill('Dupla Teste')
  await page.getByRole('button', { name: 'Criar' }).click()

  await page.waitForURL(/\/sessao\//)
  await expect(page.getByText('Dupla Teste')).toBeVisible()

  const sessaoId = await esperarSessaoDupla(logado, 'Dupla Teste')

  // Visitante sem login também vê a sessão
  const url = page.url()
  const outroContexto = await page.context().browser()!.newContext()
  const outraPagina = await outroContexto.newPage()
  await outraPagina.goto(url)
  await expect(outraPagina.getByText('Dupla Teste')).toBeVisible()
  await outroContexto.close()

  // Rota de imagem responde PNG
  const resposta = await page.request.get(`/sessao/${sessaoId}/imagem/previa`)
  expect(resposta.status()).toBe(200)
  expect(resposta.headers()['content-type']).toContain('image/png')

  // Apagar pela página /sessoes
  await page.goto('/sessoes')
  await page.getByRole('button', { name: 'Excluir' }).first().click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Dupla Teste')).toBeHidden()
})
