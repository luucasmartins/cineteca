export type ChavePremio = 'oscar' | 'bafta' | 'globo' | 'cannes' | 'veneza' | 'berlim'

/** Uma linha da resposta do Wikidata. `categoria` é o Q-id da categoria. */
export type LinhaPremio = { venceu: boolean; categoria: string; pessoa: string | null }

export type VitoriaPremio = { categoria: string; quem: string | null }

export type PremioFilme = { chave: ChavePremio; nome: string; vitorias: VitoriaPremio[]; indicacoes: string[] }
