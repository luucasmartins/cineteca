import { describe, expect, it } from 'vitest'
import { enderecoDeRetornoDaRecuperacao } from './rotas'

describe('enderecoDeRetornoDaRecuperacao', () => {
  // O Supabase devolve o link com ?code=..., e /auth/callback é a única rota que troca
  // esse código por uma sessão. Apontar direto para /redefinir-senha deixa a pessoa sem
  // sessão, e a página sempre diria que o link expirou.
  it('passa pela rota que troca o código por sessão', () => {
    const endereco = new URL(enderecoDeRetornoDaRecuperacao('https://cineteca-gules.vercel.app'))
    expect(endereco.pathname).toBe('/auth/callback')
  })

  it('leva a pessoa para a tela de criar a nova senha', () => {
    const endereco = new URL(enderecoDeRetornoDaRecuperacao('https://cineteca-gules.vercel.app'))
    expect(endereco.searchParams.get('voltar')).toBe('/redefinir-senha')
  })

  it('usa o endereço do site que recebe', () => {
    expect(enderecoDeRetornoDaRecuperacao('http://localhost:3100')).toMatch(/^http:\/\/localhost:3100\//)
  })
})
