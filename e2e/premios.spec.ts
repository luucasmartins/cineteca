import { expect, test } from './conta/fixtures'

test.describe('Prêmios', () => {
  const secao = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Prêmios' })

  test('mostra as abas dos prêmios acima da Visão & Construção, com vitórias e indicações', async ({ page }) => {
    await page.goto('/filme/1001')
    const premios = secao(page)

    const abas = premios.getByRole('tab')
    await expect(abas).toHaveCount(3)
    const oscar = premios.getByRole('tab', { name: /Oscar/ })
    await expect(oscar).toHaveAttribute('aria-selected', 'true')
    await expect(oscar).toContainText('2 vitórias · 1 indicação')
    await expect(premios.getByRole('tab', { name: /BAFTA/ })).toContainText('1 vitória')
    await expect(premios.getByRole('tab', { name: /Globo de Ouro/ })).toContainText('1 vitória · 1 indicação')

    const painel = premios.getByRole('tabpanel')
    const itens = painel.getByRole('listitem')
    await expect(itens).toHaveCount(3)
    await expect(itens.nth(0)).toHaveText(/Venceu\s*Melhor Fotografia — Fotógrafo Teste/)
    await expect(itens.nth(1)).toHaveText(/Venceu\s*Melhor Direção de Arte — Cenógrafo Dois e Diretora de Arte/)
    await expect(itens.nth(2)).toHaveText(/Indicado\s*Melhor Filme/)

    const visao = page.getByRole('region', { name: 'Visão & Construção' })
    expect((await premios.boundingBox())!.y).toBeLessThan((await visao.boundingBox())!.y)
  })

  test('troca de aba com clique e com as setas do teclado', async ({ page }) => {
    await page.goto('/filme/1001')
    const premios = secao(page)

    await premios.getByRole('tab', { name: /BAFTA/ }).click()
    await expect(premios.getByRole('tab', { name: /BAFTA/ })).toHaveAttribute('aria-selected', 'true')
    await expect(premios.getByRole('tabpanel').getByRole('listitem')).toHaveCount(1)

    await page.keyboard.press('ArrowRight')
    const globo = premios.getByRole('tab', { name: /Globo de Ouro/ })
    await expect(globo).toHaveAttribute('aria-selected', 'true')
    await expect(globo).toBeFocused()
    await expect(premios.getByRole('tabpanel')).toContainText('Melhor Filme – Drama')

    await page.keyboard.press('ArrowRight')
    await expect(premios.getByRole('tab', { name: /Oscar/ })).toBeFocused()
  })

  test('filme com um só prêmio mostra o bloco sem abas', async ({ page }) => {
    await page.goto('/filme/1002')
    const premios = secao(page)
    await expect(premios.getByText('Festival de Cannes')).toBeVisible()
    await expect(premios.getByRole('tablist')).toHaveCount(0)
    await expect(premios.getByRole('listitem')).toHaveText(/Venceu\s*Palma de Ouro$/)
  })

  test('filme sem prêmios não mostra a seção', async ({ page }) => {
    await page.goto('/filme/1005')
    await expect(page.getByRole('region', { name: 'Elenco principal' })).toBeVisible()
    await expect(secao(page)).toHaveCount(0)
  })

  test('falha do Wikidata esconde a seção e o resto da página segue normal', async ({ page }) => {
    await page.goto('/filme/1003')
    await expect(page.getByRole('region', { name: 'Visão & Construção' })).toBeVisible()
    await expect(secao(page)).toHaveCount(0)
  })
})
