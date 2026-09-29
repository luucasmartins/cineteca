import { CONTEUDO } from './estilos'

export function Rodape() {
  return (
    <footer className="mt-16 border-t border-white/5 py-8">
      <div className={`${CONTEUDO} flex flex-col gap-3`}>
        <p className="text-lg font-extrabold text-white">CineTeca</p>
        {/* Atribuição exigida pelos termos de uso da API do TMDB: discreta, mas presente. */}
        <div className="flex items-center gap-2 text-[11px] leading-tight text-white/30">
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="shrink-0 opacity-50 transition-opacity hover:opacity-80">
            <img src="/tmdb-logo.svg" alt="TMDB" className="h-2.5 w-auto" />
          </a>
          <p>Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.</p>
        </div>
      </div>
    </footer>
  )
}
