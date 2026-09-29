import { describe, expect, it } from 'vitest'
import { formatarDuracao } from './formatar'

describe('formatarDuracao', () => {
  it('formata horas e minutos', () => {
    expect(formatarDuracao(136)).toBe('2h 16min')
  })

  it('omite as horas quando é menos de uma hora', () => {
    expect(formatarDuracao(45)).toBe('45min')
  })

  it('omite os minutos quando é hora cheia', () => {
    expect(formatarDuracao(120)).toBe('2h')
  })
})
