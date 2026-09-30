export const CAMINHO_NOVA_SENHA = '/redefinir-senha'

// Para onde o Supabase manda a pessoa depois de validar o link de "Esqueci minha senha".
// Tem de ser /auth/callback: o link chega com ?code=..., e só essa rota troca o código
// por uma sessão. Sem sessão, a tela de nova senha acha que o link expirou.
export function enderecoDeRetornoDaRecuperacao(urlSite: string): string {
  return `${urlSite}/auth/callback?voltar=${encodeURIComponent(CAMINHO_NOVA_SENHA)}`
}
