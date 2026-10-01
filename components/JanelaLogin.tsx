'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { caminhoDeRetorno } from '@/lib/auth/validacao'
import { guardarAcaoPendente, obterArmazenamentoDaSessao } from '@/lib/lista/acao-pendente'
import type { FilmeSalvo, TipoLista } from '@/lib/lista/tipos'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos'
import { IconeFechar } from './Icones'

// Sem pendente, a janela só leva ao login: nada é refeito depois de entrar.
type Props = { pendente?: { tipo: TipoLista; filme: FilmeSalvo }; aoFechar(): void }

export function JanelaLogin({ pendente, aoFechar }: Props) {
  const primeiroRef = useRef<HTMLAnchorElement>(null)
  const [voltar, setVoltar] = useState('/')

  useEffect(() => {
    setVoltar(caminhoDeRetorno(window.location.pathname + window.location.search))
    primeiroRef.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aoFechar])

  const guardar = () => {
    if (pendente) guardarAcaoPendente(obterArmazenamentoDaSessao(), { ...pendente, voltar })
    aoFechar()
  }
  const consulta = `?voltar=${encodeURIComponent(voltar)}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-janela-login"
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-xl bg-superficie p-6 shadow-2xl ring-1 ring-white/10"
      >
        <button
          type="button"
          aria-label="Fechar"
          onClick={aoFechar}
          className="absolute right-3 top-3 rounded p-1 text-white/60 hover:text-white"
        >
          <IconeFechar />
        </button>
        <h2 id="titulo-janela-login" className="pr-6 text-xl font-extrabold">
          Entre para salvar seus filmes
        </h2>
        <p className="mt-2 text-sm text-white/70">
          Crie sua conta grátis para guardar seus favoritos e os filmes que quer assistir.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link ref={primeiroRef} href={`/entrar${consulta}`} onClick={guardar} className={BOTAO_PRIMARIO}>
            Entrar
          </Link>
          <Link href={`/cadastro${consulta}`} onClick={guardar} className={BOTAO_SECUNDARIO}>
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  )
}
