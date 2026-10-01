'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { calcularNumeros } from '@/lib/diario/numeros'
import type { RegistroAssistido } from '@/lib/diario/tipos'
import { DiretoresFavoritos } from './DiretoresFavoritos'
import { GraficoDecadas } from './GraficoDecadas'
import { ListaDiario } from './ListaDiario'
import { MapaCalor } from './MapaCalor'

type Aba = 'registros' | 'numeros'

const ESTILO_ABA =
  'px-4 py-2 text-sm font-bold transition-colors border-b-2'
const ATIVA = 'border-destaque text-white'
const INATIVA = 'border-transparent text-white/50 hover:text-white/80'

function hojeLocal(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

export function AbasDiario({ abaInicial, registros }: { abaInicial: Aba; registros: RegistroAssistido[] }) {
  const [aba, setAba] = useState<Aba>(abaInicial)
  const router = useRouter()
  const searchParams = useSearchParams()

  const numeros = useMemo(() => calcularNumeros(registros, hojeLocal()), [registros])

  function trocar(nova: Aba) {
    setAba(nova)
    const params = new URLSearchParams(searchParams.toString())
    if (nova === 'registros') {
      params.delete('aba')
    } else {
      params.set('aba', nova)
    }
    const qs = params.toString()
    router.replace(`/diario${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  return (
    <>
      <div className="mb-6 flex border-b border-white/10">
        <button
          type="button"
          onClick={() => trocar('registros')}
          className={`${ESTILO_ABA} ${aba === 'registros' ? ATIVA : INATIVA}`}
        >
          Registros
        </button>
        <button
          type="button"
          onClick={() => trocar('numeros')}
          className={`${ESTILO_ABA} ${aba === 'numeros' ? ATIVA : INATIVA}`}
        >
          Números
        </button>
      </div>

      {aba === 'registros' && <ListaDiario inicial={registros} />}
      {aba === 'numeros' && (
        registros.length === 0 ? (
          <p className="text-white/60">Nenhum filme registrado ainda. Marque um filme como assistido para ver seus números.</p>
        ) : (
          <div className="space-y-10">
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-3xl font-extrabold">{numeros.topo.sessoes}</p>
                <p className="text-sm text-white/50">sessões</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold">{numeros.topo.filmes}</p>
                <p className="text-sm text-white/50">filmes</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold">{numeros.topo.esteAno}</p>
                <p className="text-sm text-white/50">este ano</p>
              </div>
            </div>
            <p className="sr-only">
              Você assistiu a {numeros.topo.sessoes} sessões de {numeros.topo.filmes} filmes diferentes, sendo {numeros.topo.esteAno} este ano.
            </p>

            {numeros.mapa.length > 0 && (
              <section>
                <h3 className="mb-4 text-lg font-bold">Mapa de calor</h3>
                <MapaCalor mapa={numeros.mapa} />
              </section>
            )}

            {numeros.decadas.length > 0 && (
              <section>
                <h3 className="mb-4 text-lg font-bold">Décadas</h3>
                <GraficoDecadas decadas={numeros.decadas} />
              </section>
            )}

            {numeros.diretores.length > 0 && (
              <section>
                <h3 className="mb-4 text-lg font-bold">Diretores favoritos</h3>
                <DiretoresFavoritos diretores={numeros.diretores} />
              </section>
            )}
          </div>
        )
      )}
    </>
  )
}
