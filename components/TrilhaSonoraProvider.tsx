'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { obterArmazenamentoSeguro } from '@/lib/lista/local'
import { gravarSomDesligado, lerSomDesligado } from '@/lib/som/preferencia'

const VOLUME = 0.3

type ValorTrilha = {
  ligada: boolean
  alternar(): void
  pausar(): void
  retomar(): void
}

const ContextoTrilha = createContext<ValorTrilha | null>(null)

export function TrilhaSonoraProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [ligada, setLigada] = useState(true)
  const [paginaCarregada, setPaginaCarregada] = useState(false)
  // Lembra que a pausa veio do trailer, para só retomar nesse caso.
  const pausadaTemporariamente = useRef(false)
  const erroRegistrado = useRef(false)

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = VOLUME
    if (lerSomDesligado(obterArmazenamentoSeguro())) setLigada(false)
    if (document.readyState === 'complete') {
      setPaginaCarregada(true)
      return
    }
    const aoCarregar = () => setPaginaCarregada(true)
    window.addEventListener('load', aoCarregar)
    return () => window.removeEventListener('load', aoCarregar)
  }, [])

  // Os navegadores só liberam som depois de um gesto: o primeiro clique, toque ou tecla dá o play.
  useEffect(() => {
    const audio = audioRef.current
    if (!ligada || !audio) return
    const aoGesto = (e: Event) => {
      if (pausadaTemporariamente.current) return
      if (e.target instanceof Element && e.target.closest('[data-botao-som]')) return
      audio.play().catch(() => {})
    }
    const parar = () => {
      document.removeEventListener('pointerdown', aoGesto)
      document.removeEventListener('keydown', aoGesto)
      audio.removeEventListener('play', parar)
    }
    document.addEventListener('pointerdown', aoGesto)
    document.addEventListener('keydown', aoGesto)
    audio.addEventListener('play', parar)
    return parar
  }, [ligada])

  const alternar = useCallback(() => {
    const audio = audioRef.current
    const armazenamento = obterArmazenamentoSeguro()
    pausadaTemporariamente.current = false
    if (ligada) {
      audio?.pause()
      gravarSomDesligado(armazenamento, true)
      setLigada(false)
    } else {
      gravarSomDesligado(armazenamento, false)
      setLigada(true)
      audio?.play().catch(() => {})
    }
  }, [ligada])

  const pausar = useCallback(() => {
    const audio = audioRef.current
    if (audio && !audio.paused) {
      audio.pause()
      pausadaTemporariamente.current = true
    }
  }, [])

  const retomar = useCallback(() => {
    if (!pausadaTemporariamente.current) return
    pausadaTemporariamente.current = false
    audioRef.current?.play().catch(() => {})
  }, [])

  const aoErro = useCallback(() => {
    if (erroRegistrado.current) return
    erroRegistrado.current = true
    console.error('[CineTeca] Não foi possível carregar a trilha sonora')
  }, [])

  const valor = useMemo(() => ({ ligada, alternar, pausar, retomar }), [ligada, alternar, pausar, retomar])

  return (
    <ContextoTrilha.Provider value={valor}>
      {children}
      <audio
        ref={audioRef}
        data-testid="trilha-sonora"
        src="/som/trilha.mp3"
        loop
        preload={ligada && paginaCarregada ? 'auto' : 'none'}
        onError={aoErro}
      />
    </ContextoTrilha.Provider>
  )
}

export function useTrilhaSonora(): ValorTrilha {
  const valor = useContext(ContextoTrilha)
  if (!valor) throw new Error('useTrilhaSonora precisa estar dentro de <TrilhaSonoraProvider>')
  return valor
}
