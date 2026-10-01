// true = curti, false = não curti, null = sem voto
export type Voto = boolean | null

export type Agregado = { votos: number; curtidas: number; aprovacao: number }

export type ItemRanking = Agregado & {
  filmeId: number
  titulo: string
  posterUrl: string | null
  ano: string | null
}

// agregado é null quando o filme ainda não atingiu o mínimo de votos.
export type AvaliacaoDoFilme = { meuVoto: Voto; agregado: Agregado | null }
