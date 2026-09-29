'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { BOTAO_SECUNDARIO } from './estilos'

type Props = { texto?: string; aoTentar?: () => void }

export function MensagemErro({ texto = 'Não foi possível carregar', aoTentar }: Props) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()

  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md bg-superficie p-6 text-white/80 sm:flex-row sm:items-center">
      <p>{texto}</p>
      <button
        type="button"
        disabled={pendente}
        onClick={() => (aoTentar ? aoTentar() : iniciar(() => router.refresh()))}
        className={BOTAO_SECUNDARIO}
      >
        {pendente ? 'Tentando…' : 'Tentar novamente'}
      </button>
    </div>
  )
}
