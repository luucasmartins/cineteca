import { CONTEUDO } from '@/components/estilos'

export default function Carregando() {
  return (
    <div className={`${CONTEUDO} min-h-screen pb-16 pt-24`}>
      <div className="mb-6 h-9 w-48 animate-pulse rounded bg-white/10" />
      <div className="mb-6 flex gap-4 border-b border-white/10 pb-2">
        <div className="h-6 w-24 animate-pulse rounded bg-white/10" />
        <div className="h-6 w-24 animate-pulse rounded bg-white/10" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3 rounded-lg bg-superficie p-3">
            <div className="h-20 w-14 animate-pulse rounded bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
