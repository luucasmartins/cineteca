import { describe, expect, it } from 'vitest'
import {
  DESCRICAO_MAXIMA,
  ehIdMoodboard,
  TITULO_MAXIMO,
  validarCaminhoCena,
  validarDescricaoMoodboard,
  validarTituloMoodboard,
} from './validacao'

describe('validarTituloMoodboard', () => {
  it('aceita e corta espaços', () => {
    expect(validarTituloMoodboard('  Neons  ')).toEqual({ ok: true, valor: 'Neons' })
  })

  it('recusa vazio, só espaços e não-texto', () => {
    for (const bruto of ['', '   ', 42, null, undefined]) {
      expect(validarTituloMoodboard(bruto)).toEqual({ ok: false, erro: 'Digite um título' })
    }
  })

  it('aceita no limite e recusa um a mais', () => {
    expect(validarTituloMoodboard('a'.repeat(TITULO_MAXIMO)).ok).toBe(true)
    expect(validarTituloMoodboard('a'.repeat(TITULO_MAXIMO + 1))).toEqual({
      ok: false,
      erro: 'O título pode ter no máximo 60 caracteres',
    })
  })
})

describe('validarDescricaoMoodboard', () => {
  it('trata ausência e texto vazio como null', () => {
    for (const bruto of [undefined, null, '', '   ']) {
      expect(validarDescricaoMoodboard(bruto)).toEqual({ ok: true, valor: null })
    }
  })

  it('aceita texto e corta espaços', () => {
    expect(validarDescricaoMoodboard(' Luz de neon ')).toEqual({ ok: true, valor: 'Luz de neon' })
  })

  it('recusa não-texto e texto longo demais', () => {
    expect(validarDescricaoMoodboard(5)).toEqual({ ok: false, erro: 'Descrição inválida' })
    expect(validarDescricaoMoodboard('a'.repeat(DESCRICAO_MAXIMA + 1))).toEqual({
      ok: false,
      erro: 'A descrição pode ter no máximo 200 caracteres',
    })
  })
})

describe('validarCaminhoCena', () => {
  it('aceita caminhos do TMDB', () => {
    expect(validarCaminhoCena('/abc123.jpg')).toEqual({ ok: true, valor: '/abc123.jpg' })
    expect(validarCaminhoCena('/cena-1001-1.jpg')).toEqual({ ok: true, valor: '/cena-1001-1.jpg' })
  })

  it('recusa URLs, subpastas, extensões estranhas e não-texto', () => {
    for (const bruto of ['', 'abc.jpg', 'https://x.com/a.jpg', '/a/b.jpg', '/a.svg', '/../a.jpg', '/a.jpg?x=1', 7]) {
      expect(validarCaminhoCena(bruto)).toEqual({ ok: false, erro: 'Cena inválida' })
    }
  })
})

describe('ehIdMoodboard', () => {
  it('aceita uuid e recusa o resto', () => {
    expect(ehIdMoodboard('3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c')).toBe(true)
    expect(ehIdMoodboard('nao-e-um-id')).toBe(false)
    expect(ehIdMoodboard('')).toBe(false)
    expect(ehIdMoodboard(123)).toBe(false)
  })
})
