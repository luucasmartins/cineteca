export type Usuario = { id: string; email: string; nome: string; fotoUrl: string | null; soGoogle: boolean }

type UsuarioSupabase = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
  app_metadata?: Record<string, unknown> | null
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

export function montarUsuario(u: UsuarioSupabase, nomePerfil: string | null): Usuario {
  const meta = u.user_metadata ?? {}
  const email = u.email ?? ''
  const nome =
    texto(nomePerfil) || texto(meta.nome) || texto(meta.full_name) || texto(meta.name) || email.split('@')[0] || 'Você'
  const foto = texto(meta.avatar_url) || texto(meta.picture)
  const brutos = u.app_metadata?.providers
  const provedores = Array.isArray(brutos) ? brutos.filter((p): p is string => typeof p === 'string') : []
  return {
    id: u.id,
    email,
    nome,
    fotoUrl: foto.startsWith('https://') ? foto : null,
    soGoogle: provedores.length > 0 && !provedores.includes('email'),
  }
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome
}
