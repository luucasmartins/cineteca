export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }

export const SENHA_MINIMA = 8
export const SENHA_MAXIMA = 72
export const NOME_MAXIMO = 80

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PAGINAS_DE_ACESSO = ['/entrar', '/cadastro']

export function validarEmail(bruto: unknown): Resultado<string> {
  const email = typeof bruto === 'string' ? bruto.trim().toLowerCase() : ''
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, erro: 'Digite um e-mail válido' }
  return { ok: true, valor: email }
}

export function validarSenha(bruto: unknown): Resultado<string> {
  const senha = typeof bruto === 'string' ? bruto : ''
  if (senha.length < SENHA_MINIMA) return { ok: false, erro: 'A senha precisa ter pelo menos 8 caracteres' }
  if (senha.length > SENHA_MAXIMA) return { ok: false, erro: 'A senha pode ter no máximo 72 caracteres' }
  return { ok: true, valor: senha }
}

export function validarConfirmacao(senha: string, confirmacao: unknown): Resultado<string> {
  if (confirmacao !== senha) return { ok: false, erro: 'As senhas não são iguais' }
  return { ok: true, valor: senha }
}

export function validarNome(bruto: unknown): Resultado<string> {
  const nome = typeof bruto === 'string' ? bruto.trim().replace(/\s+/g, ' ') : ''
  if (!nome) return { ok: false, erro: 'Digite seu nome' }
  if (nome.length > NOME_MAXIMO) return { ok: false, erro: 'O nome pode ter no máximo 80 caracteres' }
  return { ok: true, valor: nome }
}

// Para onde levar a pessoa depois do login: só caminhos deste site.
export function caminhoDeRetorno(bruto: unknown): string {
  if (typeof bruto !== 'string') return '/'
  const valor = bruto.trim()
  const invalido =
    !valor.startsWith('/') ||
    valor.startsWith('//') ||
    valor.includes('\\') ||
    valor.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(valor)
  if (invalido) return '/'
  const caminho = valor.split(/[?#]/)[0]
  if (PAGINAS_DE_ACESSO.some((p) => caminho === p || caminho.startsWith(`${p}/`))) return '/'
  return valor
}
