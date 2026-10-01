'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Joia } from '@/lib/tmdb/tipos'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos'
import { IconeFechar } from './Icones'
import { ImagemComReserva } from './ImagemComReserva'
import { usePrenderFoco } from './usePrenderFoco'

type Estado = { tipo: 'carregando' } | { tipo: 'pronto'; joia: Joia } | { tipo: 'erro' }

export function JanelaFureBolha({ aoFechar }: { aoFechar: () => void }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const ultimaRef = useRef<number | null>(null)
  const caixaRef = useRef<HTMLDivElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  usePrenderFoco(caixaRef)

  const buscar = useCallback(async () => {
    try {
      const evitar = ultimaRef.current ? `?evitar=${ultimaRef.current}` : ''
      const resposta = await fetch(`/api/fure-a-bolha${evitar}`, { cache: 'no-store' })
      if (!resposta.ok) throw new Error(String(resposta.status))
      const joia = (await resposta.json()) as Joia
      ultimaRef.current = joia.id
      setEstado({ tipo: 'pronto', joia })
    } catch {
      setEstado({ tipo: 'erro' })
    }
  }, [])

  const sortearDeNovo = () => {
    setEstado({ tipo: 'carregando' })
    void buscar()
  }

  useEffect(() => {
    void buscar()
  }, [buscar])

  useEffect(() => {
    fecharRef.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aoFechar])

  const carregando = estado.tipo === 'carregando'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-fure-bolha"
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        ref={caixaRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-xl bg-superficie p-6 shadow-2xl ring-1 ring-white/10"
      >
        <button
          ref={fecharRef}
          type="button"
          aria-label="Fechar"
          onClick={aoFechar}
          className="absolute right-3 top-3 rounded p-1 text-white/60 hover:text-white"
        >
          <IconeFechar />
        </button>
        <h2 id="titulo-fure-bolha" className="pr-6 text-xl font-extrabold">
          Fure a bolha
        </h2>

        {estado.tipo === 'erro' ? (
          <div className="mt-6 space-y-4">
            <p className="text-white/80">Não foi possível sortear um filme agora.</p>
            <button type="button" onClick={sortearDeNovo} className={BOTAO_PRIMARIO}>
              Tentar de novo
            </button>
          </div>
        ) : (
          <>
            {estado.tipo === 'pronto' ? (
              <Sugestao joia={estado.joia} />
            ) : (
              <div aria-hidden="true" className="mt-5 flex gap-4">
                <div className="aspect-[2/3] w-28 shrink-0 rounded-md bg-white/10 motion-safe:animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-3/4 rounded bg-white/10 motion-safe:animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-white/10 motion-safe:animate-pulse" />
                  <div className="h-16 rounded bg-white/10 motion-safe:animate-pulse" />
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {estado.tipo === 'pronto' ? (
                <Link href={`/filme/${estado.joia.id}`} onClick={aoFechar} className={BOTAO_PRIMARIO}>
                  Ver filme
                </Link>
              ) : (
                <button type="button" disabled className={`${BOTAO_PRIMARIO} opacity-60`}>
                  Ver filme
                </button>
              )}
              <button type="button" onClick={sortearDeNovo} disabled={carregando} className={`${BOTAO_SECUNDARIO} disabled:opacity-60`}>
                Outra sugestão
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Sugestao({ joia }: { joia: Joia }) {
  const origem = [joia.idioma, joia.pais].filter(Boolean).join(' · ')
  return (
    <div className="mt-5 flex gap-4">
      <ImagemComReserva src={joia.posterUrl} reserva="/poster-padrao.svg" alt={`Pôster de ${joia.title}`} className="aspect-[2/3] w-28 shrink-0 rounded-md object-cover" />
      <div className="min-w-0 space-y-1">
        <h3 className="text-lg font-bold leading-tight">
          {joia.title}
          {joia.year && <span className="font-normal text-white/60"> · {joia.year}</span>}
        </h3>
        <p className="text-sm text-white/80">{origem}</p>
        {joia.rating !== null && <p className="text-sm text-white/80">★ {joia.rating.toFixed(1).replace('.', ',')}</p>}
        <p className="line-clamp-4 text-sm text-white/70">{joia.overview}</p>
      </div>
    </div>
  )
}
