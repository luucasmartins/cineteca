'use client'

import { useFureBolha } from './FureBolhaProvider'
import { IconeBolha } from './Icones'

export function BotaoFureBolha({ className, aoClicar }: { className: string; aoClicar?: () => void }) {
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
      <IconeBolha className="h-5 w-5" /> Fure a bolha
    </button>
  )
}
