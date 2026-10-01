'use server'

import { revalidatePath } from 'next/cache'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { getMovieDetails } from '@/lib/tmdb/detalhes'
import { lerAvaliacaoDoFilme } from './banco'
import type { AvaliacaoDoFilme } from './tipos'
import { validarFilmeId, validarVoto } from './validacao'

export const MENSAGEM_ERRO_VOTO = 'Não foi possível salvar. Tente de novo.'

export type RespostaAvaliacao =
  | { ok: true; estado: AvaliacaoDoFilme }
  | { ok: false; erro: string; sessaoExpirada: boolean }

const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])

function falhou(codigo: string | undefined, acao: string): { ok: false; erro: string; sessaoExpirada: boolean } {
  console.error(`[CineTeca] ${acao} falhou:`, codigo ?? 'sem código')
  return { ok: false, erro: MENSAGEM_ERRO_VOTO, sessaoExpirada: CODIGOS_DE_SESSAO.has(codigo ?? '') }
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

    const { error } = await supabase.from('avaliacoes').upsert(
      { usuario_id: usuarioId, filme_id: id.valor, curtiu: voto.valor, atualizado_em: new Date().toISOString() },
      { onConflict: 'usuario_id,filme_id' },
    )
    if (error) return falhou(error.code, 'avaliar')
  }

  revalidatePath('/mais-curtidos')
  revalidatePath('/')
  return { ok: true, estado: await lerAvaliacaoDoFilme(supabase, id.valor, usuarioId) }
}
