'use client'

import { useEffect, useRef, useState } from 'react'

// Só no computador e sem "reduzir movimento": poupa dados no celular e respeita a acessibilidade.
const CONDICAO = '(min-width: 768px) and (prefers-reduced-motion: no-preference)'
const ORIGEM_YOUTUBE = 'https://www.youtube-nocookie.com'
const TOCANDO = 1 // estado "playing" do player do YouTube

export function TrailerFundo({ chave }: { chave: string }) {
  const [ligado, setLigado] = useState(false)
  const [visivel, setVisivel] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const consulta = window.matchMedia(CONDICAO)
    setLigado(consulta.matches)
    const aoMudar = () => setLigado(consulta.matches)
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])

  // Só aparece quando o player avisa que está tocando. Assim a tela preta de carregamento
  // e o aviso de "vídeo indisponível" (dono bloqueou a incorporação) nunca ficam visíveis.
  useEffect(() => {
    if (!ligado) return
    const aoReceber = (e: MessageEvent) => {
      if (e.origin !== ORIGEM_YOUTUBE || e.source !== iframeRef.current?.contentWindow) return
      let dados: { event?: string; info?: unknown }
      try {
        dados = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
      } catch {
        return
      }
      const estado =
        dados.event === 'onStateChange' ? dados.info : (dados.info as { playerState?: number } | undefined)?.playerState
      if (estado === TOCANDO) setVisivel(true)
    }
    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [ligado])

  if (!ligado) return null

  const c = encodeURIComponent(chave)
  // loop só funciona com playlist apontando para o próprio vídeo; enablejsapi libera os avisos de estado.
  const src = `${ORIGEM_YOUTUBE}/embed/${c}?autoplay=1&mute=1&controls=0&loop=1&playlist=${c}&playsinline=1&rel=0&disablekb=1&iv_load_policy=3&enablejsapi=1`

  // Pede ao player para mandar os avisos de estado para esta página.
  const escutar = () =>
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), ORIGEM_YOUTUBE)

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000 [container-type:size] ${visivel ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Cobre a área toda em 16:9, cortando as sobras, como o object-cover da imagem. */}
      <iframe
        ref={iframeRef}
        data-testid="trailer-fundo"
        src={src}
        title=""
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        onLoad={escutar}
        className="absolute left-1/2 top-1/2 h-[max(100%,56.25cqw)] w-[max(100%,177.78cqh)] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  )
}
