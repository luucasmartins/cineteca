import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/tmdb/filmes', () => ({ discoverByGenre: vi.fn(), searchMovies: vi.fn() }))

import { discoverByGenre, searchMovies } from '@/lib/tmdb/filmes'
import { GET } from './route'

const PAGINA = { results: [], page: 2, totalPages: 5 }
const chamar = (consulta: string) => GET(new Request(`http://localhost/api/filmes?${consulta}`))

beforeEach(() => {
  vi.mocked(discoverByGenre).mockReset().mockResolvedValue(PAGINA)
  vi.mocked(searchMovies).mockReset().mockResolvedValue(PAGINA)
})

describe('GET /api/filmes', () => {
  it('devolve a página de um gênero', async () => {
    const resposta = await chamar('tipo=genero&id=28&ordem=nota&pagina=2')
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual(PAGINA)
    expect(discoverByGenre).toHaveBeenCalledWith(28, 'nota', 2)
  })

  it('usa popularidade quando a ordem não é informada', async () => {
    await chamar('tipo=genero&id=28&pagina=2')
    expect(discoverByGenre).toHaveBeenCalledWith(28, 'popularidade', 2)
  })

  it('devolve a página de uma busca com o termo intacto', async () => {
    const resposta = await chamar(`tipo=busca&q=${encodeURIComponent(' Amélie & cia ')}&pagina=3`)
    expect(resposta.status).toBe(200)
    expect(searchMovies).toHaveBeenCalledWith('Amélie & cia', 3)
  })

  it.each([
    ['tipo=genero&id=abc'],
    ['tipo=genero&id=28&ordem=aleatoria'],
    ['tipo=genero&id=28&pagina=501'],
    ['tipo=genero&id=28&pagina=abc'],
    ['tipo=busca&q=%20%20'],
    ['tipo=series'],
    [''],
  ])('responde 400 para parâmetros inválidos: "%s"', async (consulta) => {
    const resposta = await chamar(consulta)
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toHaveProperty('erro')
    expect(discoverByGenre).not.toHaveBeenCalled()
    expect(searchMovies).not.toHaveBeenCalled()
  })

  it('responde 502 quando o TMDB falha', async () => {
    vi.mocked(searchMovies).mockRejectedValue(new Error('fora do ar'))
    const resposta = await chamar('tipo=busca&q=matrix')
    expect(resposta.status).toBe(502)
    expect(await resposta.json()).toEqual({ erro: 'Não foi possível carregar' })
  })
})
