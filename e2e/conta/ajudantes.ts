import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

export type UsuarioTeste = { id: string; email: string; senha: string; nome: string }

// Domínio reservado para testes. Se o Supabase recusar, troque por example.com.
const DOMINIO = 'cineteca.test'

export function clienteAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SECRET_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function novoEmail(): string {
  return `teste+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@${DOMINIO}`
}

export async function criarUsuarioTeste(nome = 'Teste E2E'): Promise<UsuarioTeste> {
  const email = novoEmail()
  const senha = 'senha-de-teste-123'
  const { data, error } = await clienteAdmin().auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })
  if (error) throw error
  return { id: data.user.id, email, senha, nome }
}

export async function apagarUsuarioTeste(u: Pick<UsuarioTeste, 'id'>): Promise<void> {
  // Tolerante: o próprio teste pode já ter excluído a conta.
  await clienteAdmin().auth.admin.deleteUser(u.id)
}

export async function apagarPorEmail(email: string): Promise<void> {
  const { data } = await clienteAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 })
  const usuario = data.users.find((u) => u.email === email)
  if (usuario) await apagarUsuarioTeste(usuario)
}

export async function entrarPelaTela(page: Page, u: Pick<UsuarioTeste, 'email' | 'senha'>, voltar = '/'): Promise<void> {
  await page.goto(`/entrar?voltar=${encodeURIComponent(voltar)}`)
  await page.getByLabel('E-mail').fill(u.email)
  await page.getByLabel('Senha', { exact: true }).fill(u.senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  const destino = new URL(voltar, 'http://x').pathname
  await page.waitForURL((url) => url.pathname === destino)
}

export async function sairPeloMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('button', { name: 'Menu da conta' })).toBeHidden()
}

export async function inserirFilmes(
  u: Pick<UsuarioTeste, 'id'>,
  tipo: 'favoritos' | 'salvos',
  ids: number[],
): Promise<void> {
  const agora = Date.now()
  const linhas = ids.map((id, i) => ({
    usuario_id: u.id,
    tipo,
    filme_id: id,
    titulo: `Filme Teste ${id}`,
    poster_url: null,
    ano: '2024',
    nota: 7.8,
    criado_em: new Date(agora - i * 1000).toISOString(),
  }))
  const { error } = await clienteAdmin().from('filmes_lista').insert(linhas)
  if (error) throw error
}
