import type { SupabaseClient } from '@supabase/supabase-js'
import type { FilmeDaSessao, SessaoDupla } from './tipos'

type Cliente = Pick<SupabaseClient, 'from'>

type LinhaSessao = {
  id: string
  titulo: string
  filme1_id: number
  filme1_titulo: string
  filme1_poster: string | null
  filme1_ano: string | null
  filme2_id: number
  filme2_titulo: string
  filme2_poster: string | null
  filme2_ano: string | null
  criado_em: string
  usuario_id: string
}

const COLUNAS =
  'id, titulo, filme1_id, filme1_titulo, filme1_poster, filme1_ano, filme2_id, filme2_titulo, filme2_poster, filme2_ano, criado_em, usuario_id'

export function paraFilmeDaSessao(f: { id: number; titulo: string; poster: string | null; ano: string | null }): FilmeDaSessao {
  return { id: f.id, titulo: f.titulo, posterUrl: f.poster, ano: f.ano }
}

export function paraSessaoDupla(linha: LinhaSessao, usuarioIdAtual: string | null): SessaoDupla {
  return {
    id: linha.id,
    titulo: linha.titulo,
    filme1: { id: linha.filme1_id, titulo: linha.filme1_titulo, posterUrl: linha.filme1_poster, ano: linha.filme1_ano },
    filme2: { id: linha.filme2_id, titulo: linha.filme2_titulo, posterUrl: linha.filme2_poster, ano: linha.filme2_ano },
    criadoEm: linha.criado_em,
    minha: usuarioIdAtual !== null && linha.usuario_id === usuarioIdAtual,
  }
}

export async function lerSessaoPorCodigo(cliente: Cliente, codigo: string, usuarioId: string | null): Promise<SessaoDupla | null> {
  const { data, error } = await cliente
    .from('sessoes_duplas')
    .select(COLUNAS)
    .eq('id', codigo)
    .maybeSingle()
  if (error) {
    console.error('[CineTeca] Falha ao ler sessão dupla:', error.code)
    return null
  }
  return data ? paraSessaoDupla(data as LinhaSessao, usuarioId) : null
}

export async function listarMinhasSessoes(cliente: Cliente, usuarioId: string): Promise<SessaoDupla[]> {
  const { data, error } = await cliente
    .from('sessoes_duplas')
    .select(COLUNAS)
    .eq('usuario_id', usuarioId)
    .order('criado_em', { ascending: false })
    .limit(50)
  if (error) {
    console.error('[CineTeca] Falha ao listar sessões duplas:', error.code)
    return []
  }
  return ((data ?? []) as LinhaSessao[]).map((l) => paraSessaoDupla(l, usuarioId))
}
