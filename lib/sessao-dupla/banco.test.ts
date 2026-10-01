import { describe, expect, it } from 'vitest'
import { paraFilmeDaSessao, paraSessaoDupla } from './banco'

describe('paraFilmeDaSessao', () => {
  it('converte a linha do banco para FilmeDaSessao', () => {
    expect(
      paraFilmeDaSessao({ id: 603, titulo: 'Matrix', poster: '/p.jpg', ano: '1999' }),
    ).toEqual({ id: 603, titulo: 'Matrix', posterUrl: '/p.jpg', ano: '1999' })
  })
  it('poster nulo continua nulo', () => {
    expect(paraFilmeDaSessao({ id: 603, titulo: 'Matrix', poster: null, ano: '1999' }).posterUrl).toBeNull()
  })
})

describe('paraSessaoDupla', () => {
  const linha = {
    id: 'abc-123',
    titulo: 'Solidão Cyberpunk',
    filme1_id: 603,
    filme1_titulo: 'Matrix',
    filme1_poster: '/p1.jpg',
    filme1_ano: '1999',
    filme2_id: 604,
    filme2_titulo: 'Her',
    filme2_poster: '/p2.jpg',
    filme2_ano: '2013',
    criado_em: '2026-10-01T12:00:00Z',
    usuario_id: 'u1',
  }

  it('converte a linha do banco para SessaoDupla', () => {
    const sessao = paraSessaoDupla(linha, 'u1')
    expect(sessao.titulo).toBe('Solidão Cyberpunk')
    expect(sessao.filme1).toEqual({ id: 603, titulo: 'Matrix', posterUrl: '/p1.jpg', ano: '1999' })
    expect(sessao.filme2).toEqual({ id: 604, titulo: 'Her', posterUrl: '/p2.jpg', ano: '2013' })
    expect(sessao.minha).toBe(true)
  })

  it('minha é false para outro usuário', () => {
    expect(paraSessaoDupla(linha, 'u2').minha).toBe(false)
  })

  it('minha é false sem usuário', () => {
    expect(paraSessaoDupla(linha, null).minha).toBe(false)
  })
})
