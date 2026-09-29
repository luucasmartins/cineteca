import { CONTEUDO } from './estilos'

export function Rodape() {
  return (
    <footer className="mt-16 border-t border-white/10 py-10 text-sm text-white/60">
      <div className={`${CONTEUDO} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
        <p className="text-lg font-extrabold text-white">CineTeca</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="shrink-0">
            <img src="/tmdb-logo.svg" alt="TMDB" className="h-4 w-auto" />
          </a>
          <p>Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.</p>
        </div>
      </div>
    </footer>
  )
}
