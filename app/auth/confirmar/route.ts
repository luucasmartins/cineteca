import { NextResponse } from 'next/server'
import { caminhoDeRetorno } from '@/lib/auth/validacao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

// Link do e-mail de "Esqueci minha senha": valida o token e cria a sessão.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const tipo = url.searchParams.get('type')
  const voltar = caminhoDeRetorno(url.searchParams.get('voltar'))

  if (tokenHash && tipo === 'recovery') {
    const supabase = await criarClienteServidor()
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(voltar, url.origin))
    console.error('[CineTeca] link de recuperação recusado:', error.code ?? error.name)
  }
  return NextResponse.redirect(new URL('/recuperar-senha?erro=expirado', url.origin))
}
