'use server'

import { revalidatePath } from 'next/cache'
import { validarFilmeId } from '@/lib/avaliacoes/validacao'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { getMovieDetails } from '@/lib/tmdb/detalhes'
import type { MovieDetails } from '@/lib/tmdb/tipos'
import {
  apagarCena,
  apagarMoodboard,
  atualizarMoodboard,
  contarMoodboards,
  inserirCena,
  inserirMoodboard,
  listarResumos,
} from './banco'
import type { Resposta, ResumoMoodboard } from './tipos'
import {
  ehIdMoodboard,
  MAXIMO_MOODBOARDS,
  MENSAGEM_ERRO,
  MENSAGEM_SESSAO,
  validarCaminhoCena,
  validarDescricaoMoodboard,
  validarTituloMoodboard,
} from './validacao'

type Falha = { ok: false; erro: string; sessaoExpirada: boolean }
type CenaConferida = { filmeId: number; caminho: string; tituloFilme: string }

const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])
const SEM_SESSAO: Falha = { ok: false, erro: MENSAGEM_SESSAO, sessaoExpirada: true }
const recusar = (erro: string): Falha => ({ ok: false, erro, sessaoExpirada: false })

function falhou(codigo: string, acao: string): Falha {
  if (codigo === '23505') return recusar('Essa cena já está neste moodboard')
  console.error(`[CineTeca] ${acao} falhou:`, codigo)
  return CODIGOS_DE_SESSAO.has(codigo) ? SEM_SESSAO : recusar(MENSAGEM_ERRO)
}

async function obterUsuario() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  return { supabase, usuario: data.user }
}

function revalidar(id: string) {
  revalidatePath('/moodboards')
  revalidatePath(`/moodboard/${id}`)
}

async function conferirCena(filmeIdBruto: unknown, caminhoBruto: unknown): Promise<{ ok: true; cena: CenaConferida } | Falha> {
  const filmeId = validarFilmeId(filmeIdBruto)
  if (!filmeId.ok) return recusar(filmeId.erro)
  const caminho = validarCaminhoCena(caminhoBruto)
  if (!caminho.ok) return recusar(caminho.erro)
  let filme: MovieDetails | null
  try {
    filme = await getMovieDetails(filmeId.valor)
  } catch {
    return recusar(MENSAGEM_ERRO)
  }
  if (!filme || !filme.images.some((i) => i.caminho === caminho.valor)) return recusar('Cena não encontrada')
  return { ok: true, cena: { filmeId: filmeId.valor, caminho: caminho.valor, tituloFilme: filme.title.slice(0, 300) } }
}

export async function listarMeusMoodboardsAction(): Promise<Resposta<{ moodboards: ResumoMoodboard[] }>> {
  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO
  const r = await listarResumos(supabase, usuario.id)
  return r.ok ? { ok: true, moodboards: r.valor } : falhou(r.codigo, 'listar moodboards')
}

export async function criarMoodboardAction(
  tituloBruto: unknown,
  descricaoBruta: unknown,
  cenaBruta?: unknown,
): Promise<Resposta<{ id: string }>> {
  const titulo = validarTituloMoodboard(tituloBruto)
  if (!titulo.ok) return recusar(titulo.erro)
  const descricao = validarDescricaoMoodboard(descricaoBruta)
  if (!descricao.ok) return recusar(descricao.erro)

  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO

  let cena: CenaConferida | null = null
  if (cenaBruta !== undefined && cenaBruta !== null) {
    const { filmeId, caminho } = (typeof cenaBruta === 'object' ? cenaBruta : {}) as { filmeId?: unknown; caminho?: unknown }
    const conferida = await conferirCena(filmeId, caminho)
    if (!conferida.ok) return conferida
    cena = conferida.cena
  }

  const total = await contarMoodboards(supabase, usuario.id)
  if (!total.ok) return falhou(total.codigo, 'contar moodboards')
  if (total.valor >= MAXIMO_MOODBOARDS) return recusar(`Você atingiu o limite de ${MAXIMO_MOODBOARDS} moodboards`)

  const criado = await inserirMoodboard(supabase, usuario.id, titulo.valor, descricao.valor)
  if (!criado.ok) return falhou(criado.codigo, 'criar moodboard')

  if (cena) {
    const salva = await inserirCena(supabase, criado.valor, cena)
    if (!salva.ok) {
      await apagarMoodboard(supabase, criado.valor)
      return falhou(salva.codigo, 'salvar cena no moodboard novo')
    }
  }

  revalidar(criado.valor)
  return { ok: true, id: criado.valor }
}

export async function adicionarCenaAction(idBruto: unknown, filmeIdBruto: unknown, caminhoBruto: unknown): Promise<Resposta> {
  if (!ehIdMoodboard(idBruto)) return recusar('Moodboard inválido')
  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO
  const conferida = await conferirCena(filmeIdBruto, caminhoBruto)
  if (!conferida.ok) return conferida
  const r = await inserirCena(supabase, idBruto, conferida.cena)
  if (!r.ok) return falhou(r.codigo, 'salvar cena')
  revalidar(idBruto)
  return { ok: true }
}

export async function removerCenaAction(idBruto: unknown, filmeIdBruto: unknown, caminhoBruto: unknown): Promise<Resposta> {
  if (!ehIdMoodboard(idBruto)) return recusar('Moodboard inválido')
  const filmeId = validarFilmeId(filmeIdBruto)
  if (!filmeId.ok) return recusar(filmeId.erro)
  const caminho = validarCaminhoCena(caminhoBruto)
  if (!caminho.ok) return recusar(caminho.erro)
  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO
  const r = await apagarCena(supabase, idBruto, filmeId.valor, caminho.valor)
  if (!r.ok) return falhou(r.codigo, 'remover cena')
  revalidar(idBruto)
  return { ok: true }
}

export async function editarMoodboardAction(idBruto: unknown, tituloBruto: unknown, descricaoBruta: unknown): Promise<Resposta> {
  if (!ehIdMoodboard(idBruto)) return recusar('Moodboard inválido')
  const titulo = validarTituloMoodboard(tituloBruto)
  if (!titulo.ok) return recusar(titulo.erro)
  const descricao = validarDescricaoMoodboard(descricaoBruta)
  if (!descricao.ok) return recusar(descricao.erro)
  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO
  const r = await atualizarMoodboard(supabase, idBruto, titulo.valor, descricao.valor)
  if (!r.ok) return falhou(r.codigo, 'editar moodboard')
  revalidar(idBruto)
  return { ok: true }
}

export async function excluirMoodboardAction(idBruto: unknown): Promise<Resposta> {
  if (!ehIdMoodboard(idBruto)) return recusar('Moodboard inválido')
  const { supabase, usuario } = await obterUsuario()
  if (!usuario) return SEM_SESSAO
  const r = await apagarMoodboard(supabase, idBruto)
  if (!r.ok) return falhou(r.codigo, 'excluir moodboard')
  revalidar(idBruto)
  return { ok: true }
}
