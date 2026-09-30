'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { sair } from '@/lib/auth/acoes'
import { primeiroNome, type Usuario } from '@/lib/auth/usuario'

const ITEM = 'block w-full rounded px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white'

export function MenuUsuario({ usuario }: { usuario: Usuario | null }) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const caixaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setAberto(false)
  }, [pathname])

  useEffect(() => {
    if (!aberto) return
    const aoClicarFora = (e: MouseEvent) => {
      if (!caixaRef.current?.contains(e.target as Node)) setAberto(false)
    }
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  if (!usuario) {
    // No celular, "Entrar" e "Criar conta" ficam no menu recolhível.
    const voltar = encodeURIComponent(pathname || '/')
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Link
          href={`/entrar?voltar=${voltar}`}
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Entrar
        </Link>
        <Link
          href={`/cadastro?voltar=${voltar}`}
          className="rounded-md bg-destaque px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-destaque-escuro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Criar conta
        </Link>
      </div>
    )
  }

  const nome = primeiroNome(usuario.nome)
  return (
    <div ref={caixaRef} className="relative">
      <button
        type="button"
        aria-label="Menu da conta"
        aria-expanded={aberto}
        aria-controls="menu-conta"
        onClick={() => setAberto((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/15 text-sm font-bold transition hover:ring-2 hover:ring-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {usuario.fotoUrl ? (
          <img src={usuario.fotoUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          nome.charAt(0).toUpperCase()
        )}
      </button>
      {aberto && (
        <div
          id="menu-conta"
          className="absolute right-0 top-full mt-3 w-56 rounded-md bg-superficie/95 p-2 shadow-xl ring-1 ring-white/10 backdrop-blur"
        >
          <p className="truncate px-3 py-2 text-sm font-semibold text-white">Olá, {nome}</p>
          <Link href="/minha-lista" className={ITEM}>
            Minha lista
          </Link>
          <Link href="/conta" className={ITEM}>
            Minha conta
          </Link>
          <form action={sair}>
            <button type="submit" className={ITEM}>
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
