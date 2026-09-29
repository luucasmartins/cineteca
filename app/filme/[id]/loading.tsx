import { CONTEUDO } from '@/components/estilos'

export default function Carregando() {
  return (
    <div aria-hidden className={`${CONTEUDO} flex min-h-[70vh] flex-col gap-8 pb-12 pt-28 md:flex-row md:items-end`}>
      <div className="aspect-[2/3] w-40 shrink-0 animate-pulse rounded-lg bg-white/10 md:w-64" />
      <div className="w-full max-w-3xl space-y-4">
        <div className="h-12 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="h-24 w-full animate-pulse rounded bg-white/10" />
      </div>
    </div>
  )
}
