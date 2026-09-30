import type { FilmeSalvo, ListaStore, Listas, TipoLista } from './tipos'

export const CHAVE_LISTAS = 'cineteca:listas:v1'

export type ArmazenamentoSimples = Pick<Storage, 'getItem' | 'setItem'>

export function obterArmazenamentoSeguro(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    const armazenamento = window.localStorage
    const teste = '__cineteca_teste__'
    armazenamento.setItem(teste, '1')
    armazenamento.removeItem(teste)
    return armazenamento
  } catch {
    return null
  }
}

function listasVazias(): Listas {
  return { favoritos: [], salvos: [] }
}

export function ehFilmeSalvo(valor: unknown): valor is FilmeSalvo {
  if (!valor || typeof valor !== 'object') return false
  const f = valor as Record<string, unknown>
  return (
    typeof f.id === 'number' &&
    typeof f.title === 'string' &&
    (f.posterUrl === null || typeof f.posterUrl === 'string') &&
    (f.year === null || typeof f.year === 'string') &&
    (f.rating === null || typeof f.rating === 'number')
  )
}

function lerLista(valor: unknown): FilmeSalvo[] {
  return Array.isArray(valor) ? valor.filter(ehFilmeSalvo) : []
}

export function lerListas(armazenamento: Pick<Storage, 'getItem'>): Listas {
  try {
    const bruto = armazenamento.getItem(CHAVE_LISTAS)
    if (!bruto) return listasVazias()
    const dados: unknown = JSON.parse(bruto)
    if (!dados || typeof dados !== 'object') return listasVazias()
    const d = dados as Record<string, unknown>
    return { favoritos: lerLista(d.favoritos), salvos: lerLista(d.salvos) }
  } catch {
    return listasVazias()
  }
}

export function criarListaLocal(armazenamento: ArmazenamentoSimples | null): ListaStore {
  let listas = armazenamento ? lerListas(armazenamento) : listasVazias()
  // Fica false se a última gravação falhou: aí a memória é a fonte mais atual.
  let sincronizado = true

  function atualizar(): Listas {
    if (armazenamento && sincronizado) listas = lerListas(armazenamento)
    return listas
  }

  function gravar(novas: Listas) {
    listas = novas
    if (!armazenamento) return
    try {
      armazenamento.setItem(CHAVE_LISTAS, JSON.stringify(novas))
      sincronizado = true
    } catch {
      sincronizado = false
    }
  }

  return {
    async listar(tipo: TipoLista) {
      return [...atualizar()[tipo]]
    },
    async contem(tipo: TipoLista, id: number) {
      return atualizar()[tipo].some((f) => f.id === id)
    },
    async adicionar(tipo: TipoLista, filme: FilmeSalvo) {
      const atuais = atualizar()
      gravar({ ...atuais, [tipo]: [filme, ...atuais[tipo].filter((f) => f.id !== filme.id)] })
    },
    async remover(tipo: TipoLista, id: number) {
      const atuais = atualizar()
      gravar({ ...atuais, [tipo]: atuais[tipo].filter((f) => f.id !== id) })
    },
  }
}
