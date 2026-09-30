// Os valores padrão usam process.env.NOME literal: o Next só embute no navegador
// as variáveis NEXT_PUBLIC_ acessadas assim.
export function lerConfigSupabase(
  valores: { url?: string; chavePublica?: string } = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    chavePublica: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
): { url: string; chavePublica: string } {
  const url = valores.url?.trim() ?? ''
  const chavePublica = valores.chavePublica?.trim() ?? ''
  const faltando = [
    url ? null : 'NEXT_PUBLIC_SUPABASE_URL',
    chavePublica ? null : 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ].filter(Boolean)
  if (faltando.length > 0) {
    throw new Error(`[CineTeca] Supabase não configurado: defina ${faltando.join(' e ')}.`)
  }
  return { url, chavePublica }
}

export function lerChaveSecreta(valor: string | undefined = process.env.SUPABASE_SECRET_KEY): string {
  const chave = valor?.trim() ?? ''
  if (!chave) throw new Error('[CineTeca] Supabase não configurado: defina SUPABASE_SECRET_KEY.')
  return chave
}

export function lerUrlSite(valor: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  const url = valor?.trim().replace(/\/+$/, '') ?? ''
  return url || 'http://localhost:3000'
}
