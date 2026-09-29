import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { tmdbFetch, TmdbError } from './client'

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('tmdbFetch', () => {
  const fetchMock = vi.fn()
  let erroSpy: MockInstance<typeof console.error>

  beforeEach(() => {
    erroSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('TMDB_READ_TOKEN', 'token-teste')
  })

  afterEach(() => {
    erroSpy.mockRestore()
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

  it('registra o status e o caminho quando o TMDB responde 500', async () => {
    fetchMock.mockResolvedValue(respostaJson({}, 500))
    await expect(tmdbFetch('/movie/9', {}, 60)).rejects.toMatchObject({ status: 500 })
    expect(erroSpy).toHaveBeenCalledTimes(1)
    expect(erroSpy).toHaveBeenCalledWith('[CineTeca] TMDB respondeu', 500, 'em', '/movie/9')
  })

  it('registra a dica de token inválido quando o TMDB responde 401', async () => {
    fetchMock.mockResolvedValue(respostaJson({}, 401))
    await expect(tmdbFetch('/movie/9', {}, 60)).rejects.toMatchObject({ status: 401 })
    const textos = erroSpy.mock.calls.map((c) => c.join(' ')).join(' | ')
    expect(textos).toContain('Token do TMDB inválido')
  })

  it('não registra nada quando o TMDB responde 404', async () => {
    fetchMock.mockResolvedValue(respostaJson({}, 404))
    await expect(tmdbFetch('/movie/9', {}, 60)).rejects.toMatchObject({ status: 404 })
    expect(erroSpy).not.toHaveBeenCalled()
  })

  it('registra falhas de rede', async () => {
    fetchMock.mockRejectedValue(new Error('sem rede'))
    await expect(tmdbFetch('/movie/9', {}, 60)).rejects.toBeInstanceOf(TmdbError)
    expect(erroSpy).toHaveBeenCalledWith('[CineTeca] Falha ao contatar o TMDB em', '/movie/9', '-', 'sem rede')
  })

  it('remove espaços e aspas do token', async () => {
    vi.stubEnv('TMDB_READ_TOKEN', '  "token-teste"  ')
    fetchMock.mockResolvedValue(respostaJson({}))
    await tmdbFetch('/movie/1', {}, 60)
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token-teste')
  })

  it('nunca registra o token', async () => {
    fetchMock.mockResolvedValueOnce(respostaJson({}, 401))
    await tmdbFetch('/movie/1', {}, 60).catch(() => {})
    fetchMock.mockRejectedValueOnce(new Error('falhou'))
    await tmdbFetch('/movie/1', {}, 60).catch(() => {})
    expect(erroSpy).toHaveBeenCalled()
    for (const chamada of erroSpy.mock.calls) {
      expect(chamada.some((arg) => String(arg).includes('token-teste'))).toBe(false)
    }
  })
})
