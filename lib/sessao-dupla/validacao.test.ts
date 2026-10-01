import { describe, expect, it } from 'vitest'
import { validarFilmesDiferentes, validarTitulo } from './validacao'

describe('validarTitulo', () => {
  it('aceita título válido entre 1 e 60 caracteres', () => {
    expect(validarTitulo('Solidão Cyberpunk')).toEqual({ ok: true, valor: 'Solidão Cyberpunk' })
  })
  it('remove espaços das pontas', () => {
    expect(validarTitulo('  Amor & Caos  ')).toEqual({ ok: true, valor: 'Amor & Caos' })
  })
  it('recusa string vazia', () => {
    expect(validarTitulo('')).toEqual({ ok: false, erro: 'Digite um título' })
  })
  it('recusa só espaços', () => {
    expect(validarTitulo('   ')).toEqual({ ok: false, erro: 'Digite um título' })
  })
  it('recusa mais de 60 caracteres', () => {
    expect(validarTitulo('A'.repeat(61))).toEqual({ ok: false, erro: 'O título pode ter no máximo 60 caracteres' })
  })
  it('aceita exatamente 60 caracteres', () => {
    expect(validarTitulo('A'.repeat(60))).toEqual({ ok: true, valor: 'A'.repeat(60) })
  })
  it('recusa valor não-string', () => {
    expect(validarTitulo(123)).toEqual({ ok: false, erro: 'Digite um título' })
    expect(validarTitulo(null)).toEqual({ ok: false, erro: 'Digite um título' })
  })
})

describe('validarFilmesDiferentes', () => {
  it('aceita ids diferentes', () => {
    expect(validarFilmesDiferentes(603, 604)).toEqual({ ok: true, valor: undefined })
  })
  it('recusa ids iguais', () => {
    expect(validarFilmesDiferentes(603, 603)).toEqual({ ok: false, erro: 'Escolha dois filmes diferentes' })
  })
})
