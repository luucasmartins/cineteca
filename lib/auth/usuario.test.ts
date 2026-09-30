import { describe, expect, it } from 'vitest'
import { montarUsuario, primeiroNome } from './usuario'

describe('montarUsuario', () => {
  it('prefere o nome do perfil', () => {
    const u = montarUsuario(
      { id: '1', email: 'ana@x.com', user_metadata: { nome: 'Outro' }, app_metadata: { providers: ['email'] } },
      'Ana Souza',
    )
    expect(u).toEqual({ id: '1', email: 'ana@x.com', nome: 'Ana Souza', fotoUrl: null, soGoogle: false })
  })

  it('usa o nome e a foto do Google quando não há perfil', () => {
    const u = montarUsuario(
      {
        id: '2',
        email: 'bia@gmail.com',
        user_metadata: { full_name: 'Bia Lima', avatar_url: 'https://lh3.googleusercontent.com/a/x' },
        app_metadata: { providers: ['google'] },
      },
      null,
    )
    expect(u.nome).toBe('Bia Lima')
    expect(u.fotoUrl).toBe('https://lh3.googleusercontent.com/a/x')
    expect(u.soGoogle).toBe(true)
  })

  it('conta com e-mail e Google não é "só Google"', () => {
    expect(
      montarUsuario({ id: '3', email: 'c@x.com', app_metadata: { providers: ['email', 'google'] } }, 'C').soGoogle,
    ).toBe(false)
  })

  it('sem nome em lugar nenhum, usa o começo do e-mail', () => {
    expect(montarUsuario({ id: '4', email: 'davi.r@x.com' }, '  ').nome).toBe('davi.r')
  })

  it('ignora foto que não é https', () => {
    expect(montarUsuario({ id: '5', email: 'e@x.com', user_metadata: { picture: 'http://x/y.png' } }, 'E').fotoUrl).toBeNull()
  })
})

describe('primeiroNome', () => {
  it('pega a primeira palavra', () => {
    expect(primeiroNome('  Ana   Souza ')).toBe('Ana')
    expect(primeiroNome('Ana')).toBe('Ana')
  })
})
