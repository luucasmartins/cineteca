import type { Metadata } from 'next'
import { CONTEUDO } from '@/components/estilos'
import { GradeInfinita } from '@/components/GradeInfinita'
import { MensagemErro } from '@/components/MensagemErro'
import { searchMovies } from '@/lib/tmdb/filmes'
import type { PaginaFilmes } from '@/lib/tmdb/tipos'

type Props = { searchParams: Promise<{ q?: string | string[] }> }

async function lerTermo(searchParams: Props['searchParams']) {
  const { q } = await searchParams
  return (typeof q === 'string' ? q : '').trim()
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const termo = await lerTermo(searchParams)
  return { title: termo ? `Busca: ${termo}` : 'Busca' }
}

export default async function PaginaBusca({ searchParams }: Props) {
  const termo = await lerTermo(searchParams)

  if (!termo) {
    return (
      <div className={`${CONTEUDO} pb-8 pt-24`}>
        <h1 className="mb-6 text-3xl font-extrabold md:text-4xl">Busca</h1>
        <p className="text-lg text-white/70">Digite o nome de um filme</p>
      </div>
    )
  }

  let inicial: PaginaFilmes | null = null
  try {
    inicial = await searchMovies(termo, 1)
  } catch {
    inicial = null
  }

  return (
    <div className={`${CONTEUDO} pb-8 pt-24`}>
      <h1 className="mb-6 text-2xl font-extrabold md:text-3xl">Resultados para &quot;{termo}&quot;</h1>
      {!inicial ? (
        <MensagemErro />
      ) : inicial.results.length === 0 ? (
        <p className="text-lg text-white/70">Nenhum filme encontrado para &quot;{termo}&quot;</p>
      ) : (
        <GradeInfinita key={termo} inicial={inicial} endpoint={`/api/filmes?tipo=busca&q=${encodeURIComponent(termo)}`} />
      )}
    </div>
  )
}
