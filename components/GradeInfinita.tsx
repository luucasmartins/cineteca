'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { mesclarSemDuplicados } from '@/lib/mesclar'
import type { MovieSummary, PaginaFilmes } from '@/lib/tmdb/tipos'
import { GradeEsqueleto } from './Esqueletos'
import { GradeFilmes } from './GradeFilmes'
import { MensagemErro } from './MensagemErro'

type Estado = 'ocioso' | 'carregando' | 'erro'

export function GradeInfinita({ inicial, endpoint }: { inicial: PaginaFilmes; endpoint: string }) {
  const [filmes, setFilmes] = useState<MovieSummary[]>(() => mesclarSemDuplicados([], inicial.results))
  const [pagina, setPagina] = useState(inicial.page)
  const [estado, setEstado] = useState<Estado>('ocioso')
  const sentinelaRef = useRef<HTMLDivElement>(null)
  const temMais = pagina < inicial.totalPages

  const carregarMais = useCallback(async () => {
    if (estado !== 'ocioso' || !temMais) return
    setEstado('carregando')
    try {
      const resposta = await fetch(`${endpoint}&pagina=${pagina + 1}`)
      if (!resposta.ok) throw new Error(`status ${resposta.status}`)
      const dados = (await resposta.json()) as PaginaFilmes
      setFilmes((atuais) => mesclarSemDuplicados(atuais, dados.results))
      setPagina(pagina + 1)
      setEstado('ocioso')
    } catch {
      setEstado('erro')
    }
  }, [endpoint, estado, pagina, temMais])

  useEffect(() => {
    const sentinela = sentinelaRef.current
    if (!sentinela || estado !== 'ocioso' || !temMais) return
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) void carregarMais()
      },
      { rootMargin: '600px' },
    )
    observador.observe(sentinela)
    return () => observador.disconnect()
  }, [carregarMais, estado, temMais])

  return (
    <div className="space-y-5">
      <GradeFilmes filmes={filmes} />
      <div ref={sentinelaRef} aria-hidden className="h-px" />
      {estado === 'carregando' && <GradeEsqueleto quantidade={6} />}
      {estado === 'erro' && <MensagemErro aoTentar={() => setEstado('ocioso')} />}
    </div>
  )
}
