import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { lerConfigSupabase } from './config'

let cliente: SupabaseClient | null = null

export function obterClienteNavegador(): SupabaseClient {
  if (!cliente) {
    const { url, chavePublica } = lerConfigSupabase()
    cliente = createBrowserClient(url, chavePublica)
  }
  return cliente
}
