import { NextResponse } from 'next/server'
import { lerIdPositivo, lerPagina } from '@/lib/parametros'
import { discoverByGenre, searchMovies } from '@/lib/tmdb/filmes'
import { ORDENS_GENERO, type OrdemGenero, type PaginaFilmes } from '@/lib/tmdb/tipos'

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status })
}

function sucesso(pagina: PaginaFilmes) {
  return NextResponse.json(pagina, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const pagina = lerPagina(params.get('pagina'))
  if (pagina === null) return erro('Página inválida', 400)

  const tipo = params.get('tipo')
  let carregar: () => Promise<PaginaFilmes>

  if (tipo === 'genero') {
    const id = lerIdPositivo(params.get('id'))
    if (id === null) return erro('Gênero inválido', 400)
    const ordem = (params.get('ordem') ?? 'popularidade') as OrdemGenero
    if (!ORDENS_GENERO.includes(ordem)) return erro('Ordem inválida', 400)
    carregar = () => discoverByGenre(id, ordem, pagina)
  } else if (tipo === 'busca') {
    const termo = (params.get('q') ?? '').trim()
    if (!termo) return erro('Busca vazia', 400)
    carregar = () => searchMovies(termo, pagina)
  } else {
    return erro('Tipo inválido', 400)
  }

  try {
    return sucesso(await carregar())
  } catch {
    return erro('Não foi possível carregar', 502)
  }
}
