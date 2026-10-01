import type { Metadata } from 'next'
import Link from 'next/link'
import { ImagemComReserva } from '@/components/ImagemComReserva'
import { CONTEUDO, BOTAO_PRIMARIO } from '@/components/estilos'
import { obterRanking } from '@/lib/avaliacoes/banco'
import { textoVotos } from '@/lib/avaliacoes/calculo'

export const metadata: Metadata = { title: 'Mais curtidos' }

export default async function PaginaMaisCurtidos() {
  const filmes = await obterRanking(50)

  return (
    <div className={`${CONTEUDO} pb-16 pt-24`}>
      <h1 className="mb-2 text-3xl font-extrabold md:text-4xl">Mais curtidos na CineTeca</h1>
      <p className="mb-8 text-white/60">Ordenado pela aprovação de quem já viu. Mínimo de 3 votos.</p>

      {filmes.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-10">
          <p className="text-lg text-white/70">Ainda não há filmes avaliados o suficiente.</p>
          <p className="text-white/60">Avalie os filmes que você já viu e ajude a montar o ranking.</p>
          <Link href="/" className={BOTAO_PRIMARIO}>
            Explorar filmes
          </Link>
        </div>
      ) : (
        <ol className="space-y-3">
          {filmes.map((filme, indice) => (
            <li
              key={filme.filmeId}
              className="flex items-center gap-4 rounded-lg bg-superficie/60 p-3 ring-1 ring-white/10"
            >
              <span className="w-8 shrink-0 text-center text-xl font-extrabold text-white/40">{indice + 1}</span>
              <Link href={`/filme/${filme.filmeId}`} className="flex min-w-0 flex-1 items-center gap-4">
                <ImagemComReserva
                  src={filme.posterUrl}
                  reserva="/poster-padrao.svg"
                  alt=""
                  className="h-20 w-[3.33rem] shrink-0 rounded object-cover"
                />
                <span className="min-w-0">
                  <span className="block truncate font-bold">{filme.titulo}</span>
                  {filme.ano && <span className="block text-sm text-white/60">{filme.ano}</span>}
                </span>
              </Link>
              <span className="shrink-0 text-right">
                <span className="block font-extrabold text-destaque">{filme.aprovacao}% curtiram</span>
                <span className="block text-sm text-white/60">{textoVotos(filme.votos)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
