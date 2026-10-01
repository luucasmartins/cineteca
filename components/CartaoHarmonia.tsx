'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { FilmeHarmonia } from '@/lib/tmdb/tipos'
import { FaixaPaleta } from './FaixaPaleta'
import { usePaleta } from './usePaleta'

export function CartaoHarmonia({ filme }: { filme: FilmeHarmonia }) {
  const { estado, cores } = usePaleta(filme.cenas)
  const [revelado, setRevelado] = useState(false)
  const linkRef = useRef<HTMLAnchorElement>(null)

  // O botão some ao revelar: o foco segue para o link, senão volta ao topo da página.
  useEffect(() => {
    if (revelado) linkRef.current?.focus()
  }, [revelado])

  const paleta = (
    <div className="aspect-[16/10] w-full">
      {estado === 'pronta' ? (
        <FaixaPaleta cores={cores} direcao="coluna" className="h-full w-full" />
      ) : estado === 'carregando' ? (
        <div className="h-full w-full bg-white/5 motion-safe:animate-pulse" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white/5 px-2 text-center text-sm text-white/60">
          Paleta indisponível
        </div>
      )}
    </div>
  )

  if (!revelado) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setRevelado(true)}
          aria-label={`Revelar o filme de ${filme.year ?? 'ano desconhecido'}`}
          className="block w-full overflow-hidden rounded-xl bg-superficie text-left ring-1 ring-white/10 transition-shadow hover:ring-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {paleta}
          <span className="flex items-baseline justify-between gap-2 px-4 py-3">
            <span className="font-bold tabular-nums">{filme.year ?? '—'}</span>
            <span className="text-sm text-white/60">Revelar</span>
          </span>
        </button>
      </li>
    )
  }

  return (
    <li className="overflow-hidden rounded-xl bg-superficie ring-1 ring-destaque/60">
      {paleta}
      <div className="animar-surgir flex flex-col gap-1 px-4 py-3">
        <p className="font-bold leading-snug">
          {filme.title}
          {filme.year && <span className="font-normal text-white/60"> ({filme.year})</span>}
        </p>
        <Link
          ref={linkRef}
          href={`/filme/${filme.id}`}
          className="self-start rounded text-sm font-semibold text-destaque hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Ver filme →
        </Link>
      </div>
    </li>
  )
}
