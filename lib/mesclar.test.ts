import { describe, expect, it } from 'vitest'
import { mesclarSemDuplicados } from './mesclar'

describe('mesclarSemDuplicados', () => {
  it('acrescenta os novos no fim, mantendo a ordem', () => {
    expect(mesclarSemDuplicados([{ id: 1 }, { id: 2 }], [{ id: 3 }]).map((f) => f.id)).toEqual([1, 2, 3])
  })

  it('descarta filmes que já estão na grade', () => {
    expect(mesclarSemDuplicados([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }]).map((f) => f.id)).toEqual([1, 2, 3])
  })

  it('descarta repetidos dentro da própria página nova', () => {
    expect(mesclarSemDuplicados([], [{ id: 5 }, { id: 5 }]).map((f) => f.id)).toEqual([5])
  })
})
