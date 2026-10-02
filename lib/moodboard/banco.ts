import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { imagemFilme } from '@/lib/tmdb/imagens'
import type { CenaMoodboard, Moodboard, ResumoMoodboard } from './tipos'

type Cliente = Pick<SupabaseClient, 'from'>
type ErroBanco = { code?: string } | null

export type ResultadoBanco<T> = { ok: true; valor: T } | { ok: false; codigo: string }

type LinhaCena = { filme_id: number; caminho_imagem: string; titulo_filme: string; ordem: number; criado_em: string }
type LinhaMoodboard = {
  id: string
  titulo: string
  descricao: string | null
  usuario_id: string
  moodboard_cenas: LinhaCena[]
}

const COLUNAS_CENA = 'filme_id, caminho_imagem, titulo_filme, ordem, criado_em'

const falha = (erro: ErroBanco): { ok: false; codigo: string } => ({ ok: false, codigo: erro?.code ?? 'sem-codigo' })
const NENHUMA_LINHA = { ok: false, codigo: 'nenhuma-linha' } as const

function ordenar(cenas: LinhaCena[]): LinhaCena[] {
  return [...cenas].sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em))
}

function paraCena(linha: LinhaCena): CenaMoodboard {
  return {
    filmeId: linha.filme_id,
    caminho: linha.caminho_imagem,
    tituloFilme: linha.titulo_filme,
    imagem: imagemFilme(linha.caminho_imagem),
  }
}

export async function listarResumos(cliente: Cliente, usuarioId: string): Promise<ResultadoBanco<ResumoMoodboard[]>> {
  const { data, error } = await cliente
    .from('moodboards')
    .select(`id, titulo, moodboard_cenas(${COLUNAS_CENA})`)
    .eq('usuario_id', usuarioId)
    .order('criado_em', { ascending: false })
  if (error) return falha(error)
  const linhas = (data ?? []) as Pick<LinhaMoodboard, 'id' | 'titulo' | 'moodboard_cenas'>[]
  return {
    ok: true,
    valor: linhas.map((l) => {
      const cenas = ordenar(l.moodboard_cenas)
      return {
        id: l.id,
        titulo: l.titulo,
        quantidadeCenas: cenas.length,
        capas: cenas.slice(0, 4).map((c) => imagemFilme(c.caminho_imagem).pequena),
      }
    }),
  }
}

export async function lerMoodboard(
  cliente: Cliente,
  id: string,
  usuarioIdAtual: string | null,
): Promise<ResultadoBanco<Moodboard | null>> {
  const { data, error } = await cliente
    .from('moodboards')
    .select(`id, titulo, descricao, usuario_id, moodboard_cenas(${COLUNAS_CENA})`)
    .eq('id', id)
    .maybeSingle()
  if (error) return falha(error)
  if (!data) return { ok: true, valor: null }
  const linha = data as LinhaMoodboard
  return {
    ok: true,
    valor: {
      id: linha.id,
      titulo: linha.titulo,
      descricao: linha.descricao,
      meu: usuarioIdAtual !== null && linha.usuario_id === usuarioIdAtual,
      cenas: ordenar(linha.moodboard_cenas).map(paraCena),
    },
  }
}

export async function contarMoodboards(cliente: Cliente, usuarioId: string): Promise<ResultadoBanco<number>> {
  const { count, error } = await cliente
    .from('moodboards')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
  if (error) return falha(error)
  return { ok: true, valor: count ?? 0 }
}

export async function inserirMoodboard(
  cliente: Cliente,
  usuarioId: string,
  titulo: string,
  descricao: string | null,
): Promise<ResultadoBanco<string>> {
  const { data, error } = await cliente
    .from('moodboards')
    .insert({ usuario_id: usuarioId, titulo, descricao })
    .select('id')
    .single()
  if (error || !data) return falha(error)
  return { ok: true, valor: (data as { id: string }).id }
}

export async function atualizarMoodboard(
  cliente: Cliente,
  id: string,
  titulo: string,
  descricao: string | null,
): Promise<ResultadoBanco<void>> {
  const { data, error } = await cliente
    .from('moodboards')
    .update({ titulo, descricao, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) return falha(error)
  if ((data ?? []).length === 0) return NENHUMA_LINHA
  return { ok: true, valor: undefined }
}

export async function apagarMoodboard(cliente: Cliente, id: string): Promise<ResultadoBanco<void>> {
  const { data, error } = await cliente.from('moodboards').delete().eq('id', id).select('id')
  if (error) return falha(error)
  if ((data ?? []).length === 0) return NENHUMA_LINHA
  return { ok: true, valor: undefined }
}

export async function inserirCena(
  cliente: Cliente,
  moodboardId: string,
  cena: { filmeId: number; caminho: string; tituloFilme: string },
): Promise<ResultadoBanco<void>> {
  const { error } = await cliente.from('moodboard_cenas').insert({
    moodboard_id: moodboardId,
    filme_id: cena.filmeId,
    caminho_imagem: cena.caminho,
    titulo_filme: cena.tituloFilme,
  })
  if (error) return falha(error)
  return { ok: true, valor: undefined }
}

export async function apagarCena(
  cliente: Cliente,
  moodboardId: string,
  filmeId: number,
  caminho: string,
): Promise<ResultadoBanco<void>> {
  const { data, error } = await cliente
    .from('moodboard_cenas')
    .delete()
    .eq('moodboard_id', moodboardId)
    .eq('filme_id', filmeId)
    .eq('caminho_imagem', caminho)
    .select('filme_id')
  if (error) return falha(error)
  if ((data ?? []).length === 0) return NENHUMA_LINHA
  return { ok: true, valor: undefined }
}
