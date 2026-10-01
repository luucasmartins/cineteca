export type DiretorRegistro = {
  id: number
  nome: string
  fotoUrl: string | null
}

export type RegistroAssistido = {
  id: string
  filmeId: number
  titulo: string
  posterUrl: string | null
  ano: string | null
  diretores: DiretorRegistro[]
  assistidoEm: string // 'YYYY-MM-DD'
  anotacao: string | null
  criadoEm: string
}

export type ResumoAssistido = {
  vezes: number
  ultimaData: string // 'YYYY-MM-DD'
}

export type RespostaAssistido =
  | { ok: true; registro: RegistroAssistido }
  | { ok: false; erro: string; sessaoExpirada: boolean }

export type RespostaSimples =
  | { ok: true }
  | { ok: false; erro: string; sessaoExpirada: boolean }
