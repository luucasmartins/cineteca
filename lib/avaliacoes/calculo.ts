import type { Agregado, ItemRanking } from './tipos'

export const MINIMO_DE_VOTOS = 3

export function calcularAprovacao(curtidas: number, votos: number): number {
  if (votos <= 0) return 0
  return Math.round((curtidas * 100) / votos)
}

export function qualificado(votos: number): boolean {
  return votos >= MINIMO_DE_VOTOS
}

// Mais aprovados primeiro; empate vai para quem tem mais votos; o id mantém a ordem estável.
export function ordenarRanking(itens: ItemRanking[]): ItemRanking[] {
  return [...itens].sort(
    (a, b) => b.aprovacao - a.aprovacao || b.votos - a.votos || a.filmeId - b.filmeId,
  )
}

export function textoVotos(votos: number): string {
  return `${votos} ${votos === 1 ? 'voto' : 'votos'}`
}

export function textoAgregado(a: Agregado): string {
  return `${a.aprovacao}% das pessoas curtiram · ${textoVotos(a.votos)}`
}
