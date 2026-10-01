import { obterRanking } from '@/lib/avaliacoes/banco'
import type { MovieSummary } from '@/lib/tmdb/tipos'
import { Carrossel } from './Carrossel'

const TITULO = 'Mais curtidos na CineTeca'
// Com menos de 3 filmes qualificados a fileira ficaria pela metade: melhor não aparecer.
const MINIMO_DE_FILMES = 3

export async function FileiraRanking() {
  const itens = await obterRanking(20)
  if (itens.length < MINIMO_DE_FILMES) return null

  // O ranking guarda só o necessário para exibir; o resto do MovieSummary fica vazio.
  const filmes: MovieSummary[] = itens.map((i) => ({
    id: i.filmeId,
    title: i.titulo,
    overview: '',
    posterUrl: i.posterUrl,
    backdropUrl: null,
    year: i.ano,
    rating: null,
    genres: [],
  }))

  return <Carrossel titulo={TITULO} filmes={filmes} verMaisHref="/mais-curtidos" />
}
