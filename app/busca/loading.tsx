import { GradeEsqueleto } from '@/components/Esqueletos'
import { CONTEUDO } from '@/components/estilos'

export default function Carregando() {
  return (
    <div className={`${CONTEUDO} pb-8 pt-24`}>
      <div className="mb-6 h-9 w-72 max-w-full animate-pulse rounded bg-white/10" />
      <GradeEsqueleto />
    </div>
  )
}
