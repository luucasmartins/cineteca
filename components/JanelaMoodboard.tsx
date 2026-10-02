'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { adicionarCenaAction, criarMoodboardAction, listarMeusMoodboardsAction } from '@/lib/moodboard/acoes'
import type { ResumoMoodboard } from '@/lib/moodboard/tipos'
import { CamposMoodboard } from './CamposMoodboard'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos'
import { IconeFechar } from './Icones'
import { MensagemErro } from './MensagemErro'
import { usePrenderFoco } from './usePrenderFoco'

type Cena = { filmeId: number; caminho: string }
type Props = { cena?: Cena; aoFechar(): void }
type Lista = { estado: 'carregando' } | { estado: 'erro' } | { estado: 'pronta'; moodboards: ResumoMoodboard[] }

export function JanelaMoodboard({ cena, aoFechar }: Props) {
  const router = useRouter()
  const caixaRef = useRef<HTMLDivElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const [lista, setLista] = useState<Lista>({ estado: 'carregando' })
  const [criando, setCriando] = useState(!cena)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')
  const [salvaEm, setSalvaEm] = useState<{ id: string; titulo: string } | null>(null)
  const [pendente, iniciar] = useTransition()
  const comCena = cena !== undefined
  usePrenderFoco(caixaRef)

  const carregar = useCallback(() => {
    setLista({ estado: 'carregando' })
    listarMeusMoodboardsAction().then(
      (r) => setLista(r.ok ? { estado: 'pronta', moodboards: r.moodboards } : { estado: 'erro' }),
      () => setLista({ estado: 'erro' }),
    )
  }, [])

  useEffect(() => {
    if (comCena) carregar()
  }, [comCena, carregar])

  useEffect(() => {
    if (!caixaRef.current?.contains(document.activeElement)) fecharRef.current?.focus()
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowAnterior
    }
  }, [])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aoFechar])

  function salvarEm(m: ResumoMoodboard) {
    if (!cena) return
    setErro('')
    iniciar(async () => {
      const r = await adicionarCenaAction(m.id, cena.filmeId, cena.caminho)
      if (r.ok) setSalvaEm({ id: m.id, titulo: m.titulo })
      else setErro(r.erro)
    })
  }

  function criar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    iniciar(async () => {
      const r = await criarMoodboardAction(titulo, descricao, cena)
      if (!r.ok) {
        setErro(r.erro)
        return
      }
      if (cena) setSalvaEm({ id: r.id, titulo: titulo.trim() })
      else router.push(`/moodboard/${r.id}`)
    })
  }

  const rotulo = cena ? 'Salvar no moodboard' : 'Novo moodboard'

  return (
    <div onClick={aoFechar} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-janela-moodboard"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-xl bg-superficie p-6 shadow-2xl ring-1 ring-white/10"
      >
        <button
          ref={fecharRef}
          type="button"
          aria-label="Fechar"
          onClick={aoFechar}
          className="absolute right-3 top-3 rounded p-1 text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <IconeFechar />
        </button>
        <h2 id="titulo-janela-moodboard" className="pr-6 text-xl font-extrabold">
          {rotulo}
        </h2>

        {salvaEm ? (
          <div role="status" className="mt-4 space-y-4">
            <p>Cena salva em &ldquo;{salvaEm.titulo}&rdquo;.</p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/moodboard/${salvaEm.id}`} className={BOTAO_PRIMARIO}>
                Ver moodboard
              </Link>
              <button type="button" onClick={aoFechar} className={BOTAO_SECUNDARIO}>
                Voltar às imagens
              </button>
            </div>
          </div>
        ) : criando ? (
          <form onSubmit={criar} className="mt-4 space-y-4">
            <CamposMoodboard
              prefixo="novo-moodboard"
              titulo={titulo}
              descricao={descricao}
              aoMudarTitulo={setTitulo}
              aoMudarDescricao={setDescricao}
              focarTitulo
            />
            <div className="flex gap-3">
              {cena && (
                <button type="button" onClick={() => setCriando(false)} disabled={pendente} className={BOTAO_SECUNDARIO}>
                  Voltar
                </button>
              )}
              <button type="submit" disabled={pendente || !titulo.trim()} className={`${BOTAO_PRIMARIO} flex-1`}>
                {pendente ? 'Salvando…' : cena ? 'Criar e salvar' : 'Criar'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4">
            {lista.estado === 'carregando' && <p className="py-2 text-sm text-white/60">Carregando…</p>}
            {lista.estado === 'erro' && <MensagemErro texto="Não foi possível carregar seus moodboards" aoTentar={carregar} />}
            {lista.estado === 'pronta' &&
              (lista.moodboards.length === 0 ? (
                <p className="py-2 text-sm text-white/60">Você ainda não tem moodboards.</p>
              ) : (
                <ul className="max-h-64 space-y-1 overflow-y-auto">
                  {lista.moodboards.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={pendente}
                        onClick={() => salvarEm(m)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
                      >
                        {m.capas[0] ? (
                          <img src={m.capas[0]} alt="" className="h-9 w-16 shrink-0 rounded object-cover" />
                        ) : (
                          <span className="h-9 w-16 shrink-0 rounded bg-white/10" />
                        )}
                        <span>
                          <span className="block text-sm font-semibold">{m.titulo}</span>
                          <span className="block text-xs text-white/50">
                            {m.quantidadeCenas} {m.quantidadeCenas === 1 ? 'cena' : 'cenas'}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ))}
            <button
              type="button"
              onClick={() => {
                setErro('')
                setCriando(true)
              }}
              className={`${BOTAO_SECUNDARIO} mt-4 w-full`}
            >
              Criar novo moodboard
            </button>
          </div>
        )}

        {erro && <p className="mt-4 text-sm text-perigo">{erro}</p>}
      </div>
    </div>
  )
}
