'use client'

import { useState } from 'react'
import { BOTAO_SECUNDARIO } from './estilos'

export function BotaoCopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <button type="button" onClick={copiar} className={BOTAO_SECUNDARIO}>
      {copiado ? 'Copiado!' : 'Copiar link'}
    </button>
  )
}
