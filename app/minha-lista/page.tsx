import type { Metadata } from 'next'
import { CONTEUDO } from '@/components/estilos'
import { MinhaLista } from '@/components/MinhaLista'

export const metadata: Metadata = { title: 'Minha lista' }

export default function PaginaMinhaLista() {
  return (
    <div className={`${CONTEUDO} pb-16 pt-24`}>
      <h1 className="mb-6 text-3xl font-extrabold md:text-4xl">Minha lista</h1>
      <MinhaLista />
    </div>
  )
}
