'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { resumoContagem } from '@/lib/premios/montar'
import type { PremioFilme } from '@/lib/premios/tipos'

const BLOCO = 'rounded-lg bg-superficie px-4 py-3 text-left ring-1'

export function PlacarPremios({ premios }: { premios: PremioFilme[] }) {
  const [ativo, setAtivo] = useState(0)
  const abas = useRef<(HTMLButtonElement | null)[]>([])
  const premio = premios[ativo]
  const unico = premios.length === 1

  function aoTeclar(evento: KeyboardEvent, i: number) {
    if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return
    evento.preventDefault()
    const proximo = (i + (evento.key === 'ArrowRight' ? 1 : premios.length - 1)) % premios.length
    setAtivo(proximo)
    abas.current[proximo]?.focus()
  }

  const lista = (
    <ul className="divide-y divide-white/10">
      {premio.vitorias.map((v) => (
        <li key={`v-${v.categoria}`} className="flex items-baseline gap-4 py-2.5">
          <span className="w-20 shrink-0 text-sm font-bold text-destaque">Venceu</span>
          <span className="min-w-0">
            {v.categoria}
            {v.quem && <span className="text-white/60"> — {v.quem}</span>}
          </span>
        </li>
      ))}
      {premio.indicacoes.map((nome) => (
        <li key={`i-${nome}`} className="flex items-baseline gap-4 py-2.5 text-white/60">
          <span className="w-20 shrink-0 text-sm">Indicado</span>
          <span className="min-w-0">{nome}</span>
        </li>
      ))}
    </ul>
  )

  return (
    <section aria-labelledby="premios-titulo" className="space-y-5">
      <h2 id="premios-titulo" className="text-xl font-bold md:text-2xl">
        Prêmios
      </h2>

      {unico ? (
        <>
          <div className={`${BLOCO} inline-block ring-white/10`}>
            <p className="font-bold">{premio.nome}</p>
            <p className="text-sm text-white/60">{resumoContagem(premio)}</p>
          </div>
          {lista}
        </>
      ) : (
        <>
          <div role="tablist" aria-label="Prêmios" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {premios.map((p, i) => (
              <button
                key={p.chave}
                ref={(el) => {
                  abas.current[i] = el
                }}
                type="button"
                role="tab"
                id={`aba-premio-${p.chave}`}
                aria-selected={i === ativo}
                aria-controls="painel-premios"
                tabIndex={i === ativo ? 0 : -1}
                onClick={() => setAtivo(i)}
                onKeyDown={(evento) => aoTeclar(evento, i)}
                className={`${BLOCO} transition-colors sm:min-w-40 ${i === ativo ? 'ring-destaque' : 'ring-transparent hover:ring-white/20'}`}
              >
                <span className="block font-bold">{p.nome}</span>
                <span className="block text-sm text-white/60">{resumoContagem(p)}</span>
              </button>
            ))}
          </div>
          <div role="tabpanel" id="painel-premios" aria-labelledby={`aba-premio-${premio.chave}`}>
            {lista}
          </div>
        </>
      )}
    </section>
  )
}
