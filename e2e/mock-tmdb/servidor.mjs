import http from 'node:http'
import { detalhes, filme, GENEROS, pagina, PREMIOS } from './dados.mjs'

export const TOKEN_E2E = 'token-e2e'

export function iniciarMockTmdb(porta) {
  const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${porta}`)
    const responder = (status, corpo) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(corpo))
    }

    // Wikidata simulado (prêmios): não usa o token do TMDB.
    if (url.pathname === '/sparql') {
      const id = (url.searchParams.get('query') ?? '').match(/wdt:P4947 "(\d+)"/)?.[1]
      if (id === '1003') return responder(500, { erro: 'falha simulada' })
      return responder(200, { head: { vars: [] }, results: { bindings: PREMIOS[id] ?? [] } })
    }

    if (req.headers.authorization !== `Bearer ${TOKEN_E2E}`) return responder(401, { status_message: 'token inválido' })

    const caminho = url.pathname.replace(/^\/3/, '')
    const numero = Number(url.searchParams.get('page') ?? '1')

    if (caminho === '/genre/movie/list') return responder(200, { genres: GENEROS })
    if (caminho === '/trending/movie/day') return responder(200, pagina(1000, 1, 1))
    if (caminho === '/movie/popular') return responder(200, pagina(2000, numero, 5))
    if (caminho === '/movie/now_playing') return responder(200, pagina(3000, numero, 5))
    if (caminho === '/movie/top_rated') return responder(200, pagina(4000, numero, 5))

    if (caminho === '/discover/movie') {
      // Fure a bolha: qualquer idioma devolve 2 páginas de filmes.
      if (url.searchParams.has('with_original_language')) return responder(200, pagina(800000, numero, 2))
      // Harmonia de cores: os mais bem avaliados com 1.000 votos ou mais.
      if (url.searchParams.get('vote_count.gte') === '1000') return responder(200, pagina(900000, numero, 2))
      const genero = Number(url.searchParams.get('with_genres'))
      if (genero === 878) return responder(500, { status_message: 'falha simulada' })
      const base = genero * 1000 + 100000
      const dados = pagina(base, numero, 3)
      // Simula o TMDB repetindo um filme entre páginas.
      if (numero === 2) dados.results[0] = filme(base + 1)
      return responder(200, dados)
    }

    if (caminho === '/search/movie') {
      const termo = (url.searchParams.get('query') ?? '').toLowerCase()
      if (termo.includes('matrix')) {
        return responder(200, {
          page: 1,
          results: [filme(7001, 'Matrix'), filme(7002, 'Matrix Reloaded'), filme(7003, 'Matrix Revolutions')],
          total_pages: 1,
          total_results: 3,
        })
      }
      if (termo.includes('her')) {
        return responder(200, {
          page: 1,
          results: [filme(8001, 'Ela'), filme(8002, 'Her - Uma História de Amor')],
          total_pages: 1,
          total_results: 2,
        })
      }
      return responder(200, { page: 1, results: [], total_pages: 0, total_results: 0 })
    }

    // Cenas para a paleta: ids terminados em 5 não têm nenhuma.
    const imagens = caminho.match(/^\/movie\/(\d+)\/images$/)
    if (imagens) {
      const id = Number(imagens[1])
      const backdrops = id % 10 === 5 ? [] : [1, 2, 3].map((n) => ({ file_path: `/harmonia-${id}-${n}.jpg`, iso_639_1: null }))
      return responder(200, { id, backdrops })
    }

    const detalhe = caminho.match(/^\/movie\/(\d+)$/)
    if (detalhe) {
      const id = Number(detalhe[1])
      if (id === 999999) return responder(404, { status_message: 'não encontrado' })
      return responder(200, detalhes(id))
    }

    return responder(404, { status_message: `rota não simulada: ${caminho}` })
  })

  return new Promise((resolve) => servidor.listen(porta, () => resolve(servidor)))
}
