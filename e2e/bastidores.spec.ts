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

test.describe('Galeria de imagens', () => {
  const galeria = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Imagens', exact: true })
  const telaCheia = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Imagens de Filme Teste 1001' })

  test('mosaico com 5 quadros e "+3" no último', async ({ page }) => {
    await page.goto('/filme/1001')
    await expect(galeria(page).getByRole('button')).toHaveCount(5)
    await expect(galeria(page).getByText('+3')).toBeVisible()
    await expect(page.getByAltText('Cena 1 de Filme Teste 1001')).toBeVisible()
  })

  test('abre na imagem clicada, troca com setas e teclado, volta ao início e fecha com Esc', async ({ page }) => {
    await page.goto('/filme/1001')
    const segunda = galeria(page).getByRole('button', { name: 'Cena 2 de Filme Teste 1001' })
    await segunda.click()
    await expect(telaCheia(page).getByText('2 de 7')).toBeVisible()

    await page.keyboard.press('ArrowRight')
    await expect(telaCheia(page).getByText('3 de 7')).toBeVisible()
    await telaCheia(page).getByRole('button', { name: 'Imagem anterior' }).click()
    await expect(telaCheia(page).getByText('2 de 7')).toBeVisible()

    for (let i = 0; i < 6; i++) await telaCheia(page).getByRole('button', { name: 'Próxima imagem' }).click()
    await expect(telaCheia(page).getByText('1 de 7')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(telaCheia(page)).toHaveCount(0)
    await expect(segunda).toBeFocused()
  })

  test('o "+3" abre a galeria a partir da quinta imagem', async ({ page }) => {
    await page.goto('/filme/1001')
    await galeria(page).getByRole('button', { name: /Cena 5 de Filme Teste 1001/ }).click()
    await expect(telaCheia(page).getByText('5 de 7')).toBeVisible()
    await telaCheia(page).getByRole('button', { name: 'Fechar' }).click()
    await expect(telaCheia(page)).toHaveCount(0)
  })

  test('Tab não escapa da tela cheia', async ({ page }) => {
    await page.goto('/filme/1001')
    await galeria(page).getByRole('button', { name: 'Cena 1 de Filme Teste 1001' }).click()
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      const dentro = await telaCheia(page).evaluate((el) => el.contains(document.activeElement))
      expect(dentro).toBe(true)
    }
  })

  test('filme sem imagens não mostra a galeria', async ({ page }) => {
    await page.goto('/filme/1005')
    await expect(page.getByRole('region', { name: 'Elenco principal' })).toBeVisible()
    await expect(galeria(page)).toHaveCount(0)
  })
})

test('na tela baixa (celular deitado), o botão Fechar fica visível', async ({ page }) => {
  await page.setViewportSize({ width: 812, height: 375 })
  // Cena de verdade, em 16:9: com o 404 do TMDB simulado a imagem ficaria minúscula e esconderia o problema.
  const cena = '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#335"/></svg>'
  await page.route('https://image.tmdb.org/**', (rota) => rota.fulfill({ contentType: 'image/svg+xml', body: cena }))
  await page.goto('/filme/1001')
  await page.getByRole('region', { name: 'Imagens', exact: true }).getByRole('button', { name: 'Cena 1 de Filme Teste 1001' }).click()
  await expect(page.getByRole('dialog', { name: 'Imagens de Filme Teste 1001' }).getByRole('button', { name: 'Fechar' })).toBeInViewport({ ratio: 1 })
})
