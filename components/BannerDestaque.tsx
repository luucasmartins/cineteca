'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FocusEvent } from 'react'
import { paraFilmeSalvo } from '@/lib/lista/tipos'
import type { MovieSummary } from '@/lib/tmdb/tipos'
import { BotaoLista } from './BotaoLista'
import { BOTAO_PRIMARIO, CONTEUDO } from './estilos'
import { IconeInfo } from './Icones'

const INTERVALO_MS = 3000
const DISTANCIA_MINIMA_DESLIZE = 50

export function BannerDestaque({ filmes }: { filmes: MovieSummary[] }) {
  const [atual, setAtual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [reduzirMovimento, setReduzirMovimento] = useState(false)
  const toqueInicialX = useRef<number | null>(null)
  const total = filmes.length

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduzirMovimento(consulta.matches)
    const aoMudar = (e: MediaQueryListEvent) => setReduzirMovimento(e.matches)
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])

  // O temporizador recomeça a cada troca, inclusive nas manuais.
  useEffect(() => {
    if (pausado || reduzirMovimento || total < 2) return
    const espera = setTimeout(() => setAtual((i) => (i + 1) % total), INTERVALO_MS)
    return () => clearTimeout(espera)
  }, [atual, pausado, reduzirMovimento, total])

  const irPara = (indice: number) => setAtual(((indice % total) + total) % total)

  const aoSairDoFoco = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPausado(false)
  }

  const filme = filmes[atual]

  return (
    <section
      aria-label="Destaque"
      aria-roledescription="carrossel"
      className="relative h-[68vh] min-h-[420px] w-full md:h-[85vh]"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={aoSairDoFoco}
      onTouchStart={(e) => {
        toqueInicialX.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const inicio = toqueInicialX.current
        const fim = e.changedTouches[0]?.clientX
        toqueInicialX.current = null
        if (inicio === null || fim === undefined) return
        const distancia = fim - inicio
        if (Math.abs(distancia) >= DISTANCIA_MINIMA_DESLIZE) irPara(atual + (distancia < 0 ? 1 : -1))
      }}
    >
      {filmes.map((f, i) => (
        <img
          key={f.id}
          src={f.backdropUrl ?? undefined}
          alt=""
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${
            i === atual ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-fundo via-fundo/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-fundo via-transparent to-transparent" />
      <div className={`${CONTEUDO} relative flex h-full flex-col justify-end pb-32 md:pb-48`}>
        <div key={filme.id} className="animar-surgir max-w-xl space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight drop-shadow md:text-6xl">{filme.title}</h1>
          <p className="line-clamp-3 text-sm text-white/85 md:text-lg">{filme.overview}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/filme/${filme.id}`} className={BOTAO_PRIMARIO}>
              <IconeInfo /> Ver detalhes
            </Link>
            <BotaoLista
              tipo="salvos"
              filme={paraFilmeSalvo(filme)}
              comTexto
              textos={{ inativo: 'Minha lista', ativo: 'Na minha lista' }}
            />
          </div>
        </div>
        {total > 1 && (
          <div role="group" aria-label="Escolher filme em destaque" className="mt-6 flex gap-2">
            {filmes.map((f, i) => (
              <button
                key={f.id}
                type="button"
                aria-label={`Mostrar ${f.title}`}
                aria-current={i === atual}
                onClick={() => irPara(i)}
                className="group/indicador flex h-6 items-center focus-visible:outline-none"
              >
                <span
                  className={`block h-1 rounded-full transition-all duration-300 group-focus-visible/indicador:ring-2 group-focus-visible/indicador:ring-white ${
                    i === atual ? 'w-10 bg-white' : 'w-6 bg-white/35 group-hover/indicador:bg-white/70'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
