import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHAVE_LISTAS, criarListaLocal, obterArmazenamentoSeguro } from './local'
import { paraFilmeSalvo, type FilmeSalvo } from './tipos'

function armazenamentoFalso(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial))
  return {
    dados,
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => {
      dados.set(chave, valor)
    },
  }
}

const filme = (id: number): FilmeSalvo => ({ id, title: `Filme ${id}`, posterUrl: null, year: '2024', rating: 7.5 })

describe('criarListaLocal', () => {
  it('começa com as duas listas vazias', async () => {
    const loja = criarListaLocal(armazenamentoFalso())
    expect(await loja.listar('favoritos')).toEqual([])
    expect(await loja.listar('salvos')).toEqual([])
  })

  it('adiciona, persiste na chave certa e reabre com os mesmos dados', async () => {
    const armazenamento = armazenamentoFalso()
    await criarListaLocal(armazenamento).adicionar('favoritos', filme(1))

    expect(JSON.parse(armazenamento.dados.get(CHAVE_LISTAS)!)).toEqual({ favoritos: [filme(1)], salvos: [] })
    expect(await criarListaLocal(armazenamento).listar('favoritos')).toEqual([filme(1)])
  })

  it('coloca o mais recente primeiro e não duplica', async () => {
    const loja = criarListaLocal(armazenamentoFalso())
    await loja.adicionar('salvos', filme(1))
    await loja.adicionar('salvos', filme(2))
    await loja.adicionar('salvos', filme(1))
    expect((await loja.listar('salvos')).map((f) => f.id)).toEqual([1, 2])
  })

  it('remove e responde contem', async () => {
    const loja = criarListaLocal(armazenamentoFalso())
    await loja.adicionar('favoritos', filme(1))
    expect(await loja.contem('favoritos', 1)).toBe(true)
    await loja.remover('favoritos', 1)
    expect(await loja.contem('favoritos', 1)).toBe(false)
  })

  it('mantém favoritos e salvos independentes', async () => {
    const loja = criarListaLocal(armazenamentoFalso())
    await loja.adicionar('favoritos', filme(1))
    expect(await loja.contem('salvos', 1)).toBe(false)
  })

  it('enxerga mudanças gravadas por outra aba no mesmo armazenamento', async () => {
    const armazenamento = armazenamentoFalso()
    const abaA = criarListaLocal(armazenamento)
    const abaB = criarListaLocal(armazenamento)
    await abaB.adicionar('favoritos', filme(9))
    expect(await abaA.listar('favoritos')).toEqual([filme(9)])
  })

  it('funciona só em memória quando não há armazenamento', async () => {
    const loja = criarListaLocal(null)
    await loja.adicionar('favoritos', filme(1))
    expect(await loja.listar('favoritos')).toEqual([filme(1)])
  })

  it('não quebra quando gravar falha (armazenamento cheio ou bloqueado)', async () => {
    const armazenamento = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
    }
    const loja = criarListaLocal(armazenamento)
    await expect(loja.adicionar('favoritos', filme(1))).resolves.toBeUndefined()
    expect(await loja.listar('favoritos')).toEqual([filme(1)])
  })

  it('ignora JSON corrompido', async () => {
    const loja = criarListaLocal(armazenamentoFalso({ [CHAVE_LISTAS]: 'isso não é json' }))
    expect(await loja.listar('favoritos')).toEqual([])
  })

  it('descarta itens com formato inválido e mantém os válidos', async () => {
    const bruto = JSON.stringify({
      favoritos: [filme(1), { id: '2', title: 'id em texto' }, null, { title: 'sem id' }],
      salvos: 'não é lista',
    })
    const loja = criarListaLocal(armazenamentoFalso({ [CHAVE_LISTAS]: bruto }))
    expect(await loja.listar('favoritos')).toEqual([filme(1)])
    expect(await loja.listar('salvos')).toEqual([])
  })

  it('ignora JSON válido que não é objeto', async () => {
    const loja = criarListaLocal(armazenamentoFalso({ [CHAVE_LISTAS]: 'null' }))
    expect(await loja.listar('salvos')).toEqual([])
  })
})

describe('paraFilmeSalvo', () => {
  it('copia só os campos do resumo', () => {
    const completo = { ...filme(1), overview: 'x', genres: ['Ação'], backdropUrl: null }
    expect(paraFilmeSalvo(completo)).toEqual(filme(1))
  })
})

describe('obterArmazenamentoSeguro', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('devolve null fora do navegador', () => {
    expect(obterArmazenamentoSeguro()).toBeNull()
  })

  it('devolve null quando o navegador bloqueia o localStorage', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('bloqueado', 'SecurityError')
      },
    })
    expect(obterArmazenamentoSeguro()).toBeNull()
  })
})
