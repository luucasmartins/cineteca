import { entrarPelaTela, sairPeloMenu } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

test('/conta sem login leva para entrar', async ({ page }) => {
  await page.goto('/conta')
  await expect(page).toHaveURL(/\/entrar\?voltar=%2Fconta$/)
})

test('mostra os dados da conta', async ({ page, logado }) => {
  await page.goto('/conta')
  await expect(page.getByRole('heading', { level: 1, name: 'Minha conta' })).toBeVisible()
  await expect(page.getByLabel('Nome')).toHaveValue(logado.nome)
  await expect(page.getByText(logado.email)).toBeVisible()
})

test('mudar o nome aparece na barra superior', async ({ page, logado }) => {
  await page.goto('/conta')
  await page.getByLabel('Nome').fill('  Carla   Dias ')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Nome atualizado')).toBeVisible()
  await expect(page.getByLabel('Nome')).toHaveValue('Carla Dias')
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await expect(page.getByText('Olá, Carla')).toBeVisible()
})

test('nome vazio mostra mensagem', async ({ page, logado }) => {
  await page.goto('/conta')
  await page.getByLabel('Nome').fill('   ')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Digite seu nome')).toBeVisible()
})

test('trocar a senha e entrar com a nova', async ({ page, logado }) => {
  await page.goto('/conta')
  await page.getByLabel('Nova senha', { exact: true }).fill('senha-trocada-789')
  await page.getByLabel('Confirmar nova senha').fill('senha-trocada-789')
  await page.getByRole('button', { name: 'Trocar senha' }).click()
  await expect(page.getByText('Senha alterada')).toBeVisible()
  await sairPeloMenu(page)
  await entrarPelaTela(page, { email: logado.email, senha: 'senha-trocada-789' })
})

test('trocar a senha com confirmação diferente', async ({ page, logado }) => {
  await page.goto('/conta')
  await page.getByLabel('Nova senha', { exact: true }).fill('senha-trocada-789')
  await page.getByLabel('Confirmar nova senha').fill('outra-coisa-000')
  await page.getByRole('button', { name: 'Trocar senha' }).click()
  await expect(page.getByText('As senhas não são iguais')).toBeVisible()
})

test('excluir a conta exige digitar EXCLUIR e depois impede o login', async ({ page, logado }) => {
  await page.goto('/conta')
  const botao = page.getByRole('button', { name: 'Excluir minha conta' })
  await expect(botao).toBeDisabled()
  await page.getByLabel('Digite EXCLUIR para confirmar').fill('excluir')
  await expect(botao).toBeDisabled()
  await page.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR')
  await expect(botao).toBeEnabled()
  await botao.click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Sua conta foi excluída')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Menu da conta' })).toBeHidden()

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(logado.email)
  await page.getByLabel('Senha').fill(logado.senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('E-mail ou senha incorretos')).toBeVisible()
})

test('Sair na página da conta', async ({ page, logado }) => {
  await page.goto('/conta')
  await page.getByRole('main').getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: 'Menu da conta' })).toBeHidden()
})
