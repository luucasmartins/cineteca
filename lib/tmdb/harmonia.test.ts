import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', async () => {
  const real = await vi.importActual<typeof import('./client')>('./client')
  return { TmdbError: real.TmdbError, tmdbFetch: vi.fn() }
})

import { tmdbFetch, TmdbError } from './client'
import { sortearHarmonia } from './harmonia'

const tmdbFetchMock = vi.mocked(tmdbFetch)

const filme = (id: number) => ({ id, title: `Filme ${id}`, release_date: '1994-09-23', vote_average: 8.7, vote_count: 5000 })

type Cenas = (id: number) => { file_path: string }[]

function responder(ids: number[], totalPaginas: number, cenas: Cenas) {
  tmdbFetchMock.mockImplementation((async (caminho: string, params: Record<string, unknown>) => {
    if (caminho === '/discover/movie') return { page: Number(params.page), results: ids.map(filme), total_pages: totalPaginas, total_results: 0 }
    const imagens = caminho.match(/^\/movie\/(\d+)\/images$/)
    if (imagens) return { backdrops: cenas(Number(imagens[1])) }
    throw new Error(`caminho inesperado: ${caminho}`)
  }) as typeof tmdbFetch)
}

const tresCenas: Cenas = (id) => [1, 2, 3, 4].map((n) => ({ file_path: `/c${id}-${n}.jpg` }))
// Sempre o primeiro item: página 1 do sorteio e sem embaralhar.
const primeiro = () => 0

describe('sortearHarmonia', () => {
  beforeEach(() => {
    tmdbFetchMock.mockReset()
  })

  it('busca os mais bem avaliados com 1.000 votos ou mais, numa página sorteada', async () => {
    responder([1, 2], 40, tresCenas)
    await sortearHarmonia(() => 0.5)

    const discover = tmdbFetchMock.mock.calls.filter(([caminho]) => caminho === '/discover/movie')
    expect(discover[0][1]).toMatchObject({ sort_by: 'vote_average.desc', 'vote_count.gte': 1000, include_adult: false, page: 1 })
    expect(discover[1][1]).toMatchObject({ page: 21 })
  })

  it('pede só cenas sem texto e devolve as 3 primeiras em w300', async () => {
    responder([7], 1, tresCenas)
    const [f] = await sortearHarmonia(primeiro)

    const imagens = tmdbFetchMock.mock.calls.find(([caminho]) => caminho === '/movie/7/images')!
    expect(imagens[1]).toEqual({ include_image_language: 'null' })
    expect(f).toEqual({
      id: 7,
      title: 'Filme 7',
      year: '1994',
      cenas: ['https://image.tmdb.org/t/p/w300/c7-1.jpg', 'https://image.tmdb.org/t/p/w300/c7-2.jpg', 'https://image.tmdb.org/t/p/w300/c7-3.jpg'],
    })
  })

  it('deixa de fora filmes sem cena e devolve no máximo 12', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => i + 1)
    responder(ids, 1, (id) => (id % 2 === 0 ? [] : tresCenas(id)))
    let filmes = await sortearHarmonia(primeiro)
    expect(filmes.map((f) => f.id)).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19])

    responder(ids, 1, tresCenas)
    filmes = await sortearHarmonia(primeiro)
    expect(filmes).toHaveLength(12)
  })

  it('um filme cujas cenas falham fica de fora sem derrubar o sorteio', async () => {
    tmdbFetchMock.mockImplementation((async (caminho: string, params: Record<string, unknown>) => {
      if (caminho === '/discover/movie') return { page: Number(params.page), results: [filme(1), filme(2)], total_pages: 1, total_results: 2 }
      if (caminho === '/movie/1/images') throw new TmdbError('falhou', 500)
      return { backdrops: tresCenas(2) }
    }) as typeof tmdbFetch)
    expect((await sortearHarmonia(primeiro)).map((f) => f.id)).toEqual([2])
  })

  it('falha quando nenhum filme tem cena', async () => {
    responder([1, 2], 1, () => [])
    await expect(sortearHarmonia(primeiro)).rejects.toBeInstanceOf(TmdbError)
  })
})
