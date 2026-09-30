import type { Metadata } from 'next'
import Link from 'next/link'
import { Cartao } from '@/components/conta/Cartao'
import { FormularioNovaSenha } from '@/components/conta/FormularioNovaSenha'
import { BOTAO_PRIMARIO } from '@/components/estilos'
import { redefinirSenha } from '@/lib/auth/acoes'
import { MENSAGENS } from '@/lib/auth/erros'
import { obterUsuario } from '@/lib/auth/sessao'

export const metadata: Metadata = { title: 'Nova senha' }

export default async function PaginaRedefinirSenha() {
  const usuario = await obterUsuario()
  return (
    <Cartao titulo="Nova senha">
      {usuario ? (
        <FormularioNovaSenha acao={redefinirSenha} rotuloBotao="Salvar nova senha" />
      ) : (
        <div className="space-y-4">
          <p className="text-white/80">{MENSAGENS.linkExpirado}</p>
          <Link href="/recuperar-senha" className={BOTAO_PRIMARIO}>
            Pedir um novo link
          </Link>
        </div>
      )}
    </Cartao>
  )
}
