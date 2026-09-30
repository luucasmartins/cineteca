import 'server-only'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { montarUsuario, type Usuario } from './usuario'

export async function obterUsuario(): Promise<Usuario | null> {
  let supabase
  try {
    supabase = await criarClienteServidor()
  } catch {
    return null
  }
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  const { data: perfil } = await supabase.from('perfis').select('nome').eq('id', data.user.id).maybeSingle()
  return montarUsuario(data.user, (perfil?.nome as string | undefined) ?? null)
}
