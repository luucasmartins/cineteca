import { expect, test } from './conta/fixtures'

test.describe('Visão & Construção', () => {
  test('mostra a equipe acima do Elenco, juntando funções da mesma pessoa', async ({ page }) => {
    await page.goto('/filme/1001')
    const secao = page.getByRole('region', { name: 'Visão & Construção' })
    await expect(secao.getByText('Quem fez o filme por trás das câmeras')).toBeVisible()

    const diretora = secao.getByRole('listitem').filter({ hasText: 'Diretora Teste' })
    await expect(diretora.getByText('Direção · Roteiro')).toBeVisible()
    await expect(secao.getByRole('listitem')).toHaveCount(4)
    await expect(secao.getByText('Figurinista Teste')).toHaveCount(0)

    const elenco = page.getByRole('region', { name: 'Elenco principal' })
    const topoSecao = (await secao.boundingBox())!.y
    const topoElenco = (await elenco.boundingBox())!.y
    expect(topoSecao).toBeLessThan(topoElenco)
  })

  test('sem foto, ou com foto que não carrega, mostra as iniciais', async ({ page }) => {
    await page.goto('/filme/1001')
    const secao = page.getByRole('region', { name: 'Visão & Construção' })
    await expect(secao.getByRole('listitem').filter({ hasText: 'Fotógrafo Teste' }).getByText('FT', { exact: true })).toBeVisible()
    // A foto simulada da diretora dá 404: o cartão troca para as iniciais.
    await expect(secao.getByRole('listitem').filter({ hasText: 'Diretora Teste' }).getByText('DT', { exact: true })).toBeVisible()
  })

  test('filme sem equipe não mostra a seção', async ({ page }) => {
    await page.goto('/filme/1005')
    await expect(page.getByRole('region', { name: 'Elenco principal' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Visão & Construção' })).toHaveCount(0)
  })
})
