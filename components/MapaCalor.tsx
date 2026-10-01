'use client'

import type { LinhaMapa } from '@/lib/diario/numeros'

const MESES_CURTOS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MESES_LONGOS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const CORES: Record<number, string> = {
  0: '#16161D',
  1: '#0a4d1f',
  2: '#0d7a2f',
  3: '#01993F',
  4: '#01BD4E',
}

const TAMANHO = 22
const GAP = 3

export function MapaCalor({ mapa }: { mapa: LinhaMapa[] }) {
  if (mapa.length === 0) return null

  const labelW = 40
  const svgW = labelW + 12 * (TAMANHO + GAP)
  const headerH = 20
  const svgH = headerH + mapa.length * (TAMANHO + GAP)

  return (
    <div className="overflow-x-auto">
      <svg width={svgW} height={svgH} role="img" aria-label="Mapa de calor de filmes por mês">
        {MESES_CURTOS.map((m, i) => (
          <text
            key={m + i}
            x={labelW + i * (TAMANHO + GAP) + TAMANHO / 2}
            y={14}
            textAnchor="middle"
            className="fill-white/50 text-[10px]"
          >
            {m}
          </text>
        ))}
        {mapa.map((linha, li) => (
          <g key={linha.ano}>
            <text
              x={labelW - 6}
              y={headerH + li * (TAMANHO + GAP) + TAMANHO / 2 + 4}
              textAnchor="end"
              className="fill-white/50 text-[10px]"
            >
              {linha.ano}
            </text>
            {linha.meses.map((cel, mi) => (
              <rect
                key={mi}
                x={labelW + mi * (TAMANHO + GAP)}
                y={headerH + li * (TAMANHO + GAP)}
                width={TAMANHO}
                height={TAMANHO}
                rx={3}
                fill={CORES[cel.nivel]}
                tabIndex={0}
                role="gridcell"
                aria-label={`${MESES_LONGOS[mi]} de ${linha.ano}: ${cel.contagem} ${cel.contagem === 1 ? 'filme' : 'filmes'}`}
              >
                <title>{`${MESES_LONGOS[mi]} de ${linha.ano}: ${cel.contagem} ${cel.contagem === 1 ? 'filme' : 'filmes'}`}</title>
              </rect>
            ))}
          </g>
        ))}
      </svg>
    </div>
  )
}
