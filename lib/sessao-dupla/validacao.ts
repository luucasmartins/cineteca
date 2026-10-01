import type { Resultado } from '@/lib/auth/validacao'

export const TITULO_MAXIMO = 60
export const MENSAGEM_ERRO_SESSAO = 'Não foi possível salvar. Tente de novo.'

export function validarTitulo(bruto: unknown): Resultado<string> {
  const titulo = typeof bruto === 'string' ? bruto.trim() : ''
  if (!titulo) return { ok: false, erro: 'Digite um título' }
  if (titulo.length > TITULO_MAXIMO) return { ok: false, erro: 'O título pode ter no máximo 60 caracteres' }
  return { ok: true, valor: titulo }
}

export function validarFilmesDiferentes(id1: number, id2: number): Resultado<void> {
  if (id1 === id2) return { ok: false, erro: 'Escolha dois filmes diferentes' }
  return { ok: true, valor: undefined }
}
