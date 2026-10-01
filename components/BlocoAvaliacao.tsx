'use client'

import { useState, useTransition } from 'react'
import { avaliar } from '@/lib/avaliacoes/acoes'
import { textoAgregado } from '@/lib/avaliacoes/calculo'
import type { AvaliacaoDoFilme, Voto } from '@/lib/avaliacoes/tipos'
import { MENSAGEM_ERRO_VOTO } from '@/lib/avaliacoes/validacao'
import type { FilmeSalvo } from '@/lib/lista/tipos'
import { useAvisos } from './AvisosProvider'
import { BOTAO_SECUNDARIO } from './estilos'
import { IconeCurti, IconeNaoCurti } from './Icones'
import { JanelaLogin } from './JanelaLogin'
import { useUsuario } from './SessaoProvider'

const TITULO = 'Você já viu esse filme?'

export function BlocoAvaliacao({ filme, inicial }: { filme: FilmeSalvo; inicial: AvaliacaoDoFilme }) {
  const usuario = useUsuario()
  const { mostrar } = useAvisos()
  const [estado, setEstado] = useState<AvaliacaoDoFilme>(inicial)
  const [editando, setEditando] = useState(false)
  const [janela, setJanela] = useState(false)
  const [enviando, iniciar] = useTransition()

  const votar = (novo: Voto) => {
    if (!usuario) {
      setJanela(true)
      return
    }
    if (enviando) return
    const alvo = estado.meuVoto === novo ? null : novo
    iniciar(async () => {
      const resposta = await avaliar(filme.id, alvo)
      if (resposta.ok) {
        setEstado(resposta.estado)
        setEditando(false)
        return
      }
      if (resposta.sessaoExpirada) setJanela(true)
      else mostrar(resposta.erro || MENSAGEM_ERRO_VOTO)
    })
  }

  const votou = estado.meuVoto !== null
  const mostrarBotoes = !votou || editando

  return (
    <section aria-labelledby="titulo-avaliacao" className="rounded-xl bg-superficie/60 p-5 ring-1 ring-white/10">
      <h2 id="titulo-avaliacao" className="text-lg font-bold">
        {TITULO}
      </h2>

      {mostrarBotoes ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            aria-pressed={estado.meuVoto === true}
            disabled={enviando}
            onClick={() => votar(true)}
            className={`${BOTAO_SECUNDARIO} ${estado.meuVoto === true ? 'ring-2 ring-white' : ''}`}
          >
            <IconeCurti preenchido={estado.meuVoto === true} className={`h-5 w-5 ${estado.meuVoto === true ? 'text-destaque' : ''}`} /> Curti
          </button>
          <button
            type="button"
            aria-pressed={estado.meuVoto === false}
            disabled={enviando}
            onClick={() => votar(false)}
            className={`${BOTAO_SECUNDARIO} ${estado.meuVoto === false ? 'ring-2 ring-white' : ''}`}
          >
            <IconeNaoCurti preenchido={estado.meuVoto === false} className={`h-5 w-5 ${estado.meuVoto === false ? 'text-destaque' : ''}`} /> Não curti
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-1">
          <p className="font-semibold text-white">{estado.meuVoto ? 'Você curtiu.' : 'Você não curtiu.'}</p>
          {estado.agregado && <p className="text-sm text-white/70">{textoAgregado(estado.agregado)}</p>}
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-sm text-white/60 underline hover:text-white"
          >
            Mudar meu voto
          </button>
        </div>
      )}

      {janela && (
        <JanelaLogin aoFechar={() => setJanela(false)} />
      )}
    </section>
  )
}
