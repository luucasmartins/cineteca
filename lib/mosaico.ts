export const NO_MOSAICO = 5

// Classes completas escritas por extenso: o Tailwind só gera o que encontra no código.
const GRADE: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3 md:grid-rows-2',
  4: 'md:grid-cols-3',
  5: 'md:grid-cols-4 md:grid-rows-2',
}

const PRIMEIRA: Record<number, string> = {
  1: 'md:col-span-1 md:aspect-[21/9]',
  2: 'md:col-span-1',
  3: 'md:col-span-2 md:row-span-2 md:aspect-auto',
  4: 'md:col-span-3 md:aspect-[21/9]',
  5: 'md:col-span-2 md:row-span-2 md:aspect-auto',
}

/**
 * Celular: grade de 2 colunas, a primeira imagem na largura toda e, se sobrar uma ímpar no fim,
 * ela também. Computador: um arranjo por quantidade, sempre sem buraco.
 */
export function classesMosaico(quantidade: number): { grade: string; itens: string[] } {
  const n = Math.min(Math.max(quantidade, 0), NO_MOSAICO)
  if (n === 0) return { grade: '', itens: [] }
  const ultimaSobra = (n - 1) % 2 === 1
  const itens = Array.from({ length: n }, (_, i) => {
    if (i === 0) return `aspect-video col-span-2 ${PRIMEIRA[n]}`
    if (i === n - 1 && ultimaSobra) return 'aspect-video col-span-2 md:col-span-1'
    return 'aspect-video'
  })
  return { grade: `grid grid-cols-2 gap-2 ${GRADE[n]}`, itens }
}
