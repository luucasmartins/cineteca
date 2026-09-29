'use client'

import type { FilmeSalvo, TipoLista } from '@/lib/lista/tipos'
import { BOTAO_SECUNDARIO } from './estilos'
import { IconeCheck, IconeCoracao, IconeMais } from './Icones'
import { useListas } from './ListasProvider'

const ROTULOS: Record<TipoLista, string> = { favoritos: 'Favoritar', salvos: 'Salvar para assistir' }
const TEXTOS_PADRAO: Record<TipoLista, { inativo: string; ativo: string }> = {
  favoritos: { inativo: 'Favoritar', ativo: 'Favoritado' },
  salvos: { inativo: 'Salvar', ativo: 'Salvo' },
}

type Props = {
  tipo: TipoLista
  filme: FilmeSalvo
  comTexto?: boolean
  textos?: { inativo: string; ativo: string }
}

export function BotaoLista({ tipo, filme, comTexto = false, textos = TEXTOS_PADRAO[tipo] }: Props) {
  const { contem, alternar } = useListas()
  const ativo = contem(tipo, filme.id)

  const icone =
    tipo === 'favoritos' ? (
      <IconeCoracao preenchido={ativo} className={`h-5 w-5 ${ativo ? 'text-destaque' : ''}`} />
    ) : ativo ? (
      <IconeCheck />
    ) : (
      <IconeMais />
    )

  const classes = comTexto
    ? BOTAO_SECUNDARIO
    : 'flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-black/50 transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

  return (
    <button
      type="button"
      aria-label={ROTULOS[tipo]}
      aria-pressed={ativo}
      title={ativo ? textos.ativo : textos.inativo}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        alternar(tipo, filme)
      }}
      className={classes}
    >
      {icone}
      {comTexto && <span>{ativo ? textos.ativo : textos.inativo}</span>}
    </button>
  )
}
