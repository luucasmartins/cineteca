'use client'

import { useFureBolha } from './FureBolhaProvider'
import { IconeBolha } from './Icones'

type Props = { className: string; aoClicar?: () => void; rotulo?: string }

export function BotaoFureBolha({ className, aoClicar, rotulo = 'Fure a bolha' }: Props) {
  const { abrir } = useFureBolha()
  return (
    <button
      type="button"
      onClick={() => {
        aoClicar?.()
        abrir()
      }}
      className={className}
    >
      <IconeBolha className="h-5 w-5" /> {rotulo}
    </button>
  )
}
