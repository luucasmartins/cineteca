'use client'

import { useState } from 'react'
import type { FilmeSalvo } from '@/lib/lista/tipos'
import { BOTAO_SECUNDARIO } from './estilos'
import { IconeMais } from './Icones'
import { JanelaLogin } from './JanelaLogin'
import { JanelaSessaoDupla } from './JanelaSessaoDupla'
import { useUsuario } from './SessaoProvider'

export function BotaoSessaoDupla({ filme }: { filme: FilmeSalvo }) {
  const usuario = useUsuario()
  const [janela, setJanela] = useState<'login' | 'criar' | null>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => setJanela(usuario ? 'criar' : 'login')}
        className={BOTAO_SECUNDARIO}
      >
        <IconeMais /> Sessão dupla
      </button>
      {janela === 'login' && <JanelaLogin aoFechar={() => setJanela(null)} />}
      {janela === 'criar' && <JanelaSessaoDupla filme1={filme} aoFechar={() => setJanela(null)} />}
    </>
  )
}
