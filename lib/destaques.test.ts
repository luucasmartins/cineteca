import { describe, expect, it } from 'vitest'
import { escolherDestaques, MAX_DESTAQUES } from './destaques'
import { SINOPSE_INDISPONIVEL } from './tmdb/normalizar'
import type { MovieSummary } from './tmdb/tipos'

const filme = (id: number, extra: Partial<MovieSummary> = {}): MovieSummary => ({
  id,
  title: `Filme ${id}`,
  overview: `Sinopse ${id}`,
  posterUrl: null,
  backdropUrl: `https://image.tmdb.org/t/p/w1280/${id}.jpg`,
  year: '2024',
  rating: 7,
  genres: [],
  ...extra,
})

describe('escolherDestaques', () => {
  it('limita a 6 filmes, mantendo a ordem', () => {
    const filmes = Array.from({ length: 10 }, (_, i) => filme(i + 1))
    expect(MAX_DESTAQUES).toBe(6)
    expect(escolherDestaques(filmes).map((f) => f.id)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('descarta filmes sem imagem de fundo ou sem sinopse', () => {
    const filmes = [filme(1, { backdropUrl: null }), filme(2), filme(3, { overview: SINOPSE_INDISPONIVEL }), filme(4)]
    expect(escolherDestaques(filmes).map((f) => f.id)).toEqual([2, 4])
  })

  it('devolve lista vazia quando nenhum filme serve', () => {
    expect(escolherDestaques([filme(1, { backdropUrl: null })])).toEqual([])
  })
})
