'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { classesMosaico, NO_MOSAICO } from '@/lib/mosaico'
import type { ImagemFilme } from '@/lib/tmdb/tipos'
import { IconeFechar, IconeSetaDireita, IconeSetaEsquerda } from './Icones'
import { usePrenderFoco } from './usePrenderFoco'

export function GaleriaImagens({ imagens, titulo }: { imagens: ImagemFilme[]; titulo: string }) {
  const [aberta, setAberta] = useState<number | null>(null)
  const origemRef = useRef<HTMLButtonElement | null>(null)
  const { grade, itens } = classesMosaico(imagens.length)
  const escondidas = imagens.length - (NO_MOSAICO - 1)

  const abrir = (indice: number, botao: HTMLButtonElement) => {
    origemRef.current = botao
    setAberta(indice)
  }
  const fechar = useCallback(() => {
    setAberta(null)
    origemRef.current?.focus()
  }, [])

  return (
    <section aria-labelledby="imagens-titulo" className="space-y-4">
      <h2 id="imagens-titulo" className="text-xl font-bold md:text-2xl">
        Imagens
      </h2>
      <div className={grade}>
        {itens.map((classe, i) => {
          const comMais = i === NO_MOSAICO - 1 && imagens.length > NO_MOSAICO
          return (
            <button
              key={imagens[i].media}
              type="button"
              onClick={(e) => abrir(i, e.currentTarget)}
              className={`${classe} relative overflow-hidden rounded-lg bg-superficie focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
            >
              <img src={imagens[i].media} alt={`Cena ${i + 1} de ${titulo}`} loading="lazy" className="h-full w-full object-cover" />
              {comMais && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-extrabold">
                  +{escondidas}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {aberta !== null && (
        <TelaCheia imagens={imagens} titulo={titulo} indice={aberta} aoMudar={setAberta} aoFechar={fechar} />
      )}
    </section>
  )
}

type PropsTelaCheia = {
  imagens: ImagemFilme[]
  titulo: string
  indice: number
  aoMudar: (indice: number) => void
  aoFechar: () => void
}

function TelaCheia({ imagens, titulo, indice, aoMudar, aoFechar }: PropsTelaCheia) {
  const caixaRef = useRef<HTMLDivElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const toqueRef = useRef<number | null>(null)
  usePrenderFoco(caixaRef)

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
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
      else if (e.key === 'ArrowLeft') anterior()
      else if (e.key === 'ArrowRight') proxima()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aoFechar, anterior, proxima])

  const botao = 'rounded-full bg-black/60 p-2 text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

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
        <button ref={fecharRef} type="button" aria-label="Fechar" onClick={aoFechar} className={`${botao} absolute -top-12 right-0`}>
          <IconeFechar className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Imagem anterior" onClick={anterior} className={`${botao} absolute left-2 top-1/2 -translate-y-1/2`}>
          <IconeSetaEsquerda className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Próxima imagem" onClick={proxima} className={`${botao} absolute right-2 top-1/2 -translate-y-1/2`}>
          <IconeSetaDireita className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
