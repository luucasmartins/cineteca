import { imageUrl } from './imagens'
import type { MembroEquipe } from './tipos'

export type MembroEquipeBruto = { id: number; name: string; job?: string; profile_path?: string | null }

// A ordem desta lista é a ordem dos cartões e das funções dentro de cada cartão.
export const FUNCOES_EQUIPE: { nome: string; jobs: string[] }[] = [
  { nome: 'Direção', jobs: ['Director'] },
  { nome: 'Roteiro', jobs: ['Screenplay', 'Writer'] },
  { nome: 'Fotografia', jobs: ['Director of Photography'] },
  { nome: 'Design de produção', jobs: ['Production Design'] },
  { nome: 'Música', jobs: ['Original Music Composer'] },
  { nome: 'Montagem', jobs: ['Editor'] },
]

export const MAX_POR_FUNCAO = 3
export const MAX_EQUIPE = 12

export function normalizarEquipe(crew: MembroEquipeBruto[]): MembroEquipe[] {
  // Map guarda a ordem de inserção: cada pessoa entra na posição da sua primeira função.
  const porPessoa = new Map<number, MembroEquipe>()
  for (const funcao of FUNCOES_EQUIPE) {
    const nestaFuncao = new Set<number>()
    for (const membro of crew) {
      if (!membro.job || !funcao.jobs.includes(membro.job) || nestaFuncao.has(membro.id)) continue
      if (nestaFuncao.size >= MAX_POR_FUNCAO) break
      nestaFuncao.add(membro.id)
      const existente = porPessoa.get(membro.id)
      if (existente) existente.funcoes.push(funcao.nome)
      else
        porPessoa.set(membro.id, {
          id: membro.id,
          name: membro.name,
          profileUrl: imageUrl(membro.profile_path, 'w185'),
          funcoes: [funcao.nome],
        })
    }
  }
  return [...porPessoa.values()].slice(0, MAX_EQUIPE)
}
