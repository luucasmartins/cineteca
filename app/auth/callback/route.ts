import { NextResponse } from 'next/server'
import { caminhoDeRetorno } from '@/lib/auth/validacao'
import { criarClienteServidor } from '@/lib/supabase/servidor'

// Retorno do "Continuar com Google": troca o código por uma sessão.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const codigo = url.searchParams.get('code')
  const voltar = caminhoDeRetorno(url.searchParams.get('voltar'))

  if (codigo) {
    const supabase = await criarClienteServidor()
    const { error } = await supabase.auth.exchangeCodeForSession(codigo)
    if (!error) return NextResponse.redirect(new URL(voltar, url.origin))
    console.error('[CineTeca] retorno do Google falhou:', error.code ?? error.name)
  }
  return NextResponse.redirect(new URL(`/entrar?erro=google&voltar=${encodeURIComponent(voltar)}`, url.origin))
}
