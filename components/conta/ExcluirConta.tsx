'use client'

import { useActionState, useId, useState } from 'react'
import { excluirConta } from '@/lib/auth/acoes'

export function ExcluirConta() {
  const [estado, acao, pendente] = useActionState(excluirConta, { erro: null })
  const [confirmacao, setConfirmacao] = useState('')
  const id = useId()

  return (
    <section aria-labelledby="titulo-excluir" className="space-y-3 rounded-md border border-perigo/40 p-4">
      <h2 id="titulo-excluir" className="font-bold text-red-200">
        Excluir conta
      </h2>
      <p className="text-sm text-white/70">
        Sua conta, seus favoritos e seus filmes salvos serão apagados para sempre. Isso não pode ser desfeito.
      </p>
      <form action={acao} noValidate className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor={id} className="block text-sm font-semibold text-white/80">
            Digite EXCLUIR para confirmar
          </label>
          <input
            id={id}
            name="confirmacao"
            autoComplete="off"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2.5 text-white outline-none transition-colors focus:border-white"
          />
        </div>
        {estado.erro && <p className="rounded-md bg-perigo/15 px-3 py-2 text-sm text-red-200">{estado.erro}</p>}
        <button
          type="submit"
          disabled={confirmacao !== 'EXCLUIR' || pendente}
          className="w-full rounded-md bg-perigo px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-perigo-escuro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pendente ? 'Excluindo…' : 'Excluir minha conta'}
        </button>
      </form>
    </section>
  )
}
