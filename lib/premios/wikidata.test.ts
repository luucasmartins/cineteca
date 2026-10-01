import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { buscarLinhasPremios } from './wikidata'

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/sparql-results+json' } })
}

const ENTIDADE = 'http://www.wikidata.org/entity/'

describe('buscarLinhasPremios', () => {
  const fetchMock = vi.fn()
  let erroSpy: MockInstance<typeof console.error>

  beforeEach(() => {
    erroSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    erroSpy.mockRestore()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('consulta o Wikidata pelo id do TMDB, com cache de 1 dia, tempo limite e User-Agent', async () => {
    fetchMock.mockResolvedValue(respostaJson({ results: { bindings: [] } }))

    await buscarLinhasPremios(438631)

    const [url, init] = fetchMock.mock.calls[0]
    const u = new URL(url)
    expect(u.origin + u.pathname).toBe('https://query.wikidata.org/sparql')
    const consulta = u.searchParams.get('query')!
    expect(consulta).toContain('wdt:P4947 "438631"')
    expect(consulta).toContain('VALUES ?categoria')
    expect(consulta).toContain('wd:Q131520')
    expect(init.headers.Accept).toBe('application/sparql-results+json')
    expect(init.headers['User-Agent']).toBe('CineTeca/1.0 (https://cineteca-gules.vercel.app)')
    expect(init.next).toEqual({ revalidate: 86400 })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('usa WIKIDATA_SPARQL_URL quando definido', async () => {
    vi.stubEnv('WIKIDATA_SPARQL_URL', 'http://localhost:4010/sparql')
    fetchMock.mockResolvedValue(respostaJson({ results: { bindings: [] } }))
    await buscarLinhasPremios(1)
    const u = new URL(fetchMock.mock.calls[0][0])
    expect(u.origin + u.pathname).toBe('http://localhost:4010/sparql')
  })

  it('converte as linhas da resposta', async () => {
    fetchMock.mockResolvedValue(
      respostaJson({
        results: {
          bindings: [
            { venceu: { value: 'true' }, categoria: { value: `${ENTIDADE}Q131520` }, pessoaLabel: { value: 'Greig Fraser' } },
            { venceu: { value: 'false' }, categoria: { value: `${ENTIDADE}Q102427` } },
            { venceu: { value: 'true' } },
          ],
        },
      }),
    )

    expect(await buscarLinhasPremios(438631)).toEqual([
      { venceu: true, categoria: 'Q131520', pessoa: 'Greig Fraser' },
      { venceu: false, categoria: 'Q102427', pessoa: null },
    ])
  })

  it('devolve null e registra quando o Wikidata responde erro', async () => {
    fetchMock.mockResolvedValue(respostaJson({}, 500))
    expect(await buscarLinhasPremios(1)).toBeNull()
    expect(erroSpy.mock.calls[0][0]).toContain('[CineTeca]')
  })

  it('devolve null quando a rede falha ou estoura o tempo', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'))
    expect(await buscarLinhasPremios(1)).toBeNull()
    expect(erroSpy.mock.calls[0][0]).toContain('[CineTeca]')
  })

  it('devolve null quando a resposta vem fora do formato', async () => {
    fetchMock.mockResolvedValue(respostaJson({ erro: 'inesperado' }))
    expect(await buscarLinhasPremios(1)).toBeNull()
  })

  it('devolve null quando o corpo não é JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>manutenção</html>', { status: 200 }))
    expect(await buscarLinhasPremios(1)).toBeNull()
  })
})
