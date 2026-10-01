import { describe, expect, it } from 'vitest'
import {
  calcularAprovacao,
  MINIMO_DE_VOTOS,
  ordenarRanking,
  qualificado,
  textoAgregado,
  textoVotos,
} from './calculo'
import type { ItemRanking } from './tipos'

describe('calcularAprovacao', () => {
  it('devolve a porcentagem arredondada', () => {
    expect(calcularAprovacao(41, 50)).toBe(82)
    expect(calcularAprovacao(1, 3)).toBe(33)
    expect(calcularAprovacao(2, 3)).toBe(67)
  })

  it('casos extremos: tudo curtido e nada curtido', () => {
    expect(calcularAprovacao(5, 5)).toBe(100)
    expect(calcularAprovacao(0, 5)).toBe(0)
  })

  it('sem votos devolve 0, nunca NaN', () => {
    expect(calcularAprovacao(0, 0)).toBe(0)
    expect(Number.isNaN(calcularAprovacao(0, 0))).toBe(false)
  })
})

describe('qualificado', () => {
  it('o mínimo é 3 votos', () => {
    expect(MINIMO_DE_VOTOS).toBe(3)
    expect(qualificado(2)).toBe(false)
    expect(qualificado(3)).toBe(true)
    expect(qualificado(0)).toBe(false)
  })
})

const item = (filmeId: number, curtidas: number, votos: number): ItemRanking => ({
  filmeId,
  titulo: `Filme ${filmeId}`,
  posterUrl: null,
  ano: '2024',
  votos,
  curtidas,
  aprovacao: calcularAprovacao(curtidas, votos),
})

describe('ordenarRanking', () => {
  it('maior aprovação primeiro', () => {
    const ordem = ordenarRanking([item(1, 5, 10), item(2, 9, 10)]).map((i) => i.filmeId)
    expect(ordem).toEqual([2, 1])
  })

  it('empate na aprovação: mais votos primeiro', () => {
    const ordem = ordenarRanking([item(1, 3, 3), item(2, 20, 20)]).map((i) => i.filmeId)
    expect(ordem).toEqual([2, 1])
  })

  it('empate total: ordem estável pelo id', () => {
    const ordem = ordenarRanking([item(7, 3, 3), item(2, 3, 3)]).map((i) => i.filmeId)
    expect(ordem).toEqual([2, 7])
  })

  it('não altera a lista recebida', () => {
    const entrada = [item(1, 5, 10), item(2, 9, 10)]
    ordenarRanking(entrada)
    expect(entrada.map((i) => i.filmeId)).toEqual([1, 2])
  })
})

describe('textoVotos', () => {
  it('singular e plural', () => {
    expect(textoVotos(1)).toBe('1 voto')
    expect(textoVotos(0)).toBe('0 votos')
    expect(textoVotos(41)).toBe('41 votos')
  })
})

describe('textoAgregado', () => {
  it('monta a frase do público', () => {
    expect(textoAgregado({ curtidas: 41, votos: 50, aprovacao: 82 })).toBe(
      '82% das pessoas curtiram · 50 votos',
    )
  })

  it('usa o singular quando há um voto só', () => {
    expect(textoAgregado({ curtidas: 1, votos: 1, aprovacao: 100 })).toBe(
      '100% das pessoas curtiram · 1 voto',
    )
  })
})
