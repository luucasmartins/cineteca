import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { lerConfigSupabase } from '@/lib/supabase/config'

// Renova a sessão do Supabase (o token de acesso expira) antes de cada página.
export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request })

  let ajustes: { url: string; chavePublica: string }
  try {
    ajustes = lerConfigSupabase()
  } catch {
    return resposta
  }

  const supabase = createServerClient(ajustes.url, ajustes.chavePublica, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesParaGravar) {
        for (const { name, value } of cookiesParaGravar) request.cookies.set(name, value)
        resposta = NextResponse.next({ request })
        for (const { name, value, options } of cookiesParaGravar) resposta.cookies.set(name, value, options)
      },
    },
  })

  try {
    await supabase.auth.getUser()
  } catch (erro) {
    console.error('[CineTeca] Falha ao renovar a sessão:', (erro as Error).name)
  }
  return resposta
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/filmes|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
