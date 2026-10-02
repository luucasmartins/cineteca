import { describe, expect, it } from 'vitest'
import { imageUrl, imagemFilme } from './imagens'

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

describe('imagemFilme', () => {
  it('monta os três tamanhos usados pela galeria e guarda o caminho', () => {
    expect(imagemFilme('/abc.jpg')).toEqual({
      caminho: '/abc.jpg',
      pequena: 'https://image.tmdb.org/t/p/w300/abc.jpg',
      media: 'https://image.tmdb.org/t/p/w780/abc.jpg',
      grande: 'https://image.tmdb.org/t/p/w1280/abc.jpg',
    })
  })
})
