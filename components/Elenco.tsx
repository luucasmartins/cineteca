import type { CastMember } from '@/lib/tmdb/tipos'
import { ImagemComReserva } from './ImagemComReserva'

export function Elenco({ elenco }: { elenco: CastMember[] }) {
  return (
    <section aria-labelledby="elenco-titulo" className="space-y-4">
      <h2 id="elenco-titulo" className="text-xl font-bold md:text-2xl">
        Elenco principal
      </h2>
      <ul className="sem-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:px-0">
        {elenco.map((ator) => (
          <li key={ator.id} className="w-28 shrink-0 md:w-32">
            <ImagemComReserva
              src={ator.profileUrl}
              reserva="/pessoa-padrao.svg"
              alt={ator.name}
              className="aspect-[2/3] w-full rounded-md bg-superficie object-cover"
            />
            <p className="mt-2 line-clamp-2 text-sm font-semibold">{ator.name}</p>
            {ator.character && <p className="line-clamp-2 text-xs text-white/60">{ator.character}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
