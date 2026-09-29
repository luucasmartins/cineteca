'use client'

import Link from 'next/link'
import { paraFilmeSalvo, type FilmeSalvo } from '@/lib/lista/tipos'
import { BotaoLista } from './BotaoLista'
import { ImagemComReserva } from './ImagemComReserva'

export type CartaoFilme = FilmeSalvo & { genres?: string[] }

export function MovieCard({ filme }: { filme: CartaoFilme }) {
  const salvo = paraFilmeSalvo(filme)
  const detalhes = [filme.year, filme.rating !== null ? `★ ${filme.rating.toFixed(1)}` : null].filter(Boolean).join(' · ')

  return (
    <article
      data-testid="movie-card"
      className="group/cartao relative w-full transition-transform duration-200 hover:z-10 hover:scale-105 focus-within:z-10"
    >
      <Link
        href={`/filme/${filme.id}`}
        className="block overflow-hidden rounded-md bg-superficie focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ImagemComReserva src={filme.posterUrl} reserva="/poster-padrao.svg" alt="" className="aspect-[2/3] w-full object-cover" />
        <span className="sr-only">{filme.title}</span>
      </Link>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 rounded-b-md bg-gradient-to-t from-black via-black/90 to-transparent p-3 pt-12 opacity-0 transition duration-200 group-hover/cartao:translate-y-0 group-hover/cartao:opacity-100 group-focus-within/cartao:translate-y-0 group-focus-within/cartao:opacity-100">
        <p className="line-clamp-2 text-sm font-bold">{filme.title}</p>
        {detalhes && <p className="mt-1 text-xs text-white/70">{detalhes}</p>}
        {filme.genres && filme.genres.length > 0 && (
          <p className="mt-0.5 line-clamp-1 text-xs text-white/60">{filme.genres.slice(0, 3).join(' · ')}</p>
        )}
        <div className="pointer-events-none mt-2 flex gap-2 group-hover/cartao:pointer-events-auto group-focus-within/cartao:pointer-events-auto">
          <BotaoLista tipo="favoritos" filme={salvo} />
          <BotaoLista tipo="salvos" filme={salvo} />
        </div>
      </div>
    </article>
  )
}
