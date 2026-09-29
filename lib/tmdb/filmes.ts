import 'server-only'
import { tmdbFetch, type ParametrosTmdb } from './client'
import { CACHE_GENEROS_SEGUNDOS, CACHE_LISTAS_SEGUNDOS, REGIAO } from './config'
import { normalizarResumo } from './normalizar'
import type { Genero, OrdemGenero, PaginaFilmes, TmdbPaginaBruta } from './tipos'

const LIMITE_PAGINAS_TMDB = 500

export async function getGenres(): Promise<Genero[]> {
  const dados = await tmdbFetch<{ genres: Genero[] }>('/genre/movie/list', {}, CACHE_GENEROS_SEGUNDOS)
  return dados.genres
}

async function buscarPagina(caminho: string, params: ParametrosTmdb): Promise<PaginaFilmes> {
  const [dados, generos] = await Promise.all([
    tmdbFetch<TmdbPaginaBruta>(caminho, params, CACHE_LISTAS_SEGUNDOS),
    getGenres().catch((): Genero[] => []),
  ])
  const mapa = new Map(generos.map((g) => [g.id, g.name]))
  return {
    results: dados.results.map((filme) => normalizarResumo(filme, mapa)),
    page: dados.page,
    totalPages: Math.min(dados.total_pages, LIMITE_PAGINAS_TMDB),
  }
}

export function getTrending(): Promise<PaginaFilmes> {
  return buscarPagina('/trending/movie/day', { page: 1 })
}

export function getPopular(page = 1): Promise<PaginaFilmes> {
  return buscarPagina('/movie/popular', { page, region: REGIAO })
}

export function getNowPlaying(page = 1): Promise<PaginaFilmes> {
  return buscarPagina('/movie/now_playing', { page, region: REGIAO })
}

export function getTopRated(page = 1): Promise<PaginaFilmes> {
  return buscarPagina('/movie/top_rated', { page, region: REGIAO })
}

function parametrosDeOrdem(ordem: OrdemGenero): ParametrosTmdb {
  switch (ordem) {
    case 'nota':
      return { sort_by: 'vote_average.desc', 'vote_count.gte': 300 }
    case 'lancamento':
      return {
        sort_by: 'primary_release_date.desc',
        'vote_count.gte': 10,
        'primary_release_date.lte': new Date().toISOString().slice(0, 10),
      }
    default:
      return { sort_by: 'popularity.desc' }
  }
}

export function discoverByGenre(genreId: number, ordem: OrdemGenero, page = 1): Promise<PaginaFilmes> {
  return buscarPagina('/discover/movie', {
    with_genres: genreId,
    page,
    include_adult: false,
    ...parametrosDeOrdem(ordem),
  })
}

export function searchMovies(query: string, page = 1): Promise<PaginaFilmes> {
  return buscarPagina('/search/movie', { query, page, include_adult: false })
}
