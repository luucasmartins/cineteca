import type { Resultado } from '@/lib/auth/validacao'
import type { Voto } from './tipos'

// O TMDB não tem id acima disso; recusar cedo evita consulta inútil.
const ID_MAXIMO = 100_000_000

export function validarFilmeId(bruto: unknown): Resultado<number> {
  const numero = typeof bruto === 'number' ? bruto : typeof bruto === 'string' ? Number(bruto) : Number.NaN
  const valido = Number.isInteger(numero) && numero > 0 && numero <= ID_MAXIMO
  if (!valido) return { ok: false, erro: 'Filme inválido' }
  return { ok: true, valor: numero }
}

export function validarVoto(bruto: unknown): Resultado<Voto> {
  if (bruto === true || bruto === false || bruto === null) return { ok: true, valor: bruto }
  return { ok: false, erro: 'Voto inválido' }
}
