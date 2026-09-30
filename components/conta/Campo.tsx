import { useId } from 'react'

type Props = {
  rotulo: string
  nome: string
  tipo?: 'text' | 'email' | 'password'
  autoComplete?: string
  valorInicial?: string
  dica?: string
}

export function Campo({ rotulo, nome, tipo = 'text', autoComplete, valorInicial, dica }: Props) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-white/80">
        {rotulo}
      </label>
      <input
        id={id}
        name={nome}
        type={tipo}
        autoComplete={autoComplete}
        defaultValue={valorInicial}
        className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2.5 text-white outline-none transition-colors focus:border-white"
      />
      {dica && <p className="text-xs text-white/50">{dica}</p>}
    </div>
  )
}
