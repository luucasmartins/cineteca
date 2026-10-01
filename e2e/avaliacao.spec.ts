import { clienteAdmin, apagarUsuarioTeste } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

const FILME = 1001
const bloco = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Você já viu esse filme?' })

test('sem conta, votar abre a janela de login', async ({ page }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Entre para salvar seus filmes' })).toBeVisible()
})

test('votar, ver o próprio voto e desfazer', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti', exact: true }).click()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()

  await expect
    .poll(async () => {
      const { data } = await clienteAdmin()
        .from('avaliacoes')
        .select('curtiu')
        .eq('usuario_id', logado.id)
        .eq('filme_id', FILME)
      return data?.length ?? 0
    })
    .toBe(1)

  await bloco(page).getByRole('button', { name: 'Mudar meu voto' }).click()
  await bloco(page).getByRole('button', { name: 'Curti', exact: true }).click()
  await expect(bloco(page).getByRole('button', { name: 'Não curti', exact: true })).toBeVisible()
  await expect(bloco(page).getByText('Você curtiu.')).toHaveCount(0)
})

test('mudar de curti para não curti', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti', exact: true }).click()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()
  await bloco(page).getByRole('button', { name: 'Mudar meu voto' }).click()
  await bloco(page).getByRole('button', { name: 'Não curti', exact: true }).click()
  await expect(bloco(page).getByText('Você não curtiu.')).toBeVisible()
})

test('o voto continua lá depois de recarregar', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti', exact: true }).click()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()
  await page.reload()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()
})

test('clique duplo rápido gera um voto só', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti', exact: true }).dblclick()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()
  const { data } = await clienteAdmin()
    .from('avaliacoes')
    .select('filme_id')
    .eq('usuario_id', logado.id)
  expect(data).toHaveLength(1)
})

test('se a gravação for recusada, a tela desfaz e avisa', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await apagarUsuarioTeste(logado) // a conta some com a página aberta
  await bloco(page).getByRole('button', { name: 'Curti', exact: true }).click()
  await expect(
    page
      .getByText('Não foi possível salvar. Tente de novo.')
      .or(page.getByRole('dialog', { name: 'Entre para salvar seus filmes' })),
  ).toBeVisible()
  await expect(bloco(page).getByText('Você curtiu.')).toHaveCount(0)
})

test('o bloco não mostra percentual enquanto o filme tem poucos votos', async ({ page, logado }) => {
  await page.goto(`/filme/${FILME}`)
  await bloco(page).getByRole('button', { name: 'Curti', exact: true }).click()
  await expect(bloco(page).getByText('Você curtiu.')).toBeVisible()
  await expect(bloco(page).getByText(/das pessoas curtiram/)).toHaveCount(0)
})
