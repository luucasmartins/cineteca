import type { Metadata } from 'next'
import { CONTEUDO } from '@/components/estilos'
import { GradeHarmonia } from '@/components/GradeHarmonia'

export const metadata: Metadata = { title: 'Harmonia de cores' }

export default function PaginaHarmonia() {
  return (
    <div className={`${CONTEUDO} pb-16 pt-24`}>
      <h1 className="mb-2 text-3xl font-extrabold md:text-4xl">Escolha pela harmonia de cores</h1>
      <p className="mb-8 text-white/60">Só as cores e o ano. Escolha pelo visual e descubra o filme.</p>
      <GradeHarmonia />
    </div>
  )
}
