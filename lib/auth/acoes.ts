'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { lerUrlSite } from '@/lib/supabase/config'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { MENSAGENS, mensagemDoErroAuth } from './erros'
import { caminhoDeRetorno, validarConfirmacao, validarEmail, validarNome, validarSenha } from './validacao'

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

export type EstadoRecuperacao = { erro: string | null; enviado: boolean }

export async function recuperarSenha(_estado: EstadoRecuperacao, formData: FormData): Promise<EstadoRecuperacao> {
  const email = validarEmail(campo(formData, 'email'))
  if (!email.ok) return { erro: email.erro, enviado: false }

  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.resetPasswordForEmail(email.valor, {
    redirectTo: `${lerUrlSite()}/redefinir-senha`,
  })
  if (error) {
    const mensagem = mensagemDoErroAuth(error)
    if (mensagem === MENSAGENS.limite) return { erro: mensagem, enviado: false }
    // Outros erros não aparecem para não revelar quem tem conta.
    registrar('recuperarSenha', error)
  }
  return { erro: null, enviado: true }
}

export async function redefinirSenha(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const senha = validarSenha(campo(formData, 'senha'))
  if (!senha.ok) return { erro: senha.erro }
  const confirmacao = validarConfirmacao(senha.valor, campo(formData, 'confirmacao'))
  if (!confirmacao.ok) return { erro: confirmacao.erro }

  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return { erro: MENSAGENS.linkExpirado }
  const { error } = await supabase.auth.updateUser({ password: senha.valor })
  if (error) return { erro: falhaAuth('redefinirSenha', error) }

  revalidatePath('/', 'layout')
  redirect('/?aviso=senha-alterada')
}

async function usuarioObrigatorio() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/entrar?voltar=%2Fconta')
  return { supabase, usuario: data.user }
}

export async function atualizarNome(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const digitado = campo(formData, 'nome')
  const nome = validarNome(digitado)
  if (!nome.ok) return { erro: nome.erro, nome: digitado }

  const { supabase, usuario } = await usuarioObrigatorio()
  const { error } = await supabase.from('perfis').update({ nome: nome.valor }).eq('id', usuario.id)
  if (error) {
    console.error('[CineTeca] atualizarNome falhou:', error.code)
    return { erro: MENSAGENS.generico, nome: nome.valor }
  }
  revalidatePath('/', 'layout')
  return { erro: null, sucesso: 'Nome atualizado', nome: nome.valor }
}

export async function trocarSenha(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const senha = validarSenha(campo(formData, 'senha'))
  if (!senha.ok) return { erro: senha.erro }
  const confirmacao = validarConfirmacao(senha.valor, campo(formData, 'confirmacao'))
  if (!confirmacao.ok) return { erro: confirmacao.erro }

  const { supabase } = await usuarioObrigatorio()
  const { error } = await supabase.auth.updateUser({ password: senha.valor })
  if (error) return { erro: falhaAuth('trocarSenha', error) }
  return { erro: null, sucesso: 'Senha alterada' }
}

export async function excluirConta(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  if (campo(formData, 'confirmacao') !== 'EXCLUIR') return { erro: 'Digite EXCLUIR para confirmar' }

  const { supabase, usuario } = await usuarioObrigatorio()
  const { error } = await criarClienteAdmin().auth.admin.deleteUser(usuario.id)
  if (error) {
    registrar('excluirConta', error)
    return { erro: MENSAGENS.generico }
  }
  // A conta já não existe; só limpa os cookies desta sessão.
  await supabase.auth.signOut({ scope: 'local' })
  revalidatePath('/', 'layout')
  redirect('/?aviso=conta-excluida')
}
