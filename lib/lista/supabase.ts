import type { SupabaseClient } from '@supabase/supabase-js'
import type { FilmeSalvo, ListaStore, TipoLista } from './tipos'

type LinhaFilme = {
  filme_id: number
  titulo: string
  poster_url: string | null
  ano: string | null
  nota: number | string | null
}

type ErroBanco = { code?: string; message?: string }

export class ErroLista extends Error {
  readonly sessaoExpirada: boolean

  constructor(mensagem: string, sessaoExpirada: boolean) {
    super(mensagem)
    this.name = 'ErroLista'
    this.sessaoExpirada = sessaoExpirada
  }
}

// 42501 = recusado pela RLS; PGRST301/PGRST303 = token inválido ou expirado.
const CODIGOS_DE_SESSAO = new Set(['42501', 'PGRST301', 'PGRST303'])

function falha(erro: ErroBanco, status?: number): ErroLista {
  const sessao = CODIGOS_DE_SESSAO.has(erro.code ?? '') || status === 401
  return new ErroLista(erro.message ?? 'Falha ao acessar a lista', sessao)
}

function paraFilme(linha: LinhaFilme): FilmeSalvo {
  return {
    id: linha.filme_id,
    title: linha.titulo,
    posterUrl: linha.poster_url,
    year: linha.ano,
    rating: linha.nota === null ? null : Number(linha.nota),
  }
}

export function criarListaSupabase(cliente: Pick<SupabaseClient, 'from'>, usuarioId: string): ListaStore {
  const tabela = () => cliente.from('filmes_lista')

  return {
    async listar(tipo: TipoLista) {
      const { data, error, status } = await tabela()
        .select('filme_id, titulo, poster_url, ano, nota')
        .eq('usuario_id', usuarioId)
        .eq('tipo', tipo)
        .order('criado_em', { ascending: false })
      if (error) throw falha(error, status)
      return ((data ?? []) as LinhaFilme[]).map(paraFilme)
    },
    async contem(tipo: TipoLista, id: number) {
      const { data, error, status } = await tabela()
        .select('filme_id')
        .eq('usuario_id', usuarioId)
        .eq('tipo', tipo)
        .eq('filme_id', id)
        .limit(1)
      if (error) throw falha(error, status)
      return (data ?? []).length > 0
    },
    async adicionar(tipo: TipoLista, filme: FilmeSalvo) {
      const { error, status } = await tabela().upsert(
        {
          usuario_id: usuarioId,
          tipo,
          filme_id: filme.id,
          titulo: filme.title,
          poster_url: filme.posterUrl,
          ano: filme.year,
          nota: filme.rating,
        },
        { onConflict: 'usuario_id,tipo,filme_id', ignoreDuplicates: true },
      )
      if (error) throw falha(error, status)
    },
    async remover(tipo: TipoLista, id: number) {
      const { error, status } = await tabela().delete().eq('usuario_id', usuarioId).eq('tipo', tipo).eq('filme_id', id)
      if (error) throw falha(error, status)
    },
  }
}
