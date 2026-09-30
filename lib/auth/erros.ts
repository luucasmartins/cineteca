export const MENSAGENS = {
  credenciais: 'E-mail ou senha incorretos',
  emailEmUso: 'Já existe uma conta com esse e-mail',
  senhaFraca: 'A senha precisa ter pelo menos 8 caracteres',
  senhaVazia: 'Digite sua senha',
  mesmaSenha: 'A nova senha precisa ser diferente da atual',
  entrarDeNovo: 'Por segurança, entre de novo antes de trocar a senha.',
  limite: 'Muitas tentativas. Espere um pouco e tente de novo.',
  conexao: 'Não foi possível conectar. Tente em instantes.',
  linkExpirado: 'Este link expirou. Peça um novo.',
  google: 'Não foi possível entrar com o Google.',
  generico: 'Algo deu errado. Tente de novo.',
} as const

const POR_CODIGO: Record<string, string> = {
  invalid_credentials: MENSAGENS.credenciais,
  user_already_exists: MENSAGENS.emailEmUso,
  email_exists: MENSAGENS.emailEmUso,
  weak_password: MENSAGENS.senhaFraca,
  over_request_rate_limit: MENSAGENS.limite,
  over_email_send_rate_limit: MENSAGENS.limite,
  same_password: MENSAGENS.mesmaSenha,
  reauthentication_needed: MENSAGENS.entrarDeNovo,
  otp_expired: MENSAGENS.linkExpirado,
  flow_state_expired: MENSAGENS.linkExpirado,
  flow_state_not_found: MENSAGENS.linkExpirado,
  bad_code_verifier: MENSAGENS.linkExpirado,
}

type ErroAuth = { code?: string; status?: number; name?: string } | null | undefined

export function mensagemDoErroAuth(erro: ErroAuth): string {
  if (!erro) return MENSAGENS.generico
  if (erro.code && POR_CODIGO[erro.code]) return POR_CODIGO[erro.code]
  if (erro.status === 429) return MENSAGENS.limite
  if (erro.name === 'AuthRetryableFetchError' || erro.status === 0 || (erro.status ?? 0) >= 500) return MENSAGENS.conexao
  return MENSAGENS.generico
}
