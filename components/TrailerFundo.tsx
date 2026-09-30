'use client'

import { useEffect, useState } from 'react'

// Só no computador e sem "reduzir movimento": poupa dados no celular e respeita a acessibilidade.
const CONDICAO = '(min-width: 768px) and (prefers-reduced-motion: no-preference)'
// Espera o player começar a tocar antes de aparecer, para não mostrar a tela preta de carregamento.
const ATRASO_MS = 1500

export function TrailerFundo({ chave }: { chave: string }) {
  const [ligado, setLigado] = useState(false)
  const [carregado, setCarregado] = useState(false)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const consulta = window.matchMedia(CONDICAO)
    setLigado(consulta.matches)
    const aoMudar = () => setLigado(consulta.matches)
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])

  useEffect(() => {
    if (!carregado) return
    const espera = setTimeout(() => setVisivel(true), ATRASO_MS)
    return () => clearTimeout(espera)
  }, [carregado])

  if (!ligado) return null

  const c = encodeURIComponent(chave)
  // loop só funciona com playlist apontando para o próprio vídeo.
  const src = `https://www.youtube-nocookie.com/embed/${c}?autoplay=1&mute=1&controls=0&loop=1&playlist=${c}&playsinline=1&rel=0&disablekb=1&iv_load_policy=3`

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000 [container-type:size] ${visivel ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Cobre a área toda em 16:9, cortando as sobras, como o object-cover da imagem. */}
      <iframe
        data-testid="trailer-fundo"
        src={src}
        title=""
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        onLoad={() => setCarregado(true)}
        className="absolute left-1/2 top-1/2 h-[max(100%,56.25cqw)] w-[max(100%,177.78cqh)] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  )
}
