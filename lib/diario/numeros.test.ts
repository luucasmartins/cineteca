import { describe, expect, it } from 'vitest'
import type { RegistroAssistido } from './tipos'
import { calcularNumeros } from './numeros'

function registro(parcial: Partial<RegistroAssistido> & { filmeId: number; assistidoEm: string }): RegistroAssistido {
  return {
    id: `r-${parcial.filmeId}-${parcial.assistidoEm}`,
    titulo: `Filme ${parcial.filmeId}`,
    posterUrl: null,
    ano: parcial.ano ?? '2020',
    diretores: parcial.diretores ?? [],
    anotacao: null,
    criadoEm: '2026-10-01T00:00:00Z',
    ...parcial,
  }
}

describe('calcularNumeros', () => {
  it('sessoes conta todos, filmes conta distintos, esteAno filtra pelo ano', () => {
    const registros = [
      registro({ filmeId: 1, assistidoEm: '2026-03-10' }),
      registro({ filmeId: 1, assistidoEm: '2026-09-01' }),
      registro({ filmeId: 2, assistidoEm: '2025-12-20' }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    expect(n.topo.sessoes).toBe(3)
    expect(n.topo.filmes).toBe(2)
    expect(n.topo.esteAno).toBe(2)
  })

  it('mapa de calor inclui anos sem registro entre o primeiro e o atual', () => {
    const registros = [
      registro({ filmeId: 1, assistidoEm: '2024-01-15' }),
      registro({ filmeId: 2, assistidoEm: '2026-06-10' }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    expect(n.mapa.map((l) => l.ano)).toEqual([2026, 2025, 2024])
    expect(n.mapa.find((l) => l.ano === 2025)!.meses.every((m) => m.contagem === 0)).toBe(true)
  })

  it('revisões contam no mapa de calor', () => {
    const registros = [
      registro({ filmeId: 1, assistidoEm: '2026-03-10' }),
      registro({ filmeId: 1, assistidoEm: '2026-03-20' }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    const marco = n.mapa[0].meses[2]
    expect(marco.contagem).toBe(2)
  })

  it('décadas contam filmes distintos e incluem vazias no meio', () => {
    const registros = [
      registro({ filmeId: 1, assistidoEm: '2026-01-01', ano: '1990' }),
      registro({ filmeId: 1, assistidoEm: '2026-02-01', ano: '1990' }),
      registro({ filmeId: 2, assistidoEm: '2026-03-01', ano: '2010' }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    expect(n.decadas).toEqual([
      { decada: '1990', contagem: 1, campea: false },
      { decada: '2000', contagem: 0, campea: false },
      { decada: '2010', contagem: 1, campea: true },
    ])
  })

  it('filme sem ano fica fora das décadas', () => {
    const registros = [registro({ filmeId: 1, assistidoEm: '2026-01-01', ano: null })]
    const n = calcularNumeros(registros, '2026-10-01')
    expect(n.decadas).toEqual([])
  })

  it('diretores contam filmes distintos, top 5, desempate por mais recente', () => {
    const d1 = [{ id: 1, nome: 'Diretor A', fotoUrl: null }]
    const d2 = [{ id: 2, nome: 'Diretor B', fotoUrl: null }]
    const registros = [
      registro({ filmeId: 1, assistidoEm: '2026-01-01', diretores: d1 }),
      registro({ filmeId: 1, assistidoEm: '2026-06-01', diretores: d1 }),
      registro({ filmeId: 2, assistidoEm: '2026-09-01', diretores: d1 }),
      registro({ filmeId: 3, assistidoEm: '2026-09-15', diretores: d2 }),
      registro({ filmeId: 4, assistidoEm: '2026-09-20', diretores: d2 }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    // Ambos com 2 filmes; B visto mais recentemente (2026-09-20 vs 2026-09-01)
    expect(n.diretores[0].id).toBe(2)
    expect(n.diretores[0].filmes).toBe(2)
    expect(n.diretores[1].id).toBe(1)
  })

  it('niveisMapa vai de 0 a 4 proporcional ao maior mês', () => {
    const registros = [
      ...Array.from({ length: 8 }, (_, i) => registro({ filmeId: 100 + i, assistidoEm: `2026-03-${String(i + 1).padStart(2, '0')}` })),
      registro({ filmeId: 200, assistidoEm: '2026-07-01' }),
    ]
    const n = calcularNumeros(registros, '2026-10-01')
    const marco = n.mapa[0].meses[2]
    expect(marco.nivel).toBe(4)
    const julho = n.mapa[0].meses[6]
    expect(julho.nivel).toBe(1)
  })

  it('sem registros devolve tudo zerado e arrays vazios', () => {
    const n = calcularNumeros([], '2026-10-01')
    expect(n.topo).toEqual({ sessoes: 0, filmes: 0, esteAno: 0 })
    expect(n.mapa).toEqual([])
    expect(n.decadas).toEqual([])
    expect(n.diretores).toEqual([])
  })
})
