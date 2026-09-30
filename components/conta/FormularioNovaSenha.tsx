'use client'

import { useActionState, useEffect } from 'react'
import type { EstadoFormulario } from '@/lib/auth/acoes'
import { useAvisos } from '../AvisosProvider'
import { BOTAO_PRIMARIO } from '../estilos'
import { Campo } from './Campo'

type Props = {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>
  rotuloBotao: string
}

export function FormularioNovaSenha({ acao: acaoServidor, rotuloBotao }: Props) {
  const [estado, acao, pendente] = useActionState(acaoServidor, { erro: null })
  const { mostrar } = useAvisos()

  useEffect(() => {
    if (estado.sucesso) mostrar(estado.sucesso)
  }, [estado, mostrar])

  return (
    <form action={acao} noValidate className="space-y-4">
      <Campo rotulo="Nova senha" nome="senha" tipo="password" autoComplete="new-password" dica="Mínimo de 8 caracteres" />
      <Campo rotulo="Confirmar nova senha" nome="confirmacao" tipo="password" autoComplete="new-password" />
      {estado.erro && <p className="rounded-md bg-destaque/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className={`${BOTAO_PRIMARIO} w-full`}>
        {pendente ? 'Salvando…' : rotuloBotao}
      </button>
    </form>
  )
}
