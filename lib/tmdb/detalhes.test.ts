import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', async () => {
  const real = await vi.importActual<typeof import('./client')>('./client')
  return { TmdbError: real.TmdbError, tmdbFetch: vi.fn() }
})

import { tmdbFetch, TmdbError } from './client'
import { getMovieDetails } from './detalhes'
import { SINOPSE_INDISPONIVEL } from './normalizar'

const tmdbFetchMock = vi.mocked(tmdbFetch)
const GENEROS = { genres: [{ id: 28, name: 'Ação' }, { id: 878, name: 'Ficção científica' }] }

const COMPLETO = {
  id: 603,
  title: 'Matrix',
  overview: 'Um hacker descobre a verdade.',
  poster_path: '/p.jpg',
  backdrop_path: '/b.jpg',
  release_date: '1999-03-31',
  vote_average: 8.2,
  vote_count: 25000,
  runtime: 136,
  genres: [{ id: 28, name: 'Ação' }, { id: 878, name: 'Ficção científica' }],
  videos: {
    results: [
      { key: 'clip', site: 'YouTube', type: 'Clip', iso_639_1: 'pt' },
      { key: 'trailer-en', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'en' },
      { key: 'trailer-pt', site: 'YouTube', type: 'Trailer', official: false, iso_639_1: 'pt' },
      { key: 'vimeo', site: 'Vimeo', type: 'Trailer', iso_639_1: 'pt' },
    ],
  },
  credits: {
    cast: Array.from({ length: 20 }, (_, i) => ({
      id: 100 + i,
      name: `Ator ${i}`,
      character: i === 10 ? '' : `Personagem ${i}`,
      profile_path: i === 0 ? '/ator.jpg' : null,
      order: 19 - i,
    })),
    crew: [
      { id: 1, name: 'Lana Wachowski', job: 'Director', profile_path: '/lana.jpg' },
      { id: 1, name: 'Lana Wachowski', job: 'Writer', profile_path: '/lana.jpg' },
      { id: 2, name: 'Bill Pope', job: 'Director of Photography', profile_path: null },
      { id: 3, name: 'Kym Barrett', job: 'Costume Design', profile_path: null },
    ],
  },
  recommendations: {
    page: 1,
    total_pages: 1,
    total_results: 1,
    results: [{ id: 604, title: 'Matrix Reloaded', genre_ids: [878] }],
  },
  images: {
    backdrops: [
      { file_path: '/c1.jpg', iso_639_1: null },
      { file_path: '/com-texto.jpg', iso_639_1: 'en' },
      { file_path: '/c2.jpg', iso_639_1: null },
      { file_path: null, iso_639_1: null },
    ],
  },
  'watch/providers': {
    results: {
      US: { link: 'https://us', flatrate: [{ provider_id: 1, provider_name: 'US Only' }] },
      BR: {
        link: 'https://www.themoviedb.org/movie/603/watch?locale=BR',
        flatrate: [
          { provider_id: 9, provider_name: 'Segundo', logo_path: '/l2.jpg', display_priority: 2 },
          { provider_id: 8, provider_name: 'Primeiro', logo_path: '/l1.jpg', display_priority: 1 },
        ],
        rent: [{ provider_id: 2, provider_name: 'Loja', logo_path: null }],
      },
    },
  },
}

function responderCom(detalhe: unknown) {
  tmdbFetchMock.mockImplementation((async (caminho: string) => {
    if (caminho === '/genre/movie/list') return GENEROS
    if (caminho.startsWith('/movie/')) {
      if (detalhe instanceof Error) throw detalhe
      return detalhe
    }
    throw new Error(`caminho inesperado: ${caminho}`)
  }) as typeof tmdbFetch)
}

beforeEach(() => {
  tmdbFetchMock.mockReset()
})

