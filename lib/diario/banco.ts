import type { SupabaseClient } from '@supabase/supabase-js'
import type { DiretorRegistro, RegistroAssistido, ResumoAssistido } from './tipos'

type Cliente = Pick<SupabaseClient, 'from'>

type LinhaAssistido = {
  id: string
  filme_id: number
  titulo: string
  poster_url: string | null
  ano: string | null
  diretores: DiretorRegistro[]
  assistido_em: string
  anotacao: string | null
  criado_em: string
}

const COLUNAS = 'id, filme_id, titulo, poster_url, ano, diretores, assistido_em, anotacao, criado_em'

export function paraRegistroAssistido(linha: LinhaAssistido): RegistroAssistido {
  return {
    id: linha.id,
    filmeId: linha.filme_id,
    titulo: linha.titulo,
    posterUrl: linha.poster_url,
    ano: linha.ano,
    diretores: Array.isArray(linha.diretores) ? linha.diretores : [],
    assistidoEm: linha.assistido_em,
    anotacao: linha.anotacao,
    criadoEm: linha.criado_em,
  }
}

export async function listarAssistidos(cliente: Cliente, usuarioId: string): Promise<RegistroAssistido[]> {
  const { data, error } = await cliente
    .from('assistidos')
    .select(COLUNAS)
    .eq('usuario_id', usuarioId)
    .order('assistido_em', { ascending: false })
    .order('criado_em', { ascending: false })
    .limit(500)
  if (error) {
    console.error('[CineTeca] Falha ao listar assistidos:', error.code)
    return []
  }
  return ((data ?? []) as LinhaAssistido[]).map(paraRegistroAssistido)
}

export async function contarAssistidos(
  cliente: Cliente,
  usuarioId: string,
  filmeId: number,
): Promise<ResumoAssistido | null> {
  const { data, error } = await cliente
    .from('assistidos')
    .select('assistido_em')
    .eq('usuario_id', usuarioId)
    .eq('filme_id', filmeId)
    .order('assistido_em', { ascending: false })
  if (error || !data || data.length === 0) return null
  return { vezes: data.length, ultimaData: (data[0] as { assistido_em: string }).assistido_em }
}
