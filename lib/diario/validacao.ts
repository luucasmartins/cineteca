import type { Resultado } from '@/lib/auth/validacao'

export const ANOTACAO_MAXIMA = 500
export const MENSAGEM_ERRO_DIARIO = 'Não foi possível salvar. Tente de novo.'

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
const DATA_MINIMA = '1895-01-01'

function hojeEmSaoPaulo(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

export function validarData(bruto: unknown): Resultado<string> {
  if (typeof bruto !== 'string' || !DATA_RE.test(bruto)) return { ok: false, erro: 'Data inválida' }
  const d = new Date(bruto + 'T12:00:00')
  if (isNaN(d.getTime())) return { ok: false, erro: 'Data inválida' }
  if (bruto < DATA_MINIMA) return { ok: false, erro: 'Data inválida' }
  const hoje = hojeEmSaoPaulo()
  if (bruto > hoje) return { ok: false, erro: 'A data não pode ser no futuro' }
  return { ok: true, valor: bruto }
}

export function validarAnotacao(bruto: unknown): Resultado<string | null> {
  if (bruto === null || bruto === undefined) return { ok: true, valor: null }
  const texto = typeof bruto === 'string' ? bruto.trim() : ''
  if (!texto) return { ok: true, valor: null }
  if (texto.length > ANOTACAO_MAXIMA) return { ok: false, erro: 'A anotação pode ter no máximo 500 caracteres' }
  return { ok: true, valor: texto }
}
