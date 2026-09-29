const LIMITE_PAGINAS_TMDB = 500

export function lerIdPositivo(valor: string | null | undefined): number | null {
  if (!valor || !/^\d{1,9}$/.test(valor)) return null
  const numero = Number(valor)
  return numero > 0 ? numero : null
}

export function lerPagina(valor: string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return 1
  const numero = lerIdPositivo(valor)
  return numero !== null && numero <= LIMITE_PAGINAS_TMDB ? numero : null
}
