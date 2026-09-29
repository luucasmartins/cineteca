'use client'

import Link from 'next/link'
import { useState } from 'react'
import { TIPOS_LISTA, type TipoLista } from '@/lib/lista/tipos'
import { GradeEsqueleto } from './Esqueletos'
import { BOTAO_PRIMARIO } from './estilos'
import { GradeFilmes } from './GradeFilmes'
import { useListas } from './ListasProvider'

const NOMES: Record<TipoLista, string> = { favoritos: 'Favoritos', salvos: 'Salvos para assistir' }
const VAZIO: Record<TipoLista, string> = {
  favoritos: 'Sua lista de favoritos está vazia.',
  salvos: 'Você ainda não salvou nenhum filme para assistir.',
}

export function MinhaLista() {
  const { carregado, listas } = useListas()
  const [aba, setAba] = useState<TipoLista>('favoritos')
  const filmes = listas[aba]

  return (
    <>
      <div role="tablist" aria-label="Listas" className="mb-8 flex gap-2 border-b border-white/10">
        {TIPOS_LISTA.map((tipo) => (
          <button
            key={tipo}
            type="button"
            role="tab"
            id={`aba-${tipo}`}
            aria-selected={aba === tipo}
            aria-controls="painel-lista"
            onClick={() => setAba(tipo)}
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-bold transition-colors md:text-base ${
              aba === tipo ? 'border-destaque text-white' : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            {NOMES[tipo]} ({listas[tipo].length})
          </button>
        ))}
      </div>

      <div role="tabpanel" id="painel-lista" aria-labelledby={`aba-${aba}`}>
        {!carregado ? (
          <GradeEsqueleto quantidade={6} />
        ) : filmes.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-10">
            <p className="text-lg text-white/70">{VAZIO[aba]}</p>
            <Link href="/" className={BOTAO_PRIMARIO}>
              Explorar filmes
            </Link>
          </div>
        ) : (
          <GradeFilmes filmes={filmes} />
        )}
      </div>
    </>
  )
}
