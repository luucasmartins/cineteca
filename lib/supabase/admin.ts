import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { lerChaveSecreta, lerConfigSupabase } from './config'

// Ignora as regras de RLS: use só para excluir contas.
export function criarClienteAdmin(): SupabaseClient {
  const { url } = lerConfigSupabase()
  return createClient(url, lerChaveSecreta(), { auth: { persistSession: false, autoRefreshToken: false } })
}
