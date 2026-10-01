export type FilmeDaSessao = {
  id: number
  titulo: string
  posterUrl: string | null
  ano: string | null
}

export type SessaoDupla = {
  id: string
  titulo: string
  filme1: FilmeDaSessao
  filme2: FilmeDaSessao
  criadoEm: string
  minha: boolean // true quando o usuario_id é o da pessoa logada
}

export type RespostaSessaoDupla =
  | { ok: true; sessao: SessaoDupla }
  | { ok: false; erro: string; sessaoExpirada: boolean }

export type RespostaSimples =
  | { ok: true }
  | { ok: false; erro: string; sessaoExpirada: boolean }
