import { CONTEUDO } from '@/components/estilos'

export default function Carregando() {
  return (
    <div className={`${CONTEUDO} flex min-h-screen flex-col items-center justify-center pb-16 pt-24`}>
      <div className="mb-8 h-10 w-64 animate-pulse rounded bg-white/10" />
      <div className="flex items-center gap-6 md:gap-10">
        <div className="h-52 w-36 animate-pulse rounded-lg bg-white/10 md:h-72 md:w-52" />
        <div className="h-10 w-10 animate-pulse rounded bg-white/10" />
        <div className="h-52 w-36 animate-pulse rounded-lg bg-white/10 md:h-72 md:w-52" />
      </div>
    </div>
  )
}
