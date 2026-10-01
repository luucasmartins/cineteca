'use client'

import { useActionState, useEffect } from 'react'
import { atualizarNome } from '@/lib/auth/acoes'
import { useAvisos } from '../AvisosProvider'
import { BOTAO_SECUNDARIO } from '../estilos'
import { Campo } from './Campo'

export function FormularioNome({ nomeAtual }: { nomeAtual: string }) {
  const [estado, acao, pendente] = useActionState(atualizarNome, { erro: null, nome: nomeAtual })
  const { mostrar } = useAvisos()

  useEffect(() => {
    if (estado.sucesso) mostrar(estado.sucesso)
  }, [estado, mostrar])

  return (
    <form action={acao} noValidate className="space-y-3">
      <Campo rotulo="Nome" nome="nome" autoComplete="name" valorInicial={estado.nome} />
      {estado.erro && <p className="rounded-md bg-perigo/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className={BOTAO_SECUNDARIO}>
        {pendente ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  )
}
