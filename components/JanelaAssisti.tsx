'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useAvisos } from '@/components/AvisosProvider'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from '@/components/estilos'
import { IconeFechar } from '@/components/Icones'
import { editarAssistido, registrarAssistido } from '@/lib/diario/acoes'
import type { RegistroAssistido } from '@/lib/diario/tipos'
import { ANOTACAO_MAXIMA } from '@/lib/diario/validacao'
import { JanelaLogin } from './JanelaLogin'

type Props = {
  filmeId: number
  registro?: RegistroAssistido
  aoFechar(): void
  aoSalvar?(): void
}

function hojeLocal(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

export function JanelaAssisti({ filmeId, registro, aoFechar, aoSalvar }: Props) {
  const [data, setData] = useState(registro?.assistidoEm ?? hojeLocal())
  const [anotacao, setAnotacao] = useState(registro?.anotacao ?? '')
  const [pendente, iniciar] = useTransition()
  const [loginAberto, setLoginAberto] = useState(false)
  const { mostrar } = useAvisos()
  const caixaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    caixaRef.current?.querySelector('input')?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  if (loginAberto) return <JanelaLogin aoFechar={aoFechar} />

  function salvar() {
    iniciar(async () => {
      const res = registro
        ? await editarAssistido(registro.id, data, anotacao || null)
        : await registrarAssistido(filmeId, data, anotacao || null)
      if (res.ok) {
        mostrar(registro ? 'Registro atualizado' : 'Marcado como assistido!')
        aoSalvar?.()
        aoFechar()
      } else if ('sessaoExpirada' in res && res.sessaoExpirada) {
        setLoginAberto(true)
      } else {
        mostrar('erro' in res ? res.erro : 'Erro ao salvar')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={aoFechar}>
      <div
        ref={caixaRef}
        role="dialog"
        aria-label={registro ? 'Editar registro' : 'Marcar como assistido'}
        className="w-full max-w-md rounded-xl bg-superficie p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{registro ? 'Editar registro' : 'Quando você assistiu?'}</h2>
          <button type="button" onClick={aoFechar} className="rounded p-1 hover:bg-white/10" aria-label="Fechar">
            <IconeFechar className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-white/70">Data</span>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            max={hojeLocal()}
            min="1895-01-01"
            className="w-full rounded-lg border border-white/20 bg-fundo px-3 py-2 text-white"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 flex items-center justify-between text-sm text-white/70">
            Anotação (opcional)
            <span className={anotacao.length > ANOTACAO_MAXIMA ? 'text-perigo' : ''}>
              {anotacao.length}/{ANOTACAO_MAXIMA}
            </span>
          </span>
          <textarea
            value={anotacao}
            onChange={(e) => setAnotacao(e.target.value)}
            maxLength={ANOTACAO_MAXIMA}
            rows={3}
            placeholder="Vi no cinema com amigos..."
            className="w-full resize-none rounded-lg border border-white/20 bg-fundo px-3 py-2 text-white placeholder:text-white/30"
          />
        </label>

        <div className="flex gap-3">
          <button type="button" onClick={salvar} disabled={pendente} className={BOTAO_PRIMARIO}>
            {pendente ? 'Salvando...' : registro ? 'Salvar' : 'Registrar'}
          </button>
          <button type="button" onClick={aoFechar} className={BOTAO_SECUNDARIO}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
