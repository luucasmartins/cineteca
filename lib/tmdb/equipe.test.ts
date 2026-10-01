import { describe, expect, it } from 'vitest'
import { MAX_EQUIPE, normalizarEquipe } from './equipe'

const pessoa = (id: number, job: string, extra: Partial<{ name: string; profile_path: string | null }> = {}) => ({
  id,
  name: extra.name ?? `Pessoa ${id}`,
  job,
  profile_path: extra.profile_path ?? null,
})

describe('normalizarEquipe', () => {
  it('fica só com as 6 funções e traduz os nomes', () => {
    const equipe = normalizarEquipe([
      pessoa(1, 'Director'),
      pessoa(2, 'Costume Design'),
      pessoa(3, 'Director of Photography'),
      pessoa(4, 'Production Design'),
      pessoa(5, 'Art Direction'),
      pessoa(6, 'Original Music Composer'),
      pessoa(7, 'Editor'),
    ])
    expect(equipe.map((p) => [p.id, p.funcoes])).toEqual([
      [1, ['Direção']],
      [3, ['Fotografia']],
      [4, ['Design de produção']],
      [6, ['Música']],
      [7, ['Montagem']],
    ])
  })

  it('Screenplay e Writer viram Roteiro, sem repetir a pessoa', () => {
    const equipe = normalizarEquipe([pessoa(1, 'Screenplay'), pessoa(1, 'Writer'), pessoa(2, 'Writer')])
    expect(equipe).toEqual([
      { id: 1, name: 'Pessoa 1', profileUrl: null, funcoes: ['Roteiro'] },
      { id: 2, name: 'Pessoa 2', profileUrl: null, funcoes: ['Roteiro'] },
    ])
  })

  it('junta as funções da mesma pessoa num cartão, na ordem da tabela', () => {
    const equipe = normalizarEquipe([pessoa(9, 'Editor'), pessoa(9, 'Screenplay'), pessoa(9, 'Director')])
    expect(equipe).toHaveLength(1)
    expect(equipe[0].funcoes).toEqual(['Direção', 'Roteiro', 'Montagem'])
  })

  it('ordena os cartões pela primeira função de cada pessoa, mantendo a ordem do TMDB no empate', () => {
    const equipe = normalizarEquipe([pessoa(3, 'Editor'), pessoa(2, 'Director'), pessoa(1, 'Director')])
    expect(equipe.map((p) => p.id)).toEqual([2, 1, 3])
  })

  it('limita a 3 pessoas por função', () => {
    const equipe = normalizarEquipe([1, 2, 3, 4, 5, 6].map((id) => pessoa(id, 'Writer')))
    expect(equipe.map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('limita a 12 cartões no total', () => {
    const jobs = ['Director', 'Writer', 'Director of Photography', 'Production Design', 'Original Music Composer', 'Editor']
    const crew = jobs.flatMap((job, j) => [1, 2, 3].map((k) => pessoa(j * 10 + k, job)))
    expect(normalizarEquipe(crew)).toHaveLength(MAX_EQUIPE)
  })

  it('monta a URL da foto em w185', () => {
    const [p] = normalizarEquipe([pessoa(1, 'Director', { profile_path: '/f.jpg' })])
    expect(p.profileUrl).toBe('https://image.tmdb.org/t/p/w185/f.jpg')
  })

  it('aceita lista vazia', () => {
    expect(normalizarEquipe([])).toEqual([])
  })
})
