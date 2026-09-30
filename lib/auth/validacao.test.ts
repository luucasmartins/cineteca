import { describe, expect, it } from 'vitest'
import { caminhoDeRetorno, validarConfirmacao, validarEmail, validarNome, validarSenha } from './validacao'

describe('validarEmail', () => {
  it('remove espaços e passa para minúsculas', () => {
    expect(validarEmail('  Ana.Souza@Email.COM ')).toEqual({ ok: true, valor: 'ana.souza@email.com' })
  })

  it('recusa formatos inválidos', () => {
    for (const valor of ['', 'ana', 'ana@', '@email.com', 'ana@email', 'ana souza@email.com', null, 42]) {
      expect(validarEmail(valor)).toEqual({ ok: false, erro: 'Digite um e-mail válido' })
    }
  })
})

describe('validarSenha', () => {
  it('aceita de 8 a 72 caracteres, sem alterar a senha', () => {
    expect(validarSenha(' 12345678')).toEqual({ ok: true, valor: ' 12345678' })
    expect(validarSenha('a'.repeat(72))).toEqual({ ok: true, valor: 'a'.repeat(72) })
  })

  it('recusa senha curta', () => {
    expect(validarSenha('1234567')).toEqual({ ok: false, erro: 'A senha precisa ter pelo menos 8 caracteres' })
    expect(validarSenha(undefined)).toEqual({ ok: false, erro: 'A senha precisa ter pelo menos 8 caracteres' })
  })

  it('recusa senha longa demais', () => {
    expect(validarSenha('a'.repeat(73))).toEqual({ ok: false, erro: 'A senha pode ter no máximo 72 caracteres' })
  })
})

describe('validarConfirmacao', () => {
  it('aceita senhas iguais', () => {
    expect(validarConfirmacao('senha-123', 'senha-123')).toEqual({ ok: true, valor: 'senha-123' })
  })

  it('recusa senhas diferentes', () => {
    expect(validarConfirmacao('senha-123', 'senha-124')).toEqual({ ok: false, erro: 'As senhas não são iguais' })
  })
})

describe('validarNome', () => {
  it('remove espaços extras e mantém acentos', () => {
    expect(validarNome('  João   da  Silva ')).toEqual({ ok: true, valor: 'João da Silva' })
  })

  it('recusa nome vazio', () => {
    expect(validarNome('   ')).toEqual({ ok: false, erro: 'Digite seu nome' })
    expect(validarNome(null)).toEqual({ ok: false, erro: 'Digite seu nome' })
  })

  it('recusa nome com mais de 80 caracteres', () => {
    expect(validarNome('a'.repeat(81))).toEqual({ ok: false, erro: 'O nome pode ter no máximo 80 caracteres' })
    expect(validarNome('a'.repeat(80))).toEqual({ ok: true, valor: 'a'.repeat(80) })
  })
})

describe('caminhoDeRetorno', () => {
  it('aceita caminhos internos, com busca', () => {
    expect(caminhoDeRetorno('/filme/603')).toBe('/filme/603')
    expect(caminhoDeRetorno('/busca?q=matrix')).toBe('/busca?q=matrix')
  })

  it('troca por / qualquer coisa fora do site ou estranha', () => {
    for (const valor of [
      '//site.com',
      '/\\site.com',
      'https://site.com',
      'site.com',
      '',
      '/filme\n603',
      `/${'a'.repeat(600)}`,
      null,
      undefined,
    ]) {
      expect(caminhoDeRetorno(valor)).toBe('/')
    }
  })

  it('evita voltar para as próprias páginas de acesso', () => {
    expect(caminhoDeRetorno('/entrar')).toBe('/')
    expect(caminhoDeRetorno('/cadastro?voltar=/x')).toBe('/')
    expect(caminhoDeRetorno('/entrarx')).toBe('/entrarx')
  })
})
