import { imageUrl } from './imagens'
import type { MovieSummary, TmdbFilmeBruto } from './tipos'

export const SINOPSE_INDISPONIVEL = 'Sinopse não disponível em português.'

export function normalizarAno(data?: string | null): string | null {
  return data && /^\d{4}/.test(data) ? data.slice(0, 4) : null
}

export function normalizarNota(media?: number, votos?: number): number | null {
  if (!votos || media === undefined) return null
  return Math.round(media * 10) / 10
}

export function normalizarSinopse(texto?: string | null): string {
  const limpo = texto?.trim()
  return limpo ? limpo : SINOPSE_INDISPONIVEL
}

export function normalizarResumo(filme: TmdbFilmeBruto, generos: Map<number, string>): MovieSummary {
  return {
    id: filme.id,
    title: filme.title || filme.original_title || 'Sem título',
    overview: normalizarSinopse(filme.overview),
    posterUrl: imageUrl(filme.poster_path, 'w342'),
    backdropUrl: imageUrl(filme.backdrop_path, 'w1280'),
    year: normalizarAno(filme.release_date),
    rating: normalizarNota(filme.vote_average, filme.vote_count),
    genres: (filme.genre_ids ?? [])
      .map((id) => generos.get(id))
      .filter((nome): nome is string => Boolean(nome)),
  }
}
