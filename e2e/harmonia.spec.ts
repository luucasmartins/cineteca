import type { Page } from '@playwright/test'
import { expect, test } from './conta/fixtures'

/** Imagem BMP 2×2 de uma cor só. O navegador decodifica sem biblioteca. */
function bmp([r, g, b]: [number, number, number]): Buffer {
  const linha = Buffer.from([b, g, r, b, g, r, 0, 0]) // 2 pixels BGR + 2 bytes de alinhamento
  const pixels = Buffer.concat([linha, linha])
  const cabecalho = Buffer.alloc(54)
  cabecalho.write('BM', 0)
  cabecalho.writeUInt32LE(54 + pixels.length, 2)
  cabecalho.writeUInt32LE(54, 10)
  cabecalho.writeUInt32LE(40, 14)
  cabecalho.writeInt32LE(2, 18)
  cabecalho.writeInt32LE(2, 22)
  cabecalho.writeUInt16LE(1, 26)
  cabecalho.writeUInt16LE(24, 28)
  cabecalho.writeUInt32LE(pixels.length, 34)
  return Buffer.concat([cabecalho, pixels])
}

const VERMELHO: [number, number, number] = [255, 0, 0]
const AZUL: [number, number, number] = [0, 0, 255]

/** Cenas pequenas do TMDB: a 1ª de cada filme é vermelha, as outras azuis. Com `falhar`, todas dão 404. */
async function simularCenas(page: Page, falhar = false) {
  await page.route('https://image.tmdb.org/t/p/w300/**', (rota) => {
    if (falhar) return rota.fulfill({ status: 404 })
    const nome = new URL(rota.request().url()).pathname.split('/').pop() ?? ''
    const cor = /-1\.jpg$/.test(nome) || nome.startsWith('cena-') ? VERMELHO : AZUL
    return rota.fulfill({
      status: 200,
      contentType: 'image/bmp',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: bmp(cor),
    })
  })
}

const grade = (page: Page) => page.getByRole('main').getByRole('list').first()

test.describe('Harmonia de cores', () => {
  test('mostra 12 paletas com as cores das cenas, na proporção certa', async ({ page }) => {
    await simularCenas(page)
    await page.goto('/harmonia')
    await expect(page.getByRole('heading', { name: 'Escolha pela harmonia de cores' })).toBeVisible()

    const cartoes = page.getByRole('button', { name: /^Revelar o filme de/ })
    await expect(cartoes).toHaveCount(12)

    const faixas = cartoes.first().locator('[data-cor]')
    await expect(faixas).toHaveCount(2)
    // 2 cenas azuis e 1 vermelha: azul primeiro, com o dobro da altura.
    await expect(faixas.nth(0)).toHaveAttribute('data-cor', '#0000ff')
    await expect(faixas.nth(1)).toHaveAttribute('data-cor', '#ff0000')
    const [alturaAzul, alturaVermelha] = await Promise.all([faixas.nth(0).boundingBox(), faixas.nth(1).boundingBox()])
    expect(alturaAzul!.height / alturaVermelha!.height).toBeCloseTo(2, 0)
  })

  test('revelar mostra o filme e leva o foco para o link', async ({ page }) => {
    await simularCenas(page)
    await page.goto('/harmonia')
    const primeiro = page.getByRole('button', { name: /^Revelar o filme de/ }).first()
    await expect(primeiro).toBeVisible()
    await primeiro.click()

    const link = page.getByRole('link', { name: 'Ver filme →' })
    await expect(link).toBeFocused()
    await expect(link).toHaveAttribute('href', /^\/filme\/9000\d\d$/)
    await expect(page.getByRole('button', { name: /^Revelar o filme de/ })).toHaveCount(11)
  })

  test('"Outras paletas" sorteia de novo', async ({ page }) => {
    await simularCenas(page)
    await page.goto('/harmonia')
    await expect(page.getByRole('button', { name: /^Revelar o filme de/ })).toHaveCount(12)

    let pedidos = 0
    page.on('request', (r) => {
      if (r.url().includes('/api/harmonia')) pedidos++
    })
    await page.getByRole('button', { name: 'Outras paletas' }).click()
    await expect.poll(() => pedidos).toBe(1)
    await expect(page.getByRole('button', { name: /^Revelar o filme de/ })).toHaveCount(12)
  })

  test('falha no sorteio mostra o aviso e "Tentar de novo" recupera', async ({ page }) => {
    await simularCenas(page)
    let falhar = true
    await page.route('**/api/harmonia', (rota) => (falhar ? rota.fulfill({ status: 502, json: { erro: true } }) : rota.continue()))
    await page.goto('/harmonia')
    await expect(page.getByText('Não foi possível carregar as paletas.')).toBeVisible()

    falhar = false
    await page.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByRole('button', { name: /^Revelar o filme de/ })).toHaveCount(12)
  })

  test('cenas que não carregam mostram "Paleta indisponível"', async ({ page }) => {
    await simularCenas(page, true)
    await page.goto('/harmonia')
    await expect(page.getByText('Paleta indisponível')).toHaveCount(12)
  })

  test('o menu leva à página', async ({ page, isMobile }) => {
    await page.goto('/')
    if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
    await page.getByRole('link', { name: 'Harmonia de cores' }).click()
    await expect(page).toHaveURL(/\/harmonia$/)
  })

  test('a página do filme mostra a paleta no topo da seção Imagens', async ({ page }) => {
    await simularCenas(page)
    await page.goto('/filme/1001')
    const imagens = page.getByRole('region', { name: 'Imagens', exact: true })
    await expect(imagens.getByText('Paleta de cores')).toBeVisible()
    await expect(imagens.getByText('#FF0000')).toBeVisible()
  })
})
