import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CONTEUDO } from '@/components/estilos'
import { GradeSessoes } from '@/components/GradeSessoes'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { obterMinhasSessoes } from '@/lib/sessao-dupla/acoes'

export const metadata: Metadata = { title: 'Sessões duplas' }

export default async function PaginaSessoes() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/entrar?voltar=/sessoes')

  const sessoes = await obterMinhasSessoes()

  return (
    <main className={`${CONTEUDO} min-h-screen pb-16 pt-24`}>
      <h1 className="mb-8 text-2xl font-extrabold md:text-3xl">Sessões duplas</h1>
      {sessoes.length === 0 ? (
        <p className="text-white/60">
          Você ainda não criou nenhuma sessão dupla. Acesse a página de um filme e clique em "Sessão dupla" para começar.
        </p>
      ) : (
        <GradeSessoes inicial={sessoes} />
      )}
    </main>
  )
}
