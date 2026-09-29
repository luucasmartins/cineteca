import { FileiraEsqueleto } from '@/components/Esqueletos'

export default function Carregando() {
  return (
    <div aria-hidden>
      <div className="h-[68vh] min-h-[420px] w-full animate-pulse bg-white/5 md:h-[85vh]" />
      <FileiraEsqueleto titulo="Em alta hoje" />
      <FileiraEsqueleto titulo="Populares" />
    </div>
  )
}
