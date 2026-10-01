'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useAvisos } from '@/components/AvisosProvider'
import { ImagemComReserva } from '@/components/ImagemComReserva'
import { apagarAssistido } from '@/lib/diario/acoes'
import type { RegistroAssistido } from '@/lib/diario/tipos'
import { JanelaAssisti } from './JanelaAssisti'

type Grupo = { mes: string; registros: RegistroAssistido[] }

function agruparPorMes(registros: RegistroAssistido[]): Grupo[] {
  const mapa = new Map<string, RegistroAssistido[]>()
  for (const r of registros) {
    const d = new Date(r.assistidoEm + 'T12:00:00')
    const chave = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const lista = mapa.get(chave) ?? []
    lista.push(r)
    mapa.set(chave, lista)
  }
  return [...mapa.entries()].map(([mes, registros]) => ({ mes, registros }))
}

export function ListaDiario({ inicial }: { inicial: RegistroAssistido[] }) {
  const [registros, setRegistros] = useState(inicial)
  const [editando, setEditando] = useState<RegistroAssistido | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()
  const { mostrar } = useAvisos()
  const router = useRouter()

  const grupos = agruparPorMes(registros)

  function apagar(id: string) {
    iniciar(async () => {
      const res = await apagarAssistido(id)
      if (res.ok) {
        setRegistros((prev) => prev.filter((r) => r.id !== id))
        setConfirmando(null)
        router.refresh()
      } else {
        mostrar(res.erro)
      }
    })
  }

  return (
    <>
      {grupos.length === 0 && (
        <p className="text-white/60">Nenhum filme registrado ainda. Acesse a página de um filme e clique em "Assisti".</p>
      )}
      {grupos.map((g) => (
        <div key={g.mes} className="mb-8">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/50">{g.mes}</h3>
          <div className="space-y-3">
            {g.registros.map((r) => (
              <div key={r.id} className="flex gap-3 rounded-lg bg-superficie p-3">
                <Link href={`/filme/${r.filmeId}`} className="shrink-0">
                  <ImagemComReserva
                    src={r.posterUrl}
                    reserva="/poster-padrao.svg"
                    alt={r.titulo}
                    className="h-20 w-14 rounded object-cover"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/filme/${r.filmeId}`} className="font-bold hover:text-destaque">
                    {r.titulo}
                  </Link>
                  {r.ano && <span className="ml-2 text-xs text-white/50">({r.ano})</span>}
                  <p className="text-xs text-white/50">
                    {new Date(r.assistidoEm + 'T12:00:00').toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  {r.anotacao && <p className="mt-1 line-clamp-2 text-sm text-white/70">{r.anotacao}</p>}
                  {r.diretores.length > 0 && (
                    <p className="mt-1 text-xs text-white/40">
                      {r.diretores.map((d) => d.nome).join(', ')}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditando(r)}
                      className="text-xs text-destaque hover:underline"
                    >
                      Editar
                    </button>
                    {confirmando === r.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => apagar(r.id)}
                          disabled={pendente}
                          className="text-xs text-perigo hover:underline disabled:opacity-50"
                        >
                          Confirmar exclusão
                        </button>
                        <button type="button" onClick={() => setConfirmando(null)} className="text-xs text-white/50">
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmando(r.id)}
                        className="text-xs text-white/50 hover:text-perigo"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {editando && (
        <JanelaAssisti
          filmeId={editando.filmeId}
          registro={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => router.refresh()}
        />
      )}
    </>
  )
}
