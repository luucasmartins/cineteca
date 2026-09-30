import type { ReactNode } from 'react'
import { getTrending } from '@/lib/tmdb/filmes'

export default async function LayoutConta({ children }: { children: ReactNode }) {
  const posteres = await getTrending()
    .then((p) =>
      p.results
        .map((f) => f.posterUrl)
        .filter((u): u is string => Boolean(u))
        .slice(0, 18),
    )
    .catch((): string[] => [])

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 pb-16 pt-24">
      {posteres.length > 0 && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="grid grid-cols-3 gap-2 opacity-20 sm:grid-cols-6">
            {posteres.map((poster, i) => (
              <img key={i} src={poster} alt="" className="aspect-[2/3] w-full object-cover" />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-fundo/70 via-fundo/90 to-fundo" />
        </div>
      )}
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  )
}
