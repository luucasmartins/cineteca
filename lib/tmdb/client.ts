import 'server-only'
import { IDIOMA, TEMPO_LIMITE_MS, TMDB_API_BASE_PADRAO } from './config'

export type ParametrosTmdb = Record<string, string | number | boolean | undefined>

export class TmdbError extends Error {
  readonly status: number | null

  constructor(mensagem: string, status: number | null = null) {
    super(mensagem)
    this.name = 'TmdbError'
    this.status = status
  }
}

export async function tmdbFetch<T>(caminho: string, params: ParametrosTmdb, revalidate: number): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN
  if (!token) throw new TmdbError('TMDB_READ_TOKEN não configurado')

  const url = new URL((process.env.TMDB_API_BASE || TMDB_API_BASE_PADRAO) + caminho)
  url.searchParams.set('language', IDIOMA)
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== undefined) url.searchParams.set(chave, String(valor))
  }

  let resposta: Response
  try {
    resposta = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      next: { revalidate },
    })
  } catch (erro) {
    throw new TmdbError(`Falha ao contatar o TMDB: ${(erro as Error).message}`)
  }

  if (!resposta.ok) {
    throw new TmdbError(`TMDB respondeu ${resposta.status} em ${caminho}`, resposta.status)
  }
  return (await resposta.json()) as T
}
