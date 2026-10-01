import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', async () => {
  const real = await vi.importActual<typeof import('./client')>('./client')
  return { TmdbError: real.TmdbError, tmdbFetch: vi.fn() }
})

import { tmdbFetch, TmdbError } from './client'
import { IDIOMAS_JOIA, nomeIdioma, nomePais, sortearJoia } from './joia'

const tmdbFetchMock = vi.mocked(tmdbFetch)

const filme = (id: number) => ({
  id,
  title: `Joia ${id}`,
  overview: `Sinopse ${id}.`,
  poster_path: `/p${id}.jpg`,
  release_date: '2006-07-27',
  vote_average: 7.62,
  vote_count: 900,
})

// Sequência fixa de "sorteios": cada chamada devolve o próximo número.
function sequencia(...valores: number[]) {
  let i = 0
  return () => valores[Math.min(i++, valores.length - 1)]
}

type Discover = (idioma: string, pagina: number) => { results: ReturnType<typeof filme>[]; total_pages: number }

function responder(discover: Discover, pais: string[] = ['KR']) {
  tmdbFetchMock.mockImplementation((async (caminho: string, params: Record<string, unknown>) => {
    if (caminho === '/discover/movie') {
      const { results, total_pages } = discover(String(params.with_original_language), Number(params.page))
      return { page: Number(params.page), results, total_pages, total_results: results.length * total_pages }
    }
    if (caminho.startsWith('/movie/')) return { origin_country: pais }
    throw new Error(`caminho inesperado: ${caminho}`)
  }) as typeof tmdbFetch)
}

const chamadasDiscover = () => tmdbFetchMock.mock.calls.filter(([c]) => c === '/discover/movie').map(([, p]) => p as Record<string, unknown>)

beforeEach(() => {
  tmdbFetchMock.mockReset()
})

describe('sortearJoia', () => {
  it('consulta um idioma da lista com o corte de nota e votos, e nunca inglês', async () => {
    responder(() => ({ results: [filme(1)], total_pages: 1 }))
    await sortearJoia(null, sequencia(0))
    const [params] = chamadasDiscover()
    expect(IDIOMAS_JOIA).toContain(params.with_original_language)
    expect(IDIOMAS_JOIA).not.toContain('en')
    expect(params).toMatchObject({ 'vote_average.gte': 7.5, 'vote_count.gte': 200, include_adult: false, page: 1 })
  })

  it('devolve a sugestão pronta, com idioma e país em português', async () => {
    responder(() => ({ results: [filme(7)], total_pages: 1 }))
    const joia = await sortearJoia(null, sequencia(IDIOMAS_JOIA.indexOf('ko') / IDIOMAS_JOIA.length, 0, 0))
    expect(joia).toEqual({
      id: 7,
      title: 'Joia 7',
      year: '2006',
      posterUrl: 'https://image.tmdb.org/t/p/w342/p7.jpg',
      overview: 'Sinopse 7.',
      rating: 7.6,
      idioma: 'Coreano',
      pais: 'Coreia do Sul',
    })
  })

  it('sorteia a página dentro de total_pages', async () => {
    responder((_, pagina) => ({ results: [filme(100 + pagina)], total_pages: 4 }))
    const joia = await sortearJoia(null, sequencia(0, 0.99, 0))
    expect(chamadasDiscover().map((p) => p.page)).toEqual([1, 4])
    expect(joia.id).toBe(104)
  })

  it('limita a página sorteada a 500', async () => {
    responder((_, pagina) => ({ results: [filme(pagina)], total_pages: 9000 }))
    await sortearJoia(null, sequencia(0, 0.999999, 0))
    expect(chamadasDiscover()[1].page).toBe(500)
  })

  it('não repete o filme de evitar', async () => {
    responder(() => ({ results: [filme(10), filme(11)], total_pages: 1 }))
    expect((await sortearJoia(10, sequencia(0, 0, 0))).id).toBe(11)
  })

  it('idioma sem filmes leva a outro idioma', async () => {
    responder((idioma) => (idioma === IDIOMAS_JOIA[0] ? { results: [], total_pages: 0 } : { results: [filme(5)], total_pages: 1 }))
    const joia = await sortearJoia(null, sequencia(0, 0, 0, 0))
    const idiomas = chamadasDiscover().map((p) => p.with_original_language)
    expect(idiomas[0]).toBe(IDIOMAS_JOIA[0])
    expect(new Set(idiomas).size).toBe(2)
    expect(joia.id).toBe(5)
  })

  it('depois de 3 idiomas sem filme, falha com TmdbError', async () => {
    responder(() => ({ results: [], total_pages: 0 }))
    await expect(sortearJoia(null, sequencia(0))).rejects.toBeInstanceOf(TmdbError)
    expect(chamadasDiscover()).toHaveLength(3)
  })

  it('propaga a falha do TMDB', async () => {
    tmdbFetchMock.mockRejectedValue(new TmdbError('fora do ar', 500))
    await expect(sortearJoia(null)).rejects.toMatchObject({ status: 500 })
  })

  it('sem país conhecido, pais fica null', async () => {
    responder(() => ({ results: [filme(1)], total_pages: 1 }), [])
    expect((await sortearJoia(null, sequencia(0))).pais).toBeNull()
  })
})

describe('nomes em português', () => {
  it('idioma com maiúscula inicial', () => {
    expect(nomeIdioma('ja')).toBe('Japonês')
    expect(nomeIdioma('fa')).toBe('Persa')
  })

  it('cn é código só do TMDB: Cantonês', () => {
    expect(nomeIdioma('cn')).toBe('Cantonês')
  })

  it('país conhecido, desconhecido e ausente', () => {
    expect(nomePais('KR')).toBe('Coreia do Sul')
    expect(nomePais('XX')).toBeNull()
    expect(nomePais(undefined)).toBeNull()
  })

  it('regiões administrativas da China aparecem pelo nome curto', () => {
    expect(nomePais('HK')).toBe('Hong Kong')
    expect(nomePais('MO')).toBe('Macau')
  })
})
