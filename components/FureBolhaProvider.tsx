'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { JanelaFureBolha } from './JanelaFureBolha'

type ValorFureBolha = { abrir(): void }

const ContextoFureBolha = createContext<ValorFureBolha | null>(null)

// A janela mora aqui, e não no botão: o menu do celular desmonta ao fechar e levaria a janela junto.
export function FureBolhaProvider({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState(false)
  const fechar = useCallback(() => setAberta(false), [])
  const valor = useMemo(() => ({ abrir: () => setAberta(true) }), [])
  return (
    <ContextoFureBolha.Provider value={valor}>
      {children}
      {aberta && <JanelaFureBolha aoFechar={fechar} />}
    </ContextoFureBolha.Provider>
  )
}

export function useFureBolha(): ValorFureBolha {
  const valor = useContext(ContextoFureBolha)
  if (!valor) throw new Error('useFureBolha precisa do FureBolhaProvider')
  return valor
}
