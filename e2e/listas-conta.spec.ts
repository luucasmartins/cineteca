import { apagarPorEmail, apagarUsuarioTeste, entrarPelaTela, esperarNaConta, novoEmail } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

test('favoritar sem login abre a janela e, depois de criar conta, o filme já está salvo', async ({ page }) => {
  const email = novoEmail()
  try {
    await page.goto('/filme/1001')
    const cabecalho = page.getByRole('region', { name: 'Filme Teste 1001' })
    await cabecalho.getByRole('button', { name: 'Favoritar' }).click()
    const janela = page.getByRole('dialog', { name: 'Entre para salvar seus filmes' })
    await expect(janela).toBeVisible()
    await janela.getByRole('link', { name: 'Criar conta' }).click()
    await expect(page).toHaveURL(/\/cadastro\?voltar=%2Ffilme%2F1001$/)
    await page.getByLabel('Nome').fill('Duda')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill('senha-forte-123')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page).toHaveURL(/\/filme\/1001$/)
    await expect(
      page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Favoritar' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('"Filme Teste 1001" adicionado aos favoritos')).toBeVisible()
  } finally {
    await apagarPorEmail(email)
  }
})

test('fechar a janela sem entrar não salva nada', async ({ page }) => {
  await page.goto('/filme/1001')
  const botao = page
    .getByRole('region', { name: 'Filme Teste 1001' })
    .getByRole('button', { name: 'Salvar para assistir' })
  await botao.click()
  const janela = page.getByRole('dialog', { name: 'Entre para salvar seus filmes' })
  await expect(janela).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(janela).toBeHidden()
  await expect(botao).toHaveAttribute('aria-pressed', 'false')
})

test('salvar mostra o aviso e a lista aparece em outro aparelho', async ({ page, logado, browser }) => {
  await page.goto('/filme/1001')
  await page
    .getByRole('region', { name: 'Filme Teste 1001' })
    .getByRole('button', { name: 'Salvar para assistir' })
    .click()
  await expect(page.getByText('"Filme Teste 1001" adicionado aos salvos')).toBeVisible()

  const outroAparelho = await browser.newContext()
  try {
    const outraPagina = await outroAparelho.newPage()
    await entrarPelaTela(outraPagina, logado, '/minha-lista')
    await outraPagina.getByRole('tab', { name: /Salvos para assistir/ }).click()
    await expect(outraPagina.getByRole('link', { name: 'Filme Teste 1001' })).toBeVisible()
  } finally {
    await outroAparelho.close()
  }
})

test('duplo clique rápido não duplica nem desfaz', async ({ page, logado }) => {
  await page.goto('/filme/1001')
  const botao = page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Favoritar' })
  await botao.dblclick()
  await expect(botao).toHaveAttribute('aria-pressed', 'true')
  // Espera a gravação chegar ao banco: sair da página antes disso cancela o pedido.
  await esperarNaConta(logado, 'favoritos', 1001)
  await page.goto('/minha-lista')
  await expect(page.getByRole('tab', { name: 'Favoritos (1)' })).toBeVisible()
})

test('se o banco recusar, a tela desfaz e avisa', async ({ page, logado }) => {
  await page.goto('/filme/1001')
  const botao = page.getByRole('region', { name: 'Filme Teste 1001' }).getByRole('button', { name: 'Favoritar' })
  await expect(botao).toHaveAttribute('aria-pressed', 'false')
  await apagarUsuarioTeste(logado) // a conta some com a página aberta
  await botao.click()
  await expect(
    page
      .getByText('Não foi possível salvar. Tente de novo.')
      .or(page.getByRole('dialog', { name: 'Entre para salvar seus filmes' })),
  ).toBeVisible()
  await expect(botao).toHaveAttribute('aria-pressed', 'false')
})

test('se a lista não carregar, avisa em vez de dizer que está vazia', async ({ page, logado }) => {
  const rota = '**/rest/v1/filmes_lista*'
  await page.route(rota, (r) =>
    r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"fora do ar"}' }),
  )
  await page.goto('/minha-lista')
  await expect(page.getByText('Não foi possível carregar suas listas.')).toBeVisible()
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toHaveCount(0)

  await page.unroute(rota)
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByText('Sua lista de favoritos está vazia.')).toBeVisible()
})

test('Minha lista sem login convida a entrar', async ({ page }) => {
  await page.goto('/minha-lista')
  await expect(page.getByText('Entre para ver seus favoritos e filmes salvos')).toBeVisible()
  await expect(page.getByRole('main').getByRole('link', { name: 'Entrar' })).toHaveAttribute(
    'href',
    '/entrar?voltar=%2Fminha-lista',
  )
  await expect(page.getByRole('main').getByRole('link', { name: 'Criar conta' })).toHaveAttribute(
    'href',
    '/cadastro?voltar=%2Fminha-lista',
  )
})
