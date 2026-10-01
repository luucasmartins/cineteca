'use client'

import { useActionState } from 'react'
import { recuperarSenha } from '@/lib/auth/acoes'
import { BOTAO_PRIMARIO } from '../estilos'
import { Campo } from './Campo'

export function FormularioRecuperar({ erroInicial }: { erroInicial: string | null }) {
  const [estado, acao, pendente] = useActionState(recuperarSenha, { erro: erroInicial, enviado: false })

  if (estado.enviado) {
    return (
      <p className="text-white/80">Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.</p>
    )
  }

  return (
    <form action={acao} noValidate className="space-y-4">
      <p className="text-sm text-white/70">
        Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
      </p>
      <Campo rotulo="E-mail" nome="email" tipo="email" autoComplete="email" />
      {estado.erro && <p className="rounded-md bg-perigo/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className={`${BOTAO_PRIMARIO} w-full`}>
        {pendente ? 'Enviando…' : 'Enviar link'}
      </button>
    </form>
  )
}
