import { describe, expect, it } from 'vitest'
import { lerIdPositivo, lerPagina } from './parametros'

describe('lerIdPositivo', () => {
  it('aceita números inteiros positivos', () => {
    expect(lerIdPositivo('28')).toBe(28)
    expect(lerIdPositivo('999999')).toBe(999999)
  })

  it('recusa qualquer outra coisa', () => {
    for (const valor of ['0', '-1', 'abc', '1.5', '1e3', ' 2', '', '9999999999', null, undefined]) {
      expect(lerIdPositivo(valor)).toBeNull()
    }
  })
})

describe('lerPagina', () => {
  it('usa 1 quando não há página', () => {
    expect(lerPagina(null)).toBe(1)
    expect(lerPagina(undefined)).toBe(1)
    expect(lerPagina('')).toBe(1)
  })

  it('aceita de 1 a 500', () => {
    expect(lerPagina('2')).toBe(2)
    expect(lerPagina('500')).toBe(500)
  })

  it('recusa páginas inválidas ou acima do limite do TMDB', () => {
    expect(lerPagina('0')).toBeNull()
    expect(lerPagina('501')).toBeNull()
    expect(lerPagina('abc')).toBeNull()
  })
})
