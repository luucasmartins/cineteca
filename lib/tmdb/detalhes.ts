import 'server-only'
import { tmdbFetch, TmdbError } from './client'
import { CACHE_LISTAS_SEGUNDOS, REGIAO } from './config'
import { getGenres } from './filmes'
import { imageUrl } from './imagens'
import { normalizarResumo } from './normalizar'
import type { CastMember, Genero, MovieDetails, Provider, TmdbFilmeBruto, TmdbPaginaBruta, WatchProviders } from './tipos'

export const MAX_ELENCO = 15

type VideoBruto = { key: string; site: string; type: string; official?: boolean; iso_639_1?: string | null }
type AtorBruto = { id: number; name: string; character?: string | null; profile_path?: string | null; order?: number }
type ProvedorBruto = { provider_id: number; provider_name: string; logo_path?: string | null; display_priority?: number }
type OfertasBrutas = { link?: string; flatrate?: ProvedorBruto[]; rent?: ProvedorBruto[]; buy?: ProvedorBruto[] }

type TmdbDetalhesBruto = TmdbFilmeBruto & {
  runtime?: number | null
  genres?: Genero[]
  videos?: { results?: VideoBruto[] }
  credits?: { cast?: AtorBruto[] }
  recommendations?: Partial<TmdbPaginaBruta>
  'watch/providers'?: { results?: Record<string, OfertasBrutas> }
}

export async function getMovieDetails(id: number): Promise<MovieDetails | null> {
  let bruto: TmdbDetalhesBruto
  try {
    bruto = await tmdbFetch<TmdbDetalhesBruto>(
      `/movie/${id}`,
      {
        append_to_response: 'videos,credits,recommendations,watch/providers',
        include_video_language: 'pt,en,null',
      },
      CACHE_LISTAS_SEGUNDOS,
    )
  } catch (erro) {
    if (erro instanceof TmdbError && erro.status === 404) return null
    throw erro
  }

  const generos = await getGenres().catch((): Genero[] => [])
  const mapa = new Map(generos.map((g) => [g.id, g.name]))

  return {
    ...normalizarResumo(bruto, mapa),
    posterUrl: imageUrl(bruto.poster_path, 'w500'),
    genres: (bruto.genres ?? []).map((g) => g.name),
    runtime: bruto.runtime && bruto.runtime > 0 ? bruto.runtime : null,
    trailerKey: escolherTrailer(bruto.videos?.results ?? []),
    cast: normalizarElenco(bruto.credits?.cast ?? []),
    recommendations: (bruto.recommendations?.results ?? []).map((f) => normalizarResumo(f, mapa)),
    watchProviders: normalizarProvedores(bruto['watch/providers']?.results?.[REGIAO]),
  }
}

function escolherTrailer(videos: VideoBruto[]): string | null {
  const pontuar = (v: VideoBruto) =>
    (v.type === 'Trailer' ? 4 : v.type === 'Teaser' ? 2 : -100) +
    (v.iso_639_1 === 'pt' ? 1.5 : 0) +
    (v.official ? 0.5 : 0)
  const melhor = videos
    .filter((v) => v.site === 'YouTube' && v.key && pontuar(v) > 0)
    .sort((a, b) => pontuar(b) - pontuar(a))[0]
  return melhor?.key ?? null
}

function normalizarElenco(elenco: AtorBruto[]): CastMember[] {
  return [...elenco]
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, MAX_ELENCO)
    .map((ator) => ({
      id: ator.id,
      name: ator.name,
      character: ator.character?.trim() || null,
      profileUrl: imageUrl(ator.profile_path, 'w185'),
    }))
}

function normalizarProvedores(ofertas?: OfertasBrutas): WatchProviders | null {
  if (!ofertas) return null
  const converter = (lista?: ProvedorBruto[]): Provider[] =>
    [...(lista ?? [])]
      .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
      .map((p) => ({ id: p.provider_id, name: p.provider_name, logoUrl: imageUrl(p.logo_path, 'w92') }))
  const resultado: WatchProviders = {
    link: ofertas.link ?? '',
    streaming: converter(ofertas.flatrate),
    rent: converter(ofertas.rent),
    buy: converter(ofertas.buy),
  }
  const temAlgo = resultado.streaming.length + resultado.rent.length + resultado.buy.length > 0
  return temAlgo ? resultado : null
}
