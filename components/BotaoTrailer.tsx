'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BOTAO_PRIMARIO } from './estilos'
import { IconeFechar, IconePlay } from './Icones'

export function BotaoTrailer({ chave, titulo }: { chave: string; titulo: string }) {
  const [aberto, setAberto] = useState(false)
  const fechar = useCallback(() => setAberto(false), [])

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={BOTAO_PRIMARIO}>
        <IconePlay /> Trailer
      </button>
      {aberto && <ModalTrailer chave={chave} titulo={titulo} aoFechar={fechar} />}
    </>
  )
}

function ModalTrailer({ chave, titulo, aoFechar }: { chave: string; titulo: string; aoFechar: () => void }) {
  const fecharRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fecharRef.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
    }
  }, [aoFechar])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer de ${titulo}`}
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
    >
      <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <button
          ref={fecharRef}
          type="button"
          aria-label="Fechar trailer"
          onClick={aoFechar}
          className="absolute -top-12 right-0 rounded-full p-2 text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <IconeFechar className="h-7 w-7" />
        </button>
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(chave)}?autoplay=1&rel=0`}
            title={`Trailer de ${titulo}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  )
}
