import { describe, expect, it } from 'vitest'
import { imageUrl } from './imagens'

describe('imageUrl', () => {
  it('monta a URL completa do CDN do TMDB', () => {
    expect(imageUrl('/abc.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg')
  })

  it('devolve null quando não há imagem', () => {
    expect(imageUrl(null, 'w342')).toBeNull()
    expect(imageUrl(undefined, 'w500')).toBeNull()
    expect(imageUrl('', 'original')).toBeNull()
  })
})
