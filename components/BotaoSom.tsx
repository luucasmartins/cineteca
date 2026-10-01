'use client'

import { IconeSom, IconeSomDesligado } from './Icones'
import { useTrilhaSonora } from './TrilhaSonoraProvider'

export function BotaoSom() {
  const { ligada, alternar } = useTrilhaSonora()

  return (
    <button
      type="button"
      data-botao-som
      onClick={alternar}
      aria-label={ligada ? 'Desligar trilha sonora' : 'Ligar trilha sonora'}
      title={ligada ? 'Desligar trilha sonora' : 'Ligar trilha sonora'}
      className="rounded p-2 text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {ligada ? <IconeSom className="h-5 w-5" /> : <IconeSomDesligado className="h-5 w-5" />}
    </button>
  )
}
