import { describe, expect, it } from 'vitest'
import { importarListasDoNavegador } from './importacao'
import { CHAVE_LISTAS, criarListaLocal } from './local'
import type { FilmeSalvo, ListaStore } from './tipos'

const filme = (id: number): FilmeSalvo => ({ id, title: `Filme ${id}`, posterUrl: null, year: '2024', rating: 7 })

function navegador(conteudo: string | null) {
  const dados = new Map<string, string>()
  if (conteudo !== null) dados.set(CHAVE_LISTAS, conteudo)
  return {
    dados,
    getItem: (k: string) => dados.get(k) ?? null,
    removeItem: (k: string) => {
      dados.delete(k)
    },
  }
}

describe('importarListasDoNavegador', () => {
  it('leva os filmes para a conta, mantendo a ordem, e apaga do navegador', async () => {
    const origem = navegador(JSON.stringify({ favoritos: [filme(2), filme(1)], salvos: [filme(3)] }))
    const conta = criarListaLocal(null)
    expect(await importarListasDoNavegador(origem, conta)).toBe(3)
    expect((await conta.listar('favoritos')).map((f) => f.id)).toEqual([2, 1])
    expect((await conta.listar('salvos')).map((f) => f.id)).toEqual([3])
    expect(origem.dados.has(CHAVE_LISTAS)).toBe(false)
  })

  it('não duplica o que já está na conta', async () => {
    const origem = navegador(JSON.stringify({ favoritos: [filme(1), filme(2)], salvos: [] }))
    const conta = criarListaLocal(null)
    await conta.adicionar('favoritos', filme(1))
    expect(await importarListasDoNavegador(origem, conta)).toBe(1)
    expect(
      (await conta.listar('favoritos'))
        .map((f) => f.id)
        .sort(),
    ).toEqual([1, 2])
  })

  it('nada para importar: devolve 0 e apaga dados corrompidos', async () => {
    const corrompido = navegador('isso não é json')
    expect(await importarListasDoNavegador(corrompido, criarListaLocal(null))).toBe(0)
    expect(corrompido.dados.has(CHAVE_LISTAS)).toBe(false)
    expect(await importarListasDoNavegador(navegador(null), criarListaLocal(null))).toBe(0)
    expect(await importarListasDoNavegador(null, criarListaLocal(null))).toBe(0)
  })

  it('se a conta falhar, mantém os dados no navegador para tentar de novo', async () => {
    const origem = navegador(JSON.stringify({ favoritos: [filme(1)], salvos: [] }))
    const quebrada: ListaStore = {
      listar: async () => [],
      contem: async () => false,
      adicionar: async () => {
        throw new Error('fora do ar')
      },
      remover: async () => undefined,
    }
    await expect(importarListasDoNavegador(origem, quebrada)).rejects.toThrow('fora do ar')
    expect(origem.dados.has(CHAVE_LISTAS)).toBe(true)
  })
})
