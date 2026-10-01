import 'server-only'
import { CATEGORIAS } from './catalogo'
import type { LinhaPremio } from './tipos'

const ENDPOINT_PADRAO = 'https://query.wikidata.org/sparql'
const CACHE_SEGUNDOS = 86400
const TEMPO_LIMITE_MS = 8000
// A política do Wikidata pede que cada cliente se identifique.
const USER_AGENT = 'CineTeca/1.0 (https://cineteca-gules.vercel.app)'
const PREFIXO_ENTIDADE = 'http://www.wikidata.org/entity/'

type Binding = { venceu?: { value: string }; categoria?: { value: string }; pessoaLabel?: { value: string } }

export function montarConsulta(tmdbId: number): string {
  const valores = Object.keys(CATEGORIAS)
    .map((q) => `wd:${q}`)
    .join(' ')
  // Prêmios no filme e nas pessoas premiadas "pelo trabalho" (P1686) neste filme.
  return `SELECT ?venceu ?categoria ?pessoaLabel WHERE {
  VALUES ?categoria { ${valores} }
  ?filme wdt:P4947 "${tmdbId}" .
  { ?filme p:P166/ps:P166 ?categoria . BIND(true AS ?venceu) }
  UNION { ?filme p:P1411/ps:P1411 ?categoria . BIND(false AS ?venceu) }
  UNION { ?pessoa p:P166 ?st . ?st ps:P166 ?categoria ; pq:P1686 ?filme . BIND(true AS ?venceu) }
  UNION { ?pessoa p:P1411 ?st . ?st ps:P1411 ?categoria ; pq:P1686 ?filme . BIND(false AS ?venceu) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". }
}`
}

/** Linhas de prêmios do filme, ou null se o Wikidata falhar: a seção então não aparece. */
export async function buscarLinhasPremios(tmdbId: number): Promise<LinhaPremio[] | null> {
  const url = new URL(process.env.WIKIDATA_SPARQL_URL || ENDPOINT_PADRAO)
  url.searchParams.set('query', montarConsulta(tmdbId))
  try {
    const resposta = await fetch(url, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      next: { revalidate: CACHE_SEGUNDOS },
    })
    if (!resposta.ok) {
      console.error('[CineTeca] Wikidata respondeu', resposta.status)
      return null
    }
    const corpo = (await resposta.json()) as { results?: { bindings?: Binding[] } } | null
    const bindings = corpo?.results?.bindings
    if (!Array.isArray(bindings)) {
      console.error('[CineTeca] Resposta do Wikidata fora do formato')
      return null
    }
    return bindings.flatMap((b) => {
      const categoria = b.categoria?.value.replace(PREFIXO_ENTIDADE, '')
      if (!categoria) return []
      return [{ venceu: b.venceu?.value === 'true', categoria, pessoa: b.pessoaLabel?.value ?? null }]
    })
  } catch (erro) {
    console.error('[CineTeca] Falha ao consultar o Wikidata -', erro instanceof Error ? erro.message : String(erro))
    return null
  }
}
