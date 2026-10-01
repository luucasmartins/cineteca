import 'server-only'
import { tmdbFetch, TmdbError } from './client'
import { CACHE_LISTAS_SEGUNDOS } from './config'
import { normalizarResumo } from './normalizar'
import type { Joia, TmdbPaginaBruta } from './tipos'

// Idiomas que rendiam ao menos 5 filmes no corte em 2026-10-01. Inglês fica de fora de propósito.
export const IDIOMAS_JOIA = ['ja', 'fr', 'it', 'es', 'ko', 'zh', 'de', 'pt', 'ru', 'sv', 'hi', 'cn', 'da', 'pl', 'tr', 'fa']
export const NOTA_MINIMA_JOIA = 7.5
export const VOTOS_MINIMOS_JOIA = 200
const TENTATIVAS = 3
const LIMITE_PAGINAS = 500

const IDIOMAS_SO_DO_TMDB: Record<string, string> = { cn: 'Cantonês' }

const maiuscula = (texto: string) => texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)

export function nomeIdioma(codigo: string): string {
  if (IDIOMAS_SO_DO_TMDB[codigo]) return IDIOMAS_SO_DO_TMDB[codigo]
  try {
    return maiuscula(new Intl.DisplayNames('pt-BR', { type: 'language' }).of(codigo) ?? codigo)
  } catch {
    return codigo
  }
}

// O nome oficial ("Hong Kong, RAE da China") é burocrático demais para a janela.
const NOMES_CURTOS: Record<string, string> = { HK: 'Hong Kong', MO: 'Macau' }

export function nomePais(codigo: string | undefined): string | null {
  if (!codigo) return null
  if (NOMES_CURTOS[codigo]) return NOMES_CURTOS[codigo]
  try {
    const nome = new Intl.DisplayNames('pt-BR', { type: 'region' }).of(codigo)
    // Código desconhecido volta igual: não é um nome.
    return nome && nome !== codigo ? nome : null
  } catch {
    return null
  }
}

const indice = (tamanho: number, aleatorio: () => number) => Math.min(Math.floor(aleatorio() * tamanho), tamanho - 1)

export async function sortearJoia(evitar: number | null, aleatorio: () => number = Math.random): Promise<Joia> {
  const restantes = [...IDIOMAS_JOIA]
  for (let tentativa = 0; tentativa < TENTATIVAS && restantes.length > 0; tentativa++) {
    const idioma = restantes.splice(indice(restantes.length, aleatorio), 1)[0]
    const params = {
      with_original_language: idioma,
      'vote_average.gte': NOTA_MINIMA_JOIA,
      'vote_count.gte': VOTOS_MINIMOS_JOIA,
      include_adult: false,
      sort_by: 'vote_average.desc',
    }
    const primeira = await tmdbFetch<TmdbPaginaBruta>('/discover/movie', { ...params, page: 1 }, CACHE_LISTAS_SEGUNDOS)
    const paginas = Math.min(primeira.total_pages, LIMITE_PAGINAS)
    if (paginas < 1) continue

    const numero = 1 + indice(paginas, aleatorio)
    const pagina =
      numero === 1 ? primeira : await tmdbFetch<TmdbPaginaBruta>('/discover/movie', { ...params, page: numero }, CACHE_LISTAS_SEGUNDOS)
    const candidatos = pagina.results.filter((f) => f.id !== evitar)
    if (candidatos.length === 0) continue

    const escolhido = candidatos[indice(candidatos.length, aleatorio)]
    const detalhe = await tmdbFetch<{ origin_country?: string[] }>(`/movie/${escolhido.id}`, {}, CACHE_LISTAS_SEGUNDOS)
    const resumo = normalizarResumo(escolhido, new Map())
    return {
      id: resumo.id,
      title: resumo.title,
      year: resumo.year,
      posterUrl: resumo.posterUrl,
      overview: resumo.overview,
      rating: resumo.rating,
      idioma: nomeIdioma(idioma),
      pais: nomePais(detalhe.origin_country?.[0]),
    }
  }
  throw new TmdbError('Nenhum filme encontrado para sortear')
}
