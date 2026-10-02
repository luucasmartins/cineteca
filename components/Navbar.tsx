'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { sair } from '@/lib/auth/acoes'
import type { Usuario } from '@/lib/auth/usuario'
import type { Genero } from '@/lib/tmdb/tipos'
import { BotaoFureBolha } from './BotaoFureBolha'
import { BotaoSom } from './BotaoSom'
import { CampoBusca } from './CampoBusca'
import { CONTEUDO } from './estilos'
import { IconeChevronBaixo, IconeDiario, IconeFechar, IconeMenu } from './Icones'
import { MenuUsuario } from './MenuUsuario'

export function Navbar({ generos, usuario }: { generos: Genero[]; usuario: Usuario | null }) {
  const pathname = usePathname()
  const [rolou, setRolou] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [generosAberto, setGenerosAberto] = useState(false)
  const generosRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 16)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  useEffect(() => {
    setMenuAberto(false)
    setGenerosAberto(false)
  }, [pathname])

  useEffect(() => {
    if (!generosAberto) return
    const aoClicarFora = (e: MouseEvent) => {
      if (!generosRef.current?.contains(e.target as Node)) setGenerosAberto(false)
    }
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGenerosAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [generosAberto])

  const solida = rolou || menuAberto
  const fecharMenu = () => setMenuAberto(false)

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-200 ${
        solida ? 'bg-fundo/95 shadow-lg shadow-black/40 backdrop-blur' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <nav aria-label="Principal">
        <div className={`${CONTEUDO} flex h-16 items-center gap-6`}>
          <Link href="/" className="shrink-0">
            <span className="relative block">
              <img src="/logo.png" alt="CineTeca" className="logo-c h-6 w-auto md:h-7" />
              <img src="/logo.png" alt="" className="logo-resto absolute inset-0 h-full w-full" />
            </span>
          </Link>

          <ul className="hidden items-center gap-6 text-sm font-semibold md:flex">
            <li>
              <LinkNav href="/" ativo={pathname === '/'}>
                Início
              </LinkNav>
            </li>
            {generos.length > 0 && (
              <li ref={generosRef} className="relative">
                <button
                  type="button"
                  aria-expanded={generosAberto}
                  aria-controls="menu-generos"
                  onClick={() => setGenerosAberto((v) => !v)}
                  className="flex items-center gap-1 text-white/80 transition-colors hover:text-white"
                >
                  Gêneros <IconeChevronBaixo className="h-4 w-4" />
                </button>
                {generosAberto && (
                  <ul
                    id="menu-generos"
                    className="absolute left-0 top-full mt-3 grid w-[28rem] grid-cols-2 gap-1 rounded-md bg-superficie/95 p-3 shadow-xl ring-1 ring-white/10 backdrop-blur"
                  >
                    {generos.map((g) => (
                      <li key={g.id}>
                        <Link
                          href={`/genero/${g.id}`}
                          className="block rounded px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white"
                        >
                          {g.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}
            <li>
              <LinkNav href="/minha-lista" ativo={pathname === '/minha-lista'}>
                Minha lista
              </LinkNav>
            </li>
            <li>
              <LinkNav href="/mais-curtidos" ativo={pathname === '/mais-curtidos'}>
                Mais curtidos
              </LinkNav>
            </li>
            <li>
              <LinkNav href="/harmonia" ativo={pathname === '/harmonia'}>
                Harmonia de cores
              </LinkNav>
            </li>
            <li>
              <BotaoFureBolha className="flex items-center gap-1.5 text-white/80 transition-colors hover:text-white" />
            </li>
            {usuario && (
              <>
                <li>
                  <LinkNav href="/moodboards" ativo={pathname === '/moodboards'}>
                    Moodboards
                  </LinkNav>
                </li>
                <li>
                  <LinkNav href="/diario" ativo={pathname === '/diario'}>
                    <IconeDiario className="inline h-4 w-4" /> Meu diário
                  </LinkNav>
                </li>
              </>
            )}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            <Suspense fallback={null}>
              <CampoBusca />
            </Suspense>
            <BotaoSom />
            <MenuUsuario usuario={usuario} />
            <button
              type="button"
              className="rounded p-2 md:hidden"
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuAberto}
              aria-controls="menu-celular"
              onClick={() => setMenuAberto((v) => !v)}
            >
              {menuAberto ? <IconeFechar className="h-6 w-6" /> : <IconeMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuAberto && (
          <div id="menu-celular" className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-white/10 bg-fundo px-4 pb-6 md:hidden">
            <ul className="flex flex-col py-2 text-lg font-semibold">
              <li>
                <Link href="/" onClick={fecharMenu} className="block py-3">
                  Início
                </Link>
              </li>
              <li>
                <Link href="/minha-lista" onClick={fecharMenu} className="block py-3">
                  Minha lista
                </Link>
              </li>
              <li>
                <Link href="/mais-curtidos" onClick={fecharMenu} className="block py-3">
                  Mais curtidos
                </Link>
              </li>
              <li>
                <Link href="/harmonia" onClick={fecharMenu} className="block py-3">
                  Harmonia de cores
                </Link>
              </li>
              <li>
                <BotaoFureBolha className="flex w-full items-center gap-2 py-3 text-left" aoClicar={fecharMenu} />
              </li>
              {usuario ? (
                <>
                  <li>
                    <Link href="/sessoes" onClick={fecharMenu} className="block py-3">
                      Sessões duplas
                    </Link>
                  </li>
                  <li>
                    <Link href="/moodboards" onClick={fecharMenu} className="block py-3">
                      Moodboards
                    </Link>
                  </li>
                  <li>
                    <Link href="/diario" onClick={fecharMenu} className="flex items-center gap-1.5 py-3">
                      <IconeDiario className="h-4 w-4" /> Meu diário
                    </Link>
                  </li>
                  <li>
                    <Link href="/conta" onClick={fecharMenu} className="block py-3">
                      Minha conta
                    </Link>
                  </li>
                  <li>
                    <form action={sair}>
                      <button type="submit" className="block w-full py-3 text-left">
                        Sair
                      </button>
                    </form>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      href={`/entrar?voltar=${encodeURIComponent(pathname || '/')}`}
                      onClick={fecharMenu}
                      className="block py-3"
                    >
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/cadastro?voltar=${encodeURIComponent(pathname || '/')}`}
                      onClick={fecharMenu}
                      className="block py-3 text-destaque"
                    >
                      Criar conta
                    </Link>
                  </li>
                </>
              )}
            </ul>
            {generos.length > 0 && (
              <>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/50">Gêneros</p>
                <ul className="mt-2 grid grid-cols-2 gap-1">
                  {generos.map((g) => (
                    <li key={g.id}>
                      <Link href={`/genero/${g.id}`} onClick={fecharMenu} className="block rounded py-2 text-white/80">
                        {g.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}

function LinkNav({ href, ativo, children }: { href: string; ativo: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? 'page' : undefined}
      className={`transition-colors hover:text-white ${ativo ? 'text-white' : 'text-white/80'}`}
    >
      {children}
    </Link>
  )
}
