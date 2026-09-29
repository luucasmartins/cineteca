import { describe, expect, it } from 'vitest'
import { normalizarAno, normalizarNota, normalizarResumo, normalizarSinopse, SINOPSE_INDISPONIVEL } from './normalizar'

const GENEROS = new Map([
  [28, 'Ação'],
  [18, 'Drama'],
])

describe('normalizarResumo', () => {
  it('converte um filme completo', () => {
    const filme = normalizarResumo(
      {
        id: 603,
        title: 'Matrix',
        overview: 'Um hacker descobre a verdade.',
        poster_path: '/p.jpg',
        backdrop_path: '/b.jpg',
        release_date: '1999-03-31',
        vote_average: 8.216,
        vote_count: 25000,
        genre_ids: [28, 18, 999],
      },
      GENEROS,
    )
    expect(filme).toEqual({
      id: 603,
      title: 'Matrix',
      overview: 'Um hacker descobre a verdade.',
      posterUrl: 'https://image.tmdb.org/t/p/w342/p.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/b.jpg',
      year: '1999',
      rating: 8.2,
      genres: ['Ação', 'Drama'],
    })
  })

  it('usa valores padrão quando faltam dados', () => {
    const filme = normalizarResumo({ id: 1, original_title: 'Original' }, GENEROS)
    expect(filme).toEqual({
      id: 1,
      title: 'Original',
      overview: SINOPSE_INDISPONIVEL,
      posterUrl: null,
      backdropUrl: null,
      year: null,
      rating: null,
      genres: [],
    })
  })

  it('usa "Sem título" quando não há título nenhum', () => {
    expect(normalizarResumo({ id: 2 }, GENEROS).title).toBe('Sem título')
  })
})

describe('auxiliares', () => {
  it('normalizarSinopse troca texto vazio pela mensagem padrão', () => {
    expect(SINOPSE_INDISPONIVEL).toBe('Sinopse não disponível em português.')
    expect(normalizarSinopse('   ')).toBe(SINOPSE_INDISPONIVEL)
    expect(normalizarSinopse(null)).toBe(SINOPSE_INDISPONIVEL)
    expect(normalizarSinopse(' Texto ')).toBe('Texto')
  })

  it('normalizarAno só aceita datas com ano', () => {
    expect(normalizarAno('2024-05-10')).toBe('2024')
    expect(normalizarAno('')).toBeNull()
    expect(normalizarAno(null)).toBeNull()
  })

  it('normalizarNota devolve null sem votos e arredonda para 1 casa', () => {
    expect(normalizarNota(7.86, 10)).toBe(7.9)
    expect(normalizarNota(0, 0)).toBeNull()
    expect(normalizarNota(undefined, 10)).toBeNull()
  })
})
