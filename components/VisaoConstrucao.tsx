'use client'

import { useEffect, useRef, useState } from 'react'
import { iniciais } from '@/lib/formatar'
import type { MembroEquipe } from '@/lib/tmdb/tipos'

export function VisaoConstrucao({ equipe }: { equipe: MembroEquipe[] }) {
  return (
    <section aria-labelledby="visao-titulo" className="space-y-5 rounded-xl bg-superficie p-5 ring-1 ring-white/10 md:p-6">
      <div>
        <h2 id="visao-titulo" className="text-xl font-bold md:text-2xl">
          Visão &amp; Construção
        </h2>
        <p className="mt-1 text-sm text-white/60">Quem fez o filme por trás das câmeras</p>
      </div>
      <ul className="sem-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 md:-mx-6 md:px-6">
        {equipe.map((pessoa) => (
          <li key={pessoa.id} className="w-28 shrink-0 text-center md:w-32">
            <FotoOuIniciais nome={pessoa.name} src={pessoa.profileUrl} />
            <p className="mt-2 line-clamp-2 text-sm font-semibold">{pessoa.name}</p>
            <p className="line-clamp-2 text-xs text-white/60">{pessoa.funcoes.join(' · ')}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

const CIRCULO = 'mx-auto aspect-square w-20 rounded-full bg-white/5 ring-1 ring-white/10 md:w-24'

function FotoOuIniciais({ nome, src }: { nome: string; src: string | null }) {
  const [falhou, setFalhou] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Uma foto que falhou antes da hidratação não dispara o onError: confere na montagem.
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) setFalhou(true)
  }, [])

  if (!src || falhou) {
    return (
      <div aria-hidden="true" className={`${CIRCULO} flex items-center justify-center text-xl font-extrabold text-white/60`}>
        {iniciais(nome)}
      </div>
    )
  }
  // alt vazio: o nome já está escrito logo abaixo. Sem loading="lazy": imagem adiada também tem
  // naturalWidth 0, e a conferência acima a confundiria com uma foto quebrada. São no máximo 12.
  return <img ref={imgRef} src={src} alt="" onError={() => setFalhou(true)} className={`${CIRCULO} object-cover`} />
}
