'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { JanelaFureBolha } from './JanelaFureBolha'

type ValorFureBolha = { abrir(): void }

const ContextoFureBolha = createContext<ValorFureBolha | null>(null)

// A janela mora aqui, e não no botão: o menu do celular desmonta ao fechar e levaria a janela junto.
export function FureBolhaProvider({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState(false)
  const origemRef = useRef<HTMLElement | null>(null)

  // Ao fechar, o foco volta para quem abriu; se ele sumiu (menu do celular), fica onde o navegador puser.
  const fechar = useCallback(() => {
    setAberta(false)
    if (origemRef.current?.isConnected) origemRef.current.focus()
  }, [])
  const valor = useMemo(
    () => ({
      abrir: () => {
        origemRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        setAberta(true)
      },
    }),
    [],
  )
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
