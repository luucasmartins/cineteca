import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CONTEUDO } from '@/components/estilos'
import { GradeInfinita } from '@/components/GradeInfinita'
import { MensagemErro } from '@/components/MensagemErro'
import { SeletorOrdem } from '@/components/SeletorOrdem'
import { lerIdPositivo } from '@/lib/parametros'
import { discoverByGenre, getGenres } from '@/lib/tmdb/filmes'
import { ORDENS_GENERO, type Genero, type OrdemGenero, type PaginaFilmes } from '@/lib/tmdb/tipos'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ordem?: string | string[] }>
}

async function carregarGenero(idTexto: string): Promise<{ id: number; nome: string }> {
  const id = lerIdPositivo(idTexto)
  if (id === null) notFound()
  const generos = await getGenres().catch((): Genero[] | null => null)
  const genero = generos?.find((g) => g.id === id)
  if (generos && !genero) notFound()
  return { id, nome: genero?.name ?? 'Filmes' }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nome } = await carregarGenero((await params).id)
  return { title: nome }
}

export default async function PaginaGenero({ params, searchParams }: Props) {
  const { id, nome } = await carregarGenero((await params).id)
  const { ordem: ordemBruta } = await searchParams
  const ordem: OrdemGenero =
    typeof ordemBruta === 'string' && ORDENS_GENERO.includes(ordemBruta as OrdemGenero) ? (ordemBruta as OrdemGenero) : 'popularidade'

  let inicial: PaginaFilmes | null = null
  try {
    inicial = await discoverByGenre(id, ordem, 1)
  } catch {
    inicial = null
  }

  return (
    <div className={`${CONTEUDO} pb-8 pt-24`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold md:text-4xl">{nome}</h1>
        <SeletorOrdem caminhoBase={`/genero/${id}`} atual={ordem} />
      </div>
      {!inicial ? (
        <MensagemErro />
      ) : inicial.results.length === 0 ? (
        <p className="text-lg text-white/70">Nenhum filme encontrado.</p>
      ) : (
        <GradeInfinita key={ordem} inicial={inicial} endpoint={`/api/filmes?tipo=genero&id=${id}&ordem=${ordem}`} />
      )}
    </div>
  )
}
