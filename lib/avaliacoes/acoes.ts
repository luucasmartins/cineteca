'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { getMovieDetails } from '@/lib/tmdb/detalhes'
import { lerAvaliacaoDoFilme } from './banco'
import type { AvaliacaoDoFilme } from './tipos'
import { MENSAGEM_ERRO_VOTO, validarFilmeId, validarVoto } from './validacao'

export type RespostaAvaliacao =
  | { ok: true; estado: AvaliacaoDoFilme }
  | { ok: false; erro: string; sessaoExpirada: boolean }

const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])

function falhou(codigo: string | undefined, acao: string): { ok: false; erro: string; sessaoExpirada: boolean } {
  console.error(`[CineTeca] ${acao} falhou:`, codigo ?? 'sem código')
  return { ok: false, erro: MENSAGEM_ERRO_VOTO, sessaoExpirada: CODIGOS_DE_SESSAO.has(codigo ?? '') }
}

// Sem upsert: ele pede permissão de update em usuario_id e filme_id, que o banco nega de propósito.
// Atualiza; se não havia voto, insere; se um clique paralelo inseriu antes (23505), atualiza de novo.
async function gravarVoto(supabase: SupabaseClient, usuarioId: string, filmeId: number, curtiu: boolean) {
  const atualizar = () =>
    supabase
      .from('avaliacoes')
      .update({ curtiu, atualizado_em: new Date().toISOString() })
      .eq('usuario_id', usuarioId)
      .eq('filme_id', filmeId)
      .select('filme_id')

  const atualizado = await atualizar()
  if (atualizado.error) return atualizado.error.code
  if (atualizado.data.length > 0) return null

  const inserido = await supabase.from('avaliacoes').insert({ usuario_id: usuarioId, filme_id: filmeId, curtiu })
  if (!inserido.error) return null
  if (inserido.error.code !== '23505') return inserido.error.code

  const novamente = await atualizar()
  return novamente.error ? novamente.error.code : null
}

export async function avaliar(filmeId: unknown, curtiu: unknown): Promise<RespostaAvaliacao> {
  const id = validarFilmeId(filmeId)
  if (!id.ok) return { ok: false, erro: id.erro, sessaoExpirada: false }
  const voto = validarVoto(curtiu)
  if (!voto.ok) return { ok: false, erro: voto.erro, sessaoExpirada: false }

  const supabase = await criarClienteServidor()
  const { data: sessao } = await supabase.auth.getUser()
  if (!sessao.user) return { ok: false, erro: MENSAGEM_ERRO_VOTO, sessaoExpirada: true }
  const usuarioId = sessao.user.id

  if (voto.valor === null) {
    const { error } = await supabase.from('avaliacoes').delete().eq('usuario_id', usuarioId).eq('filme_id', id.valor)
    if (error) return falhou(error.code, 'desfazer voto')
  } else {
    // O título vem do TMDB, nunca do navegador: é o que impede um filme forjado no ranking.
    const filme = await getMovieDetails(id.valor).catch(() => null)
    if (!filme) return { ok: false, erro: 'Filme inválido', sessaoExpirada: false }

    const cadastro = await criarClienteAdmin()
      .from('filmes_avaliados')
      .upsert(
        {
          filme_id: id.valor,
          titulo: filme.title.slice(0, 300),
          poster_url: filme.posterUrl,
          ano: filme.year,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'filme_id' },
      )
    if (cadastro.error) return falhou(cadastro.error.code, 'cadastrar filme avaliado')

    const codigo = await gravarVoto(supabase, usuarioId, id.valor, voto.valor)
    if (codigo) return falhou(codigo, 'avaliar')
  }

  revalidatePath('/mais-curtidos')
  revalidatePath('/')
  return { ok: true, estado: await lerAvaliacaoDoFilme(supabase, id.valor, usuarioId) }
}
