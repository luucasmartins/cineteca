'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import type { Usuario } from '@/lib/auth/usuario'
import { obterClienteNavegador } from '@/lib/supabase/navegador'

const ContextoSessao = createContext<Usuario | null>(null)

export function SessaoProvider({ usuario, children }: { usuario: Usuario | null; children: ReactNode }) {
  const router = useRouter()
  const idAtual = usuario?.id ?? null

  // Login ou logout em outra aba: atualiza esta página.
  useEffect(() => {
    let cliente
    try {
      cliente = obterClienteNavegador()
    } catch {
      return
    }
    const { data } = cliente.auth.onAuthStateChange((evento, sessao) => {
      const novoId = sessao?.user.id ?? null
      if ((evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') && novoId !== idAtual) router.refresh()
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [idAtual, router])

  return <ContextoSessao.Provider value={usuario}>{children}</ContextoSessao.Provider>
}

export function useUsuario(): Usuario | null {
  return useContext(ContextoSessao)
}
