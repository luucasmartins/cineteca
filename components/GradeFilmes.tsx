import { MovieCard, type CartaoFilme } from './MovieCard'

export function GradeFilmes({ filmes }: { filmes: CartaoFilme[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {filmes.map((filme) => (
        <li key={filme.id}>
          <MovieCard filme={filme} />
        </li>
      ))}
    </ul>
  )
}
