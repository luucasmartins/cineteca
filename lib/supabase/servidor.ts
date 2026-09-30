import 'server-only'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { lerConfigSupabase } from './config'

export async function criarClienteServidor(): Promise<SupabaseClient> {
  const { url, chavePublica } = lerConfigSupabase()
  const cookieStore = await cookies()
  return createServerClient(url, chavePublica, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesParaGravar) {
        try {
          for (const { name, value, options } of cookiesParaGravar) cookieStore.set(name, value, options)
        } catch {
          // Server Components não podem gravar cookies; o proxy.ts renova a sessão.
        }
      },
    },
  })
}
