import { SINOPSE_INDISPONIVEL } from './tmdb/normalizar'
import type { MovieSummary } from './tmdb/tipos'

export const MAX_DESTAQUES = 6

// Filmes que servem para o banner: precisam de imagem de fundo e sinopse.
export function escolherDestaques(filmes: MovieSummary[]): MovieSummary[] {
  return filmes.filter((f) => f.backdropUrl && f.overview !== SINOPSE_INDISPONIVEL).slice(0, MAX_DESTAQUES)
}
