'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { entrar } from '@/lib/auth/acoes'
import { BOTAO_PRIMARIO } from '../estilos'
import { Campo } from './Campo'

export function FormularioEntrar({ voltar, erroInicial }: { voltar: string; erroInicial: string | null }) {
  const [estado, acao, pendente] = useActionState(entrar, { erro: erroInicial })
  return (
    <form action={acao} noValidate className="space-y-4">
      <input type="hidden" name="voltar" value={voltar} />
      <Campo rotulo="E-mail" nome="email" tipo="email" autoComplete="email" valorInicial={estado.email} />
      <Campo rotulo="Senha" nome="senha" tipo="password" autoComplete="current-password" />
      <div className="text-right">
        <Link href="/recuperar-senha" className="text-sm text-white/60 hover:text-white hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      {estado.erro && <p className="rounded-md bg-destaque/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className={`${BOTAO_PRIMARIO} w-full`}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
