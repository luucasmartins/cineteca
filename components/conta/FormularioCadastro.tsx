'use client'

import { useActionState } from 'react'
import { cadastrar } from '@/lib/auth/acoes'
import { BOTAO_PRIMARIO } from '../estilos'
import { Campo } from './Campo'

export function FormularioCadastro({ voltar }: { voltar: string }) {
  const [estado, acao, pendente] = useActionState(cadastrar, { erro: null })
  return (
    <form action={acao} noValidate className="space-y-4">
      <input type="hidden" name="voltar" value={voltar} />
      <Campo rotulo="Nome" nome="nome" autoComplete="name" valorInicial={estado.nome} />
      <Campo rotulo="E-mail" nome="email" tipo="email" autoComplete="email" valorInicial={estado.email} />
      <Campo rotulo="Senha" nome="senha" tipo="password" autoComplete="new-password" dica="Mínimo de 8 caracteres" />
      {estado.erro && <p className="rounded-md bg-destaque/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className={`${BOTAO_PRIMARIO} w-full`}>
        {pendente ? 'Criando conta…' : 'Criar conta'}
      </button>
    </form>
  )
}
