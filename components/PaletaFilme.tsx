'use client'

import { FaixaPaleta } from './FaixaPaleta'
import { usePaleta } from './usePaleta'

const FAIXA = 'h-7 w-full max-w-[360px] rounded-md'

export function PaletaFilme({ cenas }: { cenas: string[] }) {
  const { estado, cores } = usePaleta(cenas)

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-white/70">Paleta de cores</h3>
      {estado === 'carregando' ? (
        <div className={`${FAIXA} bg-white/5 motion-safe:animate-pulse`} />
      ) : estado === 'indisponivel' ? (
        <p className="text-sm text-white/60">Paleta indisponível</p>
      ) : (
        <>
          <FaixaPaleta cores={cores} direcao="linha" className={`${FAIXA} overflow-hidden`} />
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {cores.map((cor) => (
              <li key={cor.hex} className="flex items-center gap-2 text-sm tabular-nums text-white/60">
                <span aria-hidden="true" className="h-4 w-4 rounded-full ring-1 ring-white/15" style={{ backgroundColor: cor.hex }} />
                {cor.hex.toUpperCase()}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
