'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { getMovieDetails } from '@/lib/tmdb/detalhes'
import { validarFilmeId } from '@/lib/avaliacoes/validacao'
import { listarMinhasSessoes, paraSessaoDupla } from './banco'
import type { RespostaSimples, RespostaSessaoDupla, SessaoDupla } from './tipos'
import { MENSAGEM_ERRO_SESSAO, validarFilmesDiferentes, validarTitulo } from './validacao'

const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])

function falhou(codigo: string | undefined, acao: string): { ok: false; erro: string; sessaoExpirada: boolean } {
  console.error(`[CineTeca] ${acao} falhou:`, codigo ?? 'sem código')
  return { ok: false, erro: MENSAGEM_ERRO_SESSAO, sessaoExpirada: CODIGOS_DE_SESSAO.has(codigo ?? '') }
}

async function obterUsuario() {
  const supabase = await criarClienteServidor()
  const { data: sessao, error } = await supabase.auth.getUser()
  if (!sessao.user) {
    const temCookie = (await cookies()).getAll().some((c) => c.name.includes('auth-token'))
    console.error('[CineTeca] sessão dupla sem sessão:', error?.name ?? 'sem erro', temCookie ? 'com cookie' : 'sem cookie')
    return { supabase, usuario: null as null }
  }
  return { supabase, usuario: sessao.user }
}

export async function criarSessaoDupla(
  tituloInput: unknown,
  filme1IdInput: unknown,
  filme2IdInput: unknown,
): Promise<RespostaSessaoDupla> {
  const titulo = validarTitulo(tituloInput)
  if (!titulo.ok) return { ok: false, erro: titulo.erro, sessaoExpirada: false }
  const id1 = validarFilmeId(filme1IdInput)
  if (!id1.ok) return { ok: false, erro: id1.erro, sessaoExpirada: false }
  const id2 = validarFilmeId(filme2IdInput)
  if (!id2.ok) return { ok: false, erro: id2.erro, sessaoExpirada: false }
  const diferentes = validarFilmesDiferentes(id1.valor, id2.valor)
  if (!diferentes.ok) return { ok: false, erro: diferentes.erro, sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: MENSAGEM_ERRO_SESSAO, sessaoExpirada: true }

  const [filme1, filme2] = await Promise.all([
    getMovieDetails(id1.valor).catch(() => null),
    getMovieDetails(id2.valor).catch(() => null),
  ])
  if (!filme1 || !filme2) return { ok: false, erro: 'Filme não encontrado', sessaoExpirada: false }

  const { data, error } = await supabase
    .from('sessoes_duplas')
    .insert({
      usuario_id: usuario.id,
      titulo: titulo.valor,
      filme1_id: id1.valor,
      filme1_titulo: filme1.title.slice(0, 300),
      filme1_poster: filme1.posterUrl,
      filme1_ano: filme1.year,
      filme2_id: id2.valor,
      filme2_titulo: filme2.title.slice(0, 300),
      filme2_poster: filme2.posterUrl,
      filme2_ano: filme2.year,
    })
    .select('id, titulo, filme1_id, filme1_titulo, filme1_poster, filme1_ano, filme2_id, filme2_titulo, filme2_poster, filme2_ano, criado_em, usuario_id')
    .single()

  if (error || !data) return falhou(error?.code, 'criar sessão dupla')

  revalidatePath('/sessoes')
  return { ok: true, sessao: paraSessaoDupla(data as never, usuario.id) }
}

export async function apagarSessaoDupla(idInput: unknown): Promise<RespostaSimples> {
  if (typeof idInput !== 'string' || !idInput.trim()) return { ok: false, erro: 'Sessão inválida', sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: MENSAGEM_ERRO_SESSAO, sessaoExpirada: true }

  const { error } = await supabase.from('sessoes_duplas').delete().eq('id', idInput.trim()).eq('usuario_id', usuario.id)
  if (error) return falhou(error.code, 'apagar sessão dupla')

  revalidatePath('/sessoes')
  return { ok: true }
}

export async function obterMinhasSessoes(): Promise<SessaoDupla[]> {
  try {
    const { supabase, usuario } = await obterUsuario()
    if (!usuario) return []
    return await listarMinhasSessoes(supabase, usuario.id)
  } catch {
    return []
  }
}
