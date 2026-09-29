import type { MovieSummary, PaginaFilmes } from '@/lib/tmdb/tipos'
import { Carrossel } from './Carrossel'
import { CONTEUDO } from './estilos'
import { MensagemErro } from './MensagemErro'
import { SecaoFileira } from './SecaoFileira'

type Props = { titulo: string; carregar: () => Promise<PaginaFilmes>; verMaisHref?: string }

export async function FileiraAssincrona({ titulo, carregar, verMaisHref }: Props) {
  let filmes: MovieSummary[]
  try {
    filmes = (await carregar()).results
  } catch {
    return (
      <SecaoFileira titulo={titulo}>
        <div className={`${CONTEUDO} py-4`}>
          <MensagemErro />
        </div>
      </SecaoFileira>
    )
  }
  if (filmes.length === 0) return null
  return <Carrossel titulo={titulo} filmes={filmes} verMaisHref={verMaisHref} />
}
