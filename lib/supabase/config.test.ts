import { describe, expect, it } from 'vitest'
import { lerChaveSecreta, lerConfigSupabase, lerUrlSite } from './config'

describe('lerConfigSupabase', () => {
  it('lê os valores e remove espaços', () => {
    expect(lerConfigSupabase({ url: ' https://abc.supabase.co ', chavePublica: ' sb_publishable_x ' })).toEqual({
      url: 'https://abc.supabase.co',
      chavePublica: 'sb_publishable_x',
    })
  })

  it('explica quais variáveis faltam', () => {
    expect(() => lerConfigSupabase({ url: '', chavePublica: 'x' })).toThrow('NEXT_PUBLIC_SUPABASE_URL')
    expect(() => lerConfigSupabase({ url: 'https://abc.supabase.co', chavePublica: undefined })).toThrow(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    )
  })
})

describe('lerChaveSecreta', () => {
  it('lê a chave e remove espaços', () => {
    expect(lerChaveSecreta(' sb_secret_y ')).toBe('sb_secret_y')
  })

  it('explica quando falta', () => {
    expect(() => lerChaveSecreta(undefined)).toThrow('SUPABASE_SECRET_KEY')
  })
})

describe('lerUrlSite', () => {
  it('usa localhost:3000 quando não definido', () => {
    expect(lerUrlSite(undefined)).toBe('http://localhost:3000')
  })

  it('remove barras no fim', () => {
    expect(lerUrlSite('https://cineteca-gules.vercel.app/ ')).toBe('https://cineteca-gules.vercel.app')
  })
})
