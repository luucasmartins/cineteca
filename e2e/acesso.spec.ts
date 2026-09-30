import { apagarPorEmail, entrarPelaTela, novoEmail, sairPeloMenu } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

test('sem login, a barra mostra Entrar e Criar conta', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  const barra = page.getByRole('navigation', { name: 'Principal' })
  await expect(barra.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible()
  await expect(barra.getByRole('link', { name: 'Criar conta', exact: true })).toBeVisible()
})

test('Criar conta da barra leva de volta para a página onde a pessoa estava', async ({ page, isMobile }) => {
  await page.goto('/filme/1001')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Criar conta', exact: true })
    .click()
  await expect(page).toHaveURL(/\/cadastro\?voltar=%2Ffilme%2F1001$/)
})

test('criar conta leva de volta para onde a pessoa estava, já logada', async ({ page }) => {
  const email = novoEmail()
  try {
    await page.goto('/cadastro?voltar=%2Fgenero%2F35')
    await expect(page.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeVisible()
    await page.getByLabel('Nome').fill('Ana Souza')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill('senha-forte-123')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page).toHaveURL(/\/genero\/35$/)
    await page.getByRole('button', { name: 'Menu da conta' }).click()
    await expect(page.getByText('Olá, Ana')).toBeVisible()
  } finally {
    await apagarPorEmail(email)
  }
})

test('validações do cadastro aparecem com mensagens claras', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Digite seu nome')).toBeVisible()
  await page.getByLabel('Nome').fill('Ana')
  await page.getByLabel('E-mail').fill('ana@email.com')
  await page.getByLabel('Senha').fill('curta')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('A senha precisa ter pelo menos 8 caracteres')).toBeVisible()
  await expect(page.getByLabel('Nome')).toHaveValue('Ana')
})

test('e-mail já cadastrado', async ({ page, usuario }) => {
  await page.goto('/cadastro')
  await page.getByLabel('Nome').fill('Outra Pessoa')
  await page.getByLabel('E-mail').fill(usuario.email)
  await page.getByLabel('Senha').fill('outra-senha-123')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Já existe uma conta com esse e-mail')).toBeVisible()
})

test('senha errada mostra mensagem clara e mantém o e-mail', async ({ page, usuario }) => {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(usuario.email)
  await page.getByLabel('Senha').fill('senha-errada-999')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('E-mail ou senha incorretos')).toBeVisible()
  await expect(page.getByLabel('E-mail')).toHaveValue(usuario.email)
})

test('e-mail com maiúsculas e espaços entra na mesma conta', async ({ page, usuario }) => {
  await entrarPelaTela(page, { email: `  ${usuario.email.toUpperCase()} `, senha: usuario.senha })
  await expect(page.getByRole('button', { name: 'Menu da conta' })).toBeVisible()
})

test('sair mostra o Entrar de novo', async ({ page, logado, isMobile }) => {
  await sairPeloMenu(page)
  await expect(page).toHaveURL(/\/$/)
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(
    page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Entrar', exact: true }),
  ).toBeVisible()
})

test('logado, a barra não mostra mais Entrar nem Criar conta', async ({ page, logado, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  const barra = page.getByRole('navigation', { name: 'Principal' })
  await expect(barra.getByRole('link', { name: 'Entrar', exact: true })).toHaveCount(0)
  await expect(barra.getByRole('link', { name: 'Criar conta', exact: true })).toHaveCount(0)
})

test('quem já está logado e abre /entrar volta para o início', async ({ page, logado }) => {
  await page.goto('/entrar')
  await expect(page).toHaveURL(/\/$/)
})

test('endereço de retorno para fora do site é ignorado', async ({ page, usuario }) => {
  await page.goto('/entrar?voltar=%2F%2Fsite-malicioso.com')
  await page.getByLabel('E-mail').fill(usuario.email)
  await page.getByLabel('Senha').fill(usuario.senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  // O prazo padrão de 5s não cobre o login pelo servidor; os outros testes usam waitForURL, que espera 30s.
  await expect(page).toHaveURL('http://localhost:3100/', { timeout: 20_000 })
})

test('as páginas de acesso oferecem Continuar com Google', async ({ page }) => {
  for (const rota of ['/entrar', '/cadastro']) {
    await page.goto(rota)
    await expect(page.getByRole('button', { name: 'Continuar com Google' })).toBeVisible()
  }
})