describe('getMovieDetails', () => {
  it('pede tudo numa única chamada com append_to_response', async () => {
    responderCom(COMPLETO)
    await getMovieDetails(603)
    const chamada = tmdbFetchMock.mock.calls.find(([c]) => c === '/movie/603')!
    expect(chamada[1]).toEqual({
      append_to_response: 'videos,credits,recommendations,watch/providers,images',
      include_video_language: 'pt,en,null',
      include_image_language: 'null',
    })
    expect(chamada[2]).toBe(21600)
  })

  it('converte um filme completo', async () => {
    responderCom(COMPLETO)
    const filme = (await getMovieDetails(603))!
    expect(filme).toMatchObject({
      id: 603,
      title: 'Matrix',
      overview: 'Um hacker descobre a verdade.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/p.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/b.jpg',
      year: '1999',
      runtime: 136,
      rating: 8.2,
      genres: ['Ação', 'Ficção científica'],
    })
  })

  it('prefere o trailer do YouTube em português', async () => {
    responderCom(COMPLETO)
    expect((await getMovieDetails(603))!.trailerKey).toBe('trailer-pt')
  })

  describe('trailer do fundo (sem som, então sem legenda gravada)', () => {
    const comVideos = (results: object[]) => ({ ...COMPLETO, videos: { results } })
    const legendado = { key: 'pt-legendado', name: 'Trailer Oficial Legendado', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'pt' }
    const dublado = { key: 'pt-dublado', name: 'Trailer Dublado', site: 'YouTube', type: 'Trailer', iso_639_1: 'pt' }

    it('prefere o trailer que não está em português', async () => {
      responderCom(COMPLETO)
      expect((await getMovieDetails(603))!.trailerFundoKey).toBe('trailer-en')
    })

    it('sem outra língua, usa o português que não é legendado', async () => {
      responderCom(comVideos([legendado, dublado]))
      expect((await getMovieDetails(603))!.trailerFundoKey).toBe('pt-dublado')
    })

    it('só com trailer legendado, fica sem vídeo no fundo', async () => {
      responderCom(comVideos([legendado]))
      const filme = (await getMovieDetails(603))!
      expect(filme.trailerFundoKey).toBeNull()
      expect(filme.trailerKey).toBe('pt-legendado')
    })
  })

  it('limita o elenco a 15 pessoas na ordem de créditos', async () => {
    responderCom(COMPLETO)
    const { cast } = (await getMovieDetails(603))!
    expect(cast).toHaveLength(15)
    expect(cast[0]).toEqual({ id: 119, name: 'Ator 19', character: 'Personagem 19', profileUrl: null })
    expect(cast.find((a) => a.id === 110)?.character).toBeNull()
    expect(cast.find((a) => a.id === 100)).toBeUndefined()
  })

  it('normaliza a equipe da Visão & Construção', async () => {
    responderCom(COMPLETO)
    expect((await getMovieDetails(603))!.crew).toEqual([
      { id: 1, name: 'Lana Wachowski', profileUrl: 'https://image.tmdb.org/t/p/w185/lana.jpg', funcoes: ['Direção', 'Roteiro'] },
      { id: 2, name: 'Bill Pope', profileUrl: null, funcoes: ['Fotografia'] },
    ])
  })

  it('usa só as cenas sem texto, em w780 e w1280', async () => {
    responderCom(COMPLETO)
    expect((await getMovieDetails(603))!.images).toEqual([
      { media: 'https://image.tmdb.org/t/p/w780/c1.jpg', grande: 'https://image.tmdb.org/t/p/w1280/c1.jpg' },
      { media: 'https://image.tmdb.org/t/p/w780/c2.jpg', grande: 'https://image.tmdb.org/t/p/w1280/c2.jpg' },
    ])
  })

  it('limita a galeria a 20 imagens', async () => {
    const backdrops = Array.from({ length: 30 }, (_, i) => ({ file_path: `/c${i}.jpg`, iso_639_1: null }))
    responderCom({ ...COMPLETO, images: { backdrops } })
    expect((await getMovieDetails(603))!.images).toHaveLength(20)
  })

  it('usa só os provedores do Brasil, na ordem de prioridade', async () => {
    responderCom(COMPLETO)
    expect((await getMovieDetails(603))!.watchProviders).toEqual({
      link: 'https://www.themoviedb.org/movie/603/watch?locale=BR',
      streaming: [
        { id: 8, name: 'Primeiro', logoUrl: 'https://image.tmdb.org/t/p/w92/l1.jpg' },
        { id: 9, name: 'Segundo', logoUrl: 'https://image.tmdb.org/t/p/w92/l2.jpg' },
      ],
      rent: [{ id: 2, name: 'Loja', logoUrl: null }],
      buy: [],
    })
  })

  it('traduz os gêneros das recomendações', async () => {
    responderCom(COMPLETO)
    const { recommendations } = (await getMovieDetails(603))!
    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]).toMatchObject({ id: 604, title: 'Matrix Reloaded', genres: ['Ficção científica'] })
  })

  it('aceita filme sem vídeos, elenco, recomendações, provedores, pôster nem sinopse', async () => {
    responderCom({ id: 1, title: 'Mínimo', runtime: 0 })
    expect(await getMovieDetails(1)).toEqual({
      id: 1,
      title: 'Mínimo',
      overview: SINOPSE_INDISPONIVEL,
      posterUrl: null,
      backdropUrl: null,
      year: null,
      rating: null,
      genres: [],
      runtime: null,
      trailerKey: null,
      trailerFundoKey: null,
      cast: [],
      crew: [],
      images: [],
      recommendations: [],
      watchProviders: null,
    })
  })

  it('devolve watchProviders null quando só há dados de outros países', async () => {
    responderCom({ ...COMPLETO, 'watch/providers': { results: { US: COMPLETO['watch/providers'].results.US } } })
    expect((await getMovieDetails(603))!.watchProviders).toBeNull()
  })

  it('devolve null quando o filme não existe (404)', async () => {
    responderCom(new TmdbError('não encontrado', 404))
    expect(await getMovieDetails(999999)).toBeNull()
  })

  it('propaga outros erros do TMDB', async () => {
    responderCom(new TmdbError('fora do ar', 500))
    await expect(getMovieDetails(603)).rejects.toMatchObject({ status: 500 })
  })
})
