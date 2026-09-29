'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IconeBusca } from './Icones'

const ESPERA_MS = 400

export function CampoBusca() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const naBusca = pathname === '/busca'
  const termoDaUrl = naBusca ? (searchParams.get('q') ?? '') : ''

  const [aberto, setAberto] = useState(naBusca)
  const [texto, setTexto] = useState(termoDaUrl)
  const [pendente, setPendente] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const navegar = useCallback(
    (valor: string) => {
      setPendente(false)
      const termo = valor.trim()
      const destino = termo ? `/busca?q=${encodeURIComponent(termo)}` : '/busca'
      if (naBusca) router.replace(destino)
      else router.push(destino)
    },
    [naBusca, router],
  )

  useEffect(() => {
    if (!pendente) return
    const espera = setTimeout(() => navegar(texto), ESPERA_MS)
    return () => clearTimeout(espera)
  }, [texto, pendente, navegar])

  useEffect(() => {
    if (!naBusca) {
      setTexto('')
      setAberto(false)
      setPendente(false)
    }
  }, [naBusca])

  useEffect(() => {
    if (aberto && !naBusca) inputRef.current?.focus()
  }, [aberto, naBusca])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        navegar(texto)
      }}
      className={`flex items-center rounded-md transition-colors ${aberto ? 'border border-white/40 bg-black/70' : ''}`}
    >
      <button
        type="button"
        aria-label="Buscar"
        onClick={() => (aberto && texto ? navegar(texto) : setAberto((v) => !v))}
        className="p-2"
      >
        <IconeBusca className="h-5 w-5" />
      </button>
      {aberto && (
        <input
          ref={inputRef}
          type="search"
          aria-label="Buscar filmes"
          placeholder="Títulos de filmes"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setPendente(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !texto) setAberto(false)
          }}
          className="w-36 bg-transparent py-1.5 pr-3 text-sm text-white outline-none placeholder:text-white/50 sm:w-56"
        />
      )}
    </form>
  )
}
