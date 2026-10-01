'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useAvisos } from '@/components/AvisosProvider'
import { BOTAO_SECUNDARIO } from '@/components/estilos'
import { ImagemComReserva } from '@/components/ImagemComReserva'
import { apagarSessaoDupla } from '@/lib/sessao-dupla/acoes'
import type { SessaoDupla } from '@/lib/sessao-dupla/tipos'

export function GradeSessoes({ inicial }: { inicial: SessaoDupla[] }) {
  const [sessoes, setSessoes] = useState(inicial)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()
  const { mostrar } = useAvisos()
  const router = useRouter()

  function apagar(id: string) {
    iniciar(async () => {
      const res = await apagarSessaoDupla(id)
      if (res.ok) {
        setSessoes((prev) => prev.filter((s) => s.id !== id))
        setConfirmando(null)
        router.refresh()
      } else {
        mostrar(res.erro)
      }
    })
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {sessoes.map((s) => (
        <div key={s.id} className="rounded-xl bg-superficie p-4">
          <Link href={`/sessao/${s.id}`} className="group block">
            <div className="flex items-center gap-3">
              <ImagemComReserva
                src={s.filme1.posterUrl}
                reserva="/poster-padrao.svg"
                alt={s.filme1.titulo}
                className="h-24 w-16 shrink-0 rounded object-cover"
              />
              <span className="text-lg font-bold text-destaque">+</span>
              <ImagemComReserva
                src={s.filme2.posterUrl}
                reserva="/poster-padrao.svg"
                alt={s.filme2.titulo}
                className="h-24 w-16 shrink-0 rounded object-cover"
              />
            </div>
            <h2 className="mt-3 font-bold group-hover:text-destaque">{s.titulo}</h2>
            <p className="text-xs text-white/50">
              {s.filme1.titulo} + {s.filme2.titulo}
            </p>
          </Link>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-white/40">
              {new Date(s.criadoEm).toLocaleDateString('pt-BR')}
            </p>
            {confirmando === s.id ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => apagar(s.id)}
                  disabled={pendente}
                  className="rounded bg-perigo px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(null)}
                  className="rounded bg-white/10 px-3 py-1 text-xs"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(s.id)}
                className={`${BOTAO_SECUNDARIO} !px-3 !py-1 !text-xs`}
              >
                Excluir
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
