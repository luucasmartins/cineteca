import type { Page } from '@playwright/test'
import { clienteAdmin, entrarPelaTela, novoEmail, sairPeloMenu, type UsuarioTeste } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

async function abrirLinkDeRecuperacao(page: Page, usuario: UsuarioTeste) {
  const { data, error } = await clienteAdmin().auth.admin.generateLink({ type: 'recovery', email: usuario.email })
  if (error) throw error
  await page.goto(`/auth/confirmar?token_hash=${data.properties.hashed_token}&type=recovery&voltar=%2Fredefinir-senha`)
  await expect(page).toHaveURL(/\/redefinir-senha$/)
}

test('pedir o link mostra sempre a mesma mensagem', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
  await expect(page).toHaveURL(/\/recuperar-senha$/)
  await page.getByLabel('E-mail').fill(novoEmail())
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(
    page.getByText('Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.'),
  ).toBeVisible()
})

test('e-mail inválido ao pedir o link', async ({ page }) => {
  await page.goto('/recuperar-senha')
  await page.getByLabel('E-mail').fill('sem-arroba')
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(page.getByText('Digite um e-mail válido')).toBeVisible()
})

test('o link do e-mail permite criar uma nova senha', async ({ page, usuario }) => {
  await abrirLinkDeRecuperacao(page, usuario)
  await page.getByRole('textbox', { name: 'Nova senha', exact: true }).fill('nova-senha-456')
  await page.getByLabel('Confirmar nova senha').fill('nova-senha-456')
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Senha alterada')).toBeVisible()
  await sairPeloMenu(page)
  await entrarPelaTela(page, { email: usuario.email, senha: 'nova-senha-456' })
})

test('senhas diferentes na nova senha', async ({ page, usuario }) => {
  await abrirLinkDeRecuperacao(page, usuario)
  await page.getByRole('textbox', { name: 'Nova senha', exact: true }).fill('nova-senha-456')
  await page.getByLabel('Confirmar nova senha').fill('outra-senha-789')
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page.getByText('As senhas não são iguais')).toBeVisible()
})

test('link inválido leva para pedir outro', async ({ page }) => {
  await page.goto('/auth/confirmar?token_hash=invalido&type=recovery&voltar=%2Fredefinir-senha')
  await expect(page).toHaveURL(/\/recuperar-senha\?erro=expirado$/)
  await expect(page.getByText('Este link expirou. Peça um novo.')).toBeVisible()
})

test('abrir a página de nova senha sem link mostra o aviso', async ({ page }) => {
  await page.goto('/redefinir-senha')
  await expect(page.getByText('Este link expirou. Peça um novo.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pedir um novo link' })).toHaveAttribute('href', '/recuperar-senha')
})
