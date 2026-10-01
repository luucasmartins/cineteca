import { PlacarPremios } from '@/components/PlacarPremios'
import { montarPremios } from '@/lib/premios/montar'
import { buscarLinhasPremios } from '@/lib/premios/wikidata'

/** Devolve o próprio embrulho: sem prêmios, não sobra espaço nem linha divisória na página. */
export async function Premios({ filmeId }: { filmeId: number }) {
  const linhas = await buscarLinhasPremios(filmeId)
  const premios = linhas ? montarPremios(linhas) : []
  if (premios.length === 0) return null
  return (
    <div>
      <PlacarPremios premios={premios} />
    </div>
  )
}
