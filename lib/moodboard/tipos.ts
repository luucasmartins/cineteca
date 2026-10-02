import type { ImagemFilme } from '@/lib/tmdb/tipos'

export type CenaMoodboard = {
  filmeId: number
  caminho: string
  tituloFilme: string
  imagem: ImagemFilme
}

export type Moodboard = {
  id: string
  titulo: string
  descricao: string | null
  meu: boolean
  cenas: CenaMoodboard[]
}

export type ResumoMoodboard = {
  id: string
  titulo: string
  quantidadeCenas: number
  /** URLs w300 das primeiras 4 cenas. */
  capas: string[]
}

export type Resposta<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; erro: string; sessaoExpirada: boolean }
