'use client'

import { DESCRICAO_MAXIMA, TITULO_MAXIMO } from '@/lib/moodboard/validacao'

const CAMPO =
  'w-full rounded-md bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none ring-1 ring-white/20 focus:ring-white/50'

type Props = {
  prefixo: string
  titulo: string
  descricao: string
  aoMudarTitulo(valor: string): void
  aoMudarDescricao(valor: string): void
  focarTitulo?: boolean
}

export function CamposMoodboard({ prefixo, titulo, descricao, aoMudarTitulo, aoMudarDescricao, focarTitulo = false }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${prefixo}-titulo`} className="mb-1 block text-sm font-semibold">
          Título
        </label>
        <input
          id={`${prefixo}-titulo`}
          type="text"
          autoFocus={focarTitulo}
          maxLength={TITULO_MAXIMO}
          value={titulo}
          onChange={(e) => aoMudarTitulo(e.target.value)}
          placeholder="Ex.: Neons, desertos, chuva"
          className={CAMPO}
        />
      </div>
      <div>
        <label htmlFor={`${prefixo}-descricao`} className="mb-1 block text-sm font-semibold">
          Descrição <span className="font-normal text-white/50">(opcional)</span>
        </label>
        <textarea
          id={`${prefixo}-descricao`}
          maxLength={DESCRICAO_MAXIMA}
          rows={2}
          value={descricao}
          onChange={(e) => aoMudarDescricao(e.target.value)}
          className={`${CAMPO} resize-none`}
        />
      </div>
    </div>
  )
}
