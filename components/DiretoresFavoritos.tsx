'use client'

import { useState } from 'react'
import type { DiretorFavorito } from '@/lib/diario/numeros'
import { ImagemComReserva } from './ImagemComReserva'

export function DiretoresFavoritos({ diretores }: { diretores: DiretorFavorito[] }) {
  const [expandido, setExpandido] = useState<number | null>(null)

  if (diretores.length === 0) return null

  return (
    <div className="space-y-3">
      {diretores.map((d, i) => (
        <div key={d.id}>
          <button
            type="button"
            onClick={() => setExpandido(expandido === d.id ? null : d.id)}
            aria-expanded={expandido === d.id}
            className="flex w-full items-center gap-3 rounded-lg bg-superficie p-3 text-left transition-colors hover:bg-superficie/80"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/60">
              {i + 1}
            </span>
            <ImagemComReserva
              src={d.fotoUrl}
              reserva="/pessoa-padrao.svg"
              alt={d.nome}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{d.nome}</p>
              <p className="text-xs text-white/50">{d.filmes} {d.filmes === 1 ? 'filme' : 'filmes'}</p>
            </div>
          </button>
          {expandido === d.id && (
            <ul className="ml-[5.5rem] mt-1 space-y-1 text-sm text-white/70">
              {d.titulos.map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
