import 'server-only'
import { tmdbFetch, TmdbError } from './client'
import { CACHE_GENEROS_SEGUNDOS, CACHE_LISTAS_SEGUNDOS } from './config'
import { imageUrl } from './imagens'
import { normalizarResumo } from './normalizar'
import type { FilmeHarmonia, TmdbPaginaBruta } from './tipos'

export const VOTOS_MINIMOS_HARMONIA = 1000
export const NOTA_MINIMA_HARMONIA = 7.5
const QUANTIDADE = 12
const CENAS_POR_FILME = 3
const LIMITE_PAGINAS = 500

const PARAMETROS = {
  sort_by: 'vote_average.desc',
  'vote_count.gte': VOTOS_MINIMOS_HARMONIA,
  'vote_average.gte': NOTA_MINIMA_HARMONIA,
  include_adult: false,
}

const indice = (tamanho: number, aleatorio: () => number) => Math.min(Math.floor(aleatorio() * tamanho), tamanho - 1)

async function buscarCenas(id: number): Promise<string[]> {
  try {
    // "null" pede só as cenas sem texto, as que servem para a paleta.
    const dados = await tmdbFetch<{ backdrops?: { file_path?: string }[] }>(
      `/movie/${id}/images`,
      { include_image_language: 'null' },
      CACHE_GENEROS_SEGUNDOS,
    )
    return (dados.backdrops ?? [])
      .flatMap((c) => (c.file_path ? [imageUrl(c.file_path, 'w300')!] : []))
      .slice(0, CENAS_POR_FILME)
  } catch {
    return []
  }
}

/** Sorteia até 12 filmes bem avaliados, cada um com até 3 cenas pequenas para extrair a paleta. */
export async function sortearHarmonia(aleatorio: () => number = Math.random): Promise<FilmeHarmonia[]> {
  const primeira = await tmdbFetch<TmdbPaginaBruta>('/discover/movie', { ...PARAMETROS, page: 1 }, CACHE_LISTAS_SEGUNDOS)
  const paginas = Math.min(primeira.total_pages, LIMITE_PAGINAS)
  const numero = 1 + indice(Math.max(paginas, 1), aleatorio)
  const pagina =
    numero === 1 ? primeira : await tmdbFetch<TmdbPaginaBruta>('/discover/movie', { ...PARAMETROS, page: numero }, CACHE_LISTAS_SEGUNDOS)

  // Fisher-Yates para a frente: com aleatorio() = 0 a ordem não muda (útil nos testes).
  const candidatos = [...pagina.results]
  for (let i = 0; i < candidatos.length - 1; i++) {
    const j = i + indice(candidatos.length - i, aleatorio)
    ;[candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]]
  }

  const cenas = await Promise.all(candidatos.map((f) => buscarCenas(f.id)))
  const filmes = candidatos.flatMap((bruto, i): FilmeHarmonia[] => {
    if (cenas[i].length === 0) return []
    const resumo = normalizarResumo(bruto, new Map())
    return [{ id: resumo.id, title: resumo.title, year: resumo.year, cenas: cenas[i] }]
  })
  if (filmes.length === 0) throw new TmdbError('Nenhum filme com cenas para a harmonia de cores')
  return filmes.slice(0, QUANTIDADE)
}
