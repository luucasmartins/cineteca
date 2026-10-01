'use client'

import { useRef } from 'react'
import type { MovieSummary } from '@/lib/tmdb/tipos'
import { IconeSetaDireita, IconeSetaEsquerda } from './Icones'
import { MovieCard } from './MovieCard'
import { SecaoFileira } from './SecaoFileira'
import { useRolagemAutomatica } from './useRolagemAutomatica'

type Props = { titulo: string; filmes: MovieSummary[]; verMaisHref?: string; automatico?: boolean }

const ITEM = 'w-[38%] shrink-0 snap-start sm:w-[27%] md:w-[19%] lg:w-[15.5%] xl:w-[12.5%]'

export function Carrossel({ titulo, filmes, verMaisHref, automatico = false }: Props) {
  const trilhoRef = useRef<HTMLUListElement>(null)
  const rodando = useRolagemAutomatica(trilhoRef, automatico)

  const rolar = (direcao: 1 | -1) => {
    const trilho = trilhoRef.current
    if (trilho) trilho.scrollBy({ left: direcao * trilho.clientWidth * 0.9, behavior: 'smooth' })
  }

  const seta = 'absolute inset-y-0 z-20 hidden w-12 items-center justify-center opacity-0 transition-opacity duration-200 group-hover/fileira:opacity-100 focus-visible:opacity-100 md:flex'

  return (
    <SecaoFileira titulo={titulo} verMaisHref={verMaisHref}>
      <div className="group/fileira relative">
        <button
          type="button"
          aria-label={`Voltar em ${titulo}`}
          onClick={() => rolar(-1)}
          className={`${seta} left-0 bg-gradient-to-r from-fundo to-transparent`}
        >
          <IconeSetaEsquerda className="h-8 w-8" />
        </button>
        <ul
          ref={trilhoRef}
          // Sem encaixe (snap) enquanto desliza: ele puxaria o trilho de volta a cada passo.
          className={`sem-scrollbar flex scroll-px-4 gap-2 overflow-x-auto px-4 py-4 md:scroll-px-10 md:px-10 ${rodando ? '' : 'snap-x snap-mandatory'}`}
        >
          {filmes.map((filme) => (
            <li key={filme.id} className={ITEM}>
              <MovieCard filme={filme} />
            </li>
          ))}
          {/* Cópia que fecha o loop: escondida do leitor de tela e do teclado. */}
          {rodando &&
            filmes.map((filme) => (
              <li key={`copia-${filme.id}`} className={ITEM} aria-hidden="true" inert>
                <MovieCard filme={filme} />
              </li>
            ))}
        </ul>
        <button
          type="button"
          aria-label={`Avançar em ${titulo}`}
          onClick={() => rolar(1)}
          className={`${seta} right-0 bg-gradient-to-l from-fundo to-transparent`}
        >
          <IconeSetaDireita className="h-8 w-8" />
        </button>
      </div>
    </SecaoFileira>
  )
}
