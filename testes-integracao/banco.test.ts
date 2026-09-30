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
  `integracao+${rotulo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@cineteca.test`

async function criarConta(nome: string): Promise<Conta> {
  const email = novoEmail(nome.split(' ')[0].toLowerCase())
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

const linha = (usuarioId: string, filmeId = 603) => ({
  usuario_id: usuarioId,
  tipo: 'favoritos',
  filme_id: filmeId,
  titulo: 'Matrix',
  poster_url: null,
  ano: '1999',
  nota: 8.2,
})

describe('banco da CineTeca (projeto de testes)', () => {
  const criadas: Conta[] = []
  let ana: Conta
  let bia: Conta
  let clienteAna: SupabaseClient
  let clienteBia: SupabaseClient

  beforeAll(async () => {
    if (!url || !chavePublica || !chaveSecreta) throw new Error('Falta .env.test.local com as chaves do projeto cineteca-testes')
    ana = await criarConta('Ana Souza')
    bia = await criarConta('Bia Lima')
    criadas.push(ana, bia)
    clienteAna = await clienteDe(ana)
    clienteBia = await clienteDe(bia)
  })

  afterAll(async () => {
    for (const conta of criadas) await admin().auth.admin.deleteUser(conta.id)
  })

  it('cria o perfil com o nome do cadastro', async () => {
    const { data, error } = await clienteAna.from('perfis').select('nome').eq('id', ana.id).single()
    expect(error).toBeNull()
    expect(data?.nome).toBe('Ana Souza')
  })

  it('não mostra o perfil de outra pessoa', async () => {
    const { data } = await clienteBia.from('perfis').select('id').eq('id', ana.id)
    expect(data).toEqual([])
  })

  it('atualiza o próprio nome, mas não o de outra pessoa', async () => {
    await clienteAna.from('perfis').update({ nome: 'Ana S.' }).eq('id', ana.id)
    await clienteBia.from('perfis').update({ nome: 'Invasora' }).eq('id', ana.id)
    const { data } = await admin().from('perfis').select('nome').eq('id', ana.id).single()
    expect(data?.nome).toBe('Ana S.')
  })

  it('insere e lê os próprios filmes', async () => {
    expect((await clienteAna.from('filmes_lista').insert(linha(ana.id))).error).toBeNull()
    const { data } = await clienteAna.from('filmes_lista').select('filme_id, titulo').eq('usuario_id', ana.id)
    expect(data).toEqual([{ filme_id: 603, titulo: 'Matrix' }])
  })

  it('inserir o mesmo filme de novo, ignorando duplicados, não dá erro nem duplica', async () => {
    const { error } = await clienteAna
      .from('filmes_lista')
      .upsert(linha(ana.id), { onConflict: 'usuario_id,tipo,filme_id', ignoreDuplicates: true })
    expect(error).toBeNull()
    const { data } = await clienteAna.from('filmes_lista').select('filme_id').eq('usuario_id', ana.id)
    expect(data).toHaveLength(1)
  })

  it('não mostra os filmes de outra pessoa', async () => {
    const { data } = await clienteBia.from('filmes_lista').select('filme_id').eq('usuario_id', ana.id)
    expect(data).toEqual([])
  })

  it('recusa inserir filme em nome de outra pessoa', async () => {
    const { error } = await clienteBia.from('filmes_lista').insert(linha(ana.id, 604))
    expect(error?.code).toBe('42501')
  })

  it('não apaga filme de outra pessoa', async () => {
    await clienteBia.from('filmes_lista').delete().eq('usuario_id', ana.id)
    const { data } = await admin().from('filmes_lista').select('filme_id').eq('usuario_id', ana.id)
    expect(data).toHaveLength(1)
  })

  it('visitante sem login não lê nada', async () => {
    const visitante = createClient(url, chavePublica, semSessao)
    const { data, error } = await visitante.from('filmes_lista').select('filme_id')
    expect(error !== null || (data ?? []).length === 0).toBe(true)
  })

  it('recusa um tipo de lista inválido', async () => {
    const { error } = await clienteAna.from('filmes_lista').insert({ ...linha(ana.id, 605), tipo: 'series' })
    expect(error?.code).toBe('23514')
  })

  it('excluir a conta apaga o perfil e os filmes', async () => {
    const caio = await criarConta('Caio')
    const clienteCaio = await clienteDe(caio)
    await clienteCaio.from('filmes_lista').insert(linha(caio.id))
    expect((await admin().auth.admin.deleteUser(caio.id)).error).toBeNull()
    const perfis = await admin().from('perfis').select('id').eq('id', caio.id)
    const filmes = await admin().from('filmes_lista').select('filme_id').eq('usuario_id', caio.id)
    expect(perfis.data).toEqual([])
    expect(filmes.data).toEqual([])
  })
})
