import { describe, expect, it } from 'vitest'
import { AREAS, CATEGORIAS, PREMIOS } from './catalogo'

describe('catálogo de prêmios', () => {
  it('toda categoria aponta para um prêmio e uma área conhecidos, com nome', () => {
    const chaves = new Set(PREMIOS.map((p) => p.chave))
    const areas = new Set<string>(AREAS)
    for (const [qid, cat] of Object.entries(CATEGORIAS)) {
      expect(qid).toMatch(/^Q\d+$/)
      expect(chaves.has(cat.premio)).toBe(true)
      expect(areas.has(cat.area)).toBe(true)
      expect(cat.nome.trim()).not.toBe('')
    }
  })

  it('cada um dos seis prêmios tem ao menos uma categoria', () => {
    const usados = new Set(Object.values(CATEGORIAS).map((c) => c.premio))
    expect(PREMIOS).toHaveLength(6)
    for (const p of PREMIOS) expect(usados.has(p.chave)).toBe(true)
  })
})
