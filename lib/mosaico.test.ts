import { describe, expect, it } from 'vitest'
import { classesMosaico, NO_MOSAICO } from './mosaico'

describe('classesMosaico', () => {
  it('nunca passa de 5 itens', () => {
    expect(classesMosaico(20).itens).toHaveLength(NO_MOSAICO)
  })

  it.each([1, 2, 3, 4, 5])('com %i imagem(ns) gera um item por imagem', (n) => {
    expect(classesMosaico(n).itens).toHaveLength(n)
  })

  it('no celular a primeira ocupa a largura toda', () => {
    for (const n of [1, 2, 3, 4, 5]) expect(classesMosaico(n).itens[0].split(' ')).toContain('col-span-2')
  })

  it('no celular, sobra ímpar depois da primeira: a última ocupa a largura toda (sem buraco)', () => {
    expect(classesMosaico(2).itens[1].split(' ')).toContain('col-span-2')
    expect(classesMosaico(4).itens[3].split(' ')).toContain('col-span-2')
    expect(classesMosaico(3).itens[2].split(' ')).not.toContain('col-span-2')
    expect(classesMosaico(5).itens[4].split(' ')).not.toContain('col-span-2')
  })

  it('no computador, com 3 ou 5 a primeira ocupa duas linhas; com 4 ela fica sozinha no alto', () => {
    expect(classesMosaico(3).itens[0]).toContain('md:row-span-2')
    expect(classesMosaico(5).itens[0]).toContain('md:row-span-2')
    expect(classesMosaico(4).itens[0]).toContain('md:col-span-3')
  })

  it('no computador, quem ocupa duas colunas no celular volta a uma (2 e 4 imagens)', () => {
    expect(classesMosaico(2).itens.every((c) => c.includes('md:col-span-1'))).toBe(true)
    expect(classesMosaico(4).itens[3]).toContain('md:col-span-1')
  })

  it('com zero imagens não gera itens', () => {
    expect(classesMosaico(0).itens).toEqual([])
  })
})
