'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FilmeHarmonia } from '@/lib/tmdb/tipos'
import { CartaoHarmonia } from './CartaoHarmonia'
import { BOTAO_SECUNDARIO } from './estilos'

const QUANTIDADE = 12
const GRADE = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6'

export function GradeHarmonia() {
  const [estado, setEstado] = useState<'carregando' | 'pronta' | 'erro'>('carregando')
  const [filmes, setFilmes] = useState<FilmeHarmonia[]>([])
  const [rodada, setRodada] = useState(0)
  const pedido = useRef(0)

  const sortear = useCallback(async () => {
    // Uma resposta atrasada de um pedido antigo não sobrescreve a do mais novo.
    const meu = ++pedido.current
    setEstado('carregando')
    try {
      const resposta = await fetch('/api/harmonia', { cache: 'no-store' })
      if (!resposta.ok) throw new Error(`status ${resposta.status}`)
      const dados = (await resposta.json()) as { filmes: FilmeHarmonia[] }
      if (meu !== pedido.current) return
      setFilmes(dados.filmes)
      setRodada(meu)
      setEstado('pronta')
    } catch (erro: unknown) {
      if (meu !== pedido.current) return
      console.error('[CineTeca] Falha ao sortear as paletas -', erro instanceof Error ? erro.message : 'desconhecido')
      setEstado('erro')
    }
  }, [])

  useEffect(() => {
    void sortear()
  }, [sortear])

  if (estado === 'erro') {
    return (
      <div className="flex flex-col items-start gap-4 py-10">
        <p className="text-lg text-white/70">Não foi possível carregar as paletas.</p>
        <button type="button" onClick={() => void sortear()} className={BOTAO_SECUNDARIO}>
          Tentar de novo
        </button>
      </div>
    )
  }

  return (
    <>
      <ul className={GRADE}>
        {estado === 'carregando'
          ? Array.from({ length: QUANTIDADE }, (_, i) => (
              <li key={i} aria-hidden="true" className="overflow-hidden rounded-xl bg-superficie">
                <div className="aspect-[16/10] bg-white/5 motion-safe:animate-pulse" />
                <div className="h-12" />
              </li>
            ))
          : filmes.map((filme) => <CartaoHarmonia key={`${rodada}-${filme.id}`} filme={filme} />)}
      </ul>
      <div className="mt-10 flex justify-center">
        <button type="button" onClick={() => void sortear()} disabled={estado === 'carregando'} className={BOTAO_SECUNDARIO}>
          Outras paletas
        </button>
      </div>
    </>
  )
}
