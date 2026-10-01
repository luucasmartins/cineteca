import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlocoAvaliacao } from '@/components/BlocoAvaliacao'
import { BotaoLista } from '@/components/BotaoLista'
import { BotaoTrailer } from '@/components/BotaoTrailer'
import { Carrossel } from '@/components/Carrossel'
import { Elenco } from '@/components/Elenco'
import { CONTEUDO } from '@/components/estilos'
import { ImagemComReserva } from '@/components/ImagemComReserva'
import { MensagemErro } from '@/components/MensagemErro'
import { OndeAssistir } from '@/components/OndeAssistir'
import { TrailerFundo } from '@/components/TrailerFundo'
import { VisaoConstrucao } from '@/components/VisaoConstrucao'
import { obterAvaliacaoDoFilme } from '@/lib/avaliacoes/banco'
import { formatarDuracao } from '@/lib/formatar'
import { paraFilmeSalvo } from '@/lib/lista/tipos'
import { lerIdPositivo } from '@/lib/parametros'
import { getMovieDetails } from '@/lib/tmdb/detalhes'
import type { MovieDetails } from '@/lib/tmdb/tipos'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = lerIdPositivo((await params).id)
  if (id === null) return {}
  const filme = await getMovieDetails(id).catch(() => null)
  return filme ? { title: filme.title, description: filme.overview } : {}
}

export default async function PaginaFilme({ params }: Props) {
  const id = lerIdPositivo((await params).id)
  if (id === null) notFound()

  let filme: MovieDetails | null
  try {
    filme = await getMovieDetails(id)
  } catch {
    return (
      <div className={`${CONTEUDO} pt-28`}>
        <MensagemErro />
      </div>
    )
  }
  if (!filme) notFound()

  const salvo = paraFilmeSalvo(filme)
  const avaliacao = await obterAvaliacaoDoFilme(id)
  const detalhes = [
    filme.year,
    filme.runtime !== null ? formatarDuracao(filme.runtime) : null,
    filme.rating !== null ? `★ ${filme.rating.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article>
      <section aria-labelledby="titulo-filme" className="relative min-h-[70vh]">
        {filme.backdropUrl && <img src={filme.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        {filme.trailerFundoKey && <TrailerFundo chave={filme.trailerFundoKey} />}
        <div className="absolute inset-0 bg-gradient-to-r from-fundo via-fundo/80 to-fundo/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-fundo via-transparent to-transparent" />
        <div className={`${CONTEUDO} relative flex flex-col gap-8 pb-12 pt-28 md:flex-row md:items-end`}>
          <ImagemComReserva
            src={filme.posterUrl}
            reserva="/poster-padrao.svg"
            alt={`Pôster de ${filme.title}`}
            className="w-40 shrink-0 rounded-lg shadow-2xl shadow-black/60 md:w-64"
          />
          <div className="max-w-3xl space-y-4">
            <h1 id="titulo-filme" className="text-3xl font-extrabold leading-tight md:text-5xl">
              {filme.title}
            </h1>
            {detalhes && <p className="text-white/80">{detalhes}</p>}
            {filme.genres.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {filme.genres.map((g) => (
                  <li key={g} className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold">
                    {g}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-white/85 md:text-lg">{filme.overview}</p>
            <div className="flex flex-wrap gap-3">
              {filme.trailerKey && <BotaoTrailer chave={filme.trailerKey} titulo={filme.title} />}
              <BotaoLista tipo="favoritos" filme={salvo} comTexto />
              <BotaoLista tipo="salvos" filme={salvo} comTexto />
            </div>
          </div>
        </div>
      </section>

      <div className={`${CONTEUDO} space-y-12 pb-8`}>
        <BlocoAvaliacao filme={salvo} inicial={avaliacao} />
        <OndeAssistir provedores={filme.watchProviders} />
        {filme.crew.length > 0 && <VisaoConstrucao equipe={filme.crew} />}
        {filme.cast.length > 0 && <Elenco elenco={filme.cast} />}
      </div>

      {filme.recommendations.length > 0 && (
        <div className="mt-12">
          <Carrossel titulo="Filmes semelhantes" filmes={filme.recommendations} />
        </div>
      )}
    </article>
  )
}
