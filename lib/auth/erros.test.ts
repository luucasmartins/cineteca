import { describe, expect, it } from 'vitest'
import { MENSAGENS, mensagemDoErroAuth } from './erros'

describe('mensagemDoErroAuth', () => {
  it.each([
    ['invalid_credentials', 'E-mail ou senha incorretos'],
    ['user_already_exists', 'Já existe uma conta com esse e-mail'],
    ['email_exists', 'Já existe uma conta com esse e-mail'],
    ['weak_password', 'A senha precisa ter pelo menos 8 caracteres'],
    ['over_request_rate_limit', 'Muitas tentativas. Espere um pouco e tente de novo.'],
    ['over_email_send_rate_limit', 'Muitas tentativas. Espere um pouco e tente de novo.'],
    ['same_password', 'A nova senha precisa ser diferente da atual'],
    ['otp_expired', 'Este link expirou. Peça um novo.'],
    ['flow_state_expired', 'Este link expirou. Peça um novo.'],
  ])('código %s', (code, mensagem) => {
    expect(mensagemDoErroAuth({ code })).toBe(mensagem)
  })

  it('status 429 sem código vira "muitas tentativas"', () => {
    expect(mensagemDoErroAuth({ status: 429 })).toBe(MENSAGENS.limite)
  })

  it('falha de rede ou servidor fora do ar vira "não foi possível conectar"', () => {
    expect(mensagemDoErroAuth({ name: 'AuthRetryableFetchError' })).toBe('Não foi possível conectar. Tente em instantes.')
    expect(mensagemDoErroAuth({ status: 503 })).toBe(MENSAGENS.conexao)
    expect(mensagemDoErroAuth({ status: 0 })).toBe(MENSAGENS.conexao)
  })

  it('qualquer outro erro vira a mensagem genérica', () => {
    expect(mensagemDoErroAuth({ code: 'algo_novo', status: 400 })).toBe('Algo deu errado. Tente de novo.')
    expect(mensagemDoErroAuth(null)).toBe(MENSAGENS.generico)
  })
})
