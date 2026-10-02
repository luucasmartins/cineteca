'use client'

import { useCallback, useState } from 'react'
import { BOTAO_PRIMARIO } from './estilos'
import { IconeMais } from './Icones'
import { JanelaMoodboard } from './JanelaMoodboard'

export function BotaoNovoMoodboard() {
  const [aberta, setAberta] = useState(false)
  const fechar = useCallback(() => setAberta(false), [])
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className={BOTAO_PRIMARIO}>
        <IconeMais className="h-5 w-5" /> Novo moodboard
      </button>
      {aberta && <JanelaMoodboard aoFechar={fechar} />}
    </>
  )
}
