'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

const DURACAO_MS = 3000

// Avisos que chegam por redirecionamento do servidor (?aviso=...).
const AVISOS_DA_URL: Record<string, string> = {
  'senha-alterada': 'Senha alterada',
  'conta-excluida': 'Sua conta foi excluída',
}

type ValorAvisos = { mostrar(texto: string): void }
type Aviso = { id: number; texto: string }

const ContextoAvisos = createContext<ValorAvisos | null>(null)

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const proximoId = useRef(0)

  const mostrar = useCallback((texto: string) => {
    proximoId.current += 1
    const id = proximoId.current
    setAvisos((atuais) => [...atuais.slice(-2), { id, texto }])
    setTimeout(() => {
      setAvisos((atuais) => atuais.filter((a) => a.id !== id))
    }, DURACAO_MS)
  }, [])

  const valor = useMemo(() => ({ mostrar }), [mostrar])

  return (
    <ContextoAvisos.Provider value={valor}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
      >
        {avisos.map((a) => (
          <p key={a.id} className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-xl">
            {a.texto}
          </p>
        ))}
      </div>
      <Suspense fallback={null}>
        <AvisoDaUrl mostrar={mostrar} />
      </Suspense>
    </ContextoAvisos.Provider>
  )
}

function AvisoDaUrl({ mostrar }: { mostrar(texto: string): void }) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const codigo = params.get('aviso')

  useEffect(() => {
    if (!codigo) return
    const texto = AVISOS_DA_URL[codigo]
    if (texto) mostrar(texto)
    const resto = new URLSearchParams(params.toString())
    resto.delete('aviso')
    const consulta = resto.toString()
    router.replace(consulta ? `${pathname}?${consulta}` : pathname, { scroll: false })
  }, [codigo, mostrar, params, pathname, router])

  return null
}

export function useAvisos(): ValorAvisos {
  const valor = useContext(ContextoAvisos)
  if (!valor) throw new Error('useAvisos precisa estar dentro de <AvisosProvider>')
  return valor
}
