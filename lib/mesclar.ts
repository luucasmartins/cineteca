export function mesclarSemDuplicados<T extends { id: number }>(atuais: T[], novos: T[]): T[] {
  const vistos = new Set(atuais.map((item) => item.id))
  const resultado = [...atuais]
  for (const item of novos) {
    if (vistos.has(item.id)) continue
    vistos.add(item.id)
    resultado.push(item)
  }
  return resultado
}
