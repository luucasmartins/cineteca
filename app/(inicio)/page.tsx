import { Suspense } from 'react'
import { BannerDestaque } from '@/components/BannerDestaque'
import { BotaoFureBolha } from '@/components/BotaoFureBolha'
import { BOTAO_PRIMARIO, CONTEUDO } from '@/components/estilos'
import { FileiraEsqueleto } from '@/components/Esqueletos'
import { FileiraAssincrona } from '@/components/FileiraAssincrona'
import { FileiraRanking } from '@/components/FileiraRanking'
import { escolherDestaques } from '@/lib/destaques'
import { discoverByGenre, getNowPlaying, getPopular, getTopRated, getTrending } from '@/lib/tmdb/filmes'
import type { PaginaFilmes } from '@/lib/tmdb/tipos'

const GENEROS_INICIO = [
  { id: 28, nome: 'Ação' },
  { id: 35, nome: 'Comédia' },
  { id: 27, nome: 'Terror' },
  { id: 16, nome: 'Animação' },
  { id: 878, nome: 'Ficção científica' },
]

const FILEIRAS: { titulo: string; carregar: () => Promise<PaginaFilmes>; verMaisHref?: string; automatico?: boolean }[] = [
  { titulo: 'Em alta hoje', carregar: () => getTrending(), automatico: true },
  { titulo: 'Populares', carregar: () => getPopular() },
  { titulo: 'Em cartaz nos cinemas', carregar: () => getNowPlaying() },
  { titulo: 'Mais bem avaliados', carregar: () => getTopRated() },
  ...GENEROS_INICIO.map((g) => ({
    titulo: g.nome,
    carregar: () => discoverByGenre(g.id, 'popularidade'),
    verMaisHref: `/genero/${g.id}`,
  })),
]

export default async function Inicio() {
  const destaques = await getTrending()
    .then((p) => escolherDestaques(p.results))
    .catch(() => [])
  const temBanner = destaques.length > 0

  return (
    <>
      {temBanner ? <BannerDestaque filmes={destaques} /> : <div className="h-24" />}
      <div className={`relative z-10 space-y-6 pb-8 md:space-y-10 ${temBanner ? '-mt-24 md:-mt-40' : ''}`}>
        <div className={`${CONTEUDO} flex flex-wrap items-center gap-x-4 gap-y-2`}>
          <BotaoFureBolha className={BOTAO_PRIMARIO} />
          <p className="text-sm text-white/70">Um filme aclamado, longe do circuito de sempre.</p>
        </div>
        <Suspense fallback={null}>
          <FileiraRanking />
        </Suspense>
        {FILEIRAS.map((fileira) => (
          <Suspense key={fileira.titulo} fallback={<FileiraEsqueleto titulo={fileira.titulo} />}>
            <FileiraAssincrona titulo={fileira.titulo} carregar={fileira.carregar} verMaisHref={fileira.verMaisHref} automatico={fileira.automatico} />
          </Suspense>
        ))}
      </div>
    </>
  )
}
