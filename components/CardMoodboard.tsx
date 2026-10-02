import Link from 'next/link'
import type { ResumoMoodboard } from '@/lib/moodboard/tipos'

export function CardMoodboard({ moodboard }: { moodboard: ResumoMoodboard }) {
  const { id, titulo, quantidadeCenas, capas } = moodboard
  return (
    <Link
      href={`/moodboard/${id}`}
      className="group block rounded-xl bg-superficie p-3 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
    >
      <div className="grid aspect-video grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-lg">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white/5">
            {capas[i] && <img src={capas[i]} alt="" loading="lazy" className="h-full w-full object-cover" />}
          </div>
        ))}
      </div>
      <h2 className="mt-2 truncate text-sm font-bold">{titulo}</h2>
      <p className="text-xs text-white/50">
        {quantidadeCenas} {quantidadeCenas === 1 ? 'cena' : 'cenas'}
      </p>
    </Link>
  )
}
