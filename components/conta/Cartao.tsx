import type { ReactNode } from 'react'

export function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby="titulo-cartao"
      className="rounded-xl bg-superficie/95 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur sm:p-8"
    >
      <h1 id="titulo-cartao" className="mb-6 text-2xl font-extrabold md:text-3xl">
        {titulo}
      </h1>
      {children}
    </section>
  )
}
