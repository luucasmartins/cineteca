'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { RegistroAssistido } from '@/lib/diario/tipos'
import { ListaDiario } from './ListaDiario'

type Aba = 'registros' | 'numeros'

const ESTILO_ABA =
  'px-4 py-2 text-sm font-bold transition-colors border-b-2'
const ATIVA = 'border-destaque text-white'
const INATIVA = 'border-transparent text-white/50 hover:text-white/80'

export function AbasDiario({ abaInicial, registros }: { abaInicial: Aba; registros: RegistroAssistido[] }) {
  const [aba, setAba] = useState<Aba>(abaInicial)
  const router = useRouter()
  const searchParams = useSearchParams()

  function trocar(nova: Aba) {
    setAba(nova)
    const params = new URLSearchParams(searchParams.toString())
    if (nova === 'registros') {
      params.delete('aba')
    } else {
      params.set('aba', nova)
    }
    const qs = params.toString()
    router.replace(`/diario${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  return (
    <>
      <div className="mb-6 flex border-b border-white/10">
        <button
          type="button"
          onClick={() => trocar('registros')}
          className={`${ESTILO_ABA} ${aba === 'registros' ? ATIVA : INATIVA}`}
        >
          Registros
        </button>
        <button
          type="button"
          onClick={() => trocar('numeros')}
          className={`${ESTILO_ABA} ${aba === 'numeros' ? ATIVA : INATIVA}`}
        >
          Números
        </button>
      </div>

      {aba === 'registros' && <ListaDiario inicial={registros} />}
      {aba === 'numeros' && (
        <p className="text-white/60">Em breve: seus números e estatísticas.</p>
      )}
    </>
  )
}
