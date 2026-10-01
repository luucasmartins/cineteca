import { describe, expect, it } from 'vitest'
import { formatarDuracao, iniciais } from './formatar'

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
describe('iniciais', () => {
  it('usa a primeira letra do primeiro e do último nome', () => {
    expect(iniciais('Lana Wachowski')).toBe('LW')
    expect(iniciais('Owen  de  Paterson ')).toBe('OP')
  })

  it('nome de uma palavra só tem uma inicial', () => {
    expect(iniciais('Vangelis')).toBe('V')
  })

  it('mantém o acento e põe em maiúscula', () => {
    expect(iniciais('érico ávila')).toBe('ÉÁ')
  })

  it('nome vazio devolve vazio', () => {
    expect(iniciais('   ')).toBe('')
  })
})
