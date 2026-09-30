import type { Metadata } from 'next'
import Link from 'next/link'
import { Cartao } from '@/components/conta/Cartao'
import { FormularioRecuperar } from '@/components/conta/FormularioRecuperar'
import { MENSAGENS } from '@/lib/auth/erros'

export const metadata: Metadata = { title: 'Esqueci minha senha' }

type Props = { searchParams: Promise<{ erro?: string | string[] }> }

export default async function PaginaRecuperarSenha({ searchParams }: Props) {
  const { erro } = await searchParams
  return (
    <Cartao titulo="Esqueci minha senha">
      <FormularioRecuperar erroInicial={erro === 'expirado' ? MENSAGENS.linkExpirado : null} />
      <p className="mt-6 text-center text-sm text-white/60">
        Lembrou?{' '}
        <Link href="/entrar" className="font-semibold text-white hover:underline">
          Entrar
        </Link>
      </p>
    </Cartao>
  )
}
