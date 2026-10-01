'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import type { FilmeSalvo } from '@/lib/lista/tipos'
import { criarSessaoDupla } from '@/lib/sessao-dupla/acoes'
import { TITULO_MAXIMO } from '@/lib/sessao-dupla/validacao'
import type { MovieSummary } from '@/lib/tmdb/tipos'
import { useAvisos } from './AvisosProvider'
import { BOTAO_PRIMARIO } from './estilos'
import { IconeFechar } from './Icones'
import { ImagemComReserva } from './ImagemComReserva'
import { JanelaLogin } from './JanelaLogin'

type Props = { filme1: FilmeSalvo; aoFechar(): void }

type ResultadoBusca = { id: number; title: string; posterUrl: string | null; year: string | null }

export function JanelaSessaoDupla({ filme1, aoFechar }: Props) {
  const router = useRouter()
  const { mostrar } = useAvisos()
  const primeiroRef = useRef<HTMLInputElement>(null)

  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [filme2, setFilme2] = useState<ResultadoBusca | null>(null)
  const [titulo, setTitulo] = useState('')
  const [erro, setErro] = useState('')
  const [janelaLogin, setJanelaLogin] = useState(false)
  const [enviando, iniciar] = useTransition()

  // Debounced search
  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([])
      return
    }
    const timer = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/filmes?tipo=busca&q=${encodeURIComponent(termo.trim())}&pagina=1`)
        if (res.ok) {
          const dados = await res.json()
          setResultados(
            (dados.results as MovieSummary[])
              .filter((f) => f.id !== filme1.id)
              .slice(0, 8)
              .map((f) => ({ id: f.id, title: f.title, posterUrl: f.posterUrl, year: f.year })),
          )
        }
      } catch {
        // silencioso: a pessoa pode tentar de novo
      } finally {
        setBuscando(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [termo, filme1.id])

  useEffect(() => {
    primeiroRef.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  const criar = useCallback(() => {
    if (!filme2 || enviando) return
    setErro('')
    iniciar(async () => {
      const resposta = await criarSessaoDupla(titulo, filme1.id, filme2.id)
      if (resposta.ok) {
        router.push(`/sessao/${resposta.sessao.id}`)
        aoFechar()
        return
      }
      if (resposta.sessaoExpirada) setJanelaLogin(true)
      else setErro(resposta.erro)
    })
  }, [filme2, titulo, filme1.id, enviando, router, aoFechar])

  if (janelaLogin) return <JanelaLogin aoFechar={() => { setJanelaLogin(false); aoFechar() }} />

  const miniatura = (f: { title: string; posterUrl: string | null; year: string | null }) => (
    <div className="flex items-center gap-3">
      <ImagemComReserva
        src={f.posterUrl}
        reserva="/poster-padrao.svg"
        alt=""
        className="h-16 w-11 shrink-0 rounded object-cover"
      />
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{f.title}</p>
        {f.year && <p className="text-xs text-white/60">{f.year}</p>}
      </div>
    </div>
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-janela-sessao"
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-xl bg-superficie p-6 shadow-2xl ring-1 ring-white/10"
      >
        <button
          type="button"
          aria-label="Fechar"
          onClick={aoFechar}
          className="absolute right-3 top-3 rounded p-1 text-white/60 hover:text-white"
        >
          <IconeFechar />
        </button>
        <h2 id="titulo-janela-sessao" className="pr-6 text-xl font-extrabold">
          Criar sessão dupla
        </h2>

        <div className="mt-4 space-y-4">
          {/* Filme 1 — fixo */}
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/50">Filme 1</p>
            {miniatura(filme1)}
          </div>

          {/* Filme 2 — busca */}
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/50">Filme 2</p>
            {filme2 ? (
              <div className="flex items-center gap-2">
                {miniatura(filme2)}
                <button
                  type="button"
                  onClick={() => { setFilme2(null); setTermo('') }}
                  className="ml-auto shrink-0 rounded p-1 text-white/60 hover:text-white"
                  aria-label="Trocar filme"
                >
                  <IconeFechar className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={primeiroRef}
                  type="text"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Buscar filme..."
                  className="w-full rounded-md bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none ring-1 ring-white/20 focus:ring-white/50"
                />
                {buscando && <p className="mt-1 text-xs text-white/50">Buscando…</p>}
                {resultados.length > 0 && (
                  <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-md bg-superficie ring-1 ring-white/10">
                    {resultados.map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => { setFilme2(f); setResultados([]); setTermo('') }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/10"
                        >
                          <ImagemComReserva
                            src={f.posterUrl}
                            reserva="/poster-padrao.svg"
                            alt=""
                            className="h-12 w-8 shrink-0 rounded object-cover"
                          />
                          <span className="truncate text-sm text-white">{f.title}</span>
                          {f.year && <span className="ml-auto shrink-0 text-xs text-white/50">{f.year}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Título */}
          <div>
            <label htmlFor="titulo-sessao" className="mb-1 block text-xs font-bold uppercase tracking-widest text-white/50">
              Título da sessão
            </label>
            <input
              id="titulo-sessao"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={TITULO_MAXIMO}
              placeholder="Ex.: Solidão Cyberpunk"
              className="w-full rounded-md bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none ring-1 ring-white/20 focus:ring-white/50"
            />
            <p className="mt-1 text-right text-xs text-white/40">{titulo.length}/{TITULO_MAXIMO}</p>
          </div>

          {erro && <p className="text-sm font-semibold text-perigo">{erro}</p>}

          <button
            type="button"
            disabled={!filme2 || !titulo.trim() || enviando}
            onClick={criar}
            className={BOTAO_PRIMARIO + ' w-full'}
          >
            {enviando ? 'Criando…' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}
