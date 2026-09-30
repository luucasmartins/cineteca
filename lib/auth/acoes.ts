'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { lerUrlSite } from '@/lib/supabase/config'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { MENSAGENS, mensagemDoErroAuth } from './erros'
import { caminhoDeRetorno, validarEmail, validarNome, validarSenha } from './validacao'

export type EstadoFormulario = { erro: string | null; sucesso?: string | null; email?: string; nome?: string }

type ErroAuth = { code?: string; status?: number; name?: string }

function campo(formData: FormData, nome: string): string {
  const valor = formData.get(nome)
  return typeof valor === 'string' ? valor : ''
}

function registrar(acao: string, erro: ErroAuth) {
  console.error(`[CineTeca] ${acao} falhou:`, erro.code ?? erro.name ?? `status ${erro.status ?? '?'}`)
}

// Mensagem para a tela; registra no log só o que não é erro "esperado" da pessoa.
function falhaAuth(acao: string, erro: ErroAuth): string {
  const mensagem = mensagemDoErroAuth(erro)
  if (mensagem === MENSAGENS.generico || mensagem === MENSAGENS.conexao) registrar(acao, erro)
  return mensagem
}

export async function entrar(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const emailDigitado = campo(formData, 'email')
  const email = validarEmail(emailDigitado)
  const senha = campo(formData, 'senha')
  const voltar = caminhoDeRetorno(campo(formData, 'voltar'))
  if (!email.ok) return { erro: email.erro, email: emailDigitado }
  if (!senha) return { erro: MENSAGENS.senhaVazia, email: email.valor }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email: email.valor, password: senha })
  if (error) return { erro: falhaAuth('entrar', error), email: email.valor }

  revalidatePath('/', 'layout')
  redirect(voltar)
}

export async function cadastrar(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = { nome: campo(formData, 'nome'), email: campo(formData, 'email') }
  const nome = validarNome(valores.nome)
  const email = validarEmail(valores.email)
  const senha = validarSenha(campo(formData, 'senha'))
  const voltar = caminhoDeRetorno(campo(formData, 'voltar'))
  if (!nome.ok) return { erro: nome.erro, ...valores }
  if (!email.ok) return { erro: email.erro, ...valores }
  if (!senha.ok) return { erro: senha.erro, ...valores }

  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.auth.signUp({
    email: email.valor,
    password: senha.valor,
    options: { data: { nome: nome.valor } },
  })
  if (error) return { erro: falhaAuth('cadastrar', error), ...valores }
  if (!data.session) {
    console.error('[CineTeca] cadastro sem sessão: confira se "Confirm email" está desligado no Supabase')
    return { erro: MENSAGENS.generico, ...valores }
  }

  revalidatePath('/', 'layout')
  redirect(voltar)
}

export async function entrarComGoogle(formData: FormData): Promise<void> {
  const voltar = caminhoDeRetorno(campo(formData, 'voltar'))
  const supabase = await criarClienteServidor()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${lerUrlSite()}/auth/callback?voltar=${encodeURIComponent(voltar)}` },
  })
  if (error || !data.url) {
    if (error) registrar('entrarComGoogle', error)
    redirect(`/entrar?erro=google&voltar=${encodeURIComponent(voltar)}`)
  }
  redirect(data.url)
}

export async function sair(): Promise<void> {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
