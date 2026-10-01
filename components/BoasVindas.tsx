'use client'

import { useEffect, useRef, useState } from 'react'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos'
import { IconeFechar } from './Icones'
import { usePrenderFoco } from './usePrenderFoco'

const CHAVE = 'cineteca:visto'

const PASSOS = [
  {
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-8 w-8 text-destaque">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
    titulo: 'Descubra filmes',
    texto: 'Catálogo completo com busca por nome e filtro por gênero. Tudo em português.',
  },
  {
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-8 w-8 text-destaque">
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.4 1 4.8 2.7 1.4-1.7 2.8-2.7 4.8-2.7 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
      </svg>
    ),
    titulo: 'Suas listas',
    texto: 'Salve favoritos e filmes para assistir. Crie sua conta grátis e leve tudo com você.',
  },
  {
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-8 w-8 text-destaque">
        <circle cx="12" cy="12" r="8" />
        <path d="M8.5 10a4 4 0 0 1 3-3" />
        <path d="M19 5l2-2M21 7h-1.5M17 3V1.5" />
      </svg>
    ),
    titulo: 'Fure a bolha',
    texto: 'Sugestões de filmes que você nunca encontraria sozinho — de países e épocas que fogem do óbvio.',
  },
  {
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-8 w-8 text-destaque">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    titulo: 'E mais',
    texto: 'Diário pessoal, sessão dupla, harmonia de cores e prêmios dos principais festivais.',
  },
]

export function BoasVindas() {
  const [visivel, setVisivel] = useState(false)
  const [passo, setPasso] = useState(0)
  const caixaRef = useRef<HTMLDivElement>(null)
  usePrenderFoco(caixaRef)

  useEffect(() => {
    try {
      if (!localStorage.getItem(CHAVE)) setVisivel(true)
    } catch {
      // modo privado ou bloqueio — não mostra
    }
  }, [])

  const fechar = () => {
    setVisivel(false)
    try {
      localStorage.setItem(CHAVE, '1')
    } catch {
      // ignora
    }
  }

  const avancar = () => {
    if (passo < PASSOS.length - 1) {
      setPasso(passo + 1)
    } else {
      fechar()
    }
  }

  useEffect(() => {
    if (!visivel) return
    caixaRef.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel])

  if (!visivel) return null

  const atual = PASSOS[passo]
  const ultimo = passo === PASSOS.length - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-boas-vindas"
      onClick={fechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        ref={caixaRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-xl bg-superficie p-6 shadow-2xl ring-1 ring-white/10 focus:outline-none"
      >
        <button
          type="button"
          aria-label="Fechar"
          onClick={fechar}
          className="absolute right-3 top-3 rounded p-1 text-white/60 hover:text-white"
        >
          <IconeFechar />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destaque/10">
            {atual.icone}
          </div>
          <h2 id="titulo-boas-vindas" className="text-xl font-extrabold">
            {atual.titulo}
          </h2>
          <p className="mt-2 text-sm text-white/70">{atual.texto}</p>
        </div>

        <div className="mt-5 flex justify-center gap-1.5" aria-label={`Passo ${passo + 1} de ${PASSOS.length}`}>
          {PASSOS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === passo ? 'w-6 bg-destaque' : 'w-1.5 bg-white/30'}`}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          {!ultimo && (
            <button type="button" onClick={fechar} className={`${BOTAO_SECUNDARIO} flex-1`}>
              Pular
            </button>
          )}
          <button type="button" onClick={avancar} className={`${BOTAO_PRIMARIO} flex-1`}>
            {ultimo ? 'Começar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
