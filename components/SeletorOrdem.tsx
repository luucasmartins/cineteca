import Link from 'next/link'
import { ORDENS_GENERO, type OrdemGenero } from '@/lib/tmdb/tipos'

const NOMES: Record<OrdemGenero, string> = { popularidade: 'Popularidade', nota: 'Nota', lancamento: 'Lançamento' }

export function SeletorOrdem({ caminhoBase, atual }: { caminhoBase: string; atual: OrdemGenero }) {
  return (
    <nav aria-label="Ordenar por" className="flex rounded-md bg-superficie p-1 text-sm font-semibold">
      {ORDENS_GENERO.map((ordem) => (
        <Link
          key={ordem}
          href={`${caminhoBase}?ordem=${ordem}`}
          aria-current={ordem === atual ? 'page' : undefined}
          className={`rounded px-3 py-1.5 transition-colors ${
            ordem === atual ? 'bg-white text-black' : 'text-white/70 hover:text-white'
          }`}
        >
          {NOMES[ordem]}
        </Link>
      ))}
    </nav>
  )
}
