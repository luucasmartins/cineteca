export const CHAVE_SOM = 'cineteca:som'

export function lerSomDesligado(armazenamento: Pick<Storage, 'getItem'> | null): boolean {
  try {
    return armazenamento?.getItem(CHAVE_SOM) === 'desligado'
  } catch {
    return false
  }
}

export function gravarSomDesligado(
  armazenamento: Pick<Storage, 'setItem' | 'removeItem'> | null,
  desligado: boolean,
): void {
  if (!armazenamento) return
  try {
    if (desligado) armazenamento.setItem(CHAVE_SOM, 'desligado')
    else armazenamento.removeItem(CHAVE_SOM)
  } catch {
    // Sem armazenamento, a escolha vale só até recarregar a página.
  }
}
