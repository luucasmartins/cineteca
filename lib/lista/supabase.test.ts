import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { criarListaSupabase, ErroLista } from './supabase'
import type { FilmeSalvo } from './tipos'

type Resposta = { data: unknown; error: { code?: string; message?: string } | null; status?: number }

function clienteFalso(resposta: Resposta = { data: [], error: null, status: 200 }) {
  const chamadas: { metodo: string; args: unknown[] }[] = []
  const consulta: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'order', 'limit', 'upsert', 'delete']) {
    consulta[metodo] = (...args: unknown[]) => {
      chamadas.push({ metodo, args })
      return consulta
    }
  }
  consulta.then = (aoResolver: (r: Resposta) => unknown, aoRejeitar?: (e: unknown) => unknown) =>
    Promise.resolve(resposta).then(aoResolver, aoRejeitar)
  const cliente = {
    from: (tabela: string) => {
      chamadas.push({ metodo: 'from', args: [tabela] })
      return consulta
    },
  }
  return { cliente: cliente as unknown as Pick<SupabaseClient, 'from'>, chamadas }
}

const matrix: FilmeSalvo = { id: 603, title: 'Matrix', posterUrl: 'https://img/p.jpg', year: '1999', rating: 8.2 }

describe('criarListaSupabase', () => {
  it('lista os filmes da pessoa, mais recentes primeiro', async () => {
    const { cliente, chamadas } = clienteFalso({
      data: [{ filme_id: 603, titulo: 'Matrix', poster_url: 'https://img/p.jpg', ano: '1999', nota: '8.2' }],
      error: null,
      status: 200,
    })
    const filmes = await criarListaSupabase(cliente, 'u1').listar('favoritos')
    expect(filmes).toEqual([matrix])
    expect(chamadas).toEqual([
      { metodo: 'from', args: ['filmes_lista'] },
      { metodo: 'select', args: ['filme_id, titulo, poster_url, ano, nota'] },
      { metodo: 'eq', args: ['usuario_id', 'u1'] },
      { metodo: 'eq', args: ['tipo', 'favoritos'] },
      { metodo: 'order', args: ['criado_em', { ascending: false }] },
    ])
  })

  it('converte nota nula em null', async () => {
    const { cliente } = clienteFalso({
      data: [{ filme_id: 1, titulo: 'X', poster_url: null, ano: null, nota: null }],
      error: null,
      status: 200,
    })
    expect(await criarListaSupabase(cliente, 'u1').listar('salvos')).toEqual([
      { id: 1, title: 'X', posterUrl: null, year: null, rating: null },
    ])
  })

  it('adiciona sem duplicar (upsert que ignora repetidos)', async () => {
    const { cliente, chamadas } = clienteFalso({ data: null, error: null, status: 201 })
    await criarListaSupabase(cliente, 'u1').adicionar('salvos', matrix)
    expect(chamadas[1]).toEqual({
      metodo: 'upsert',
      args: [
        {
          usuario_id: 'u1',
          tipo: 'salvos',
          filme_id: 603,
          titulo: 'Matrix',
          poster_url: 'https://img/p.jpg',
          ano: '1999',
          nota: 8.2,
        },
        { onConflict: 'usuario_id,tipo,filme_id', ignoreDuplicates: true },
      ],
    })
  })

  it('remove só o filme daquela pessoa e daquela lista', async () => {
    const { cliente, chamadas } = clienteFalso({ data: null, error: null, status: 204 })
    await criarListaSupabase(cliente, 'u1').remover('favoritos', 603)
    expect(chamadas.slice(1)).toEqual([
      { metodo: 'delete', args: [] },
      { metodo: 'eq', args: ['usuario_id', 'u1'] },
      { metodo: 'eq', args: ['tipo', 'favoritos'] },
      { metodo: 'eq', args: ['filme_id', 603] },
    ])
  })

  it('contem consulta um único filme', async () => {
    const { cliente } = clienteFalso({ data: [{ filme_id: 603 }], error: null, status: 200 })
    expect(await criarListaSupabase(cliente, 'u1').contem('favoritos', 603)).toBe(true)
    const vazio = clienteFalso({ data: [], error: null, status: 200 })
    expect(await criarListaSupabase(vazio.cliente, 'u1').contem('favoritos', 603)).toBe(false)
  })

  it('erro de permissão ou sessão vira ErroLista com sessaoExpirada', async () => {
    for (const resposta of [
      { data: null, error: { code: '42501', message: 'rls' }, status: 403 },
      { data: null, error: { code: 'PGRST301', message: 'jwt expired' }, status: 401 },
      { data: null, error: { message: 'sem código' }, status: 401 },
    ]) {
      const erro = await criarListaSupabase(clienteFalso(resposta).cliente, 'u1')
        .adicionar('favoritos', matrix)
        .catch((e) => e)
      expect(erro).toBeInstanceOf(ErroLista)
      expect(erro.sessaoExpirada).toBe(true)
    }
  })

  it('outros erros viram ErroLista comum', async () => {
    const { cliente } = clienteFalso({ data: null, error: { code: '23503', message: 'fk' }, status: 409 })
    const erro = await criarListaSupabase(cliente, 'u1')
      .listar('favoritos')
      .catch((e) => e)
    expect(erro).toBeInstanceOf(ErroLista)
    expect(erro.sessaoExpirada).toBe(false)
  })
})
