import { describe, expect, it } from 'vitest'
import { extrairPaleta } from './extrair'

type Rgba = [number, number, number, number?]

function pixels(...grupos: [Rgba, number][]): Uint8ClampedArray {
  const valores: number[] = []
  for (const [[r, g, b, a = 255], quantidade] of grupos) {
    for (let i = 0; i < quantidade; i++) valores.push(r, g, b, a)
  }
  return new Uint8ClampedArray(valores)
}

describe('extrairPaleta', () => {
  it('uma cor sólida vira uma cor com peso total', () => {
    expect(extrairPaleta(pixels([[255, 0, 0], 100]))).toEqual([{ hex: '#ff0000', peso: 1 }])
  })

  it('separa as cores na proporção em que aparecem, da mais presente para a menos', () => {
    const paleta = extrairPaleta(pixels([[255, 0, 0], 100], [[0, 0, 255], 200]))
    expect(paleta.map((c) => c.hex)).toEqual(['#0000ff', '#ff0000'])
    expect(paleta[0].peso).toBeCloseTo(2 / 3)
    expect(paleta[1].peso).toBeCloseTo(1 / 3)
  })

  it('ignora pixels transparentes', () => {
    expect(extrairPaleta(pixels([[0, 255, 0], 50], [[255, 255, 255, 0], 500]))).toEqual([{ hex: '#00ff00', peso: 1 }])
  })

  it('devolve no máximo 5 cores, com pesos que somam 1', () => {
    const cores: Rgba[] = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [0, 255, 255], [255, 0, 255], [128, 128, 128]]
    const paleta = extrairPaleta(pixels(...cores.map((c): [Rgba, number] => [c, 30])))
    expect(paleta.length).toBeLessThanOrEqual(5)
    expect(paleta.reduce((soma, c) => soma + c.peso, 0)).toBeCloseTo(1)
  })

  it('aceita menos pixels que cores pedidas', () => {
    expect(extrairPaleta(pixels([[10, 20, 30], 2]))).toEqual([{ hex: '#0a141e', peso: 1 }])
  })

  it('sem pixels, sem cores', () => {
    expect(extrairPaleta(new Uint8ClampedArray())).toEqual([])
  })

  it('a mesma imagem dá sempre a mesma paleta', () => {
    const entrada = pixels([[200, 30, 30], 40], [[20, 30, 200], 70], [[240, 240, 220], 25], [[10, 10, 10], 90])
    expect(extrairPaleta(entrada)).toEqual(extrairPaleta(entrada))
  })
})
