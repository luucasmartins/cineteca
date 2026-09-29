import Link from 'next/link'
import type { ReactNode } from 'react'
import { CONTEUDO } from './estilos'

function slug(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

type Props = { titulo: string; verMaisHref?: string; children: ReactNode }

export function SecaoFileira({ titulo, verMaisHref, children }: Props) {
  const id = `fileira-${slug(titulo)}`
  return (
    <section aria-labelledby={id}>
      <div className={`${CONTEUDO} flex items-baseline gap-4`}>
        <h2 id={id} className="text-lg font-bold md:text-2xl">
          {titulo}
        </h2>
        {verMaisHref && (
          <Link href={verMaisHref} className="text-sm font-semibold text-white/60 transition-colors hover:text-white">
            Ver tudo ›
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
