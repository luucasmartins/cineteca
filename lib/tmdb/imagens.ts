import { TMDB_IMAGE_BASE } from './config'
import type { ImagemFilme } from './tipos'

export type TamanhoImagem = 'w92' | 'w185' | 'w300' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'

export function imageUrl(caminho: string | null | undefined, tamanho: TamanhoImagem): string | null {
  if (!caminho) return null
  return `${TMDB_IMAGE_BASE}/${tamanho}${caminho}`
}

export function imagemFilme(caminho: string): ImagemFilme {
  return {
    caminho,
    pequena: imageUrl(caminho, 'w300')!,
    media: imageUrl(caminho, 'w780')!,
    grande: imageUrl(caminho, 'w1280')!,
  }
}
