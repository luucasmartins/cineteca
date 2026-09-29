'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CHAVE_LISTAS, criarListaLocal, obterArmazenamentoSeguro } from '@/lib/lista/local'
import type { FilmeSalvo, ListaStore, Listas, TipoLista } from '@/lib/lista/tipos'

type ValorListas = {
  carregado: boolean
  listas: Listas
  contem(tipo: TipoLista, id: number): boolean
  alternar(tipo: TipoLista, filme: FilmeSalvo): void
}

const ContextoListas = createContext<ValorListas | null>(null)

export function ListasProvider({ children }: { children: ReactNode }) {
  const lojaRef = useRef<ListaStore | null>(null)
  const [listas, setListas] = useState<Listas>({ favoritos: [], salvos: [] })
  const [carregado, setCarregado] = useState(false)

  const recarregar = useCallback(async () => {
    const loja = lojaRef.current
    if (!loja) return
    const [favoritos, salvos] = await Promise.all([loja.listar('favoritos'), loja.listar('salvos')])
    setListas({ favoritos, salvos })
    setCarregado(true)
  }, [])

  useEffect(() => {
    lojaRef.current = criarListaLocal(obterArmazenamentoSeguro())
    void recarregar()
    const aoMudarEmOutraAba = (e: StorageEvent) => {
      if (e.key === CHAVE_LISTAS) void recarregar()
    }
    window.addEventListener('storage', aoMudarEmOutraAba)
    return () => window.removeEventListener('storage', aoMudarEmOutraAba)
  }, [recarregar])

  const contem = useCallback((tipo: TipoLista, id: number) => listas[tipo].some((f) => f.id === id), [listas])

  const alternar = useCallback(
    (tipo: TipoLista, filme: FilmeSalvo) => {
      const loja = lojaRef.current
      if (!loja) return
      const jaEsta = listas[tipo].some((f) => f.id === filme.id)
      setListas((atuais) => ({
        ...atuais,
        [tipo]: jaEsta
          ? atuais[tipo].filter((f) => f.id !== filme.id)
          : [filme, ...atuais[tipo].filter((f) => f.id !== filme.id)],
      }))
      void (jaEsta ? loja.remover(tipo, filme.id) : loja.adicionar(tipo, filme))
    },
    [listas],
  )

  const valor = useMemo(() => ({ carregado, listas, contem, alternar }), [carregado, listas, contem, alternar])

  return <ContextoListas.Provider value={valor}>{children}</ContextoListas.Provider>
}

export function useListas(): ValorListas {
  const valor = useContext(ContextoListas)
  if (!valor) throw new Error('useListas precisa estar dentro de <ListasProvider>')
  return valor
}
