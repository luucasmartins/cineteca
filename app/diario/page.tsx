import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AbasDiario } from '@/components/AbasDiario'
import { CONTEUDO } from '@/components/estilos'
import { obterMeusAssistidos } from '@/lib/diario/acoes'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export const metadata: Metadata = { title: 'Meu diário' }

export default async function PaginaDiario({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/entrar?voltar=/diario')

  const registros = await obterMeusAssistidos()

  return (
    <main className={`${CONTEUDO} min-h-screen pb-16 pt-24`}>
      <h1 className="mb-6 text-2xl font-extrabold md:text-3xl">Meu diário</h1>
      <AbasDiario abaInicial={aba === 'numeros' ? 'numeros' : 'registros'} registros={registros} />
    </main>
  )
}
