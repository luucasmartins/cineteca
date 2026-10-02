import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
const chaveSecreta = process.env.SUPABASE_SECRET_KEY ?? ''
const semSessao = { auth: { persistSession: false, autoRefreshToken: false } }
const SENHA = 'senha-de-integracao-123'

type Conta = { id: string; email: string }

const admin = () => createClient(url, chaveSecreta, semSessao)
const novoEmail = (rotulo: string) =>
  `moodboards+${rotulo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@cineteca.test`

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

const cena = (moodboardId: string, caminho = '/cena-1.jpg') => ({
  moodboard_id: moodboardId,
  filme_id: 90001,
  caminho_imagem: caminho,
  titulo_filme: 'Filme de Integração',
})

describe('moodboards no banco (projeto de testes)', () => {
  const contas: Conta[] = []
  let ana: Conta
  let bia: Conta
  let clienteAna: SupabaseClient
  let clienteBia: SupabaseClient
  let moodboardDaAna = ''

  beforeAll(async () => {
    if (!url || !chavePublica || !chaveSecreta) {
      throw new Error('Falta .env.test.local com as chaves do projeto cineteca-testes')
    }
    ana = await criarConta('Ana')
    bia = await criarConta('Bia')
    contas.push(ana, bia)
    clienteAna = await clienteDe(ana)
    clienteBia = await clienteDe(bia)
  })

  afterAll(async () => {
    for (const conta of contas) await admin().auth.admin.deleteUser(conta.id)
  })

  it('a dona cria, lê e põe uma cena no próprio moodboard', async () => {
    const { data, error } = await clienteAna
      .from('moodboards')
      .insert({ usuario_id: ana.id, titulo: 'Neons' })
      .select('id')
      .single()
    expect(error).toBeNull()
    moodboardDaAna = (data as { id: string }).id

    expect((await clienteAna.from('moodboard_cenas').insert(cena(moodboardDaAna))).error).toBeNull()
    const lidas = await clienteAna.from('moodboard_cenas').select('caminho_imagem').eq('moodboard_id', moodboardDaAna)
    expect(lidas.data).toEqual([{ caminho_imagem: '/cena-1.jpg' }])
  })

  it('recusa a mesma cena duas vezes no mesmo moodboard', async () => {
    const { error } = await clienteAna.from('moodboard_cenas').insert(cena(moodboardDaAna))
    expect(error?.code).toBe('23505')
  })

  it('recusa caminho de imagem fora do formato do TMDB', async () => {
    const { error } = await clienteAna.from('moodboard_cenas').insert(cena(moodboardDaAna, 'https://x.com/a.jpg'))
    expect(error?.code).toBe('23514')
  })

  it('outra pessoa não lê o moodboard nem as cenas', async () => {
    const moodboards = await clienteBia.from('moodboards').select('id').eq('id', moodboardDaAna)
    const cenas = await clienteBia.from('moodboard_cenas').select('filme_id').eq('moodboard_id', moodboardDaAna)
    expect(moodboards.data).toEqual([])
    expect(cenas.data).toEqual([])
  })

  it('outra pessoa não põe cena no moodboard alheio', async () => {
    const { error } = await clienteBia.from('moodboard_cenas').insert(cena(moodboardDaAna, '/invasora.jpg'))
    expect(error?.code).toBe('42501')
  })

  it('outra pessoa não altera nem apaga o moodboard alheio', async () => {
    const alterado = await clienteBia.from('moodboards').update({ titulo: 'Invadido' }).eq('id', moodboardDaAna).select('id')
    const apagado = await clienteBia.from('moodboards').delete().eq('id', moodboardDaAna).select('id')
    expect(alterado.data ?? []).toEqual([])
    expect(apagado.data ?? []).toEqual([])
    const { data } = await admin().from('moodboards').select('titulo').eq('id', moodboardDaAna).single()
    expect(data?.titulo).toBe('Neons')
  })

  it('a dona não consegue passar o moodboard para outra pessoa', async () => {
    const { error } = await clienteAna.from('moodboards').update({ usuario_id: bia.id }).eq('id', moodboardDaAna)
    expect(error?.code).toBe('42501')
  })

  it('visitante sem login não lê nada', async () => {
    const visitante = createClient(url, chavePublica, semSessao)
    const moodboards = await visitante.from('moodboards').select('id')
    const cenas = await visitante.from('moodboard_cenas').select('filme_id')
    expect(moodboards.error !== null || (moodboards.data ?? []).length === 0).toBe(true)
    expect(cenas.error !== null || (cenas.data ?? []).length === 0).toBe(true)
  })

  it('apagar o moodboard apaga as cenas', async () => {
    const apagado = await clienteAna.from('moodboards').delete().eq('id', moodboardDaAna).select('id')
    expect(apagado.data).toHaveLength(1)
    const { data } = await admin().from('moodboard_cenas').select('filme_id').eq('moodboard_id', moodboardDaAna)
    expect(data).toEqual([])
  })
})
