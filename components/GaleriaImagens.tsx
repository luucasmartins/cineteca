'use client'

import { useCallback, useRef, useState } from 'react'
import { classesMosaico, NO_MOSAICO } from '@/lib/mosaico'
import type { ImagemFilme } from '@/lib/tmdb/tipos'
import { PaletaFilme } from './PaletaFilme'
import { TelaCheia } from './TelaCheia'

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
      <PaletaFilme cenas={imagens.slice(0, 3).map((imagem) => imagem.pequena)} />
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
