import type { SupabaseClient } from '@supabase/supabase-js'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import type { AvaliacaoDoFilme, ItemRanking } from './tipos'

type Cliente = Pick<SupabaseClient, 'from'>

type LinhaRanking = {
  filme_id: number
  titulo: string
  poster_url: string | null
  ano: string | null
  votos: number
  curtidas: number
  aprovacao: number
}

function paraItem(linha: LinhaRanking): ItemRanking {
  return {
    filmeId: linha.filme_id,
    titulo: linha.titulo,
    posterUrl: linha.poster_url,
    ano: linha.ano,
    votos: linha.votos,
    curtidas: linha.curtidas,
    aprovacao: linha.aprovacao,
  }
}

// Falha de leitura nunca derruba a página: o bloco some e a pessoa pode votar de novo.
export async function lerAvaliacaoDoFilme(
  cliente: Cliente,
  filmeId: number,
  usuarioId: string | null,
): Promise<AvaliacaoDoFilme> {
  const consultaAgregado = cliente
    .from('ranking_filmes')
    .select('votos, curtidas, aprovacao')
    .eq('filme_id', filmeId)
    .maybeSingle()

  const consultaVoto = usuarioId
    ? cliente.from('avaliacoes').select('curtiu').eq('filme_id', filmeId).maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [agregado, voto] = await Promise.all([consultaAgregado, consultaVoto])

  if (agregado.error) console.error('[CineTeca] Falha ao ler o agregado:', agregado.error.code)
  if (voto.error) console.error('[CineTeca] Falha ao ler o voto:', voto.error.code)

  const dadosAgregado = agregado.error ? null : (agregado.data as Omit<ItemRanking, 'filmeId' | 'titulo' | 'posterUrl' | 'ano'> | null)
  const dadosVoto = voto.error ? null : (voto.data as { curtiu: boolean } | null)

  return {
    meuVoto: dadosVoto ? dadosVoto.curtiu : null,
    agregado: dadosAgregado
      ? { votos: dadosAgregado.votos, curtidas: dadosAgregado.curtidas, aprovacao: dadosAgregado.aprovacao }
      : null,
  }
}

export async function lerRanking(cliente: Cliente, limite: number): Promise<ItemRanking[]> {
  const { data, error } = await cliente
    .from('ranking_filmes')
    .select('filme_id, titulo, poster_url, ano, votos, curtidas, aprovacao')
    .limit(limite)
  if (error) {
    console.error('[CineTeca] Falha ao ler o ranking:', error.code)
    return []
  }
  return ((data ?? []) as LinhaRanking[]).map(paraItem)
}

export async function obterAvaliacaoDoFilme(filmeId: number): Promise<AvaliacaoDoFilme> {
  try {
    const supabase = await criarClienteServidor()
    const { data } = await supabase.auth.getUser()
    return await lerAvaliacaoDoFilme(supabase, filmeId, data.user?.id ?? null)
  } catch {
    return { meuVoto: null, agregado: null }
  }
}

export async function obterRanking(limite = 50): Promise<ItemRanking[]> {
  try {
    const supabase = await criarClienteServidor()
    return await lerRanking(supabase, limite)
  } catch {
    return []
  }
}
