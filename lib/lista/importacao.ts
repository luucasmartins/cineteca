import { CHAVE_LISTAS, lerListas } from './local'
import { TIPOS_LISTA, type ListaStore } from './tipos'

// Leva para a conta as listas que a Fase 1 guardava no navegador. Devolve quantos filmes foram trazidos.
export async function importarListasDoNavegador(
  armazenamento: Pick<Storage, 'getItem' | 'removeItem'> | null,
  destino: ListaStore,
): Promise<number> {
  if (!armazenamento) return 0
  let existe = false
  try {
    existe = armazenamento.getItem(CHAVE_LISTAS) !== null
  } catch {
    return 0
  }
  if (!existe) return 0

  const antigas = lerListas(armazenamento)
  let trazidos = 0
  for (const tipo of TIPOS_LISTA) {
    const naConta = new Set((await destino.listar(tipo)).map((f) => f.id))
    // Do mais antigo para o mais novo, para o mais novo continuar no topo.
    for (const filme of [...antigas[tipo]].reverse()) {
      if (naConta.has(filme.id)) continue
      await destino.adicionar(tipo, filme)
      naConta.add(filme.id)
      trazidos++
    }
  }
  try {
    armazenamento.removeItem(CHAVE_LISTAS)
  } catch {
    // ignorado: na próxima vez os filmes já estarão na conta e nada será duplicado
  }
  return trazidos
}
