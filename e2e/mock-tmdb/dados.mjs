export const GENEROS = [
  { id: 28, name: 'Ação' },
  { id: 35, name: 'Comédia' },
  { id: 27, name: 'Terror' },
  { id: 16, name: 'Animação' },
  { id: 878, name: 'Ficção científica' },
  { id: 18, name: 'Drama' },
]

export function filme(id, titulo = `Filme Teste ${id}`) {
  return {
    id,
    title: titulo,
    original_title: titulo,
    overview: `Sinopse do ${titulo}.`,
    poster_path: `/poster-${id}.jpg`,
    backdrop_path: `/fundo-${id}.jpg`,
    release_date: '2024-05-10',
    vote_average: 7.8,
    vote_count: 1200,
    genre_ids: [28, 18],
  }
}

export function pagina(base, numero, totalPaginas) {
  const results = Array.from({ length: 20 }, (_, i) => filme(base + (numero - 1) * 20 + i + 1))
  return { page: numero, results, total_pages: totalPaginas, total_results: totalPaginas * 20 }
}

export function detalhes(id) {
  // Filme sem equipe nem imagens: as seções Visão & Construção e Imagens não aparecem.
  const semBastidores = id === 1005
  return {
    ...filme(id),
    origin_country: ['KR'],
    runtime: 136,
    genres: [
      { id: 28, name: 'Ação' },
      { id: 18, name: 'Drama' },
    ],
    videos: { results: [{ key: 'trailer-teste', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'pt' }] },
    credits: {
      cast: Array.from({ length: 20 }, (_, i) => ({
        id: 500 + i,
        name: `Ator ${i + 1}`,
        character: `Personagem ${i + 1}`,
        profile_path: null,
        order: i,
      })),
      crew: semBastidores
        ? []
        : [
            // A foto não existe no servidor de imagens: o cartão tem de cair nas iniciais.
            { id: 900, name: 'Diretora Teste', job: 'Director', profile_path: '/diretora-inexistente.jpg' },
            { id: 900, name: 'Diretora Teste', job: 'Screenplay', profile_path: '/diretora-inexistente.jpg' },
            { id: 901, name: 'Roteirista Dois', job: 'Writer', profile_path: null },
            { id: 902, name: 'Fotógrafo Teste', job: 'Director of Photography', profile_path: null },
            { id: 903, name: 'Montador', job: 'Editor', profile_path: null },
            { id: 904, name: 'Figurinista Teste', job: 'Costume Design', profile_path: null },
          ],
    },
    images: {
      backdrops: semBastidores
        ? []
        : [
            ...Array.from({ length: 7 }, (_, i) => ({ file_path: `/cena-${id}-${i + 1}.jpg`, iso_639_1: null })),
            { file_path: `/cena-${id}-com-texto.jpg`, iso_639_1: 'pt' },
          ],
    },
    recommendations: pagina(id * 100, 1, 1),
    'watch/providers': {
      results: {
        BR: {
          link: `https://www.themoviedb.org/movie/${id}/watch?locale=BR`,
          flatrate: [{ provider_id: 8, provider_name: 'Serviço de Streaming', logo_path: '/logo.jpg', display_priority: 1 }],
        },
      },
    },
  }
}
