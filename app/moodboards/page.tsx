import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BotaoNovoMoodboard } from '@/components/BotaoNovoMoodboard'
import { CardMoodboard } from '@/components/CardMoodboard'
import { CONTEUDO } from '@/components/estilos'
import { MensagemErro } from '@/components/MensagemErro'
import { listarResumos } from '@/lib/moodboard/banco'
import { criarClienteServidor } from '@/lib/supabase/servidor'

export const metadata: Metadata = { title: 'Moodboards' }

export default async function PaginaMoodboards() {
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/entrar?voltar=/moodboards')

  const resultado = await listarResumos(supabase, data.user.id)
  if (!resultado.ok) console.error('[CineTeca] listar moodboards falhou:', resultado.codigo)

  return (
    <main className={`${CONTEUDO} min-h-screen pb-16 pt-24`}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold md:text-3xl">Moodboards</h1>
        <BotaoNovoMoodboard />
      </div>
      {!resultado.ok ? (
        <MensagemErro texto="Não foi possível carregar seus moodboards" />
      ) : resultado.valor.length === 0 ? (
        <p className="py-16 text-center text-white/60">
          Você ainda não tem moodboards. Abra as imagens de um filme e salve as cenas de que gostar.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {resultado.valor.map((m) => (
            <li key={m.id}>
              <CardMoodboard moodboard={m} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
