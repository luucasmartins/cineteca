import { describe, expect, it } from 'vitest'
import { validarAnotacao, validarData } from './validacao'

describe('validarData', () => {
  it('aceita data válida no passado', () => {
    expect(validarData('2026-06-15')).toEqual({ ok: true, valor: '2026-06-15' })
  })
  it('aceita hoje', () => {
    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    expect(validarData(hoje).ok).toBe(true)
  })
  it('recusa data no futuro (amanhã + 2)', () => {
    const futuro = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
    expect(validarData(futuro)).toEqual({ ok: false, erro: 'A data não pode ser no futuro' })
  })
  it('recusa antes de 1895', () => {
    expect(validarData('1894-12-31')).toEqual({ ok: false, erro: 'Data inválida' })
  })
  it('recusa formato inválido', () => {
    expect(validarData('abc')).toEqual({ ok: false, erro: 'Data inválida' })
    expect(validarData(123)).toEqual({ ok: false, erro: 'Data inválida' })
    expect(validarData(null)).toEqual({ ok: false, erro: 'Data inválida' })
  })
})

describe('validarAnotacao', () => {
  it('aceita texto até 500 caracteres', () => {
    expect(validarAnotacao('Vi no cinema')).toEqual({ ok: true, valor: 'Vi no cinema' })
  })
  it('remove espaços das pontas', () => {
    expect(validarAnotacao('  Nota  ')).toEqual({ ok: true, valor: 'Nota' })
  })
  it('vazio e null viram null', () => {
    expect(validarAnotacao('')).toEqual({ ok: true, valor: null })
    expect(validarAnotacao('   ')).toEqual({ ok: true, valor: null })
    expect(validarAnotacao(null)).toEqual({ ok: true, valor: null })
    expect(validarAnotacao(undefined)).toEqual({ ok: true, valor: null })
  })
  it('recusa mais de 500 caracteres', () => {
    expect(validarAnotacao('A'.repeat(501))).toEqual({ ok: false, erro: 'A anotação pode ter no máximo 500 caracteres' })
  })
})
