// Tipos públicos: o resto do site só conhece estes formatos.
export type Genero = { id: number; name: string }

export type OrdemGenero = 'popularidade' | 'nota' | 'lancamento'
export const ORDENS_GENERO: OrdemGenero[] = ['popularidade', 'nota', 'lancamento']

export type MovieSummary = {
  id: number
  title: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  year: string | null
  rating: number | null
  genres: string[]
}

export type PaginaFilmes = { results: MovieSummary[]; page: number; totalPages: number }

export type CastMember = { id: number; name: string; character: string | null; profileUrl: string | null }

export type MembroEquipe = { id: number; name: string; profileUrl: string | null; funcoes: string[] }

export type Provider = { id: number; name: string; logoUrl: string | null }

export type WatchProviders = { link: string; streaming: Provider[]; rent: Provider[]; buy: Provider[] }

export type MovieDetails = MovieSummary & {
  runtime: number | null
  trailerKey: string | null
  /** Trailer que toca sem som no fundo do cabeçalho: evita os legendados. */
  trailerFundoKey: string | null
  cast: CastMember[]
  /** Visão & Construção: já filtrada, agrupada por pessoa, ordenada e limitada. */
  crew: MembroEquipe[]
  recommendations: MovieSummary[]
  watchProviders: WatchProviders | null
}

// Formatos brutos do TMDB (usados só dentro de lib/tmdb).
export type TmdbFilmeBruto = {
  id: number
  title?: string
  original_title?: string
  overview?: string | null
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string | null
  vote_average?: number
  vote_count?: number
  genre_ids?: number[]
}

export type TmdbPaginaBruta = {
  page: number
  results: TmdbFilmeBruto[]
  total_pages: number
  total_results: number
}
