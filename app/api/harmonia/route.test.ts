import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'

vi.mock('@/lib/tmdb/harmonia', () => ({ sortearHarmonia: vi.fn() }))

import { sortearHarmonia } from '@/lib/tmdb/harmonia'
import { GET } from './route'

describe('GET /api/harmonia', () => {
  let erroSpy: MockInstance<typeof console.error>

  beforeEach(() => {
    erroSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(sortearHarmonia).mockReset()
  })

  afterEach(() => {
    erroSpy.mockRestore()
  })

  it('devolve os filmes sorteados, sem cache', async () => {
    const filmes = [{ id: 1, title: 'Filme', year: '1994', cenas: ['https://image.tmdb.org/t/p/w300/a.jpg'] }]
    vi.mocked(sortearHarmonia).mockResolvedValue(filmes)

    const resposta = await GET()
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get('Cache-Control')).toBe('no-store')
    expect(await resposta.json()).toEqual({ filmes })
  })

  it('responde 502 e registra quando o sorteio falha', async () => {
    vi.mocked(sortearHarmonia).mockRejectedValue(new TypeError('falhou'))

    const resposta = await GET()
    expect(resposta.status).toBe(502)
    expect(await resposta.json()).toEqual({ erro: true })
    expect(erroSpy.mock.calls[0][0]).toContain('[CineTeca]')
  })
})
