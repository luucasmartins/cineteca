import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BotaoGoogle } from '@/components/conta/BotaoGoogle'
import { Cartao } from '@/components/conta/Cartao'
import { Divisoria } from '@/components/conta/Divisoria'
import { FormularioEntrar } from '@/components/conta/FormularioEntrar'
import { MENSAGENS } from '@/lib/auth/erros'
import { obterUsuario } from '@/lib/auth/sessao'
import { caminhoDeRetorno } from '@/lib/auth/validacao'

export const metadata: Metadata = { title: 'Entrar' }

type Props = { searchParams: Promise<{ voltar?: string | string[]; erro?: string | string[] }> }

export default async function PaginaEntrar({ searchParams }: Props) {
  const { voltar: bruto, erro } = await searchParams
  if (await obterUsuario()) redirect('/')
  const voltar = caminhoDeRetorno(typeof bruto === 'string' ? bruto : null)

  return (
    <Cartao titulo="Entrar">
      <BotaoGoogle voltar={voltar} />
      <Divisoria />
      <FormularioEntrar voltar={voltar} erroInicial={erro === 'google' ? MENSAGENS.google : null} />
      <p className="mt-6 text-center text-sm text-white/60">
        Não tem conta?{' '}
        <Link href={`/cadastro?voltar=${encodeURIComponent(voltar)}`} className="font-semibold text-white hover:underline">
          Criar conta
        </Link>
      </p>
    </Cartao>
  )
}
