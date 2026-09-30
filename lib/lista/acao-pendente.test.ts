import { describe, expect, it } from 'vitest'
import {
  CHAVE_ACAO_PENDENTE,
  guardarAcaoPendente,
  lerAcaoPendente,
  limparAcaoPendente,
  VALIDADE_ACAO_MS,
} from './acao-pendente'

function armazenamentoFalso(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial))
  return {
    dados,
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => {
      dados.set(k, v)
    },
    removeItem: (k: string) => {
      dados.delete(k)
    },
  }
}

const filme = { id: 603, title: 'Matrix', posterUrl: null, year: '1999', rating: 8.2 }

describe('ação pendente', () => {
  it('guarda e lê de volta', () => {
    const a = armazenamentoFalso()
    guardarAcaoPendente(a, { tipo: 'favoritos', filme, voltar: '/filme/603' }, 1000)
    expect(lerAcaoPendente(a, 2000)).toEqual({ tipo: 'favoritos', filme, voltar: '/filme/603', criadaEm: 1000 })
  })

  it('limpar apaga a ação', () => {
    const a = armazenamentoFalso()
    guardarAcaoPendente(a, { tipo: 'salvos', filme, voltar: '/' }, 1000)
    limparAcaoPendente(a)
    expect(lerAcaoPendente(a, 1000)).toBeNull()
  })

  it('expira depois de 30 minutos e é apagada', () => {
    const a = armazenamentoFalso()
    guardarAcaoPendente(a, { tipo: 'salvos', filme, voltar: '/' }, 0)
    expect(VALIDADE_ACAO_MS).toBe(30 * 60 * 1000)
    expect(lerAcaoPendente(a, VALIDADE_ACAO_MS + 1)).toBeNull()
    expect(a.dados.has(CHAVE_ACAO_PENDENTE)).toBe(false)
  })

  it('ignora e apaga dados corrompidos ou com formato errado', () => {
    for (const bruto of [
      'isso não é json',
      'null',
      JSON.stringify({ tipo: 'series', filme, voltar: '/', criadaEm: 0 }),
      JSON.stringify({ tipo: 'favoritos', filme: { id: '603' }, voltar: '/', criadaEm: 0 }),
      JSON.stringify({ tipo: 'favoritos', filme, voltar: '/', criadaEm: 'ontem' }),
    ]) {
      const a = armazenamentoFalso({ [CHAVE_ACAO_PENDENTE]: bruto })
      expect(lerAcaoPendente(a, 0)).toBeNull()
      expect(a.dados.has(CHAVE_ACAO_PENDENTE)).toBe(false)
    }
  })

  it('limpa o endereço de retorno ao guardar e ao ler', () => {
    const a = armazenamentoFalso()
    guardarAcaoPendente(a, { tipo: 'favoritos', filme, voltar: '//site.com' }, 0)
    expect(lerAcaoPendente(a, 0)?.voltar).toBe('/')
    const b = armazenamentoFalso({
      [CHAVE_ACAO_PENDENTE]: JSON.stringify({ tipo: 'favoritos', filme, voltar: 'https://site.com', criadaEm: 0 }),
    })
    expect(lerAcaoPendente(b, 0)?.voltar).toBe('/')
  })

  it('não quebra sem armazenamento ou quando gravar falha', () => {
    expect(() => guardarAcaoPendente(null, { tipo: 'favoritos', filme, voltar: '/' })).not.toThrow()
    expect(lerAcaoPendente(null)).toBeNull()
    const quebrado = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
      removeItem: () => undefined,
    }
    expect(() => guardarAcaoPendente(quebrado, { tipo: 'favoritos', filme, voltar: '/' })).not.toThrow()
  })
})
