import type { Resultado } from '@/lib/auth/validacao'

export const TITULO_MAXIMO = 60
export const DESCRICAO_MAXIMA = 200
export const MAXIMO_MOODBOARDS = 20
export const MENSAGEM_ERRO = 'Não foi possível salvar. Tente de novo.'
export const MENSAGEM_SESSAO = 'Sua sessão expirou. Entre de novo para continuar.'

const CAMINHO_CENA = /^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validarTituloMoodboard(bruto: unknown): Resultado<string> {
  const titulo = typeof bruto === 'string' ? bruto.trim() : ''
  if (!titulo) return { ok: false, erro: 'Digite um título' }
  if (titulo.length > TITULO_MAXIMO) return { ok: false, erro: 'O título pode ter no máximo 60 caracteres' }
  return { ok: true, valor: titulo }
}

export function validarDescricaoMoodboard(bruto: unknown): Resultado<string | null> {
  if (bruto === undefined || bruto === null) return { ok: true, valor: null }
  if (typeof bruto !== 'string') return { ok: false, erro: 'Descrição inválida' }
  const descricao = bruto.trim()
  if (descricao.length > DESCRICAO_MAXIMA) return { ok: false, erro: 'A descrição pode ter no máximo 200 caracteres' }
  return { ok: true, valor: descricao || null }
}

export function validarCaminhoCena(bruto: unknown): Resultado<string> {
  if (typeof bruto === 'string' && CAMINHO_CENA.test(bruto)) return { ok: true, valor: bruto }
  return { ok: false, erro: 'Cena inválida' }
}

export function ehIdMoodboard(bruto: unknown): bruto is string {
  return typeof bruto === 'string' && ID.test(bruto)
}
