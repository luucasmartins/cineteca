import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tmdbFetch, TmdbError } from './client'

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('tmdbFetch', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('TMDB_READ_TOKEN', 'token-teste')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('chama o TMDB com token, idioma pt-BR, parâmetros, cache e tempo limite', async () => {
    fetchMock.mockResolvedValue(respostaJson({ ok: true }))

    const dados = await tmdbFetch<{ ok: boolean }>('/movie/popular', { page: 2, region: 'BR' }, 21600)

    expect(dados).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    const u = new URL(url)
    expect(u.origin + u.pathname).toBe('https://api.themoviedb.org/3/movie/popular')
    expect(u.searchParams.get('language')).toBe('pt-BR')
    expect(u.searchParams.get('page')).toBe('2')
    expect(u.searchParams.get('region')).toBe('BR')
    expect(init.headers.Authorization).toBe('Bearer token-teste')
    expect(init.next).toEqual({ revalidate: 21600 })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('ignora parâmetros undefined', async () => {
    fetchMock.mockResolvedValue(respostaJson({}))
    await tmdbFetch('/movie/popular', { page: undefined }, 60)
    const u = new URL(fetchMock.mock.calls[0][0])
    expect(u.searchParams.has('page')).toBe(false)
  })

  it('codifica acentos e símbolos da busca sem alterar o termo', async () => {
    fetchMock.mockResolvedValue(respostaJson({}))
    await tmdbFetch('/search/movie', { query: 'Amélie & cia?' }, 60)
    const url = fetchMock.mock.calls[0][0] as URL
    expect(url.toString()).toContain('Am%C3%A9lie')
    expect(url.searchParams.get('query')).toBe('Amélie & cia?')
  })

  it('usa TMDB_API_BASE quando definido', async () => {
    vi.stubEnv('TMDB_API_BASE', 'http://localhost:4010/3')
    fetchMock.mockResolvedValue(respostaJson({}))
    await tmdbFetch('/movie/popular', {}, 60)
    const u = new URL(fetchMock.mock.calls[0][0])
    expect(u.origin + u.pathname).toBe('http://localhost:4010/3/movie/popular')
  })

  it('lança TmdbError com o status quando a resposta não é ok', async () => {
    fetchMock.mockResolvedValue(respostaJson({ status_message: 'x' }, 404))
    await expect(tmdbFetch('/movie/1', {}, 60)).rejects.toMatchObject({ name: 'TmdbError', status: 404 })
  })

  it('lança TmdbError quando a rede falha ou o tempo esgota', async () => {
    fetchMock.mockRejectedValue(new DOMException('tempo esgotado', 'TimeoutError'))
    const erro = (await tmdbFetch('/movie/1', {}, 60).catch((e) => e)) as TmdbError
    expect(erro).toBeInstanceOf(TmdbError)
    expect(erro.status).toBeNull()
  })

  it('lança TmdbError sem chamar a API quando o token não está configurado', async () => {
    vi.stubEnv('TMDB_READ_TOKEN', '')
    await expect(tmdbFetch('/movie/1', {}, 60)).rejects.toThrow('TMDB_READ_TOKEN')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
