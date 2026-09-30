import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BotaoGoogle } from '@/components/conta/BotaoGoogle'
import { Cartao } from '@/components/conta/Cartao'
import { Divisoria } from '@/components/conta/Divisoria'
import { FormularioCadastro } from '@/components/conta/FormularioCadastro'
import { obterUsuario } from '@/lib/auth/sessao'
import { caminhoDeRetorno } from '@/lib/auth/validacao'

export const metadata: Metadata = { title: 'Criar conta' }

type Props = { searchParams: Promise<{ voltar?: string | string[] }> }

export default async function PaginaCadastro({ searchParams }: Props) {
  const { voltar: bruto } = await searchParams
  if (await obterUsuario()) redirect('/')
  const voltar = caminhoDeRetorno(typeof bruto === 'string' ? bruto : null)

  return (
    <Cartao titulo="Criar conta">
      <BotaoGoogle voltar={voltar} />
      <Divisoria />
      <FormularioCadastro voltar={voltar} />
      <p className="mt-6 text-center text-sm text-white/60">
        Já tem conta?{' '}
        <Link href={`/entrar?voltar=${encodeURIComponent(voltar)}`} className="font-semibold text-white hover:underline">
          Entrar
        </Link>
      </p>
    </Cartao>
  )
}
