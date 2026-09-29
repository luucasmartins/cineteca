import Link from 'next/link'
import { paraFilmeSalvo } from '@/lib/lista/tipos'
import type { MovieSummary } from '@/lib/tmdb/tipos'
import { BotaoLista } from './BotaoLista'
import { BOTAO_PRIMARIO, CONTEUDO } from './estilos'
import { IconeInfo } from './Icones'

export function BannerDestaque({ filme }: { filme: MovieSummary }) {
  return (
    <section aria-label="Destaque" className="relative h-[68vh] min-h-[420px] w-full md:h-[85vh]">
      {filme.backdropUrl && <img src={filme.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-fundo via-fundo/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-fundo via-transparent to-transparent" />
      <div className={`${CONTEUDO} relative flex h-full flex-col justify-end pb-32 md:pb-48`}>
        <div className="max-w-xl space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight drop-shadow md:text-6xl">{filme.title}</h1>
          <p className="line-clamp-3 text-sm text-white/85 md:text-lg">{filme.overview}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/filme/${filme.id}`} className={BOTAO_PRIMARIO}>
              <IconeInfo /> Ver detalhes
            </Link>
            <BotaoLista
              tipo="salvos"
              filme={paraFilmeSalvo(filme)}
              comTexto
              textos={{ inativo: 'Minha lista', ativo: 'Na minha lista' }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
