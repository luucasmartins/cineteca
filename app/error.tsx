'use client'

import { CONTEUDO } from '@/components/estilos'
import { MensagemErro } from '@/components/MensagemErro'

export default function Erro({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className={`${CONTEUDO} pt-28`}>
      <MensagemErro texto="Algo deu errado ao carregar esta página." aoTentar={retry} />
    </div>
  )
}
