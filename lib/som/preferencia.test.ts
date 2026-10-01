import { describe, expect, it } from 'vitest'
import { CHAVE_SOM, gravarSomDesligado, lerSomDesligado } from './preferencia'

function armazenamentoFalso() {
  const dados = new Map<string, string>()
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

const quebrado = {
  getItem(): string | null {
    throw new DOMException('bloqueado', 'SecurityError')
  },
  setItem(): void {
    throw new DOMException('cheio', 'QuotaExceededError')
  },
  removeItem(): void {
    throw new DOMException('bloqueado', 'SecurityError')
  },
}

describe('preferência de som', () => {
  it('começa ligado', () => {
    expect(lerSomDesligado(armazenamentoFalso())).toBe(false)
  })

  it('grava e lê "desligado"', () => {
    const a = armazenamentoFalso()
    gravarSomDesligado(a, true)
    expect(a.dados.get(CHAVE_SOM)).toBe('desligado')
    expect(lerSomDesligado(a)).toBe(true)
  })

  it('religar apaga a chave', () => {
    const a = armazenamentoFalso()
    gravarSomDesligado(a, true)
    gravarSomDesligado(a, false)
    expect(a.dados.has(CHAVE_SOM)).toBe(false)
    expect(lerSomDesligado(a)).toBe(false)
  })

  it('sem armazenamento, lê ligado e gravar não faz nada', () => {
    expect(lerSomDesligado(null)).toBe(false)
    expect(() => gravarSomDesligado(null, true)).not.toThrow()
  })

  it('com o armazenamento bloqueado, lê ligado e gravar não lança erro', () => {
    expect(lerSomDesligado(quebrado)).toBe(false)
    expect(() => gravarSomDesligado(quebrado, true)).not.toThrow()
    expect(() => gravarSomDesligado(quebrado, false)).not.toThrow()
  })
})
