import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
const chaveSecreta = process.env.SUPABASE_SECRET_KEY ?? ''
const semSessao = { auth: { persistSession: false, autoRefreshToken: false } }
const SENHA = 'senha-de-integracao-123'
const FILME = 90001

type Conta = { id: string; email: string }

const admin = () => createClient(url, chaveSecreta, semSessao)
const novoEmail = (rotulo: string) =>
  `avaliacoes+${rotulo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@cineteca.test`

async function criarConta(nome: string): Promise<Conta> {
  const email = novoEmail(nome.toLowerCase())
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
    user_metadata: { nome },
  })
  if (error) throw error
  return { id: data.user.id, email }
}

async function clienteDe(conta: Conta): Promise<SupabaseClient> {
  const cliente = createClient(url, chavePublica, semSessao)
  const { error } = await cliente.auth.signInWithPassword({ email: conta.email, password: SENHA })
  if (error) throw error
  return cliente
}

const linhaDoRanking = async (filmeId: number) =>
  (await admin().from('ranking_filmes').select('*').eq('filme_id', filmeId).maybeSingle()).data as
    | { votos: number; curtidas: number; aprovacao: number; titulo: string }
    | null

describe('avaliações no banco (projeto de testes)', () => {
  const contas: Conta[] = []
  let ana: Conta
  let bia: Conta
  let caio: Conta
  let clienteAna: SupabaseClient
  let clienteBia: SupabaseClient

  beforeAll(async () => {
    if (!url || !chavePublica || !chaveSecreta) {
      throw new Error('Falta .env.test.local com as chaves do projeto cineteca-testes')
    }
    await admin().from('filmes_avaliados').upsert({
      filme_id: FILME,
      titulo: 'Filme de Integração',
      poster_url: null,
      ano: '2024',
    })
    ana = await criarConta('Ana')
    bia = await criarConta('Bia')
    caio = await criarConta('Caio')
    contas.push(ana, bia, caio)
    clienteAna = await clienteDe(ana)
    clienteBia = await clienteDe(bia)
  })

  afterAll(async () => {
    for (const conta of contas) await admin().auth.admin.deleteUser(conta.id)
    await admin().from('filmes_avaliados').delete().eq('filme_id', FILME)
  })

  it('a pessoa grava e lê o próprio voto', async () => {
    const { error } = await clienteAna.from('avaliacoes').insert({
      usuario_id: ana.id,
      filme_id: FILME,
      curtiu: true,
    })
    expect(error).toBeNull()
    const { data } = await clienteAna.from('avaliacoes').select('curtiu').eq('filme_id', FILME)
    expect(data).toEqual([{ curtiu: true }])
  })

  it('não enxerga o voto de outra pessoa', async () => {
    const { data } = await clienteBia.from('avaliacoes').select('curtiu').eq('usuario_id', ana.id)
    expect(data).toEqual([])
  })

  it('recusa votar em nome de outra pessoa', async () => {
    const { error } = await clienteBia.from('avaliacoes').insert({
      usuario_id: ana.id,
      filme_id: FILME + 1,
      curtiu: true,
    })
    expect(error?.code).toBe('42501')
  })

  it('recusa um segundo voto da mesma pessoa no mesmo filme', async () => {
    const { error } = await clienteAna.from('avaliacoes').insert({
      usuario_id: ana.id,
      filme_id: FILME,
      curtiu: false,
    })
    expect(error?.code).toBe('23505')
  })

  it('a pessoa muda o próprio voto', async () => {
    await clienteAna.from('avaliacoes').update({ curtiu: false }).eq('filme_id', FILME)
    const { data } = await clienteAna.from('avaliacoes').select('curtiu').eq('filme_id', FILME)
    expect(data).toEqual([{ curtiu: false }])
    await clienteAna.from('avaliacoes').update({ curtiu: true }).eq('filme_id', FILME)
  })

  it('ninguém logado escreve em filmes_avaliados', async () => {
    const insercao = await clienteAna
      .from('filmes_avaliados')
      .insert({ filme_id: FILME + 2, titulo: 'Título Forjado' })
    expect(insercao.error).not.toBeNull()
    const alteracao = await clienteAna
      .from('filmes_avaliados')
      .update({ titulo: 'Título Forjado' })
      .eq('filme_id', FILME)
    expect(alteracao.error).not.toBeNull()
    const { data } = await admin().from('filmes_avaliados').select('titulo').eq('filme_id', FILME).single()
    expect(data?.titulo).toBe('Filme de Integração')
  })

  it('o filme só entra no ranking a partir de 3 votos', async () => {
    expect(await linhaDoRanking(FILME)).toBeNull()

    await clienteBia.from('avaliacoes').insert({ usuario_id: bia.id, filme_id: FILME, curtiu: true })
    expect(await linhaDoRanking(FILME)).toBeNull()

    const clienteCaio = await clienteDe(caio)
    await clienteCaio.from('avaliacoes').insert({ usuario_id: caio.id, filme_id: FILME, curtiu: false })

    const linha = await linhaDoRanking(FILME)
    expect(linha).toMatchObject({ votos: 3, curtidas: 2, aprovacao: 67 })
  })

  it('o ranking não devolve nenhuma coluna que identifique quem votou', async () => {
    const { data } = await admin().from('ranking_filmes').select('*').eq('filme_id', FILME).single()
    expect(Object.keys(data ?? {}).sort()).toEqual(
      ['ano', 'aprovacao', 'curtidas', 'filme_id', 'poster_url', 'titulo', 'votos'].sort(),
    )
  })

  it('visitante sem login lê o ranking, mas não os votos', async () => {
    const visitante = createClient(url, chavePublica, semSessao)
    const ranking = await visitante.from('ranking_filmes').select('filme_id').eq('filme_id', FILME)
    expect(ranking.error).toBeNull()
    expect(ranking.data).toHaveLength(1)

    const votos = await visitante.from('avaliacoes').select('curtiu')
    expect(votos.error !== null || (votos.data ?? []).length === 0).toBe(true)
  })

  it('excluir a conta apaga o voto e o filme sai do ranking', async () => {
    expect((await admin().auth.admin.deleteUser(caio.id)).error).toBeNull()
    contas.splice(contas.indexOf(caio), 1)
    const votosRestantes = await admin().from('avaliacoes').select('usuario_id').eq('filme_id', FILME)
    expect(votosRestantes.data).toHaveLength(2)
    expect(await linhaDoRanking(FILME)).toBeNull()
  })

  it('recusa filme_id inválido', async () => {
    const { error } = await clienteBia.from('avaliacoes').insert({
      usuario_id: bia.id,
      filme_id: 0,
      curtiu: true,
    })
    expect(error?.code).toBe('23514')
  })
})
