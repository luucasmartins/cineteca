import { describe, expect, it } from 'vitest'
import { validarFilmeId, validarVoto } from './validacao'

describe('validarFilmeId', () => {
  it('aceita inteiro positivo, como número ou texto', () => {
    expect(validarFilmeId(603)).toEqual({ ok: true, valor: 603 })
    expect(validarFilmeId('603')).toEqual({ ok: true, valor: 603 })
  })

  it('recusa qualquer coisa que não seja inteiro positivo', () => {
    for (const valor of [0, -1, 1.5, '1.5', 'abc', '', null, undefined, Number.NaN, Infinity, 1e12, {}]) {
      expect(validarFilmeId(valor)).toEqual({ ok: false, erro: 'Filme inválido' })
    }
  })
})

describe('validarVoto', () => {
  it('aceita curti, não curti e desfazer', () => {
    expect(validarVoto(true)).toEqual({ ok: true, valor: true })
    expect(validarVoto(false)).toEqual({ ok: true, valor: false })
    expect(validarVoto(null)).toEqual({ ok: true, valor: null })
  })

  it('recusa qualquer outro valor', () => {
    for (const valor of ['true', 1, 0, undefined, {}, []]) {
      expect(validarVoto(valor)).toEqual({ ok: false, erro: 'Voto inválido' })
    }
  })
})
