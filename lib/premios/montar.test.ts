import { describe, expect, it } from 'vitest'
import { montarPremios, resumoContagem, textoPessoas } from './montar'
import type { LinhaPremio } from './tipos'

const v = (categoria: string, pessoa: string | null = null): LinhaPremio => ({ venceu: true, categoria, pessoa })
const i = (categoria: string, pessoa: string | null = null): LinhaPremio => ({ venceu: false, categoria, pessoa })

// Linhas reais de Duna (TMDB 438631), consulta de 2026-10-01, só Oscar.
const DUNA_OSCAR: LinhaPremio[] = [
  i('Q102427'), i('Q102427', 'Cale Boyter'), i('Q102427', 'Denis Villeneuve'), i('Q102427', 'Mary Parent'),
  i('Q107258', 'Denis Villeneuve'), i('Q107258', 'Eric Roth'), i('Q107258', 'Jon Spaihts'),
  i('Q131520', 'Greig Fraser'), i('Q277536', 'Bob Morgan'), i('Q277536', 'Jacqueline West'),
  i('Q277751', 'Patrice Vermette'), i('Q277751', 'Zsuzsanna Sipos'), i('Q281939', 'Joe Walker'),
  i('Q393686', 'Brian Connor'), i('Q393686', 'Gerd Nefzer'), i('Q393686', 'Paul Lambert (efeitos visuais)'), i('Q393686', 'Tristan Myles'),
  i('Q487136', 'Donald Mowat'), i('Q487136', 'Eva von Bahr'), i('Q487136', 'Love Larson'),
  i('Q488651', 'Hans Zimmer'), i('Q830079', 'Doug Hemphill'), i('Q830079', 'Mac Ruth'),
  v('Q131520', 'Greig Fraser'), v('Q277751', 'Patrice Vermette'), v('Q277751', 'Zsuzsanna Sipos'),
  v('Q281939', 'Joe Walker'), v('Q393686', 'Brian Connor'), v('Q393686', 'Gerd Nefzer'),
  v('Q393686', 'Paul Lambert (efeitos visuais)'), v('Q393686', 'Tristan Myles'), v('Q488651', 'Hans Zimmer'),
  v('Q830079', 'Doug Hemphill'), v('Q830079', 'Mac Ruth'), v('Q830079', 'Mark Mangini'), v('Q830079', 'Ron Bartlett'), v('Q830079', 'Theo Green'),
]

describe('montarPremios', () => {
  it('Duna: 6 vitórias técnicas em ordem e 4 indicações, sem repetir quem venceu', () => {
    const [oscar] = montarPremios(DUNA_OSCAR)
    expect(oscar.chave).toBe('oscar')
    expect(oscar.nome).toBe('Oscar')
    expect(oscar.vitorias).toEqual([
      { categoria: 'Melhor Fotografia', quem: 'Greig Fraser' },
      { categoria: 'Melhor Direção de Arte', quem: 'Patrice Vermette e Zsuzsanna Sipos' },
      { categoria: 'Melhores Efeitos Visuais', quem: 'Brian Connor e outros 3' },
      { categoria: 'Melhor Montagem', quem: 'Joe Walker' },
      { categoria: 'Melhor Som', quem: 'Doug Hemphill e outros 4' },
      { categoria: 'Melhor Trilha Sonora', quem: 'Hans Zimmer' },
    ])
    expect(oscar.indicacoes).toEqual(['Melhor Figurino', 'Melhor Maquiagem e Penteado', 'Melhor Filme', 'Melhor Roteiro Adaptado'])
    expect(resumoContagem(oscar)).toBe('6 vitórias · 4 indicações')
  })

  it('ordena os prêmios na ordem fixa e descarta os que não aparecem', () => {
    const premios = montarPremios([v('Q179808'), i('Q1011509'), v('Q131520', 'Fulano')])
    expect(premios.map((p) => p.chave)).toEqual(['oscar', 'globo', 'cannes'])
  })

  it('ignora categoria fora do catálogo', () => {
    expect(montarPremios([v('Q60521588'), i('Q732997', 'Theo Green')])).toEqual([])
  })

  it('vitória sem pessoa não tem nome', () => {
    const [cannes] = montarPremios([v('Q179808')])
    expect(cannes.vitorias).toEqual([{ categoria: 'Palma de Ouro', quem: null }])
  })

  it('não mostra Q-id no lugar do nome e não repete a mesma pessoa', () => {
    const [oscar] = montarPremios([v('Q131520', 'Q98765'), v('Q131520', 'Ana Lima'), v('Q131520', 'Ana Lima')])
    expect(oscar.vitorias).toEqual([{ categoria: 'Melhor Fotografia', quem: 'Ana Lima' }])
  })

  it('junta dois Q-ids com o mesmo nome numa linha só', () => {
    const [oscar] = montarPremios([v('Q21995136', 'Ana Lima'), v('Q131520', 'Bruno Costa')])
    expect(oscar.vitorias).toEqual([{ categoria: 'Melhor Fotografia', quem: 'Ana Lima e Bruno Costa' }])
  })

  it('lista vazia dá nenhum prêmio', () => {
    expect(montarPremios([])).toEqual([])
  })
})

describe('textoPessoas', () => {
  it('formata zero, um, dois e vários nomes em ordem alfabética', () => {
    expect(textoPessoas([])).toBeNull()
    expect(textoPessoas(['Ana'])).toBe('Ana')
    expect(textoPessoas(['Bruno', 'Ana'])).toBe('Ana e Bruno')
    expect(textoPessoas(['Carla', 'Bruno', 'Ana'])).toBe('Ana e outros 2')
  })
})

describe('resumoContagem', () => {
  it('usa singular e omite o lado zerado', () => {
    expect(resumoContagem({ chave: 'oscar', nome: 'Oscar', vitorias: [{ categoria: 'X', quem: null }], indicacoes: [] })).toBe('1 vitória')
    expect(resumoContagem({ chave: 'oscar', nome: 'Oscar', vitorias: [], indicacoes: ['X'] })).toBe('1 indicação')
    expect(resumoContagem({ chave: 'oscar', nome: 'Oscar', vitorias: [], indicacoes: ['X', 'Y'] })).toBe('2 indicações')
  })
})
