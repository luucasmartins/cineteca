'use client'

import { useState } from 'react'
import { BOTAO_SECUNDARIO } from '@/components/estilos'
import type { ResumoAssistido } from '@/lib/diario/tipos'
import { JanelaAssisti } from './JanelaAssisti'
import { JanelaLogin } from './JanelaLogin'
import { useUsuario } from './SessaoProvider'

function formatarData(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function BotaoAssisti({ filmeId, resumo }: { filmeId: number; resumo: ResumoAssistido | null }) {
  const usuario = useUsuario()
  const [aberto, setAberto] = useState(false)
  const [loginAberto, setLoginAberto] = useState(false)

  function clicar() {
    if (!usuario) {
      setLoginAberto(true)
    } else {
      setAberto(true)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button type="button" onClick={clicar} className={BOTAO_SECUNDARIO}>
          Assisti
        </button>
        {resumo && (
          <span className="text-sm text-white/60">
            Você viu {resumo.vezes} {resumo.vezes === 1 ? 'vez' : 'vezes'} · última em {formatarData(resumo.ultimaData)}
          </span>
        )}
      </div>
      {aberto && <JanelaAssisti filmeId={filmeId} aoFechar={() => setAberto(false)} />}
      {loginAberto && <JanelaLogin aoFechar={() => setLoginAberto(false)} />}
    </>
  )
}
