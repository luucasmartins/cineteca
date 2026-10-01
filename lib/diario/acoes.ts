'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { getMovieDetails } from '@/lib/tmdb/detalhes'
import { validarFilmeId } from '@/lib/avaliacoes/validacao'
import { contarAssistidos as contarNoBanco, listarAssistidos, paraRegistroAssistido } from './banco'
import type { DiretorRegistro, RegistroAssistido, RespostaAssistido, RespostaSimples, ResumoAssistido } from './tipos'
import { MENSAGEM_ERRO_DIARIO, validarAnotacao, validarData } from './validacao'

const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])

function falhou(codigo: string | undefined, acao: string): { ok: false; erro: string; sessaoExpirada: boolean } {
  console.error(`[CineTeca] ${acao} falhou:`, codigo ?? 'sem código')
  return { ok: false, erro: MENSAGEM_ERRO_DIARIO, sessaoExpirada: CODIGOS_DE_SESSAO.has(codigo ?? '') }
}

async function obterUsuario() {
  const supabase = await criarClienteServidor()
  const { data: sessao, error } = await supabase.auth.getUser()
  if (!sessao.user) {
    const temCookie = (await cookies()).getAll().some((c) => c.name.includes('auth-token'))
    console.error('[CineTeca] diário sem sessão:', error?.name ?? 'sem erro', temCookie ? 'com cookie' : 'sem cookie')
    return { supabase, usuario: null as null }
  }
  return { supabase, usuario: sessao.user }
}

function extrairDiretores(crew: { id: number; name: string; profileUrl: string | null; funcoes: string[] }[]): DiretorRegistro[] {
  return crew
    .filter((m) => m.funcoes.includes('Direção'))
    .slice(0, 3)
    .map((m) => ({ id: m.id, nome: m.name, fotoUrl: m.profileUrl }))
}

export async function registrarAssistido(
  filmeIdInput: unknown,
  dataInput: unknown,
  anotacaoInput: unknown,
): Promise<RespostaAssistido> {
  const id = validarFilmeId(filmeIdInput)
  if (!id.ok) return { ok: false, erro: id.erro, sessaoExpirada: false }
  const data = validarData(dataInput)
  if (!data.ok) return { ok: false, erro: data.erro, sessaoExpirada: false }
  const anotacao = validarAnotacao(anotacaoInput)
  if (!anotacao.ok) return { ok: false, erro: anotacao.erro, sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: MENSAGEM_ERRO_DIARIO, sessaoExpirada: true }

  const filme = await getMovieDetails(id.valor).catch(() => null)
  if (!filme) return { ok: false, erro: 'Filme não encontrado', sessaoExpirada: false }

  const diretores = extrairDiretores(filme.crew)

  const { data: inserido, error } = await supabase
    .from('assistidos')
    .insert({
      usuario_id: usuario.id,
      filme_id: id.valor,
      assistido_em: data.valor,
      anotacao: anotacao.valor,
      titulo: filme.title.slice(0, 300),
      poster_url: filme.posterUrl,
      ano: filme.year,
      diretores,
    })
    .select('id, filme_id, titulo, poster_url, ano, diretores, assistido_em, anotacao, criado_em')
    .single()

  if (error || !inserido) return falhou(error?.code, 'registrar assistido')

  revalidatePath('/diario')
  return { ok: true, registro: paraRegistroAssistido(inserido as never) }
}

export async function editarAssistido(
  idInput: unknown,
  dataInput: unknown,
  anotacaoInput: unknown,
): Promise<RespostaSimples> {
  if (typeof idInput !== 'string' || !idInput.trim()) return { ok: false, erro: 'Registro inválido', sessaoExpirada: false }
  const data = validarData(dataInput)
  if (!data.ok) return { ok: false, erro: data.erro, sessaoExpirada: false }
  const anotacao = validarAnotacao(anotacaoInput)
  if (!anotacao.ok) return { ok: false, erro: anotacao.erro, sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: MENSAGEM_ERRO_DIARIO, sessaoExpirada: true }

  const { error } = await supabase
    .from('assistidos')
    .update({ assistido_em: data.valor, anotacao: anotacao.valor })
    .eq('id', idInput.trim())
    .eq('usuario_id', usuario.id)
  if (error) return falhou(error.code, 'editar assistido')

  revalidatePath('/diario')
  return { ok: true }
}

export async function apagarAssistido(idInput: unknown): Promise<RespostaSimples> {
  if (typeof idInput !== 'string' || !idInput.trim()) return { ok: false, erro: 'Registro inválido', sessaoExpirada: false }

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return { ok: false, erro: MENSAGEM_ERRO_DIARIO, sessaoExpirada: true }

  const { error } = await supabase.from('assistidos').delete().eq('id', idInput.trim()).eq('usuario_id', usuario.id)
  if (error) return falhou(error.code, 'apagar assistido')

  revalidatePath('/diario')
  return { ok: true }
}

export async function obterMeusAssistidos(): Promise<RegistroAssistido[]> {
  try {
    const { supabase, usuario } = await obterUsuario()
    if (!usuario) return []
    return await listarAssistidos(supabase, usuario.id)
  } catch {
    return []
  }
}

export async function obterResumoAssistido(filmeId: number): Promise<ResumoAssistido | null> {
  try {
    const { supabase, usuario } = await obterUsuario()
    if (!usuario) return null
    return await contarNoBanco(supabase, usuario.id, filmeId)
  } catch {
    return null
  }
}
