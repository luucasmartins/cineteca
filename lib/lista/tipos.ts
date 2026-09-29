export type TipoLista = 'favoritos' | 'salvos'
export const TIPOS_LISTA: TipoLista[] = ['favoritos', 'salvos']

export type FilmeSalvo = {
  id: number
  title: string
  posterUrl: string | null
  year: string | null
  rating: number | null
}

export type Listas = Record<TipoLista, FilmeSalvo[]>

// Interface estável: na Fase 2 ganha uma implementação com Supabase.
export interface ListaStore {
  listar(tipo: TipoLista): Promise<FilmeSalvo[]>
  contem(tipo: TipoLista, id: number): Promise<boolean>
  adicionar(tipo: TipoLista, filme: FilmeSalvo): Promise<void>
  remover(tipo: TipoLista, id: number): Promise<void>
}

export function paraFilmeSalvo(filme: FilmeSalvo): FilmeSalvo {
  return {
    id: filme.id,
    title: filme.title,
    posterUrl: filme.posterUrl,
    year: filme.year,
    rating: filme.rating,
  }
}
