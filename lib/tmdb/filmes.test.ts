import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', () => ({ tmdbFetch: vi.fn() }))

import { tmdbFetch, type ParametrosTmdb } from './client'
import { discoverByGenre, getGenres, getNowPlaying, getPopular, getTopRated, getTrending, searchMovies } from './filmes'

const tmdbFetchMock = vi.mocked(tmdbFetch)

const GENEROS = { genres: [{ id: 28, name: 'Ação' }, { id: 35, name: 'Comédia' }] }

function paginaBruta(totalPaginas = 3) {
  return {
    page: 1,
    total_pages: totalPaginas,
    total_results: totalPaginas * 20,
    results: [{ id: 10, title: 'Filme A', genre_ids: [28, 35], vote_average: 7, vote_count: 5 }],
  }
}

function responderCom(rotas: Record<string, unknown>) {
  tmdbFetchMock.mockImplementation((async (caminho: string) => {
    if (caminho in rotas) {
      const valor = rotas[caminho]
      if (valor instanceof Error) throw valor
      return valor
    }
    throw new Error(`caminho inesperado: ${caminho}`)
  }) as typeof tmdbFetch)
}

function chamadaPara(caminho: string) {
  const chamada = tmdbFetchMock.mock.calls.find(([c]) => c === caminho)
  if (!chamada) throw new Error(`${caminho} não foi chamado`)
  return { params: chamada[1], revalidate: chamada[2] }
}

beforeEach(() => {
  tmdbFetchMock.mockReset()
})

describe('getGenres', () => {
  it('busca a lista de gêneros com cache de 24 h', async () => {
    responderCom({ '/genre/movie/list': GENEROS })
    expect(await getGenres()).toEqual(GENEROS.genres)
    expect(chamadaPara('/genre/movie/list').revalidate).toBe(86400)
  })
})

describe('listas', () => {
  it('getPopular pede a página e a região BR, com cache de 6 h, e traduz os gêneros', async () => {
    responderCom({ '/movie/popular': paginaBruta(), '/genre/movie/list': GENEROS })
    const pagina = await getPopular(2)
    expect(chamadaPara('/movie/popular')).toEqual({ params: { page: 2, region: 'BR' }, revalidate: 21600 })
    expect(pagina.page).toBe(1)
    expect(pagina.totalPages).toBe(3)
    expect(pagina.results[0]).toMatchObject({ id: 10, title: 'Filme A', genres: ['Ação', 'Comédia'] })
  })

  it('getTrending, getNowPlaying e getTopRated usam os endpoints certos', async () => {
    responderCom({
      '/trending/movie/day': paginaBruta(),
      '/movie/now_playing': paginaBruta(),
      '/movie/top_rated': paginaBruta(),
      '/genre/movie/list': GENEROS,
    })
    await getTrending()
    await getNowPlaying()
    await getTopRated()
    expect(chamadaPara('/trending/movie/day').params).toEqual({ page: 1 })
    expect(chamadaPara('/movie/now_playing').params).toEqual({ page: 1, region: 'BR' })
    expect(chamadaPara('/movie/top_rated').params).toEqual({ page: 1, region: 'BR' })
  })

  it('continua funcionando sem nomes de gênero quando a lista de gêneros falha', async () => {
    responderCom({ '/movie/popular': paginaBruta(), '/genre/movie/list': new Error('fora do ar') })
    const pagina = await getPopular()
    expect(pagina.results[0].genres).toEqual([])
  })

  it('limita totalPages a 500 (limite do TMDB)', async () => {
    responderCom({ '/movie/popular': paginaBruta(40000), '/genre/movie/list': GENEROS })
    expect((await getPopular()).totalPages).toBe(500)
  })

  it('propaga o erro quando a lista principal falha', async () => {
    responderCom({ '/movie/popular': new Error('TMDB fora do ar'), '/genre/movie/list': GENEROS })
    await expect(getPopular()).rejects.toThrow('TMDB fora do ar')
  })
})

describe('discoverByGenre', () => {
  beforeEach(() => responderCom({ '/discover/movie': paginaBruta(), '/genre/movie/list': GENEROS }))

  it('ordena por popularidade', async () => {
    await discoverByGenre(28, 'popularidade', 3)
    expect(chamadaPara('/discover/movie').params).toMatchObject({
      with_genres: 28,
      page: 3,
      include_adult: false,
      sort_by: 'popularity.desc',
    })
  })

  it('ordena por nota exigindo um mínimo de votos', async () => {
    await discoverByGenre(28, 'nota')
    expect(chamadaPara('/discover/movie').params).toMatchObject({ sort_by: 'vote_average.desc', 'vote_count.gte': 300 })
  })

  it('ordena por lançamento sem incluir filmes futuros', async () => {
    await discoverByGenre(28, 'lancamento')
    const { params } = chamadaPara('/discover/movie')
    expect(params).toMatchObject({ sort_by: 'primary_release_date.desc', 'vote_count.gte': 10 })
    expect(params['primary_release_date.lte']).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('searchMovies', () => {
  it('envia o termo sem alterá-lo', async () => {
    responderCom({ '/search/movie': paginaBruta(), '/genre/movie/list': GENEROS })
    await searchMovies('Amélie & cia', 2)
    expect(chamadaPara('/search/movie').params).toEqual({ query: 'Amélie & cia', page: 2, include_adult: false })
  })
})
