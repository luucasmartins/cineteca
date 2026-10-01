import { describe, expect, it } from 'vitest'
import { lerAvaliacaoDoFilme, lerRanking } from './banco'

type Resposta = { data: unknown; error: { code?: string; message?: string } | null; status?: number }

// Devolve uma resposta diferente por tabela consultada.
function clienteFalso(porTabela: Record<string, Resposta>) {
  const chamadas: { metodo: string; args: unknown[] }[] = []
  const criarConsulta = (tabela: string) => {
    const resposta = porTabela[tabela] ?? { data: [], error: null, status: 200 }
    const consulta: Record<string, unknown> = {}
    for (const metodo of ['select', 'eq', 'order', 'limit', 'maybeSingle']) {
      consulta[metodo] = (...args: unknown[]) => {
        chamadas.push({ metodo, args })
        return metodo === 'maybeSingle' ? Promise.resolve(resposta) : consulta
      }
    }
    consulta.then = (aoResolver: (r: Resposta) => unknown, aoRejeitar?: (e: unknown) => unknown) =>
      Promise.resolve(resposta).then(aoResolver, aoRejeitar)
    return consulta
  }
  const cliente = {
    from: (tabela: string) => {
      chamadas.push({ metodo: 'from', args: [tabela] })
      return criarConsulta(tabela)
    },
  }
  return { cliente: cliente as never, chamadas }
}

describe('lerAvaliacaoDoFilme', () => {
  it('devolve o voto da pessoa e o agregado', async () => {
    const { cliente } = clienteFalso({
      avaliacoes: { data: { curtiu: true }, error: null, status: 200 },
      ranking_filmes: { data: { votos: 50, curtidas: 41, aprovacao: 82 }, error: null, status: 200 },
    })
    expect(await lerAvaliacaoDoFilme(cliente, 603, 'u1')).toEqual({
      meuVoto: true,
      agregado: { votos: 50, curtidas: 41, aprovacao: 82 },
    })
  })

  it('sem usuário, não consulta o voto e devolve meuVoto nulo', async () => {
    const { cliente, chamadas } = clienteFalso({
      ranking_filmes: { data: { votos: 3, curtidas: 3, aprovacao: 100 }, error: null, status: 200 },
    })
    const estado = await lerAvaliacaoDoFilme(cliente, 603, null)
    expect(estado.meuVoto).toBeNull()
    expect(chamadas.some((c) => c.args[0] === 'avaliacoes')).toBe(false)
  })

  it('filme fora do ranking devolve agregado nulo', async () => {
    const { cliente } = clienteFalso({
      avaliacoes: { data: null, error: null, status: 200 },
      ranking_filmes: { data: null, error: null, status: 200 },
    })
    expect(await lerAvaliacaoDoFilme(cliente, 603, 'u1')).toEqual({ meuVoto: null, agregado: null })
  })

  it('erro na leitura não derruba a página: devolve o estado vazio', async () => {
    const { cliente } = clienteFalso({
      avaliacoes: { data: null, error: { code: 'PGRST301' }, status: 401 },
      ranking_filmes: { data: null, error: { code: '500' }, status: 500 },
    })
    expect(await lerAvaliacaoDoFilme(cliente, 603, 'u1')).toEqual({ meuVoto: null, agregado: null })
  })
})

describe('lerRanking', () => {
  it('converte as linhas do banco e respeita o limite', async () => {
    const { cliente, chamadas } = clienteFalso({
      ranking_filmes: {
        data: [
          { filme_id: 603, titulo: 'Matrix', poster_url: 'https://img/p.jpg', ano: '1999', votos: 50, curtidas: 41, aprovacao: 82 },
        ],
        error: null,
        status: 200,
      },
    })
    expect(await lerRanking(cliente, 20)).toEqual([
      { filmeId: 603, titulo: 'Matrix', posterUrl: 'https://img/p.jpg', ano: '1999', votos: 50, curtidas: 41, aprovacao: 82 },
    ])
    expect(chamadas.some((c) => c.metodo === 'limit' && c.args[0] === 20)).toBe(true)
  })

  it('erro devolve lista vazia em vez de quebrar', async () => {
    const { cliente } = clienteFalso({
      ranking_filmes: { data: null, error: { code: '500' }, status: 500 },
    })
    expect(await lerRanking(cliente, 20)).toEqual([])
  })
})
