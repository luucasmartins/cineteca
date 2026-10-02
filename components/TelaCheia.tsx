'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { ImagemFilme } from '@/lib/tmdb/tipos'
import { IconeFechar, IconeSetaDireita, IconeSetaEsquerda } from './Icones'
import { usePrenderFoco } from './usePrenderFoco'

export const BOTAO_TELA_CHEIA =
  'rounded-full bg-black/60 p-2 text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

type Props = {
  imagens: ImagemFilme[]
  titulo: string
  indice: number
  aoMudar: (indice: number) => void
  aoFechar: () => void
  /** Outra janela está por cima: teclado e trava de foco ficam com ela. */
  pausada?: boolean
  acoes?: ReactNode
}

export function TelaCheia({ imagens, titulo, indice, aoMudar, aoFechar, pausada = false, acoes }: Props) {
  const caixaRef = useRef<HTMLDivElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const toqueRef = useRef<number | null>(null)
  usePrenderFoco(caixaRef, !pausada)

  const total = imagens.length
  const anterior = useCallback(() => aoMudar((indice - 1 + total) % total), [aoMudar, indice, total])
  const proxima = useCallback(() => aoMudar((indice + 1) % total), [aoMudar, indice, total])

  useEffect(() => {
    fecharRef.current?.focus()
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowAnterior
    }
  }, [])

  useEffect(() => {
    if (pausada) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
      else if (e.key === 'ArrowLeft') anterior()
      else if (e.key === 'ArrowRight') proxima()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [pausada, aoFechar, anterior, proxima])

  return (
    <div
      ref={caixaRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Imagens de ${titulo}`}
      onClick={aoFechar}
      onTouchStart={(e) => {
        toqueRef.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (toqueRef.current === null) return
        const deslocamento = e.changedTouches[0].clientX - toqueRef.current
        toqueRef.current = null
        if (deslocamento > 50) anterior()
        else if (deslocamento < -50) proxima()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
    >
      <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <img src={imagens[indice].grande} alt={`Cena ${indice + 1} de ${titulo}`} className="max-h-[80vh] w-full rounded-lg object-contain" />
        <p className="mt-3 text-center text-sm text-white/70">
          {indice + 1} de {total}
        </p>
        <div className="fixed right-4 top-4 z-10 flex gap-2">
          {acoes}
          <button ref={fecharRef} type="button" aria-label="Fechar" onClick={aoFechar} className={BOTAO_TELA_CHEIA}>
            <IconeFechar className="h-6 w-6" />
          </button>
        </div>
        <button type="button" aria-label="Imagem anterior" onClick={anterior} className={`${BOTAO_TELA_CHEIA} absolute left-2 top-1/2 -translate-y-1/2`}>
          <IconeSetaEsquerda className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Próxima imagem" onClick={proxima} className={`${BOTAO_TELA_CHEIA} absolute right-2 top-1/2 -translate-y-1/2`}>
          <IconeSetaDireita className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
