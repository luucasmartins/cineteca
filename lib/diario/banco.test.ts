import { describe, expect, it } from 'vitest'
import { paraRegistroAssistido } from './banco'

describe('paraRegistroAssistido', () => {
  const linha = {
    id: 'r1',
    filme_id: 603,
    titulo: 'Matrix',
    poster_url: '/p.jpg',
    ano: '1999',
    diretores: [{ id: 900, nome: 'Lana Wachowski', fotoUrl: null }],
    assistido_em: '2026-09-14',
    anotacao: 'Cinema IMAX',
    criado_em: '2026-09-14T18:00:00Z',
  }

  it('converte a linha do banco', () => {
    const r = paraRegistroAssistido(linha)
    expect(r.filmeId).toBe(603)
    expect(r.titulo).toBe('Matrix')
    expect(r.posterUrl).toBe('/p.jpg')
    expect(r.diretores).toEqual([{ id: 900, nome: 'Lana Wachowski', fotoUrl: null }])
    expect(r.assistidoEm).toBe('2026-09-14')
    expect(r.anotacao).toBe('Cinema IMAX')
  })

  it('anotação null continua null', () => {
    expect(paraRegistroAssistido({ ...linha, anotacao: null }).anotacao).toBeNull()
  })

  it('diretores vazio continua array vazio', () => {
    expect(paraRegistroAssistido({ ...linha, diretores: [] }).diretores).toEqual([])
  })
})
