'use client'

import type { Decada } from '@/lib/diario/numeros'

export function GraficoDecadas({ decadas }: { decadas: Decada[] }) {
  if (decadas.length === 0) return null

  const max = Math.max(...decadas.map((d) => d.contagem), 1)

  return (
    <div className="space-y-2">
      {decadas.map((d) => {
        const largura = max > 0 ? (d.contagem / max) * 100 : 0
        return (
          <div key={d.decada} className="flex items-center gap-3" aria-label={`${d.decada}: ${d.contagem} ${d.contagem === 1 ? 'filme' : 'filmes'}`}>
            <span className="w-10 shrink-0 text-right text-sm text-white/60">{d.decada}</span>
            <div className="flex-1">
              <div
                className={`h-6 rounded ${d.campea ? 'bg-destaque' : 'bg-white/20'}`}
                style={{
                  width: `${Math.max(largura, d.contagem > 0 ? 4 : 0)}%`,
                  animation: 'crescer 0.6s ease-out',
                }}
              />
            </div>
            <span className="w-6 text-right text-sm font-bold">{d.contagem}</span>
          </div>
        )
      })}
      <style>{`
        @keyframes crescer { from { width: 0 } }
        @media (prefers-reduced-motion: reduce) {
          @keyframes crescer { from { width: unset } }
        }
      `}</style>
    </div>
  )
}
