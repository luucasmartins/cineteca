import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Cartao } from '@/components/conta/Cartao'
import { ExcluirConta } from '@/components/conta/ExcluirConta'
import { FormularioNome } from '@/components/conta/FormularioNome'
import { FormularioNovaSenha } from '@/components/conta/FormularioNovaSenha'
import { BOTAO_SECUNDARIO } from '@/components/estilos'
import { sair, trocarSenha } from '@/lib/auth/acoes'
import { obterUsuario } from '@/lib/auth/sessao'

export const metadata: Metadata = { title: 'Minha conta' }

export default async function PaginaConta() {
  const usuario = await obterUsuario()
  if (!usuario) redirect('/entrar?voltar=%2Fconta')

  return (
    <Cartao titulo="Minha conta">
      <div className="space-y-8">
        <FormularioNome nomeAtual={usuario.nome} />

        <section aria-labelledby="titulo-email" className="space-y-1">
          <h2 id="titulo-email" className="text-sm font-semibold text-white/80">
            E-mail
          </h2>
          <p className="break-all text-white">{usuario.email}</p>
        </section>

        <section aria-labelledby="titulo-senha" className="space-y-3">
          <h2 id="titulo-senha" className="text-sm font-semibold text-white/80">
            Senha
          </h2>
          {usuario.soGoogle ? (
            <p className="text-white/70">Você entra com o Google.</p>
          ) : (
            <FormularioNovaSenha acao={trocarSenha} rotuloBotao="Trocar senha" />
          )}
        </section>

        <form action={sair}>
          <button type="submit" className={`${BOTAO_SECUNDARIO} w-full`}>
            Sair
          </button>
        </form>

        <ExcluirConta />
      </div>
    </Cartao>
  )
}
