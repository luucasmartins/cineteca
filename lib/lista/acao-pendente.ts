import { caminhoDeRetorno } from '@/lib/auth/validacao'
import { ehFilmeSalvo } from './local'
import { TIPOS_LISTA, type FilmeSalvo, type TipoLista } from './tipos'

export const CHAVE_ACAO_PENDENTE = 'cineteca:acao-pendente'
export const VALIDADE_ACAO_MS = 30 * 60 * 1000

export type AcaoPendente = { tipo: TipoLista; filme: FilmeSalvo; voltar: string; criadaEm: number }
export type ArmazenamentoDaSessao = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function obterArmazenamentoDaSessao(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function guardarAcaoPendente(
  armazenamento: ArmazenamentoDaSessao | null,
  acao: Omit<AcaoPendente, 'criadaEm'>,
  agora: number = Date.now(),
): void {
  if (!armazenamento) return
  const registro: AcaoPendente = { ...acao, voltar: caminhoDeRetorno(acao.voltar), criadaEm: agora }
  try {
    armazenamento.setItem(CHAVE_ACAO_PENDENTE, JSON.stringify(registro))
  } catch {
    // Sem espaço ou bloqueado: a pessoa só precisará clicar de novo depois do login.
  }
}

export function limparAcaoPendente(armazenamento: ArmazenamentoDaSessao | null): void {
  try {
    armazenamento?.removeItem(CHAVE_ACAO_PENDENTE)
  } catch {
    // ignorado
  }
}

export function lerAcaoPendente(
  armazenamento: ArmazenamentoDaSessao | null,
  agora: number = Date.now(),
): AcaoPendente | null {
  if (!armazenamento) return null
  let bruto: string | null = null
  try {
    bruto = armazenamento.getItem(CHAVE_ACAO_PENDENTE)
  } catch {
    return null
  }
  if (!bruto) return null
  try {
    const dados = JSON.parse(bruto) as Record<string, unknown> | null
    const valida =
      dados !== null &&
      typeof dados === 'object' &&
      TIPOS_LISTA.includes(dados.tipo as TipoLista) &&
      ehFilmeSalvo(dados.filme) &&
      typeof dados.voltar === 'string' &&
      typeof dados.criadaEm === 'number' &&
      agora - dados.criadaEm <= VALIDADE_ACAO_MS
    if (valida) {
      return {
        tipo: dados.tipo as TipoLista,
        filme: dados.filme as FilmeSalvo,
        voltar: caminhoDeRetorno(dados.voltar),
        criadaEm: dados.criadaEm as number,
      }
    }
  } catch {
    // corrompido: cai na limpeza abaixo
  }
  limparAcaoPendente(armazenamento)
  return null
}
