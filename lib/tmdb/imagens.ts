import { TMDB_IMAGE_BASE } from './config'

export type TamanhoImagem = 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'

export function imageUrl(caminho: string | null | undefined, tamanho: TamanhoImagem): string | null {
  if (!caminho) return null
  return `${TMDB_IMAGE_BASE}/${tamanho}${caminho}`
}
